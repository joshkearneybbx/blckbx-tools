import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  downloadFile,
  isLinksApiError,
  listFiles,
  reissueFile,
  searchClients,
  uploadFile,
  type LinksClientResult,
  type LinksFileListResponse,
  type LinksFileRow,
  type LinksFileStatus,
  type LinksUploadResponse,
} from "./api";
import "./links.css";

type LinksTab = "upload" | "archive";
type UploadErrorType = "type" | "size" | "missing" | "network" | "generic" | null;
type ArchiveStatusFilter = "all" | LinksFileStatus;

const TABS: Array<{ id: LinksTab; label: string }> = [
  { id: "upload", label: "Upload" },
  { id: "archive", label: "Archive" },
];

const STATUS_FILTERS: Array<{ value: ArchiveStatusFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "live", label: "Live" },
  { value: "expired", label: "Expired" },
];

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ARCHIVE_PER_PAGE = 25;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "—";

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function extractTitle(html: string): string {
  try {
    const parsed = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "";
    const textarea = document.createElement("textarea");
    textarea.innerHTML = parsed;
    return textarea.value.trim();
  } catch {
    return "";
  }
}

function isHtmlFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return name.endsWith(".html") || name.endsWith(".htm");
}

function getErrorMessage(type: UploadErrorType, fallback: string): string {
  if (type === "type") return "Upload an .html or .htm file only.";
  if (type === "size") return "That file is too large. Upload an HTML file smaller than 50 MB.";
  if (type === "missing") return "Choose an HTML file, client name, title, and area before uploading.";
  if (type === "network") return "Network error. Check your connection and try again.";
  return fallback || "The Links service could not complete the request.";
}

function uploaderDisplay(email: string): string {
  if (!email) return "—";
  return email.split("@")[0] || email;
}

function safeFilename(title: string): string {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${slug || "link"}.html`;
}

function archiveErrorMessage(error: unknown): string {
  if (isLinksApiError(error)) return error.message;
  return "The Archive could not load. Try again.";
}

export default function LinksPage() {
  const [activeTab, setActiveTab] = useState<LinksTab>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [area, setArea] = useState<"BOH" | "Travel" | "">("");
  const [selectedClient, setSelectedClient] = useState<LinksClientResult | null>(null);
  const [clientResults, setClientResults] = useState<LinksClientResult[]>([]);
  const [isClientSearchOpen, setIsClientSearchOpen] = useState(false);
  const [isSearchingClients, setIsSearchingClients] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<LinksUploadResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorType, setErrorType] = useState<UploadErrorType>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [archiveSearch, setArchiveSearch] = useState("");
  const [debouncedArchiveSearch, setDebouncedArchiveSearch] = useState("");
  const [archiveClientQuery, setArchiveClientQuery] = useState("");
  const [archiveClientResults, setArchiveClientResults] = useState<LinksClientResult[]>([]);
  const [archiveClient, setArchiveClient] = useState<LinksClientResult | null>(null);
  const [isArchiveClientOpen, setIsArchiveClientOpen] = useState(false);
  const [isArchiveClientLoading, setIsArchiveClientLoading] = useState(false);
  const [archiveStatus, setArchiveStatus] = useState<ArchiveStatusFilter>("all");
  const [archivePage, setArchivePage] = useState(1);
  const [archiveData, setArchiveData] = useState<LinksFileListResponse | null>(null);
  const [isArchiveLoading, setIsArchiveLoading] = useState(false);
  const [archiveError, setArchiveError] = useState("");
  const [archiveRetryKey, setArchiveRetryKey] = useState(0);
  const [copiedRowId, setCopiedRowId] = useState<string | null>(null);
  const [reissuingId, setReissuingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const trimmedClientName = clientName.trim();
  const trimmedTitle = title.trim();
  const canSubmit = Boolean(file && trimmedClientName && trimmedTitle && area && !isUploading);
  const rows = archiveData?.rows || [];
  const archiveTotal = archiveData?.total || 0;
  const archivePageCount = Math.max(1, Math.ceil(archiveTotal / ARCHIVE_PER_PAGE));

  const exactClientMatch = useMemo(
    () => clientResults.some((client) => client.name.trim().toLowerCase() === trimmedClientName.toLowerCase()),
    [clientResults, trimmedClientName]
  );

  useEffect(() => {
    const query = trimmedClientName;
    setSelectedClient((current) => (current?.name === clientName ? current : null));

    if (!query) {
      setClientResults([]);
      setIsSearchingClients(false);
      return;
    }

    let cancelled = false;
    setIsSearchingClients(true);

    const handle = window.setTimeout(() => {
      searchClients(query)
        .then((results) => {
          if (cancelled) return;
          setClientResults(results);
          setIsClientSearchOpen(true);
        })
        .catch(() => {
          if (cancelled) return;
          setClientResults([]);
        })
        .finally(() => {
          if (!cancelled) setIsSearchingClients(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [clientName, trimmedClientName]);

  useEffect(() => {
    if (!copied) return;
    const handle = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(handle);
  }, [copied]);

  useEffect(() => {
    if (!copiedRowId) return;
    const handle = window.setTimeout(() => setCopiedRowId(null), 1800);
    return () => window.clearTimeout(handle);
  }, [copiedRowId]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedArchiveSearch(archiveSearch.trim());
      setArchivePage(1);
    }, 300);

    return () => window.clearTimeout(handle);
  }, [archiveSearch]);

  useEffect(() => {
    const query = archiveClientQuery.trim();

    if (!query) {
      setArchiveClientResults([]);
      setIsArchiveClientLoading(false);
      return;
    }

    let cancelled = false;
    setIsArchiveClientLoading(true);

    const handle = window.setTimeout(() => {
      searchClients(query)
        .then((results) => {
          if (cancelled) return;
          setArchiveClientResults(results);
          setIsArchiveClientOpen(true);
        })
        .catch(() => {
          if (cancelled) return;
          setArchiveClientResults([]);
        })
        .finally(() => {
          if (!cancelled) setIsArchiveClientLoading(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [archiveClientQuery]);

  useEffect(() => {
    if (activeTab !== "archive") return;

    let cancelled = false;
    setIsArchiveLoading(true);
    setArchiveError("");

    listFiles({
      q: debouncedArchiveSearch,
      clientId: archiveClient?.id || "",
      status: archiveStatus,
      page: archivePage,
      perPage: ARCHIVE_PER_PAGE,
    })
      .then((data) => {
        if (cancelled) return;
        const pageCount = Math.max(1, Math.ceil(data.total / ARCHIVE_PER_PAGE));
        if (archivePage > pageCount) {
          setArchivePage(pageCount);
          return;
        }
        setArchiveData(data);
      })
      .catch((error) => {
        if (cancelled) return;
        setArchiveError(archiveErrorMessage(error));
      })
      .finally(() => {
        if (!cancelled) setIsArchiveLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab, debouncedArchiveSearch, archiveClient, archiveStatus, archivePage, archiveRetryKey]);

  const setSpecificError = (type: UploadErrorType, fallback = "") => {
    setErrorType(type);
    setErrorMessage(getErrorMessage(type, fallback));
  };

  const clearError = () => {
    setErrorType(null);
    setErrorMessage("");
  };

  const handleFile = (nextFile: File | undefined) => {
    setUploadResult(null);
    setCopied(false);

    if (!nextFile) return;

    if (!isHtmlFile(nextFile)) {
      setFile(null);
      setTitle("");
      setSpecificError("type");
      return;
    }

    if (nextFile.size > MAX_FILE_SIZE) {
      setFile(null);
      setTitle("");
      setSpecificError("size");
      return;
    }

    setFile(nextFile);
    clearError();

    nextFile
      .text()
      .then((text) => setTitle(extractTitle(text)))
      .catch(() => setTitle(""));
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleFile(event.target.files?.[0]);
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    handleFile(event.dataTransfer.files?.[0]);
  };

  const handleSubmit = async () => {
    if (!file || !trimmedClientName || !trimmedTitle || !area) {
      setSpecificError("missing");
      return;
    }

    clearError();
    setUploadResult(null);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const result = await uploadFile({
        file,
        clientName: trimmedClientName,
        title: trimmedTitle,
        area,
        onProgress: setUploadProgress,
      });
      setUploadProgress(100);
      setUploadResult(result);
    } catch (error) {
      if (isLinksApiError(error)) {
        if (error.kind === "too_large") setSpecificError("size", error.message);
        else if (error.kind === "bad_request") setSpecificError("missing", error.message);
        else if (error.kind === "network") setSpecificError("network", error.message);
        else setSpecificError("generic", error.message);
      } else {
        setSpecificError("generic");
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleCopy = async () => {
    if (!uploadResult?.url) return;
    await navigator.clipboard.writeText(uploadResult.url);
    setCopied(true);
  };

  const handleRowCopy = async (row: LinksFileRow) => {
    await navigator.clipboard.writeText(row.url);
    setCopiedRowId(row.id);
  };

  const handleReissue = async (row: LinksFileRow) => {
    setReissuingId(row.id);
    setArchiveError("");

    try {
      const updated = await reissueFile(row.id);
      setArchiveData((current) => current
        ? { ...current, rows: current.rows.map((item) => item.id === updated.id ? updated : item) }
        : current
      );
    } catch (error) {
      setArchiveError(archiveErrorMessage(error));
    } finally {
      setReissuingId(null);
    }
  };

  const handleDownload = async (row: LinksFileRow) => {
    setDownloadingId(row.id);
    setArchiveError("");

    try {
      const { blob, filename } = await downloadFile(row.id, safeFilename(row.title));
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (error) {
      setArchiveError(archiveErrorMessage(error));
    } finally {
      setDownloadingId(null);
    }
  };

  const selectClient = (client: LinksClientResult) => {
    setSelectedClient(client);
    setClientName(client.name);
    setIsClientSearchOpen(false);
  };

  const selectArchiveClient = (client: LinksClientResult) => {
    setArchiveClient(client);
    setArchiveClientQuery(client.name);
    setArchivePage(1);
    setIsArchiveClientOpen(false);
  };

  const clearArchiveClient = () => {
    setArchiveClient(null);
    setArchiveClientQuery("");
    setArchivePage(1);
    setIsArchiveClientOpen(false);
  };

  const renderUploadView = () => (
    <div
      id="links-upload-panel"
      role="tabpanel"
      aria-labelledby="links-upload-tab"
      className="links-upload-panel"
      data-testid="links-upload-placeholder"
    >
      <div
        className={`links-dropzone${isDragging ? " is-dragging" : ""}`}
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
          accept=".html,.htm"
          className="links-file-input"
          onChange={handleInputChange}
          data-testid="links-file-input"
        />
        <div className="links-marker" aria-hidden="true">◇</div>
        <div>
          <p className="links-drop-title">Drop an HTML file here</p>
          <p className="links-drop-copy">or browse for a .html/.htm file up to 50 MB</p>
        </div>
        <button type="button" className="links-secondary-button" onClick={() => inputRef.current?.click()}>
          Browse
        </button>
      </div>

      {file && (
        <div className="links-file-summary" data-testid="links-file-summary">
          <span>{file.name}</span>
          <span>{formatFileSize(file.size)}</span>
        </div>
      )}

      <div className="links-form-grid">
        <label className="links-field">
          <span>Client</span>
          <div className="links-autocomplete">
            <input
              value={clientName}
              onChange={(event) => {
                setClientName(event.target.value);
                setIsClientSearchOpen(true);
              }}
              onFocus={() => setIsClientSearchOpen(true)}
              placeholder="Search or create a client"
              data-testid="links-client-input"
            />
            {isClientSearchOpen && trimmedClientName && (
              <div className="links-client-menu" data-testid="links-client-menu">
                {isSearchingClients && <div className="links-client-option is-muted">Searching…</div>}
                {!isSearchingClients && clientResults.map((client) => (
                  <button key={client.id} type="button" className="links-client-option" onClick={() => selectClient(client)}>
                    {client.name}
                  </button>
                ))}
                {!isSearchingClients && !exactClientMatch && (
                  <button
                    type="button"
                    className="links-client-option is-create"
                    onClick={() => {
                      setSelectedClient(null);
                      setIsClientSearchOpen(false);
                    }}
                    data-testid="links-create-client"
                  >
                    Create &apos;{trimmedClientName}&apos;
                  </button>
                )}
              </div>
            )}
          </div>
          {selectedClient && <em>Selected existing client</em>}
        </label>

        <label className="links-field">
          <span>Title</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Link title"
            data-testid="links-title-input"
          />
        </label>

        <div className="links-field">
          <span>Area</span>
          <div className="links-filter-pills" data-testid="links-area-filter">
            {(["BOH", "Travel"] as const).map((value) => (
              <button
                key={value}
                type="button"
                className={`links-filter-pill${area === value ? " is-active" : ""}`}
                onClick={() => setArea(value)}
                data-testid={`links-area-${value.toLowerCase()}`}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
      </div>

      {errorType && (
        <div className={`links-error links-error-${errorType}`} role="alert" data-testid="links-error-message">
          {errorMessage}
        </div>
      )}

      <div className="links-actions">
        <button
          type="button"
          className="links-primary-button"
          disabled={!canSubmit}
          onClick={handleSubmit}
          data-testid="links-upload-submit"
        >
          {isUploading ? "Uploading" : "Upload link"} <span aria-hidden="true">→</span>
        </button>
        {isUploading && (
          <div className="links-progress" aria-label={`Upload progress ${uploadProgress}%`}>
            <div className="links-progress-bar" style={{ width: `${uploadProgress}%` }} />
          </div>
        )}
      </div>

      {uploadResult && (
        <div className="links-success" data-testid="links-success-result">
          <p className="links-success-label">Link ready</p>
          <a href={uploadResult.url} target="_blank" rel="noreferrer">{uploadResult.url}</a>
          <div className="links-success-row">
            <span>Expires {formatDate(uploadResult.expires_at)}</span>
            <button type="button" className="links-copy-button" onClick={handleCopy}>
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderArchiveBody = () => {
    if (isArchiveLoading && !archiveData) {
      return <div className="links-archive-state">Loading archive…</div>;
    }

    if (archiveError && !archiveData) {
      return (
        <div className="links-archive-error" role="alert">
          <p>{archiveError}</p>
          <button type="button" className="links-secondary-button" onClick={() => setArchiveRetryKey((key) => key + 1)}>
            Retry
          </button>
        </div>
      );
    }

    if (rows.length === 0) {
      const hasFilters = Boolean(debouncedArchiveSearch || archiveClient || archiveStatus !== "all");
      return (
        <div className="links-empty-state" data-testid="links-archive-empty">
          <div className="links-marker" aria-hidden="true">◇</div>
          <p>{hasFilters ? "No results" : "No links yet"}</p>
        </div>
      );
    }

    return (
      <div className="links-table-wrap">
        <table className="links-table" data-testid="links-archive-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Client</th>
              <th>Uploader</th>
              <th>Uploaded</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isLive = row.status.toLowerCase() === "live";
              return (
                <tr key={row.id} data-testid="links-archive-row">
                  <td className="links-table-title">{row.title}</td>
                  <td>{row.client_name}</td>
                  <td data-testid="links-uploader-cell">{uploaderDisplay(row.uploader_email)}</td>
                  <td>{formatDate(row.uploaded_at)}</td>
                  <td>
                    <span className={`links-status-badge ${isLive ? "is-live" : "is-expired"}`}>
                      {isLive ? "Live" : "Expired"}
                    </span>
                  </td>
                  <td>
                    <div className="links-row-actions">
                      {isLive && (
                        <button type="button" className="links-text-button" onClick={() => handleRowCopy(row)} data-testid="links-copy-row">
                          {copiedRowId === row.id ? "Copied" : "Copy link"}
                        </button>
                      )}
                      {!isLive && (
                        <button type="button" className="links-text-button" onClick={() => handleReissue(row)} disabled={reissuingId === row.id} data-testid="links-reissue-row">
                          {reissuingId === row.id ? "Reissuing" : "Reissue"}
                        </button>
                      )}
                      <button type="button" className="links-text-button" onClick={() => handleDownload(row)} disabled={downloadingId === row.id} data-testid="links-download-row">
                        {downloadingId === row.id ? "Downloading" : "Download"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderArchiveView = () => (
    <div
      id="links-archive-panel"
      role="tabpanel"
      aria-labelledby="links-archive-tab"
      className="links-archive-panel"
      data-testid="links-archive-placeholder"
    >
      <div className="links-section-heading">
        <p className="links-preheading">ARCHIVE</p>
        <h2 className="links-section-title">Stored links</h2>
      </div>

      <div className="links-archive-controls">
        <label className="links-field links-search-field">
          <span>Search</span>
          <input
            value={archiveSearch}
            onChange={(event) => setArchiveSearch(event.target.value)}
            placeholder="Search title, client, or body"
            data-testid="links-archive-search"
          />
        </label>

        <label className="links-field links-client-filter">
          <span>Client</span>
          <div className="links-autocomplete">
            <input
              value={archiveClientQuery}
              onChange={(event) => {
                setArchiveClientQuery(event.target.value);
                setArchiveClient(null);
                setArchivePage(1);
                setIsArchiveClientOpen(true);
              }}
              onFocus={() => setIsArchiveClientOpen(true)}
              placeholder="All clients"
              data-testid="links-archive-client-input"
            />
            {isArchiveClientOpen && (
              <div className="links-client-menu" data-testid="links-archive-client-menu">
                <button type="button" className="links-client-option is-create" onClick={clearArchiveClient}>
                  All clients
                </button>
                {isArchiveClientLoading && <div className="links-client-option is-muted">Searching…</div>}
                {!isArchiveClientLoading && archiveClientResults.map((client) => (
                  <button key={client.id} type="button" className="links-client-option" onClick={() => selectArchiveClient(client)}>
                    {client.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </label>

        <div className="links-field links-status-filter">
          <span>Status</span>
          <div className="links-filter-pills" data-testid="links-status-filter">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                className={`links-filter-pill${archiveStatus === filter.value ? " is-active" : ""}`}
                onClick={() => {
                  setArchiveStatus(filter.value);
                  setArchivePage(1);
                }}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {archiveError && archiveData && (
        <div className="links-archive-error is-inline" role="alert">
          <p>{archiveError}</p>
          <button type="button" className="links-secondary-button" onClick={() => setArchiveRetryKey((key) => key + 1)}>
            Retry
          </button>
        </div>
      )}

      {isArchiveLoading && archiveData && <div className="links-archive-updating">Updating archive…</div>}
      {renderArchiveBody()}

      <div className="links-pagination" data-testid="links-pagination">
        <button
          type="button"
          className="links-secondary-button"
          disabled={archivePage <= 1 || isArchiveLoading}
          onClick={() => setArchivePage((page) => Math.max(1, page - 1))}
        >
          Prev
        </button>
        <span>Page {Math.min(archivePage, archivePageCount)} of {archivePageCount}</span>
        <button
          type="button"
          className="links-secondary-button"
          disabled={archivePage >= archivePageCount || isArchiveLoading}
          onClick={() => setArchivePage((page) => Math.min(archivePageCount, page + 1))}
        >
          Next
        </button>
      </div>
    </div>
  );

  return (
    <div className="links-tool">
      <div className="links-shell">
        <header className="links-header">
          <p className="links-preheading">LINKS</p>
          <h1 className="links-title" data-testid="links-page-title">Links Library</h1>
          <p className="links-intro">
            Upload client HTML files and manage shareable links.
          </p>
        </header>

        <section className="links-tabs" aria-label="Links views">
          <div className="links-tab-list" role="tablist" aria-label="Links views">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`links-${tab.id}-panel`}
                id={`links-${tab.id}-tab`}
                className={`links-tab${activeTab === tab.id ? " is-active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "upload" ? renderUploadView() : renderArchiveView()}
        </section>
      </div>
    </div>
  );
}
