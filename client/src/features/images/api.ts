import { getFreshToken } from "@/features/links/api";

export type ImageUploadResponse = {
  url: string;
  bytes: number;
  width: number;
  height: number;
};

export type ImageApiErrorKind = "auth" | "bad_request" | "too_large" | "network" | "generic";

export class ImageApiError extends Error {
  kind: ImageApiErrorKind;
  status?: number;
  details?: unknown;

  constructor(kind: ImageApiErrorKind, message: string, options: { status?: number; details?: unknown } = {}) {
    super(message);
    this.name = "ImageApiError";
    this.kind = kind;
    this.status = options.status;
    this.details = options.details;
  }
}

export function isImageApiError(error: unknown): error is ImageApiError {
  return error instanceof ImageApiError;
}

function parseXhrBody(xhr: XMLHttpRequest): unknown {
  const text = xhr.responseText;
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function extractMessage(body: unknown, fallback: string): string {
  if (!body) return fallback;
  if (typeof body === "string") return body || fallback;
  if (typeof body === "object") {
    const record = body as Record<string, unknown>;
    const message = record.error || record.message || record.detail;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

type UploadImageInput = {
  file: File;
  onProgress?: (percent: number) => void;
};

/**
 * Upload one image to POST /api/images (sibling of /api/links, same-origin).
 * Uses XHR for progress; Authorization is the raw PocketBase token.
 */
export function uploadImage({ file, onProgress }: UploadImageInput): Promise<ImageUploadResponse> {
  const token = getFreshToken();
  const formData = new FormData();
  formData.append("file", file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open("POST", "/api/images");
    xhr.setRequestHeader("Authorization", token);

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !onProgress) return;
      onProgress(Math.round((event.loaded / event.total) * 100));
    };

    xhr.onload = () => {
      const body = parseXhrBody(xhr);

      if (xhr.status >= 200 && xhr.status < 300) {
        const record = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
        const url = typeof record.url === "string" ? record.url : "";
        if (!url) {
          reject(new ImageApiError("generic", "Upload succeeded but no URL was returned.", { status: xhr.status, details: body }));
          return;
        }
        resolve({
          url,
          bytes: Number(record.bytes) || 0,
          width: Number(record.width) || 0,
          height: Number(record.height) || 0,
        });
        return;
      }

      if (xhr.status === 401) {
        reject(new ImageApiError(
          "auth",
          "Your session has expired. Please sign in again.",
          { status: 401, details: body },
        ));
        return;
      }

      if (xhr.status === 400) {
        reject(new ImageApiError(
          "bad_request",
          extractMessage(body, "Upload rejected."),
          { status: 400, details: body },
        ));
        return;
      }

      if (xhr.status === 413) {
        reject(new ImageApiError(
          "too_large",
          extractMessage(body, "That file is too large."),
          { status: 413, details: body },
        ));
        return;
      }

      reject(new ImageApiError(
        "generic",
        extractMessage(body, "The image service could not complete the request."),
        { status: xhr.status, details: body },
      ));
    };

    xhr.onerror = () => {
      reject(new ImageApiError("network", "Network error. Check your connection and try again."));
    };

    xhr.ontimeout = () => {
      reject(new ImageApiError("network", "The upload timed out. Check your connection and try again."));
    };

    xhr.timeout = 120000;
    xhr.send(formData);
  });
}
