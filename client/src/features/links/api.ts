import { pb } from "@/lib/pocketbase";

export type LinksUploadResponse = {
  id: string;
  url: string;
  expires_at: string;
};

export type LinksClientResult = {
  id: string;
  name: string;
};

export type LinksFileStatus = "live" | "expired";

export type LinksFileRow = {
  id: string;
  title: string;
  client_name: string;
  uploader_email: string;
  uploaded_at: string;
  expires_at: string;
  status: LinksFileStatus | string;
  size_bytes: number | string;
  url: string;
};

export type LinksFileListResponse = {
  page: number;
  per_page: number;
  total: number;
  rows: LinksFileRow[];
};

export type ListFilesInput = {
  q?: string;
  clientId?: string;
  status?: LinksFileStatus | "all";
  page?: number;
  perPage?: number;
};

export type DownloadFileResponse = {
  blob: Blob;
  filename: string;
};

export type LinksApiErrorKind = "auth" | "bad_request" | "too_large" | "network" | "generic";

export class LinksApiError extends Error {
  kind: LinksApiErrorKind;
  status?: number;
  details?: unknown;

  constructor(kind: LinksApiErrorKind, message: string, options: { status?: number; details?: unknown } = {}) {
    super(message);
    this.name = "LinksApiError";
    this.kind = kind;
    this.status = options.status;
    this.details = options.details;
  }
}

type UploadFileInput = {
  file: File;
  clientName: string;
  title: string;
  area: "BOH" | "Travel";
  onProgress?: (percent: number) => void;
};

function getFreshToken(): string {
  const token = pb.authStore.token;

  if (!token) {
    throw new LinksApiError("auth", "Your session has expired. Please sign in again.");
  }

  return token;
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const text = await response.text().catch(() => "");
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
    const message = record.message || record.error || record.detail;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

function toLinksApiError(status: number, body: unknown): LinksApiError {
  if (status === 413) {
    return new LinksApiError("too_large", "That file is too large. Upload an HTML file smaller than 50 MB.", {
      status,
      details: body,
    });
  }

  if (status === 400) {
    return new LinksApiError("bad_request", extractMessage(body, "Check the file type, client name, and title, then try again."), {
      status,
      details: body,
    });
  }

  return new LinksApiError("generic", extractMessage(body, "The Links service could not complete the request."), {
    status,
    details: body,
  });
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

function normalizeFileRow(item: unknown): LinksFileRow | null {
  if (!item || typeof item !== "object") return null;
  const record = item as Record<string, unknown>;

  if (typeof record.id !== "string") return null;

  return {
    id: record.id,
    title: typeof record.title === "string" ? record.title : "Untitled link",
    client_name: typeof record.client_name === "string" ? record.client_name : "—",
    uploader_email: typeof record.uploader_email === "string" ? record.uploader_email : "",
    uploaded_at: typeof record.uploaded_at === "string" ? record.uploaded_at : "",
    expires_at: typeof record.expires_at === "string" ? record.expires_at : "",
    status: typeof record.status === "string" ? record.status : "expired",
    size_bytes: typeof record.size_bytes === "number" || typeof record.size_bytes === "string" ? record.size_bytes : 0,
    url: typeof record.url === "string" ? record.url : "",
  };
}

function filenameFromDisposition(disposition: string | null, fallback: string): string {
  if (!disposition) return fallback;

  const utfMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch?.[1]) return decodeURIComponent(utfMatch[1].replace(/"/g, ""));

  const match = disposition.match(/filename="?([^";]+)"?/i);
  return match?.[1] || fallback;
}

export function uploadFile({ file, clientName, title, area, onProgress }: UploadFileInput): Promise<LinksUploadResponse> {
  const token = getFreshToken();
  const formData = new FormData();
  formData.append("file", file);
  formData.append("client_name", clientName);
  formData.append("title", title);
  formData.append("area", area);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open("POST", "/api/links/upload");
    xhr.setRequestHeader("Authorization", token);

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !onProgress) return;
      onProgress(Math.round((event.loaded / event.total) * 100));
    };

    xhr.onload = () => {
      const body = parseXhrBody(xhr);

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body as LinksUploadResponse);
        return;
      }

      reject(toLinksApiError(xhr.status, body));
    };

    xhr.onerror = () => {
      reject(new LinksApiError("network", "Network error. Check your connection and try again."));
    };

    xhr.ontimeout = () => {
      reject(new LinksApiError("network", "The upload timed out. Check your connection and try again."));
    };

    xhr.timeout = 120000;
    xhr.send(formData);
  });
}

export async function searchClients(q: string): Promise<LinksClientResult[]> {
  const token = getFreshToken();

  let response: Response;
  try {
    response = await fetch(`/api/links/clients?q=${encodeURIComponent(q)}`, {
      method: "GET",
      headers: {
        Authorization: token,
      },
    });
  } catch {
    throw new LinksApiError("network", "Network error. Client search is unavailable right now.");
  }

  const body = await parseResponseBody(response);

  if (!response.ok) {
    throw toLinksApiError(response.status, body);
  }

  const rows = Array.isArray(body)
    ? body
    : body && typeof body === "object" && Array.isArray((body as { rows?: unknown }).rows)
      ? (body as { rows: unknown[] }).rows
      : [];

  return rows
    .map((item): LinksClientResult | null => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      if ((typeof record.id !== "string" && typeof record.id !== "number") || typeof record.name !== "string") return null;
      return { id: String(record.id), name: record.name };
    })
    .filter((item): item is LinksClientResult => Boolean(item))
    .slice(0, 10);
}

export async function listFiles({ q = "", clientId = "", status = "all", page = 1, perPage = 25 }: ListFilesInput): Promise<LinksFileListResponse> {
  const token = getFreshToken();
  const params = new URLSearchParams();
  const trimmedQ = q.trim();

  if (trimmedQ) params.set("q", trimmedQ);
  if (clientId) params.set("client_id", clientId);
  if (status && status !== "all") params.set("status", status);
  params.set("page", String(Math.max(1, page)));
  params.set("per_page", String(perPage));

  let response: Response;
  try {
    response = await fetch(`/api/links/files?${params.toString()}`, {
      method: "GET",
      headers: {
        Authorization: token,
      },
    });
  } catch {
    throw new LinksApiError("network", "Network error. Archive is unavailable right now.");
  }

  const body = await parseResponseBody(response);

  if (!response.ok) {
    throw toLinksApiError(response.status, body);
  }

  const record = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const rows = Array.isArray(record.rows) ? record.rows : [];

  return {
    page: typeof record.page === "number" ? record.page : page,
    per_page: typeof record.per_page === "number" ? record.per_page : perPage,
    total: typeof record.total === "number" ? record.total : 0,
    rows: rows.map(normalizeFileRow).filter((row): row is LinksFileRow => Boolean(row)),
  };
}

export async function reissueFile(id: string): Promise<LinksFileRow> {
  const token = getFreshToken();

  let response: Response;
  try {
    response = await fetch(`/api/links/files/${encodeURIComponent(id)}/reissue`, {
      method: "POST",
      headers: {
        Authorization: token,
      },
    });
  } catch {
    throw new LinksApiError("network", "Network error. Reissue is unavailable right now.");
  }

  const body = await parseResponseBody(response);

  if (!response.ok) {
    throw toLinksApiError(response.status, body);
  }

  const row = normalizeFileRow(body);
  if (!row) {
    throw new LinksApiError("generic", "The Links service returned an invalid reissue response.");
  }

  return row;
}

export async function downloadFile(id: string, fallbackFilename = "link.html"): Promise<DownloadFileResponse> {
  const token = getFreshToken();

  let response: Response;
  try {
    response = await fetch(`/api/links/files/${encodeURIComponent(id)}/download`, {
      method: "GET",
      headers: {
        Authorization: token,
      },
    });
  } catch {
    throw new LinksApiError("network", "Network error. Download is unavailable right now.");
  }

  if (!response.ok) {
    const body = await parseResponseBody(response);
    throw toLinksApiError(response.status, body);
  }

  return {
    blob: await response.blob(),
    filename: filenameFromDisposition(response.headers.get("content-disposition"), fallbackFilename),
  };
}

export function isLinksApiError(error: unknown): error is LinksApiError {
  return error instanceof LinksApiError;
}
