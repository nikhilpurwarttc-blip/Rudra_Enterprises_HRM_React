import { useEffect, useId, useRef, useState } from "react";
import { Download, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

export const APP_DOWNLOAD_URL = "https://drive.google.com/file/d/1ZC5eaa7iZkDsmJdCkjxkk9shq3h-M1Xk/view?usp=drive_link";

export const AppDownloadModal = ({ isOpen, onClose, downloadUrl = APP_DOWNLOAD_URL, id }) => {
  if (!isOpen) return null;

  return (
    <div
      id={id}
      role="dialog"
      aria-label="Download the app"
      className="absolute right-0 top-full z-[60] mt-2 w-72 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4 shadow-xl"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">Get the app</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close app download dialog"
          className="rounded-md p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-text)]"
        >
          <X size={16} />
        </button>
      </div>
      {downloadUrl ? (
        <>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Scan this QR code with your phone to download the app.
          </p>
          <div className="mx-auto my-4 w-fit rounded-lg bg-white p-3">
            <QRCodeSVG value={downloadUrl} size={176} />
          </div>
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            <Download size={15} />
            Download App
          </a>
        </>
      ) : (
        <>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            The app download link will be available here soon.
          </p>
          <button
            type="button"
            disabled
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white opacity-50"
          >
            <Download size={15} />
            Download App
          </button>
        </>
      )}
    </div>
  );
};

const AppDownloadButton = ({ downloadUrl = APP_DOWNLOAD_URL }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const popoverId = useId();

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleOutsideClick = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label="Download app"
        aria-expanded={isOpen}
        aria-controls={popoverId}
        className="h-auto rounded-md p-1 transition-colors hover:bg-[var(--color-border)]"
        title="Download app"
      >
        <img src="/appDownload.png" alt="" className="h-5 w-auto" />
      </button>
      <AppDownloadModal
        id={popoverId}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        downloadUrl={downloadUrl}
      />
    </div>
  );
};

export default AppDownloadButton;
