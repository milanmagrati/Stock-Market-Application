import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { 
  Download, 
  FileSpreadsheet, 
  FileCode, 
  ShieldAlert, 
  CheckCircle, 
  X, 
  RefreshCw, 
  Lock, 
  ArrowRight,
  FileText
} from "lucide-react";

export const ReportExportModal = ({ isOpen, onClose, companies, selectedCompany }) => {
  const { user, switchRole } = useAuth();
  const [format, setFormat] = useState("csv"); // "csv" or "json"
  const [scope, setScope] = useState("single"); // "single" or "all"
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState(null);
  const [exportSuccess, setExportSuccess] = useState(null);

  if (!isOpen) return null;

  const isViewer = user?.role === "Viewer";
  const isAnalystOrAdmin = user?.role === "Analyst" || user?.role === "Admin";

  const handleExport = async (forceAttempt = false) => {
    setIsExporting(true);
    setExportError(null);
    setExportSuccess(null);
    try {
      const companyId = scope === "single" ? (selectedCompany?.id || null) : null;
      const result = await api.exportReport(companyId, format);
      setExportSuccess(`Successfully downloaded: ${result.filename}`);
      setTimeout(() => {
        setIsExporting(false);
      }, 1000);
    } catch (err) {
      setExportError(err.message || "Export failed");
      setIsExporting(false);
    }
  };

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0, 0, 0, 0.75)",
      backdropFilter: "blur(5px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 110,
      padding: "1rem"
    }}>
      <div className="card" style={{ maxWidth: "540px", width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
        {/* Header */}
        <div className="card-header" style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "0.75rem", marginBottom: "1rem" }}>
          <div className="card-title">
            <Download size={18} color="var(--blue-accent)" />
            <span>Export Institutional Market Intelligence Report</span>
          </div>
          <button onClick={onClose} className="action-msg-close">
            <X size={16} />
          </button>
        </div>

        {/* Viewer RBAC Restriction Notice */}
        {isViewer ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{
              background: "rgba(245, 158, 11, 0.12)",
              border: "1px solid rgba(245, 158, 11, 0.35)",
              borderRadius: "10px",
              padding: "1rem",
              display: "flex",
              gap: "0.75rem",
              alignItems: "flex-start"
            }}>
              <ShieldAlert size={20} color="var(--anomaly-amber)" style={{ flexShrink: 0, marginTop: "2px" }} />
              <div style={{ fontSize: "0.82rem", lineHeight: "1.5" }}>
                <strong style={{ color: "var(--anomaly-amber)" }}>Server-Side RBAC Restriction:</strong>
                <div style={{ marginTop: "0.3rem", color: "var(--text-secondary)" }}>
                  As specified in the technical requirements, the <strong>Viewer</strong> role is granted <em>read-only</em> access to dashboards. Generating or exporting institutional data reports is role-gated to <strong>Analyst</strong> and <strong>Admin</strong>.
                </div>
              </div>
            </div>

            {exportError && (
              <div style={{
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.4)",
                padding: "0.75rem",
                borderRadius: "8px",
                fontSize: "0.78rem",
                color: "var(--bear-red)"
              }}>
                <strong>Server Response (HTTP 403 Forbidden):</strong>
                <div>{exportError}</div>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <button
                onClick={() => {
                  switchRole("Analyst");
                  setExportError(null);
                }}
                className="btn btn-primary"
                style={{ width: "100%", justifyContent: "center" }}
              >
                <span>Switch to Analyst Role &amp; Unlock Export</span>
                <ArrowRight size={14} />
              </button>

              <button
                onClick={() => handleExport(true)}
                disabled={isExporting}
                className="btn btn-secondary"
                style={{ width: "100%", justifyContent: "center", fontSize: "0.76rem" }}
              >
                <Lock size={13} />
                <span>Test Server 403 Enforcement (Call API as Viewer)</span>
              </button>
            </div>
          </div>
        ) : (
          /* Analyst / Admin Export Configuration */
          <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
            {/* Scope Selection */}
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>
                REPORT DATA SCOPE
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => setScope("single")}
                  className={`btn ${scope === "single" ? "btn-primary" : "btn-secondary"}`}
                  style={{ fontSize: "0.78rem", justifyContent: "center", textAlign: "center" }}
                >
                  <span>Selected Asset ({selectedCompany?.symbol || "NABIL"})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setScope("all")}
                  className={`btn ${scope === "all" ? "btn-primary" : "btn-secondary"}`}
                  style={{ fontSize: "0.78rem", justifyContent: "center", textAlign: "center" }}
                >
                  <span>All Tracked Equities ({companies.length})</span>
                </button>
              </div>
            </div>

            {/* Format Selection */}
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>
                OUTPUT FORMAT
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => setFormat("csv")}
                  className={`btn ${format === "csv" ? "btn-primary" : "btn-secondary"}`}
                  style={{ fontSize: "0.78rem", justifyContent: "center" }}
                >
                  <FileSpreadsheet size={15} />
                  <span>Tabular CSV Format</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormat("json")}
                  className={`btn ${format === "json" ? "btn-primary" : "btn-secondary"}`}
                  style={{ fontSize: "0.78rem", justifyContent: "center" }}
                >
                  <FileCode size={15} />
                  <span>Structured JSON Dossier</span>
                </button>
              </div>
            </div>

            {/* Contents Overview */}
            <div style={{
              background: "var(--bg-input)",
              borderRadius: "8px",
              padding: "0.75rem 0.85rem",
              border: "1px solid var(--border-color)",
              fontSize: "0.75rem",
              color: "var(--text-secondary)",
              lineHeight: "1.5"
            }}>
              <strong style={{ color: "var(--text-primary)", display: "block", marginBottom: "0.25rem" }}>
                Dataset Contents Included:
              </strong>
              • 30-Day Daily OHLCV Price &amp; Volume Telemetry<br />
              • Volume-Weighted Average Price (VWAP) &amp; Spread Spread Delta %<br />
              • Close Location Value (CLV) Buy/Sell Pressure Index (0–100)<br />
              • 20-Day Rolling Z-Score Volume Anomaly Detection ($Z &gt; 2.0\sigma$)<br />
              • Floorsheet Broker Accumulation/Distribution Rankings<br />
              • News Impact Event Study (Next-Day T+1 Price &amp; Volume Drift)<br />
              • Section 3 Written Empirical Findings Synthesis
            </div>

            {/* Status alerts */}
            {exportSuccess && (
              <div style={{
                background: "rgba(16, 185, 129, 0.15)",
                border: "1px solid rgba(16, 185, 129, 0.4)",
                padding: "0.6rem 0.8rem",
                borderRadius: "8px",
                fontSize: "0.78rem",
                color: "var(--bull-green)",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem"
              }}>
                <CheckCircle size={14} />
                <span>{exportSuccess}</span>
              </div>
            )}

            {exportError && (
              <div style={{
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.4)",
                padding: "0.6rem 0.8rem",
                borderRadius: "8px",
                fontSize: "0.78rem",
                color: "var(--bear-red)"
              }}>
                {exportError}
              </div>
            )}

            {/* Download Button */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
              <button type="button" onClick={onClose} className="btn btn-secondary">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleExport(false)}
                disabled={isExporting}
                className="btn btn-primary"
              >
                {isExporting ? (
                  <>
                    <RefreshCw size={14} className="spin-fast" />
                    <span>Compiling Report...</span>
                  </>
                ) : (
                  <>
                    <Download size={14} />
                    <span>Download {format.toUpperCase()} Report</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
