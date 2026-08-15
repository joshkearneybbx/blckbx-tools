import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { isImageApiError, uploadImage, type ImageUploadResponse } from "@/features/images/api";

const MAX_BYTES = 25 * 1024 * 1024;

type RowStatus = "queued" | "uploading" | "done" | "failed";

type ImageRow = {
  id: string;
  file: File;
  previewUrl: string;
  status: RowStatus;
  progress: number;
  error?: string;
  result?: ImageUploadResponse;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function precheckFile(file: File): string | null {
  if (!file.type.startsWith("image/")) {
    return "Not an image file.";
  }
  if (file.size > MAX_BYTES) {
    return "File is larger than 25 MB.";
  }
  return null;
}

function buildImgTag(result: ImageUploadResponse): string {
  const width = result.width > 0 ? result.width : "";
  const height = result.height > 0 ? result.height : "";
  const widthAttr = width !== "" ? ` width="${width}"` : "";
  const heightAttr = height !== "" ? ` height="${height}"` : "";
  return `<img src="${result.url}"${widthAttr}${heightAttr} alt="">`;
}

async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

export default function ImagesPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const rowsRef = useRef<ImageRow[]>([]);
  const processingRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const [rows, setRows] = useState<ImageRow[]>([]);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  useEffect(() => {
    return () => {
      rowsRef.current.forEach((row) => URL.revokeObjectURL(row.previewUrl));
    };
  }, []);

  const updateRow = useCallback((id: string, patch: Partial<ImageRow>) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }, []);

  const processQueue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;

    try {
      // Sequential: one request at a time until no queued rows remain.
      while (true) {
        const next = rowsRef.current.find((row) => row.status === "queued");
        if (!next) break;

        updateRow(next.id, { status: "uploading", progress: 0, error: undefined });

        try {
          const result = await uploadImage({
            file: next.file,
            onProgress: (percent) => updateRow(next.id, { progress: percent }),
          });
          updateRow(next.id, { status: "done", progress: 100, result, error: undefined });
          setSessionError(null);
        } catch (error) {
          if (isImageApiError(error) && error.kind === "auth") {
            setSessionError(error.message);
            updateRow(next.id, { status: "failed", error: error.message, progress: 0 });
            // Leave remaining queued items queued so the user can retry after re-auth.
            break;
          }

          const message = isImageApiError(error)
            ? error.message
            : error instanceof Error
              ? error.message
              : "Upload failed.";
          updateRow(next.id, { status: "failed", error: message, progress: 0 });
          // Continue the rest of the queue after a single-file failure.
        }
      }
    } finally {
      processingRef.current = false;
      // If more files were dropped while processing, drain again.
      if (rowsRef.current.some((row) => row.status === "queued")) {
        void processQueue();
      }
    }
  }, [updateRow]);

  const enqueueFiles = useCallback((fileList: FileList | File[]) => {
    const incoming = Array.from(fileList);
    if (incoming.length === 0) return;

    const nextRows: ImageRow[] = incoming.map((file) => {
      const id = `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 9)}`;
      const previewUrl = URL.createObjectURL(file);
      const precheck = precheckFile(file);
      if (precheck) {
        return {
          id,
          file,
          previewUrl,
          status: "failed" as const,
          progress: 0,
          error: precheck,
        };
      }
      return {
        id,
        file,
        previewUrl,
        status: "queued" as const,
        progress: 0,
      };
    });

    setRows((current) => [...nextRows, ...current]);
    // Kick queue after state commits via microtask so rowsRef is updated in the effect cycle.
    queueMicrotask(() => {
      // rowsRef may lag one render; merge manually for immediate process.
      rowsRef.current = [...nextRows, ...rowsRef.current.filter((row) => !nextRows.some((n) => n.id === row.id))];
      void processQueue();
    });
  }, [processQueue]);

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer.files?.length) {
      enqueueFiles(event.dataTransfer.files);
    }
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.length) {
      enqueueFiles(event.target.files);
      event.target.value = "";
    }
  };

  const handleRetry = (row: ImageRow) => {
    const precheck = precheckFile(row.file);
    if (precheck) {
      updateRow(row.id, { status: "failed", error: precheck });
      return;
    }
    setSessionError(null);
    updateRow(row.id, { status: "queued", progress: 0, error: undefined, result: undefined });
    queueMicrotask(() => {
      rowsRef.current = rowsRef.current.map((item) =>
        item.id === row.id
          ? { ...item, status: "queued", progress: 0, error: undefined, result: undefined }
          : item,
      );
      void processQueue();
    });
  };

  const handleCopyUrl = async (row: ImageRow) => {
    if (!row.result?.url) return;
    const ok = await copyText(row.result.url);
    if (ok) {
      setCopiedId(`${row.id}:url`);
      setTimeout(() => setCopiedId((current) => (current === `${row.id}:url` ? null : current)), 1500);
    } else {
      toast({ title: "Copy failed", description: "Could not write to the clipboard.", variant: "destructive" });
    }
  };

  const handleCopyImg = async (row: ImageRow) => {
    if (!row.result) return;
    const ok = await copyText(buildImgTag(row.result));
    if (ok) {
      setCopiedId(`${row.id}:img`);
      setTimeout(() => setCopiedId((current) => (current === `${row.id}:img` ? null : current)), 1500);
    } else {
      toast({ title: "Copy failed", description: "Could not write to the clipboard.", variant: "destructive" });
    }
  };

  const succeeded = rows.filter((row) => row.status === "done" && row.result?.url);
  const handleCopyAll = async () => {
    if (succeeded.length < 2) return;
    const text = succeeded.map((row) => row.result!.url).join("\n");
    const ok = await copyText(text);
    if (ok) {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 1500);
    } else {
      toast({ title: "Copy failed", description: "Could not write to the clipboard.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F3F0] px-4 py-8 md:px-8">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-6 border border-[#D4D0CB] bg-white px-5 py-5">
          <p className="font-[var(--bb-font-sans)] text-[11px] uppercase tracking-[1.5px] text-[#696969]">Tools</p>
          <h1 className="mt-1 font-[var(--bb-font-sans)] text-[28px] font-semibold text-[#0A0A0A]">Image uploader</h1>
          <p className="mt-2 text-[13px] leading-relaxed text-[#404040]">
            Drop images to upload them one at a time and copy public URLs for HTML documents.
            This list is session-only — reloading the page clears everything. Nothing is archived.
          </p>
        </header>

        {sessionError ? (
          <div className="mb-4 border border-[#0A0A0A] bg-white px-4 py-3 text-[13px] text-[#0A0A0A]" role="alert">
            {sessionError}
          </div>
        ) : null}

        <div
          className={[
            "flex flex-col items-center justify-center gap-4 border border-dashed border-[#D4D0CB] bg-white px-6 py-12 text-center transition-colors",
            isDragging ? "border-[#0A0A0A] bg-[#FAF9F7]" : "",
          ].join(" ")}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleInputChange}
          />
          <div className="flex h-10 w-10 items-center justify-center border border-[#D4D0CB] bg-[#F5F3F0] text-[#0A0A0A]">
            <ImageIcon className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <p className="text-[15px] font-medium text-[#0A0A0A]">Drop images here</p>
            <p className="mt-1 text-[12px] text-[#696969]">or browse — JPEG, PNG, WebP, GIF · max 25 MB each · uploads run one at a time</p>
          </div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="border border-[#0A0A0A] bg-[#0A0A0A] px-4 py-2 font-[var(--bb-font-sans)] text-[13px] font-medium text-white hover:bg-black"
          >
            Browse
          </button>
        </div>

        {succeeded.length > 1 ? (
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => void handleCopyAll()}
              className="border border-[#0A0A0A] px-3 py-2 text-[12px] font-medium uppercase tracking-[1px] text-[#0A0A0A] hover:bg-white"
            >
              {copiedAll ? "Copied" : "Copy all URLs"}
            </button>
          </div>
        ) : null}

        {rows.length > 0 ? (
          <ul className="mt-4 space-y-3">
            {rows.map((row) => (
              <li key={row.id} className="border border-[#D4D0CB] bg-white p-4">
                <div className="flex gap-4">
                  <img
                    src={row.previewUrl}
                    alt=""
                    className="h-16 w-16 shrink-0 object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-medium text-[#0A0A0A]">{row.file.name}</p>
                        <p className="mt-0.5 text-[12px] text-[#696969]">
                          {formatBytes(row.file.size)}
                          {row.status === "uploading" ? ` · ${row.progress}%` : ""}
                          {row.status === "queued" ? " · Queued" : ""}
                          {row.status === "done" ? " · Done" : ""}
                          {row.status === "failed" ? " · Failed" : ""}
                        </p>
                      </div>
                      {row.status === "uploading" ? (
                        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#0A0A0A]" aria-label="Uploading" />
                      ) : null}
                    </div>

                    {row.status === "uploading" ? (
                      <div className="mt-3 h-1 w-full bg-[#F5F3F0]">
                        <div className="h-1 bg-[#0A0A0A] transition-all" style={{ width: `${row.progress}%` }} />
                      </div>
                    ) : null}

                    {row.status === "failed" && row.error ? (
                      <div className="mt-3 space-y-2">
                        <p className="text-[13px] text-[#0A0A0A]">{row.error}</p>
                        <button
                          type="button"
                          onClick={() => handleRetry(row)}
                          className="border border-[#0A0A0A] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[1px] text-[#0A0A0A] hover:bg-[#F5F3F0]"
                        >
                          Retry
                        </button>
                      </div>
                    ) : null}

                    {row.status === "done" && row.result ? (
                      <div className="mt-3 space-y-2">
                        <p className="break-all font-mono text-[12px] text-[#404040]">{row.result.url}</p>
                        <p className="text-[11px] text-[#696969]">
                          {row.result.width > 0 && row.result.height > 0
                            ? `${row.result.width}×${row.result.height}`
                            : null}
                          {row.result.bytes > 0
                            ? `${row.result.width > 0 ? " · " : ""}${formatBytes(row.result.bytes)}`
                            : null}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => void handleCopyUrl(row)}
                            className="border border-[#0A0A0A] bg-[#0A0A0A] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[1px] text-white"
                          >
                            {copiedId === `${row.id}:url` ? "Copied" : "Copy URL"}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleCopyImg(row)}
                            className="border border-[#0A0A0A] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[1px] text-[#0A0A0A] hover:bg-[#F5F3F0]"
                          >
                            {copiedId === `${row.id}:img` ? "Copied" : "Copy <img> tag"}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
