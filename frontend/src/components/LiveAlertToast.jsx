import React, { useState, useEffect } from "react";
import { AlertTriangle, Bell, CheckCircle2, X, Clock } from "lucide-react";

const ToastItem = ({ alert, onDismiss, duration = 5 }) => {
  const [secondsLeft, setSecondsLeft] = useState(duration);
  const [isPaused, setIsPaused] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (isPaused || isExiting) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          triggerExit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPaused, isExiting]);

  const triggerExit = () => {
    if (isExiting) return;
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(alert.id);
    }, 320);
  };

  const isAnomaly = alert.type === "VOLUME_ANOMALY";
  const isCrawl = alert.type === "CRAWL_COMPLETED";
  const isRetag = alert.type === "ARTICLE_RECATEGORIZED";

  const accentColor = isAnomaly
    ? "var(--anomaly-amber)"
    : isCrawl
    ? "var(--bull-green)"
    : isRetag
    ? "var(--ai-purple)"
    : "var(--blue-accent)";

  const progressPercent = Math.max(0, (secondsLeft / duration) * 100);

  return (
    <div
      className={`toast-item-card ${isExiting ? "toast-exit" : "toast-enter"}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      style={{
        borderLeft: `4px solid ${accentColor}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.65rem", width: "100%" }}>
        {/* Status Icon */}
        <div style={{ marginTop: "2px", flexShrink: 0 }}>
          {isAnomaly ? (
            <AlertTriangle size={18} color="var(--anomaly-amber)" />
          ) : isCrawl ? (
            <CheckCircle2 size={18} color="var(--bull-green)" />
          ) : isRetag ? (
            <Bell size={18} color="var(--ai-purple)" />
          ) : (
            <Bell size={18} color="var(--blue-accent)" />
          )}
        </div>

        {/* Content Body */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
            <span style={{ fontWeight: "600", color: "var(--text-primary)", fontSize: "0.82rem" }}>
              {alert.title || "Live Telemetry Event"}
            </span>
          </div>

          <p style={{ color: "var(--text-secondary)", fontSize: "0.78rem", lineHeight: "1.35", marginTop: "0.2rem" }}>
            {alert.message}
          </p>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "0.45rem" }}>
            <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
              {alert.time}
            </span>

            {/* Countdown Badge in Seconds */}
            <div
              className={`toast-timer-pill ${isPaused ? "paused" : ""}`}
              title={isPaused ? "Timer paused while hovering" : "Auto-dismiss countdown in seconds"}
            >
              <Clock size={10} />
              <span>{isPaused ? `${secondsLeft}s (Paused)` : `${secondsLeft}s`}</span>
            </div>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={triggerExit}
          className="toast-close-btn"
          title="Dismiss now"
          aria-label="Dismiss alert"
        >
          <X size={14} />
        </button>
      </div>

      {/* Animated Countdown Progress Bar */}
      <div className="toast-progress-track">
        <div
          className="toast-progress-fill"
          style={{
            width: `${progressPercent}%`,
            background: accentColor,
            transition: isPaused ? "none" : "width 1s linear"
          }}
        />
      </div>
    </div>
  );
};

export const LiveAlertToast = ({ alerts, onDismiss }) => {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div className="toast-container" aria-live="polite">
      {alerts.map((alert) => (
        <ToastItem key={alert.id} alert={alert} onDismiss={onDismiss} duration={5} />
      ))}
    </div>
  );
};
