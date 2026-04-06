import { useState, useEffect } from "react";
import { X, Download, ExternalLink, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { xhrGetBlob, BACKEND_URL } from "@/lib/xhr";

export default function PdfPreviewModal({ invoice, onClose, onDownload, user, stats }) {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPreview();
    return () => {
      if (pdfUrl) window.URL.revokeObjectURL(pdfUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice.invoice_id]);

  const loadPreview = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await xhrGetBlob(
        `${BACKEND_URL}/api/invoices/${invoice.invoice_id}/preview`
      );
      if (!result.ok) throw new Error("Failed to load preview");
      const url = window.URL.createObjectURL(result.blob);
      setPdfUrl(url);
    } catch (err) {
      console.error("Preview error:", err);
      setError("Failed to load PDF preview");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenNewTab = () => {
    if (pdfUrl) {
      window.open(pdfUrl, "_blank");
    }
  };

  const isDownloadLimited =
    user?.plan === "starter" &&
    !user?.is_owner &&
    (stats?.downloads_used || 0) >= 5;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col"
        style={{ height: "min(90vh, 800px)" }}
        data-testid="pdf-preview-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-[#0066cc]" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900 text-base">
                {invoice.document_type} - {invoice.invoice_number}
              </h2>
              <p className="text-xs text-slate-500">{invoice.customer_name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            data-testid="close-pdf-preview"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* PDF Content */}
        <div className="flex-1 min-h-0 bg-slate-100 relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#0066cc]" />
                <p className="text-sm text-slate-500">Loading preview...</p>
              </div>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-white">
              <div className="text-center">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500 mb-3">{error}</p>
                <Button variant="outline" size="sm" onClick={loadPreview}>
                  Retry
                </Button>
              </div>
            </div>
          )}
          {pdfUrl && !loading && !error && (
            <iframe
              src={pdfUrl}
              className="w-full h-full border-0"
              title="PDF Preview"
              data-testid="pdf-preview-iframe"
            />
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 shrink-0">
          <p className="text-xs text-slate-400">
            Preview does not count towards your download limit
          </p>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleOpenNewTab}
              disabled={!pdfUrl}
              data-testid="open-new-tab-btn"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open in New Tab
            </Button>
            <Button
              onClick={() => {
                onDownload(invoice);
                onClose();
              }}
              className="bg-[#0066cc] hover:bg-[#0052a3] text-white"
              disabled={isDownloadLimited}
              data-testid="preview-download-btn"
            >
              <Download className="w-4 h-4 mr-2" />
              {isDownloadLimited ? "Limit Reached" : "Download PDF"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
