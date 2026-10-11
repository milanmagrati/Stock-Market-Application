import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { 
  Newspaper, 
  ExternalLink, 
  Edit3, 
  CheckCircle2, 
  Clock, 
  Globe, 
  Tag, 
  Lock, 
  Plus, 
  Trash2 
} from "lucide-react";

export const NewsFeed = ({ news, companies, onNewsUpdated }) => {
  const { user } = useAuth();
  const [editingArticle, setEditingArticle] = useState(null);
  const [selectedCompId, setSelectedCompId] = useState("");
  const [actionType, setActionType] = useState("UPDATE_CONFIDENCE");
  const [confidenceScore, setConfidenceScore] = useState(0.95);
  const [notes, setNotes] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canEdit = user?.role === "Admin" || user?.role === "Analyst";

  const handleOpenEdit = (art) => {
    setEditingArticle(art);
    setStatusMsg("");
    if (art.tags && art.tags.length > 0) {
      setSelectedCompId(art.tags[0].company_id);
      setConfidenceScore(art.tags[0].confidence_score);
    } else if (companies.length > 0) {
      setSelectedCompId(companies[0].id);
    }
  };

  const handleSaveCorrection = async () => {
    if (!editingArticle || !selectedCompId) return;
    setSubmitting(true);
    setStatusMsg("");
    try {
      const res = await api.recategorizeArticle(editingArticle.id, {
        company_id: Number(selectedCompId),
        action: actionType,
        confidence_score: Number(confidenceScore),
        notes: notes || "Analyst manual correction",
      });
      setStatusMsg(`Success: ${res.message}`);
      if (onNewsUpdated) onNewsUpdated();
      setTimeout(() => setEditingArticle(null), 1200);
    } catch (err) {
      setStatusMsg(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card">
      {/* Header */}
      <div className="card-header">
        <div className="card-title">
          <Newspaper size={18} color="var(--blue-accent)" />
          <span>Categorized Financial Intelligence Feed</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            {news.length} Articles Tracked
          </span>
          <span className="badge badge-ai">Multi-Label AI Tagged</span>
        </div>
      </div>

      {/* Articles Stream */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", maxHeight: "650px", overflowY: "auto", paddingRight: "0.3rem" }}>
        {news.length === 0 ? (
          <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", padding: "1.5rem", textAlign: "center" }}>
            No categorized news found for selected company filter.
          </div>
        ) : (
          news.map((art) => (
            <div
              key={art.id}
              style={{
                background: "var(--bg-input)",
                border: "1px solid var(--border-color)",
                borderRadius: "10px",
                padding: "0.9rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                transition: "border-color 0.15s ease"
              }}
            >
              {/* Top Meta: Source & Date */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.72rem", color: "var(--text-muted)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <Globe size={12} color="var(--vwap-cyan)" />
                  <span style={{ color: "var(--vwap-cyan)", fontWeight: "600" }}>{art.source_portal}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  <Clock size={12} />
                  <span>{new Date(art.published_at).toLocaleString()}</span>
                </div>
              </div>

              {/* Headline */}
              <h4 style={{ fontSize: "0.92rem", fontWeight: "600", lineHeight: "1.35", color: "var(--text-primary)" }}>
                {art.headline}
              </h4>

              {/* Excerpt */}
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                {art.excerpt || art.body?.slice(0, 160) + "..."}
              </p>

              {/* Company Tags & Analyst Edit Action */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.3rem", paddingTop: "0.4rem", borderTop: "1px solid var(--border-color)" }}>
                {/* Multi-label Badges */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                  {art.tags && art.tags.length > 0 ? (
                    art.tags.map((t) => (
                      <span
                        key={t.id}
                        className="badge badge-ai"
                        style={{ fontSize: "0.72rem", padding: "0.15rem 0.5rem", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                      >
                        <Tag size={10} />
                        <strong>{t.company_symbol}</strong>: {(t.confidence_score * 100).toFixed(0)}%
                        {t.is_analyst_corrected && (
                          <CheckCircle2 size={11} color="var(--bull-green)" title={`Corrected by ${t.corrected_by}`} />
                        )}
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Untagged</span>
                  )}
                </div>

                {/* Edit Button for Analyst/Admin */}
                <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                  {canEdit ? (
                    <button
                      onClick={() => handleOpenEdit(art)}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: "0.7rem", padding: "0.2rem 0.5rem" }}
                    >
                      <Edit3 size={12} />
                      <span>Edit Tag</span>
                    </button>
                  ) : (
                    <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.2rem" }}>
                      <Lock size={10} /> Analyst to edit
                    </span>
                  )}
                  <a
                    href={art.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "var(--text-muted)", display: "flex", alignItems: "center" }}
                    title="Open Source Article"
                  >
                    <ExternalLink size={13} />
                  </a>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Analyst Recategorization Modal */}
      {editingArticle && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.75)",
          backdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 100,
          padding: "1rem"
        }}>
          <div className="card" style={{ maxWidth: "520px", width: "100%", background: "var(--bg-secondary)", border: "1px solid var(--border-glow)" }}>
            <div className="card-header">
              <div className="card-title">
                <Edit3 size={16} color="var(--ai-purple)" />
                <span>Analyst Tag Correction (Human-in-the-Loop)</span>
              </div>
              <button
                onClick={() => setEditingArticle(null)}
                style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "1.2rem" }}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "1rem", lineHeight: "1.4" }}>
              <strong style={{ color: "#fff" }}>Article:</strong> {editingArticle.headline}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", fontSize: "0.82rem" }}>
              <div>
                <label style={{ display: "block", color: "var(--text-muted)", marginBottom: "0.25rem" }}>Target Company</label>
                <select
                  value={selectedCompId}
                  onChange={(e) => setSelectedCompId(e.target.value)}
                  className="select"
                  style={{ width: "100%" }}
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.symbol} — {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", color: "var(--text-muted)", marginBottom: "0.25rem" }}>Action</label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value)}
                  className="select"
                  style={{ width: "100%" }}
                >
                  <option value="UPDATE_CONFIDENCE">Update Confidence Score</option>
                  <option value="ADD">Add New Company Tag</option>
                  <option value="REMOVE">Remove Company Tag</option>
                </select>
              </div>

              {actionType !== "REMOVE" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                    <label style={{ color: "var(--text-muted)" }}>Confidence Score</label>
                    <span className="font-mono" style={{ color: "var(--ai-purple)", fontWeight: "600" }}>
                      {(confidenceScore * 100).toFixed(0)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.10"
                    max="1.00"
                    step="0.05"
                    value={confidenceScore}
                    onChange={(e) => setConfidenceScore(parseFloat(e.target.value))}
                    style={{ width: "100%" }}
                  />
                </div>
              )}

              <div>
                <label style={{ display: "block", color: "var(--text-muted)", marginBottom: "0.25rem" }}>Analyst Retraining Notes</label>
                <input
                  type="text"
                  placeholder="e.g. False positive due to general sector mention..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="input"
                  style={{ width: "100%" }}
                />
              </div>

              {statusMsg && (
                <div style={{
                  padding: "0.5rem",
                  borderRadius: "6px",
                  fontSize: "0.78rem",
                  background: statusMsg.startsWith("Error") ? "var(--bear-red-bg)" : "var(--bull-green-bg)",
                  color: statusMsg.startsWith("Error") ? "var(--bear-red)" : "var(--bull-green)",
                }}>
                  {statusMsg}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
                <button
                  onClick={() => setEditingArticle(null)}
                  className="btn btn-secondary"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCorrection}
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? "Saving Audit Log..." : "Confirm Correction"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
