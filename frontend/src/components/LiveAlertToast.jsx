import React from "react";
import { AlertTriangle, Bell, CheckCircle2, X } from "lucide-react";

export const LiveAlertToast = ({ alerts, onDismiss }) => {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div style={{
      position: "fixed",
      bottom: "1.5rem",
      right: "1.5rem",
      zIndex: 1000,
      display: "flex",
      flexDirection: "column",
      gap: "0.5rem",
      maxWidth: "380px",
      width: "100%"
    }}>
      {alerts.map((alert) => {
        const isAnomaly = alert.type === "VOLUME_ANOMALY";
        const isCrawl = alert.type === "CRAWL_COMPLETED";
        return (
          <div
            key={alert.id}
            style={{
              background: "var(--bg-secondary)",
              border: `1px solid ${isAnomaly ? "var(--anomaly-amber)" : "var(--blue-accent)"}`,
              boxShadow: "0 8px 30px rgba(0, 0, 0, 0.6)",
              borderRadius: "10px",
              padding: "0.75rem 1rem",
              display: "flex",
              alignItems: "flex-start",
              gap: "0.6rem",
              animation: "slideIn 0.3s ease",
              position: "relative"
            }}
          >
            <div style={{ marginTop: "2px" }}>
              {isAnomaly ? (
                <AlertTriangle size={18} color="var(--anomaly-amber)" />
              ) : isCrawl ? (
                <CheckCircle2 size={18} color="var(--bull-green)" />
              ) : (
                <Bell size={18} color="var(--ai-purple)" />
              )}
            </div>
            <div style={{ flex: 1, fontSize: "0.8rem" }}>
              <div style={{ fontWeight: "600", color: "#fff", marginBottom: "0.15rem" }}>
                {alert.title || "Live Telemetry Event"}
              </div>
              <div style={{ color: "var(--text-secondary)", lineHeight: "1.3" }}>
                {alert.message}
              </div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>
                {alert.time}
              </div>
            </div>
            <button
              onClick={() => onDismiss(alert.id)}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                padding: "2px"
              }}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
