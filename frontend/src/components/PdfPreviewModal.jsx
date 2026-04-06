import { useState, useEffect, useRef, useCallback } from "react";
import { X, Download, Loader2, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { xhrGetBlob, BACKEND_URL } from "@/lib/xhr";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

export default function PdfPreviewModal({ invoice, onClose, onDownload, user, stats }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const canvasRef = useRef(null);
  const pdfDocRef = useRef(null);

  const renderPage = useCallback(async (pageNum) => {
    if (!pdfDocRef.current || !canvasRef.current) return;
    try {
      const page = await pdfDocRef.current.getPage(pageNum);
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      const container = canvas.parentElement;
      const containerWidth = container.clientWidth - 32;
      const unscaledViewport = page.getViewport({ scale: 1 });
      const scale = Math.min(containerWidth / unscaledViewport.width, 2);
      const viewport = page.getViewport({ scale });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: ctx, viewport }).promise;
    } catch (err) {
      console.error("Render page error:", err);
    }
  }, []);

  useEffect(() => {
    loadPreview();
    return () => {
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy();
        pdfDocRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice.invoice_id]);

  useEffect(() => {
    if (pdfDocRef.current && currentPage > 0) {
      renderPage(currentPage);
    }
  }, [currentPage, renderPage]);

  const loadPreview = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await xhrGetBlob(
        `${BACKEND_URL}/api/invoices/${invoice.invoice_id}/preview`
      );
      if (!result.ok) throw new Error("Failed to load preview");
      const arrayBuffer = await result.blob.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      pdfDocRef.current = pdf;
      setPageCount(pdf.numPages);
      setCurrentPage(1);
      setLoading(false);
      setTimeout(() => renderPage(1), 50);
    } catch (err) {
      console.error("Preview error:", err);
      setError("Failed to load PDF preview");
      setLoading(false);
    }
  };

  const isDownloadLimited =
    user?.plan === "starter" &&
    !user?.is_owner &&
    (stats?.downloads_used || 0) >= 5;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col"
        style={{ height: "min(92vh, 820px)" }}
        data-testid="pdf-preview-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-[#0066cc]" />
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-slate-900 text-sm sm:text-base truncate">
                {invoice.invoice_number}
              </h2>
              <p className="text-xs text-slate-500 truncate">{invoice.customer_name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
            data-testid="close-pdf-preview"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* PDF Canvas */}
        <div className="flex-1 min-h-0 bg-slate-100 overflow-auto relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#0066cc]" />
                <p className="text-sm text-slate-500">Loading preview...</p>
              </div>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
              <div className="text-center px-4">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500 mb-3">{error}</p>
                <Button variant="outline" size="sm" onClick={loadPreview}>
                  Retry
                </Button>
              </div>
            </div>
          )}
          <div className="flex justify-center p-4">
            <canvas
              ref={canvasRef}
              className="shadow-lg rounded bg-white max-w-full"
              style={{ display: loading || error ? "none" : "block" }}
              data-testid="pdf-preview-canvas"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200 shrink-0 gap-2">
          {/* Page Navigation */}
          <div className="flex items-center gap-1 sm:gap-2">
            {pageCount > 1 && (
              <>
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30 transition-colors"
                  data-testid="prev-page-btn"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="text-xs sm:text-sm text-slate-500 tabular-nums">
                  {currentPage} / {pageCount}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(pageCount, p + 1))}
                  disabled={currentPage >= pageCount}
                  className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30 transition-colors"
                  data-testid="next-page-btn"
                >
                  <ChevronRight size={18} />
                </button>
              </>
            )}
            {pageCount <= 1 && (
              <p className="text-xs text-slate-400">
                Preview only
              </p>
            )}
          </div>

          {/* Download */}
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
            <span className="hidden sm:inline">{isDownloadLimited ? "Limit Reached" : "Download PDF"}</span>
            <span className="sm:hidden">{isDownloadLimited ? "Limit" : "Download"}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
