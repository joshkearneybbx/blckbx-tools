import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";
import { isLinksApiError, searchClients, uploadFile, type LinksClientResult, type LinksUploadResponse } from "./api";
import "./links.css";

type LinksTab = "upload" | "archive";
type UploadErrorType = "type" | "size" | "missing" | "network" | "generic" | null;

const TABS: Array<{ id: LinksTab; label: string }> = [
  { id: "upload", label: "Upload" },
  { id: "archive", label: "Archive" },
];

const MAX_FILE_SIZE = 50 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

function formatExpiry(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

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
  if (type === "missing") return "Choose an HTML file, client name, and title before uploading.";
  if (type === "network") return "Network error. Check your connection and try again.";
  return fallback || "The Links service could not complete the request.";
}

export default function LinksPage() {
  const [activeTab, setActiveTab] = useState<LinksTab>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [clientName, setClientName] = useState("");
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

  const trimmedClientName = clientName.trim();
  const trimmedTitle = title.trim();
  const canSubmit = Boolean(file && trimmedClientName && trimmedTitle && !isUploading);

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
    if (!file || !trimmedClientName || !trimmedTitle) {
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

  const selectClient = (client: LinksClientResult) => {
    setSelectedClient(client);
    setClientName(client.name);
    setIsClientSearchOpen(false);
  };

  return (
    <div className="links-tool">
      <div className="links-shell">
        <header className="links-header">
          <p className="links-preheading">LINKS</p>
          <h1 className="links-title" data-testid="links-page-title">Links Library</h1>
          <p className="links-intro">
            Upload and archive client links. This shell is ready for the Links API integration.
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

          {activeTab === "upload" ? (
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
                    <span>Expires {formatExpiry(uploadResult.expires_at)}</span>
                    <button type="button" className="links-copy-button" onClick={handleCopy}>
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div
              id="links-archive-panel"
              role="tabpanel"
              aria-labelledby="links-archive-tab"
              className="links-placeholder"
              aria-label="Archive placeholder"
              data-testid="links-archive-placeholder"
            />
          )}
        </section>
      </div>
    </div>
  );
}
