import { pb } from "@/lib/pocketbase";
import type { BookingRecord, BookingStatus } from "@/lib/types";

const COLLECTION = "blckbx_bookings";

function normalizeDate(value: unknown): string {
  const str = String(value ?? "");
  if (!str) return "";
  return str.split("T")[0].split(" ")[0];
}

function normalizeRecord(record: Record<string, unknown>): BookingRecord {
  return {
    id: String(record.id),
    persisted: true,
    status: (record.status as BookingStatus) || "draft",
    tripName: String(record.tripName ?? ""),
    bookingRef: String(record.bookingRef ?? ""),
    issueDate: normalizeDate(record.issueDate),
    departureDate: normalizeDate(record.departureDate),
    clientFirstName: String(record.clientFirstName ?? ""),
    clientLastName: String(record.clientLastName ?? ""),
    welcomeMessage: String(record.welcomeMessage ?? ""),
    coverImage: String(record.coverImage ?? ""),
    bookingData: (record.bookingData ?? {}) as BookingRecord["bookingData"],
    created: record.created ? String(record.created) : undefined,
    updated: record.updated ? String(record.updated) : undefined,
  };
}

/**
 * Resolve what to send to PocketBase for the coverImage file field.
 *
 * - Empty / falsy → send null to clear the field.
 * - Full URL (starts with http/https) → omit entirely. This happens when the
 *   value was populated from `pb.files.getUrl(...)` for UI preview (e.g. after
 *   Import from Quote). Sending the URL would fail PocketBase's file validation.
 * - data: URI → omit entirely. These come from client-side file readers before
 *   the file is uploaded through the proper file upload path.
 * - Otherwise treat as an existing filename already attached to this record
 *   and pass through unchanged.
 *
 * Returns `undefined` to signal "omit this key from the payload".
 */
function resolveCoverImageForSave(value: string): string | null | undefined {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return undefined;
  if (/^data:/i.test(trimmed)) return undefined;
  return trimmed;
}

export async function fetchBookings(): Promise<BookingRecord[]> {
  try {
    const records = await pb.collection(COLLECTION).getFullList({
      sort: "-updated",
    });
    return records.map((r) => normalizeRecord(r as unknown as Record<string, unknown>));
  } catch (err) {
    console.error("Failed to fetch bookings:", err);
    return [];
  }
}

export async function saveBooking({
  booking,
  status,
}: {
  booking: BookingRecord;
  status?: BookingStatus;
}): Promise<BookingRecord> {
  const coverImagePayload = resolveCoverImageForSave(booking.coverImage);

  const payload: Record<string, unknown> = {
    user: pb.authStore.model?.id || "",
    status: status ?? booking.status,
    tripName: booking.tripName,
    bookingRef: booking.bookingRef,
    issueDate: booking.issueDate,
    departureDate: booking.departureDate,
    clientFirstName: booking.clientFirstName,
    clientLastName: booking.clientLastName,
    welcomeMessage: booking.welcomeMessage,
    bookingData: booking.bookingData,
  };

  if (coverImagePayload !== undefined) {
    payload.coverImage = coverImagePayload;
  }

  try {
    const record = booking.persisted === false
      ? await pb.collection(COLLECTION).create(payload)
      : await pb.collection(COLLECTION).update(booking.id, payload);

    return normalizeRecord(record as unknown as Record<string, unknown>);
  } catch (err) {
    console.error("Failed to save booking:", err);
    throw err;
  }
}

export async function deleteBooking(id: string): Promise<void> {
  try {
    await pb.collection(COLLECTION).delete(id);
  } catch (err) {
    console.error("Failed to delete booking:", err);
    throw err;
  }
}
