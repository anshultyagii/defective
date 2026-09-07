import React, { useRef, useState } from "react";
import "./DataUpload.css";

/**
 * DataUpload
 * ----------------------------------------------------------------------------
 * Replaces the old static "Upload screening data..." heading on Page 2 with
 * an actual file-input control.
 *
 * Wiring to a real backend: fill in `uploadFile()` below — everything else
 * (button, hidden input, selected-file chip, status states) already works.
 * ----------------------------------------------------------------------------
 */

const ACCEPTED_EXTENSIONS = [".csv", ".json", ".xlsx", ".xls"];
const ACCEPTED_ATTR = ACCEPTED_EXTENSIONS.join(",");
const MAX_FILE_SIZE_MB = 50;

async function uploadFile(file) {
  // TODO: point this at your real endpoint.
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/screening-data", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Upload failed with status ${response.status}`);
  }

  return response.json();
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DataUpload({ onFileAdded }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | uploading | success | error
  const [errorMessage, setErrorMessage] = useState("");

  function openFilePicker() {
    inputRef.current?.click();
  }

  function handleFileChange(event) {
    const selected = event.target.files?.[0];
    if (!selected) return;

    const extension = "." + selected.name.split(".").pop().toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(extension)) {
      setStatus("error");
      setErrorMessage(
        `Unsupported file type. Use ${ACCEPTED_EXTENSIONS.join(", ")}.`,
      );
      setFile(null);
      return;
    }
    if (selected.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setStatus("error");
      setErrorMessage(`File is too large. Max size is ${MAX_FILE_SIZE_MB}MB.`);
      setFile(null);
      return;
    }

    setFile(selected);
    setStatus("idle");
    setErrorMessage("");
    onFileAdded?.(selected);
  }

  function handleDrop(event) {
    event.preventDefault();
    const dropped = event.dataTransfer.files?.[0];
    if (!dropped) return;
    if (inputRef.current) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(dropped);
      inputRef.current.files = dataTransfer.files;
    }
    handleFileChange({ target: { files: [dropped] } });
  }

  function handleDragOver(event) {
    event.preventDefault();
  }

  function clearFile() {
    setFile(null);
    setStatus("idle");
    setErrorMessage("");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleUploadClick() {
    if (!file) return;
    setStatus("uploading");
    setErrorMessage("");
    try {
      await uploadFile(file);
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err.message || "Something went wrong during upload.");
    }
  }

  return (
    <div
      className="glass-card data-upload"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_ATTR}
        onChange={handleFileChange}
        className="data-upload-input"
        aria-label="Select screening data file"
      />

      {!file && (
        <>
          <button
            type="button"
            className="glass-btn data-upload-btn"
            onClick={openFilePicker}
          >
            + Add Data
          </button>
          <p className="data-upload-hint">
            CSV, JSON, or Excel · up to {MAX_FILE_SIZE_MB}MB · or drag a file
            here
          </p>
        </>
      )}

      {file && (
        <div className="data-upload-file-row">
          <div className="data-upload-file-info">
            <span className="data-upload-file-name">{file.name}</span>
            <span className="data-upload-file-size">
              {formatBytes(file.size)}
            </span>
          </div>

          <div className="data-upload-actions">
            {status !== "success" && (
              <button
                type="button"
                className="glass-btn data-upload-btn"
                onClick={handleUploadClick}
                disabled={status === "uploading"}
              >
                {status === "uploading" ? "Uploading…" : "Upload"}
              </button>
            )}
            <button
              type="button"
              className="data-upload-clear"
              onClick={clearFile}
              disabled={status === "uploading"}
            >
              Remove
            </button>
          </div>
        </div>
      )}

      {status === "success" && (
        <p className="data-upload-status data-upload-status--success">
          Uploaded successfully.
        </p>
      )}
      {status === "error" && (
        <p className="data-upload-status data-upload-status--error">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
