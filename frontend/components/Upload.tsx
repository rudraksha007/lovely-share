"use client";

import { useState, useEffect } from "react";

export default function Upload() {
  const [queue, setQueue] = useState<
    { id: string; name: string; files: File[]; type: "folder" | "file" }[]
  >([]);
  const [uploads, setUploads] = useState<{ id: string; name: string; progress: number }[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    document.body.style.margin = "0";
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // FILE UPLOAD
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles = Array.from(files).map((f) => ({
      id: Math.random().toString(36),
      name: f.name,
      files: [f],
      type: "file" as const,
    }));

    setQueue((q) => [...q, ...newFiles]);
    e.target.value = "";
  };

  // FOLDER UPLOAD – MULTIPLE FOLDERS SUPPORT
  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const folderMap = new Map<string, File[]>();

    // Group files by folder name
    Array.from(files).forEach((file) => {
      const folderName = file.webkitRelativePath.split("/")[0];
      if (!folderMap.has(folderName)) {
        folderMap.set(folderName, []);
      }
      folderMap.get(folderName)!.push(file);
    });

    // Create one entry per folder
    const newFolders = Array.from(folderMap).map(([name, fileList]) => ({
      id: Math.random().toString(36),
      name,
      files: fileList,
      type: "folder" as const,
    }));

    setQueue((q) => [...q, ...newFolders]);
    e.target.value = "";
  };

  const startUpload = () => {
    if (queue.length === 0) return;

    const items = queue.map((item) => ({
      id: item.id,
      name: item.name,
      progress: 0,
    }));
    setUploads((u) => [...u, ...items]);
    setQueue([]);
    setMessage("Uploading...");

    items.forEach((item) => {
      let prog = 0;
      const id = setInterval(() => {
        prog += 10;
        setUploads((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, progress: prog } : i))
        );
        if (prog >= 100) {
          clearInterval(id);
          const allDone = uploads.every((u) => u.progress === 100);
          if (allDone) {
            setTimeout(() => setMessage("All uploads completed!"), 400);
          }
        }
      }, 200);
    });
  };

  return (
    <>
      {/* HEADER */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "80px",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
        }}
      >
        <h1
          style={{
            color: "white",
            fontSize: "2.6rem",
            fontWeight: 800,
            margin: 0,
            letterSpacing: "2px",
            fontFamily: "'Poppins', sans-serif",
          }}
        >
          Lovely Share
        </h1>
      </div>

      {/* LEFT: DASHBOARD */}
      <div
        style={{
          position: "fixed",
          left: 0,
          top: "80px",
          width: "50vw",
          height: "calc(100vh - 80px)",
          background: "#f0f4ff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "620px",
            height: "86vh",
            background: "white",
            borderRadius: "28px",
            padding: "2.2rem",
            boxShadow: "0 20px 50px rgba(0,0,0,0.15)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <h2 style={{ color: "#5a67d8", textAlign: "center", marginBottom: "0.4rem", fontSize: "1.9rem", fontWeight: 700 }}>
            User Dashboard
          </h2>
          <p style={{ textAlign: "center", marginBottom: "1.6rem", color: "#718096", fontSize: "1.1rem" }}>
            Welcome, <strong style={{ color: "#4a5568" }}>Aryan!</strong>
          </p>

          <div
            style={{
              flex: 1,
              background: "#f8faff",
              borderRadius: "18px",
              padding: "1.4rem",
              overflowY: "auto",
              border: "1px solid #e2e8f0",
            }}
          >
            {uploads.length === 0 ? (
              <p style={{ textAlign: "center", color: "#a0aec0", fontSize: "1.1rem", marginTop: "3rem" }}>
                No uploads yet.
              </p>
            ) : (
              uploads.map((f) => (
                <div key={f.id} style={{ marginBottom: "1.4rem" }}>
                  <p
                    style={{
                      fontWeight: 600,
                      fontSize: "0.98rem",
                      marginBottom: "0.5rem",
                      color: "#2d3748",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {f.name}
                  </p>
                  <div style={{ background: "#e2e8f0", borderRadius: "10px", height: "14px", overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${f.progress}%`,
                        height: "100%",
                        background:
                          f.progress === 100
                            ? "linear-gradient(90deg, #48bb78, #68d391)"
                            : "linear-gradient(90deg, #667eea, #764ba2)",
                        borderRadius: "10px",
                        transition: "width 0.4s ease",
                      }}
                    />
                  </div>
                  <small
                    style={{
                      fontSize: "0.82rem",
                      display: "block",
                      marginTop: "0.3rem",
                      fontWeight: 600,
                      color: f.progress === 100 ? "#48bb78" : "#718096",
                    }}
                  >
                    {f.progress}%
                  </small>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* RIGHT: UPLOAD BOX */}
      <div
        style={{
          position: "fixed",
          right: 0,
          top: "80px",
          width: "50vw",
          height: "calc(100vh - 80px)",
          background: "#fdfbfb",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "520px",
            height: "86vh",
            background: "white",
            borderRadius: "28px",
            padding: "3rem 2.2rem",
            textAlign: "center",
            boxShadow: "0 25px 60px rgba(0,0,0,0.18)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <h2
            style={{
              fontSize: "2.3rem",
              color: "transparent",
              margin: 0,
              fontWeight: 700,
              background: "linear-gradient(90deg, #667eea, #764ba2)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
            }}
          >
            Upload Files & Folders
          </h2>

          <div style={{ display: "flex", gap: "1.2rem", justifyContent: "center", margin: "2rem 0" }}>
            <label
              style={{
                background: "linear-gradient(45deg, #667eea, #764ba2)",
                color: "white",
                padding: "1rem 2rem",
                borderRadius: "14px",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "1.05rem",
                boxShadow: "0 8px 20px rgba(102, 126, 234, 0.3)",
              }}
            >
              Select Files
              <input type="file" multiple onChange={handleFileSelect} style={{ display: "none" }} />
            </label>

            <label
              style={{
                background: "linear-gradient(45deg, #48bb78, #68d391)",
                color: "white",
                padding: "1rem 2rem",
                borderRadius: "14px",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "1.05rem",
                boxShadow: "0 8px 20px rgba(72, 187, 120, 0.3)",
              }}
            >
              Select Folder(s)
              <input
                type="file"
                webkitdirectory="true"
                multiple
                onChange={handleFolderSelect}
                style={{ display: "none" }}
              />
            </label>
          </div>

          {/* QUEUED ITEMS */}
          {queue.length > 0 && (
            <div
              style={{
                background: "rgba(102, 126, 234, 0.08)",
                border: "2px dashed rgba(102, 126, 234, 0.4)",
                borderRadius: "16px",
                padding: "1.2rem",
                margin: "1rem 0",
                maxHeight: "260px",
                overflowY: "auto",
              }}
            >
              <p style={{ margin: "0 0 0.8rem", fontWeight: 600, color: "#5a67d8", fontSize: "1rem" }}>
                {queue.length} item{queue.length > 1 ? "s" : ""} queued
              </p>

              {/* FILES */}
              {queue.filter((i) => i.type === "file").length > 0 && (
                <div style={{ marginBottom: "1rem" }}>
                  <p style={{ fontSize: "0.9rem", color: "#5a67d8", fontWeight: 600, margin: "0.5rem 0" }}>
                    Files
                  </p>
                  {queue
                    .filter((i) => i.type === "file")
                    .map((item) => (
                      <div
                        key={item.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          background: "rgba(102, 126, 234, 0.1)",
                          padding: "0.6rem 0.9rem",
                          borderRadius: "10px",
                          marginBottom: "0.5rem",
                          fontSize: "0.88rem",
                        }}
                      >
                        <span style={{ fontWeight: 500, color: "#2d3748" }}>{item.name}</span>
                        <span style={{ color: "#718096", fontWeight: 600 }}>
                          {formatSize(item.files[0].size)}
                        </span>
                      </div>
                    ))}
                </div>
              )}

              {/* FOLDERS */}
              {queue.filter((i) => i.type === "folder").length > 0 && (
                <div>
                  <p style={{ fontSize: "0.9rem", color: "#48bb78", fontWeight: 600, margin: "0.5rem 0" }}>
                    Folders
                  </p>
                  {queue
                    .filter((i) => i.type === "folder")
                    .map((item) => (
                      <div
                        key={item.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          background: "rgba(72, 187, 120, 0.1)",
                          padding: "0.6rem 0.9rem",
                          borderRadius: "10px",
                          marginBottom: "0.5rem",
                          fontSize: "0.88rem",
                        }}
                      >
                        <span style={{ fontWeight: 600, color: "#2d3748" }}>{item.name}</span>
                        <span style={{ color: "#718096", fontSize: "0.82rem" }}>
                          {item.files.length} file{item.files.length > 1 ? "s" : ""}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* UPLOAD BUTTON */}
          <button
            onClick={startUpload}
            disabled={queue.length === 0}
            style={{
              background: queue.length > 0 ? "linear-gradient(45deg, #667eea, #764ba2)" : "#cbd5e0",
              color: "white",
              padding: "1.3rem 3rem",
              borderRadius: "18px",
              border: "none",
              cursor: queue.length > 0 ? "pointer" : "not-allowed",
              fontWeight: 700,
              fontSize: "1.3rem",
              boxShadow: queue.length > 0 ? "0 12px 28px rgba(102, 126, 234, 0.4)" : "none",
              marginTop: "1.5rem",
            }}
          >
            {queue.length > 0
              ? `Upload ${queue.length} Item${queue.length > 1 ? "s" : ""}`
              : "No Items"}
          </button>

          {message && (
            <p
              style={{
                margin: "1.2rem 0 0",
                fontWeight: 600,
                color: message.includes("completed") ? "#48bb78" : "#4a5568",
                fontSize: "1.1rem",
              }}
            >
              {message}
            </p>
          )}
        </div>
      </div>
    </>
  );
}