"use client";

import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

interface ClipItem {
  id: number;
  content: string;
  content_type: string;
  created_at: string;
  pinned: boolean;
}

const TYPE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  url:   { bg: "#E8F4FD", text: "#2D8FE5", dot: "#3B82F6" },
  code:  { bg: "#EDE9FE", text: "#7C5CFC", dot: "#8B5CF6" },
  json:  { bg: "#FEF3E2", text: "#D97706", dot: "#F59E0B" },
  color: { bg: "#FCE7F3", text: "#DB2777", dot: "#EC4899" },
  email: { bg: "#D1FAE5", text: "#059669", dot: "#10B981" },
  image: { bg: "#FFEDD5", text: "#EA580C", dot: "#F97316" },
  text:  { bg: "#F3F4F6", text: "#6B7280", dot: "#9CA3AF" },
};

const TYPE_LABELS: Record<string, string> = {
  url:   "URL",
  code:  "CODE",
  json:  "JSON",
  color: "COLOR",
  email: "EMAIL",
  image: "IMAGE",
  text:  "TEXT",
};

export default function Home() {
  const [clips, setClips] = useState<ClipItem[]>([]);
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState<number | null>(null);
  const [status, setStatus] = useState("");

  const loadClips = useCallback(async (q = "") => {
    try {
      const data = await invoke<ClipItem[]>("get_clips", {
        search: q || null,
      });
      setClips(data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    loadClips();
    let lastText = "";
    let lastImage = "";
    
    const interval = setInterval(async () => {
      try {
        const imgData = await invoke<string | null>("get_clipboard_image");
        if (imgData && imgData !== lastImage) {
          lastImage = imgData;
          lastText = "";
          await invoke("save_image_clip", { base64Data: imgData });
          loadClips(search);
          return;
        }
        
        const text = await invoke<string>("get_clipboard_now");
        if (text && text.trim() && text !== lastText) {
          lastText = text;
          lastImage = "";
          await invoke("save_clip", { content: text });
          loadClips(search);
        }
      } catch (_) {}
    }, 1500);
    return () => clearInterval(interval);
  }, [loadClips, search]);

  useEffect(() => {
    loadClips(search);
  }, [search, loadClips]);

  async function copyToClipboard(item: ClipItem) {
    try {
      await navigator.clipboard.writeText(item.content);
      setCopied(item.id);
      setTimeout(() => setCopied(null), 1500);
    } catch (e) {
      console.error(e);
    }
  }

  async function deleteClip(e: React.MouseEvent, id: number) {
    e.stopPropagation();
    try {
      await invoke("delete_clip", { id });
      loadClips(search);
    } catch (err) {
      console.error("Delete failed:", err);
    }
  }

  async function togglePin(id: number) {
    await invoke("toggle_pin", { id });
    loadClips(search);
  }

  async function clearAll() {
    if (!confirm("Clear all clips?")) return;
    await invoke("clear_all");
    setStatus("Cleared");
    setTimeout(() => setStatus(""), 2000);
    loadClips();
  }

  return (
    <div style={{ 
      display: "flex", 
      flexDirection: "column", 
      height: "100vh",
      background: "#EEEEF4",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(122, 92, 252, 0.2);
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(122, 92, 252, 0.4);
        }
        input::placeholder {
          color: #AAAAB5;
        }
      `}</style>

      {/* Header */}
      <div style={{
        padding: "20px 28px",
        display: "flex",
        alignItems: "center",
        gap: 20,
        background: "#FFFFFF",
        boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
      }}>
        <div style={{ 
          fontSize: 26, 
          fontWeight: 700, 
          color: "#1A1A2E",
          letterSpacing: -0.5,
        }}>
          ClipVault
        </div>
        
        <div style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: "#7C5CFC",
        }} />
        
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search clips..."
          style={{
            flex: 1,
            background: "#F8F8FA",
            border: "1px solid transparent",
            borderRadius: 50,
            padding: "12px 20px",
            color: "#1A1A2E",
            fontSize: 14,
            outline: "none",
            fontFamily: "inherit",
            transition: "all 0.2s",
          }}
        />
        
        <div style={{ 
          fontSize: 13, 
          color: "#8A8A9A", 
          minWidth: 80,
          fontWeight: 500,
        }}>
          {clips.length} clips
        </div>
        
        <button
          onClick={clearAll}
          style={{
            background: "transparent",
            color: "#E74C3C",
            border: "1px solid #E74C3C",
            borderRadius: 50,
            padding: "10px 20px",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
            transition: "all 0.2s",
          }}
        >
          Clear all
        </button>
        
        {status && (
          <div style={{ 
            fontSize: 13, 
            color: "#2ECC71", 
            fontWeight: 600,
            padding: "8px 16px",
            background: "#D1FAE5",
            borderRadius: 50,
          }}>
            {status}
          </div>
        )}
      </div>

      {/* Clip grid */}
      <div style={{ 
        flex: 1, 
        overflowY: "auto", 
        padding: "24px 28px",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: 16,
        alignContent: "start",
      }}>
        {clips.length === 0 && (
          <div style={{
            gridColumn: "1 / -1",
            textAlign: "center",
            color: "#AAAAB5",
            marginTop: 100,
            fontSize: 20,
            fontWeight: 600,
          }}>
            Copy something to get started
          </div>
        )}

        {clips.map(clip => (
          <div
            key={clip.id}
            style={{
              background: "#FFFFFF",
              borderRadius: 16,
              padding: "20px 24px",
              cursor: "pointer",
              transition: "all 0.2s",
              boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
            }}
            onClick={() => copyToClipboard(clip)}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#E8E8F0";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#FFFFFF";
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              {/* type badge */}
              <span style={{
                fontSize: 11,
                fontWeight: 600,
                color: TYPE_COLORS[clip.content_type]?.text || "#6B7280",
                background: TYPE_COLORS[clip.content_type]?.bg || "#F3F4F6",
                padding: "6px 12px",
                borderRadius: 50,
                letterSpacing: 0.5,
              }}>
                {TYPE_LABELS[clip.content_type] ?? "TEXT"}
              </span>

              {/* color swatch */}
              {clip.content_type === "color" && (
                <span style={{
                  width: 18, height: 18,
                  borderRadius: 6,
                  background: clip.content,
                  border: "2px solid #E5E7EB",
                  display: "inline-block",
                }} />
              )}

              <span style={{ flex: 1 }} />

              {/* timestamp */}
              <span style={{ fontSize: 12, color: "#AAAAB5", fontWeight: 500 }}>
                {clip.created_at}
              </span>
            </div>

            {/* content preview */}
            {clip.content_type === "image" ? (
              <img
                src={`data:image/png;base64,${clip.content}`}
                alt="clipboard image"
                style={{ 
                  maxWidth: "100%", 
                  maxHeight: 140, 
                  borderRadius: 12, 
                }}
              />
            ) : (
              <div style={{
                fontSize: 14,
                color: copied === clip.id ? "#2ECC71" : "#1A1A2E",
                fontFamily: clip.content_type === "code" || clip.content_type === "json"
                  ? "'SF Mono', 'Consolas', monospace" : "inherit",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
                maxHeight: 80,
                overflow: "hidden",
                lineHeight: 1.6,
                fontWeight: 400,
              }}>
                {copied === clip.id ? "✓ Copied!" : clip.content}
              </div>
            )}

            {/* Actions */}
            <div style={{ 
              display: "flex", 
              gap: 8, 
              marginTop: 16,
              paddingTop: 14,
              borderTop: "1px solid #F3F4F6",
            }}>
              <button
                onClick={e => { e.stopPropagation(); togglePin(clip.id); }}
                style={{
                  background: clip.pinned ? "#D1FAE5" : "transparent",
                  border: clip.pinned ? "1px solid #2ECC71" : "1px solid #E5E7EB",
                  color: clip.pinned ? "#059669" : "#8A8A9A",
                  fontSize: 12,
                  padding: "8px 16px",
                  borderRadius: 50,
                  cursor: "pointer",
                  fontWeight: 600,
                  fontFamily: "inherit",
                  flex: 1,
                }}
                title={clip.pinned ? "Unpin" : "Pin"}
              >
                {clip.pinned ? "Pinned" : "Pin"}
              </button>

              <button
                onClick={(e) => deleteClip(e, clip.id)}
                style={{
                  background: "transparent",
                  border: "1px solid #FEE2E2",
                  color: "#E74C3C",
                  fontSize: 12,
                  padding: "8px 16px",
                  borderRadius: 50,
                  cursor: "pointer",
                  fontWeight: 600,
                  fontFamily: "inherit",
                  flex: 1,
                }}
                title="Delete"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}