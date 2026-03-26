import { useMemo, useRef, useState } from "react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { FileText, Loader2, Upload, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { ImportedDocumentPDF } from "@/components/pdf/ImportedDocumentPDF";

type WebhookResponseItem = {
  extractedText?: string;
};

function getWebhookUrl(): string {
  const webhookUrl = import.meta.env.VITE_PDF_IMPORT_WEBHOOK_URL;
  if (!webhookUrl) {
    throw new Error("Missing VITE_PDF_IMPORT_WEBHOOK_URL in environment configuration.");
  }
  return webhookUrl;
}

export default function PDFImport() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string>("");
  const [clientName, setClientName] = useState<string>("");
  const [assistantName, setAssistantName] = useState<string>("");
  const [assistantEmail, setAssistantEmail] = useState<string>("");
  const [hasStartedExtraction, setHasStartedExtraction] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const outputFilename = useMemo(() => {
    if (!selectedFile?.name) return "blckbx-imported-document";
    return selectedFile.name.replace(/\.pdf$/i, "") || "blckbx-imported-document";
  }, [selectedFile]);

  const resetResult = () => {
    setExtractedText("");
    setError(null);
  };

  const handleFilePicked = (file: File | null) => {
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are supported.");
      return;
    }

    setSelectedFile(file);
    resetResult();
    setClientName("");
    setAssistantName("");
    setAssistantEmail("");
    setHasStartedExtraction(false);
  };

  const handleConvert = async () => {
    if (!selectedFile) return;

    setHasStartedExtraction(true);
    setIsConverting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("data", selectedFile);

      const response = await fetch(getWebhookUrl(), {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Webhook request failed (${response.status})`);
      }

      const data = (await response.json()) as WebhookResponseItem[] | { extractedText?: string };
      console.log("PDF import webhook response:", data);
      const text =
        Array.isArray(data)
          ? data?.[0]?.extractedText
          : data?.extractedText;

      if (!text || typeof text !== "string") {
        throw new Error("No extracted text was returned by the webhook.");
      }

      console.log("Setting extractedText:", text);
      setExtractedText(text);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to convert document.";
      setError(message);
      setExtractedText("");
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F8] px-4 py-10 md:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-serif font-semibold text-[#1D1C1B]">PDF Import</h1>
          <p className="text-sm text-[#6B6B68]">
            Upload any PDF to convert it to BlckBx branded format
          </p>
        </div>

        <Card className="border-[#E6E5E0] bg-white">
          <CardHeader>
            <CardTitle className="text-[#1D1C1B]">Upload PDF</CardTitle>
            <CardDescription>Select or drag a PDF file to start conversion.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const droppedFile = e.dataTransfer.files?.[0] || null;
                handleFilePicked(droppedFile);
              }}
              className={`cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
                isDragging
                  ? "border-[#E7C51C] bg-[#FAF9F8]"
                  : "border-[#E6E5E0] bg-[#FAF9F8]/40 hover:bg-[#FAF9F8]"
              }`}
              data-testid="pdf-import-dropzone"
            >
              <Upload className="mx-auto mb-3 h-8 w-8 text-[#6B6B68]" />
              <p className="text-sm font-medium text-[#1D1C1B]">Drag and drop a PDF here</p>
              <p className="mt-1 text-xs text-[#6B6B68]">or click to browse files</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => handleFilePicked(e.target.files?.[0] || null)}
              />
            </div>

            {selectedFile && (
              <div className="rounded-md border border-[#E6E5E0] bg-[#FAF9F8] px-3 py-2 text-sm text-[#424242]">
                Selected file: <span className="font-medium">{selectedFile.name}</span>
              </div>
            )}

            {selectedFile && hasStartedExtraction && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300 rounded-xl border border-[#E6E5E0] bg-[#FAF9F8] p-4 space-y-3">
                {isConverting && (
                  <div className="flex items-center gap-2 text-xs text-[#6B6B68]">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Extracting document content…
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-[#1D1C1B]">Client Name</p>
                    <Input
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="e.g. John Smith"
                      className="bg-white"
                      data-testid="input-client-name"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-[#1D1C1B]">Your Name</p>
                    <Input
                      value={assistantName}
                      onChange={(e) => setAssistantName(e.target.value)}
                      placeholder="e.g. Josh Kearney"
                      className="bg-white"
                      data-testid="input-assistant-name"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-[#1D1C1B]">Your Email</p>
                    <Input
                      type="email"
                      value={assistantEmail}
                      onChange={(e) => setAssistantEmail(e.target.value)}
                      placeholder="e.g. josh@blckbx.co.uk"
                      className="bg-white"
                      data-testid="input-assistant-email"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={handleConvert}
                disabled={!selectedFile || isConverting}
                className="bg-[#1D1C1B] text-white hover:bg-[#111111]"
                data-testid="button-convert-pdf-import"
              >
                {isConverting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Converting your document...
                  </>
                ) : (
                  "Convert to BlckBx PDF"
                )}
              </Button>

              {error && (
                <Button variant="outline" onClick={handleConvert} disabled={!selectedFile || isConverting}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Retry
                </Button>
              )}
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {extractedText && selectedFile && (
          <Card className="border-[#E6E5E0] bg-white">
            <CardHeader>
              <CardTitle className="text-[#1D1C1B]">Conversion Complete</CardTitle>
              <CardDescription>Your document is ready as a BlckBx-branded PDF.</CardDescription>
            </CardHeader>
            <CardContent>
              {(() => {
                const importedDocument = (
                  <ImportedDocumentPDF
                    text={extractedText}
                    fileName={selectedFile.name}
                    clientName={clientName}
                    assistantName={assistantName}
                    assistantEmail={assistantEmail}
                  />
                );

                return (
              <PDFDownloadLink
                document={importedDocument}
                fileName={`${outputFilename}_BlckBx.pdf`}
              >
                {({ loading }) => (
                  <Button
                    disabled={loading}
                    className="bg-[#E7C51C] text-[#1D1C1B] hover:bg-[#d8b614]"
                    data-testid="button-download-imported-pdf"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Preparing download...
                      </>
                    ) : (
                      <>
                        <FileText className="mr-2 h-4 w-4" />
                        Download PDF
                      </>
                    )}
                  </Button>
                )}
              </PDFDownloadLink>
                );
              })()}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
