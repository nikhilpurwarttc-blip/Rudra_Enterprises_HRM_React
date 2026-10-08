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
      const validationError = validateFile(file, [
        ...files,
        ...validFiles,
      ]);

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

    // Allows selecting the same file again
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
      <div className={`w-full ${className}`}>
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 flex items-center gap-1 text-sm font-semibold text-[var(--color-text)]"
          >
            {label}

            {required && (
              <span className="text-[var(--color-danger)]">*</span>
            )}
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
          className={[
            "group flex min-h-[104px] w-full cursor-pointer items-center justify-between gap-4 rounded-xl border border-dashed px-4 py-4",
            "bg-[var(--color-surface)]",
            "transition-all duration-200",
            "hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)]",
            dragging
              ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] shadow-[0_0_0_4px_var(--color-accent-soft)]"
              : "",
            activeError
              ? "border-[var(--color-danger)]"
              : "border-[var(--color-border-strong)]",
            disabled ? "cursor-not-allowed opacity-50" : "",
          ].join(" ")}
        >
          {/* Left Content (Icon/Thumbnail + Details) */}
          <div className="flex min-w-0 items-center gap-4">
            {currentFile ? (
              /* Selected/Uploaded File Thumbnail or Icon */
              <div className="h-12 w-12 shrink-0">
                {fileType === "image" && previewUrl ? (
                  <img
                    src={previewUrl}
                    alt={getFileName(currentFile)}
                    className="h-12 w-12 rounded-lg border border-[var(--color-border)] object-cover"
                  />
                ) : (
                  <div
                    className="
                      flex h-12 w-12 items-center justify-center
                      rounded-lg
                      bg-[var(--color-accent-soft)]
                      text-[var(--color-accent)]
                    "
                  >
                    {fileType === "image" ? (
                      <FileImage size={21} />
                    ) : fileType === "pdf" ? (
                      <FileText size={21} />
                    ) : (
                      <FileIcon size={21} />
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Default Upload Icon */
              <div
                className="
                  flex h-11 w-11 shrink-0 items-center justify-center
                  rounded-xl border border-[var(--color-border)]
                  bg-[var(--color-accent-soft)]
                  text-[var(--color-accent)]
                  transition-transform duration-200
                  group-hover:-translate-y-0.5
                "
              >
                <Upload size={20} />
              </div>
            )}

            {/* Details or Placeholder */}
            <div className="min-w-0">
              {currentFile ? (
                <>
                  <p
                    title={getFileName(currentFile)}
                    className="truncate text-sm font-semibold text-[var(--color-text)]"
                  >
                    {getFileName(currentFile)}
                  </p>

                  <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[var(--color-text-muted)]">
                    {getFileSize(currentFile) > 0 && (
                      <span>{formatFileSize(getFileSize(currentFile))}</span>
                    )}

                    {getFileSize(currentFile) > 0 && <span>•</span>}

                    <span>{fileType.toUpperCase()}</span>

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

                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                    {accept.replaceAll(",", ", ")}
                    {maxSize
                      ? ` • Maximum ${formatFileSize(maxSize)}`
                      : ""}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Right Action Buttons (Shown when file is selected) */}
          {currentFile && (
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                disabled={disabled}
                onClick={(e) => openPreview(e, currentFile)}
                title="Preview"
                className="
                  inline-flex h-8 w-8 items-center justify-center
                  rounded-lg border border-[var(--color-border)]
                  bg-[var(--color-surface)]
                  text-[var(--color-text)]
                  transition-all duration-150
                  hover:border-[var(--color-accent)]
                  hover:bg-[var(--color-accent-soft)]
                  hover:text-[var(--color-accent)]
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                <Eye size={16} />
              </button>

              <button
                type="button"
                disabled={disabled}
                onClick={(e) => removeFile(e, files.length - 1)}
                title="Remove"
                className="
                  inline-flex h-8 w-8 items-center justify-center
                  rounded-lg border border-[var(--color-border)]
                  bg-[var(--color-surface)]
                  text-[var(--color-text)]
                  transition-all duration-150
                  hover:border-[var(--color-danger)]
                  hover:bg-[var(--color-danger)]/10
                  hover:text-[var(--color-danger)]
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                <X size={16} />
              </button>
            </div>
          )}
        </label>

        {/* Helper */}
        {helperText && !activeError && (
          <p className="mt-1.5 text-xs text-[var(--color-text-muted)]">
            {helperText}
          </p>
        )}

        {/* Error */}
        {activeError && (
          <div className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-[var(--color-danger)]">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />

            <span>{activeError}</span>
          </div>
        )}
      </div>

      {/* Modal - only rendered when previewFile state is active */}
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

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="
        fixed inset-0 z-[9999]
        flex items-center justify-center
        bg-black/70 p-3 backdrop-blur-md
      "
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="
          flex h-[min(90vh,850px)] w-full max-w-6xl
          flex-col overflow-hidden rounded-2xl
          border border-[var(--color-border-strong)]
          bg-[var(--color-bg-elevated)]
          shadow-2xl
        "
      >
        {/* Header */}
        <div
          className="
            flex items-center justify-between gap-3
            border-b border-[var(--color-border)]
            bg-[var(--color-surface-strong)]
            px-4 py-3
          "
        >
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
            className="
              inline-flex h-9 w-9 shrink-0 items-center justify-center
              rounded-lg border border-[var(--color-border)]
              bg-[var(--color-surface)]
              text-[var(--color-text)]
              transition-all
              hover:border-[var(--color-danger)]
              hover:bg-[var(--color-danger)]/10
              hover:text-[var(--color-danger)]
            "
            aria-label="Close preview"
          >
            <X size={19} />
          </button>
        </div>

        {/* Body */}
        <div
          className="
            flex min-h-0 flex-1 items-center justify-center
            overflow-auto bg-[var(--color-bg)] p-4
          "
        >
          {type === "image" && previewUrl && (
            <img
              src={previewUrl}
              alt={getFileName(file)}
              className="max-h-full max-w-full rounded-lg object-contain shadow-xl"
            />
          )}

          {type === "pdf" && previewUrl && (
            <iframe
              src={previewUrl}
              title={getFileName(file)}
              className="h-full min-h-[600px] w-full rounded-lg border-0 bg-white"
            />
          )}

          {type === "document" && (
            <div className="flex max-w-md flex-col items-center text-center">
              <div
                className="
                  flex h-20 w-20 items-center justify-center
                  rounded-2xl bg-[var(--color-accent-soft)]
                  text-[var(--color-accent)]
                "
              >
                <FileIcon size={38} />
              </div>

              <h3 className="mt-4 text-base font-bold text-[var(--color-text)]">
                Preview unavailable
              </h3>

              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                This document type cannot be previewed directly
                in the browser.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadField;