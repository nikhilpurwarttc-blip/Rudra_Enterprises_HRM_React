import { useEffect, useId, useMemo, useState } from "react";
import {
  AlertCircle,
  Eye,
  File as FileIcon,
  FileImage,
  FileText,
  Upload,
  X,
} from "lucide-react";
import { cn } from "../utils/cn";

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10 MB

const formatFileSize = (bytes = 0) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileType = (file) => {
  const type = file?.type || "";
  if (type.startsWith("image/")) return "image";
  if (type === "application/pdf") return "pdf";
  return "document";
};

const isBrowserFile = (file) =>
  typeof globalThis.File !== "undefined" && file instanceof globalThis.File;

const normalizeValue = (value, multiple) => {
  if (!value) return [];
  if (multiple) {
    return Array.isArray(value) ? value : [value];
  }
  return Array.isArray(value) ? value.slice(0, 1) : [value];
};

const getFileName = (file) => {
  if (isBrowserFile(file)) return file.name;
  return file?.name || file?.fileName || "Document";
};

const getFileSize = (file) => {
  if (isBrowserFile(file)) return file.size;
  return file?.size || 0;
};

const getFileUrl = (file) => {
  if (!file) return "";
  if (isBrowserFile(file)) {
    return URL.createObjectURL(file);
  }
  return file?.url || file?.preview || file?.path || "";
};

const UploadField = ({
  label = "Upload Document",
  required = false,
  value,
  onChange,
  accept = "image/*,.pdf",
  multiple = false,
  maxSize = DEFAULT_MAX_SIZE,
  maxFiles = 5,
  disabled = false,
  error,
  helperText,
  placeholder = "Click to upload or drag and drop",
  className = "",
  validate,
}) => {
  const inputId = useId();

  const [internalError, setInternalError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [browserPreviewUrl, setBrowserPreviewUrl] = useState("");

  const files = useMemo(
    () => normalizeValue(value, multiple),
    [value, multiple]
  );

  const currentFile = files[files.length - 1] || null;
  const fileType = getFileType(currentFile);
  const previewUrl = isBrowserFile(currentFile)
    ? browserPreviewUrl
    : getFileUrl(currentFile);

  useEffect(() => {
    if (!isBrowserFile(currentFile)) {
      setBrowserPreviewUrl("");
      return undefined;
    }

    const url = URL.createObjectURL(currentFile);
    const frame = window.requestAnimationFrame(() =>
      setBrowserPreviewUrl(url)
    );

    return () => {
      window.cancelAnimationFrame(frame);
      URL.revokeObjectURL(url);
    };
  }, [currentFile]);

  const activeError = error || internalError;

  const validateFile = (file, existingFiles = []) => {
    if (!file) return null;

    if (isBrowserFile(file)) {
      if (maxSize && file.size > maxSize) {
        return `${file.name} exceeds the maximum size of ${formatFileSize(
          maxSize
        )}.`;
      }

      if (typeof validate === "function") {
        const customError = validate(file, existingFiles);
        if (customError) {
          return customError;
        }
      }
    }

    return null;
  };

  const handleFiles = (fileList) => {
    if (disabled) return;

    const selectedFiles = Array.from(fileList || []);
    if (!selectedFiles.length) return;

    setInternalError("");

    if (!multiple && selectedFiles.length > 1) {
      setInternalError("Please select only one file.");
      return;
    }

    if (multiple && selectedFiles.length + files.length > maxFiles) {
      setInternalError(`You can upload a maximum of ${maxFiles} files.`);
      return;
    }

    const validFiles = [];

    for (const file of selectedFiles) {
      const validationError = validateFile(file, [...files, ...validFiles]);

      if (validationError) {
        setInternalError(validationError);
        return;
      }

      validFiles.push(file);
    }

    const nextFiles = multiple ? [...files, ...validFiles] : validFiles;
    onChange?.(multiple ? nextFiles : nextFiles[0] || null);
  };

  const handleInputChange = (event) => {
    handleFiles(event.target.files);
    event.target.value = "";
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setDragging(false);

    if (disabled) return;
    handleFiles(event.dataTransfer.files);
  };

  const removeFile = (event, indexToRemove) => {
    event.preventDefault();
    event.stopPropagation();

    if (disabled) return;
    setInternalError("");

    const nextFiles = files.filter((_, index) => index !== indexToRemove);
    onChange?.(multiple ? nextFiles : null);
  };

  const openPreview = (event, file) => {
    event.preventDefault();
    event.stopPropagation();
    setPreviewFile(file);
  };

  return (
    <>
      <div className={cn("w-full space-y-1.5", className)}>
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className="flex items-center gap-1 text-sm font-semibold text-[var(--color-text)]"
          >
            {label}
            {required && <span className="text-[var(--color-danger)]">*</span>}
          </label>
        )}

        {/* Hidden input */}
        <input
          id={inputId}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          onChange={handleInputChange}
          className="sr-only"
        />

        {/* Combined Dropzone */}
        <label
          htmlFor={inputId}
          onDragOver={(event) => {
            event.preventDefault();
            if (!disabled) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={cn(
            "group flex min-h-[110px] w-full cursor-pointer items-center justify-between gap-4 rounded-xl border border-dashed px-2 py-2",
            "bg-[var(--color-surface)] transition-all duration-200",
            "hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)]/40",
            dragging
              ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] shadow-sm"
              : "",
            activeError
              ? "border-[var(--color-danger)] bg-[var(--color-danger)]/5"
              : "border-[var(--color-border-strong)]",
            disabled ? "cursor-not-allowed opacity-50" : ""
          )}
        >
          {/* Left Content */}
          <div className="flex min-w-0 items-center gap-4">
            {currentFile ? (
              <div className="shrink-0">
                {fileType === "image" && previewUrl ? (
                  <img
                    src={previewUrl}
                    alt={getFileName(currentFile)}
                    className="h-[100px] rounded-lg border border-[var(--color-border)] object-cover shadow-xs"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                    {fileType === "pdf" ? (
                      <FileText size={22} />
                    ) : (
                      <FileIcon size={22} />
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-accent-soft)] text-[var(--color-accent)] transition-transform duration-200 group-hover:-translate-y-0.5">
                <Upload size={20} />
              </div>
            )}

            {/* Details */}
            <div className="min-w-0 space-y-0.5">
              {currentFile ? (
                <>
                  <p
                    title={getFileName(currentFile)}
                    className="truncate text-sm font-semibold text-[var(--color-text)]"
                  >
                    {getFileName(currentFile)}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                    {getFileSize(currentFile) > 0 && (
                      <span>{formatFileSize(getFileSize(currentFile))}</span>
                    )}
                    {getFileSize(currentFile) > 0 && <span>•</span>}
                    <span className="uppercase tracking-wider font-medium text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-surface-strong)] border border-[var(--color-border)]">
                      {fileType}
                    </span>
                    {multiple && files.length > 1 && (
                      <>
                        <span>•</span>
                        <span className="font-medium text-[var(--color-accent)]">
                          +{files.length - 1} more file
                          {files.length - 1 > 1 ? "s" : ""}
                        </span>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-[var(--color-text)]">
                    {placeholder}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {accept.replaceAll(",", ", ")}
                    {maxSize ? ` • Max ${formatFileSize(maxSize)}` : ""}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Right Action Buttons */}
          {currentFile && (
            <div className="flex shrink-0 items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                disabled={disabled}
                onClick={(e) => openPreview(e, currentFile)}
                title="Preview document"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] transition-all hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Eye size={16} />
              </button>

              <button
                type="button"
                disabled={disabled}
                onClick={(e) => removeFile(e, files.length - 1)}
                title="Remove document"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] transition-all hover:border-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 hover:text-[var(--color-danger)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X size={16} />
              </button>
            </div>
          )}
        </label>

        {/* Helper */}
        {helperText && !activeError && (
          <p className="text-xs text-[var(--color-text-muted)]">
            {helperText}
          </p>
        )}

        {/* Error */}
        {activeError && (
          <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-danger)] pt-0.5">
            <AlertCircle size={15} className="shrink-0" />
            <span>{activeError}</span>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewFile && (
        <PreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </>
  );
};

const PreviewModal = ({ file, onClose }) => {
  const [browserPreviewUrl, setBrowserPreviewUrl] = useState("");

  const type = getFileType(file);
  const previewUrl = isBrowserFile(file)
    ? browserPreviewUrl
    : getFileUrl(file);

  useEffect(() => {
    if (!isBrowserFile(file)) return undefined;

    const url = URL.createObjectURL(file);
    const frame = window.requestAnimationFrame(() =>
      setBrowserPreviewUrl(url)
    );

    return () => {
      window.cancelAnimationFrame(frame);
      URL.revokeObjectURL(url);
    };
  }, [file]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/75 p-4 pt-6 md:pt-10 backdrop-blur-sm overflow-y-auto"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="flex h-[min(90vh,850px)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-bg-elevated)] shadow-2xl animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface-strong)] px-5 py-3.5">
          <div className="min-w-0">
            <p className="text-sm font-bold text-[var(--color-text)]">
              Document Preview
            </p>
            <p
              title={getFileName(file)}
              className="mt-0.5 truncate text-xs text-[var(--color-text-muted)]"
            >
              {getFileName(file)}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] transition-all hover:border-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 hover:text-[var(--color-danger)]"
            aria-label="Close preview"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-[var(--color-bg)] p-6">
          {type === "image" && previewUrl && (
            <img
              src={previewUrl}
              alt={getFileName(file)}
              className="max-h-full max-w-full rounded-xl object-contain shadow-md"
            />
          )}

          {type === "pdf" && previewUrl && (
            <iframe
              src={previewUrl}
              title={getFileName(file)}
              className="h-full min-h-[550px] w-full rounded-xl border border-[var(--color-border)] bg-white shadow-xs"
            />
          )}

          {type === "document" && (
            <div className="flex max-w-sm flex-col items-center text-center p-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-accent-soft)] text-[var(--color-accent)] shadow-xs">
                <FileIcon size={32} />
              </div>
              <h3 className="mt-4 text-base font-bold text-[var(--color-text)]">
                Preview Unavailable
              </h3>
              <p className="mt-1 text-xs text-[var(--color-text-muted)] leading-relaxed">
                This document format cannot be previewed directly inside the browser. You can download it to view its contents.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadField;