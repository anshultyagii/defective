import React, { useRef, useState } from "react";
import "./DocumentUploadBox.css";

/**
 * DocumentUploadBox
 * ----------------------------------------------------------------------------
 * New, self-contained section added below Page 1 (revealed by scrolling
 * past the hero). Deliberately styled independently of the rest of the
 * app's dark glass/space theme, matching the reference "Upload Documents"
 * card design. Does not import or modify any existing component/CSS.
 *
 * Supports adding MULTIPLE files (via picker or drag-and-drop), shows each
 * added file in a list (name, inferred category, size, checkmark), and a
 * Submit button that finalizes the batch and shows a confirmation state.
 *
 * Wiring to a real backend: fill in `submitDocuments()` below.
 * ----------------------------------------------------------------------------
 */

const ACCEPTED_EXTENSIONS = [
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".doc",
  ".docx",
];
const ACCEPTED_ATTR = ACCEPTED_EXTENSIONS.join(",");

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function inferCategory(fileName) {
  const lower = fileName.toLowerCase();
  const ext = "." + lower.split(".").pop();
  if ([".jpg", ".jpeg", ".png"].includes(ext)) return "Imaging";
  if (lower.includes("prescription") || lower.includes("rx"))
    return "Prescription";
  if (lower.includes("lab") || lower.includes("report")) return "Lab Report";
  if (lower.includes("scan") || lower.includes("xray") || lower.includes("x-ray"))
    return "Imaging";
  if (ext === ".pdf") return "Document";
  return "Document";
}

async function submitDocuments(files) {
  // TODO: point this at your real endpoint.
  const formData = new FormData();
  files.forEach((f) => formData.append("documents", f));

  const response = await fetch("/api/documents", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Submit failed with status ${response.status}`);
  }

  return response.json();
}

let nextId = 1;

export default function DocumentUploadBox() {
  const inputRef = useRef(null);
  const [files, setFiles] = useState([]); // [{ id, file, category }]
  const [status, setStatus] = useState("idle"); // idle | submitting | success | error
  const [errorMessage, setErrorMessage] = useState("");

  function openFilePicker() {
    inputRef.current?.click();
  }

  function addFiles(fileList) {
    const incoming = Array.from(fileList || []);
    if (incoming.length === 0) return;

    const accepted = incoming.filter((f) => {
      const ext = "." + f.name.split(".").pop().toLowerCase();
      return ACCEPTED_EXTENSIONS.includes(ext);
    });

    if (accepted.length === 0) {
      setStatus("error");
      setErrorMessage(
        `Unsupported file type. Use ${ACCEPTED_EXTENSIONS.join(", ")}.`,
      );
      return;
    }

    setFiles((prev) => [
      ...prev,
      ...accepted.map((file) => ({
        id: nextId++,
        file,
        category: inferCategory(file.name),
      })),
    ]);
    setStatus("idle");
    setErrorMessage("");
  }

  function handleFileChange(event) {
    addFiles(event.target.files);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleDrop(event) {
    event.preventDefault();
    addFiles(event.dataTransfer.files);
  }

  function handleDragOver(event) {
    event.preventDefault();
  }

  function removeFile(id) {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }

  async function handleSubmit() {
    if (files.length === 0) return;
    setStatus("submitting");
    setErrorMessage("");
    try {
      await submitDocuments(files.map((f) => f.file));
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err.message || "Something went wrong during submit.");
    }
  }

  function resetAll() {
    setFiles([]);
    setStatus("idle");
    setErrorMessage("");
  }

  return (
    <div className="docbox-card">
      <div className="docbox-header">
        <span className="docbox-header-title">
          <svg
            className="docbox-icon"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M12 15V4M12 4L7 9M12 4l5 5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Upload Documents
        </span>
        <span className="docbox-secure-pill">Secure Upload</span>
      </div>

      <div
        className="docbox-dropzone"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_ATTR}
          onChange={handleFileChange}
          className="docbox-input"
          aria-label="Select medical documents"
        />
        <div className="docbox-dropzone-icon-wrap">
          <svg
            className="docbox-dropzone-icon"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M12 15V4M12 4L7 9M12 4l5 5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <p className="docbox-dropzone-title">Drop your medical documents here</p>
        <p className="docbox-dropzone-sub">
          Prescriptions, lab reports, X-rays, test results
        </p>
        <button
          type="button"
          className="docbox-browse-btn"
          onClick={openFilePicker}
        >
          Browse Files
        </button>
      </div>

      {files.length > 0 && (
        <div className="docbox-file-list">
          {files.map(({ id, file, category }) => (
            <div className="docbox-file-row" key={id}>
              <span className="docbox-file-icon-wrap">
                <svg
                  className="docbox-file-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M15 2v5h5"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="docbox-file-info">
                <span className="docbox-file-name">{file.name}</span>
                <span className="docbox-file-meta">
                  {category} · {formatBytes(file.size)}
                </span>
              </span>
              {status === "success" ? (
                <span className="docbox-file-check" aria-label="Uploaded">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle
                      cx="12"
                      cy="12"
                      r="9"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    />
                    <path
                      d="M8 12.5l2.5 2.5L16 9.5"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              ) : (
                <button
                  type="button"
                  className="docbox-file-remove"
                  onClick={() => removeFile(id)}
                  disabled={status === "submitting"}
                  aria-label={`Remove ${file.name}`}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {files.length > 0 && status !== "success" && (
        <button
          type="button"
          className="docbox-submit-btn"
          onClick={handleSubmit}
          disabled={status === "submitting"}
        >
          {status === "submitting"
            ? "Submitting…"
            : `Submit ${files.length} Document${files.length > 1 ? "s" : ""}`}
        </button>
      )}

      {status === "success" && (
        <div className="docbox-success-row">
          <p className="docbox-status docbox-status--success">
            All documents submitted successfully.
          </p>
          <button
            type="button"
            className="docbox-reset-btn"
            onClick={resetAll}
          >
            Upload More
          </button>
        </div>
      )}

      {status === "error" && (
        <p className="docbox-status docbox-status--error">{errorMessage}</p>
      )}
    </div>
  );
}
