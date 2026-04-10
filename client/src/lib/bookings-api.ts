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
  const payload = {
    user: pb.authStore.model?.id || "",
    status: status ?? booking.status,
    tripName: booking.tripName,
    bookingRef: booking.bookingRef,
    issueDate: booking.issueDate,
    departureDate: booking.departureDate,
    clientFirstName: booking.clientFirstName,
    clientLastName: booking.clientLastName,
    welcomeMessage: booking.welcomeMessage,
    coverImage: booking.coverImage,
    bookingData: booking.bookingData,
  };

  try {
    // Try update first — if the record exists in PocketBase, update it
    const record = await pb
      .collection(COLLECTION)
      .update(booking.id, payload)
      .catch(async (err: { status?: number }) => {
        // 404 means the record doesn't exist yet — create it
        if (err?.status === 404) {
          return pb.collection(COLLECTION).create(payload);
        }
        throw err;
      });

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
