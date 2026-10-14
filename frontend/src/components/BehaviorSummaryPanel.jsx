import React, { useState, useMemo } from "react";
import { 
  Compass, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  FileText, 
  Cpu, 
  Scale,
  Download,
  RefreshCw,
  Activity,
  Newspaper,
  Check,
  Copy,
  Sparkles
} from "lucide-react";

export const BehaviorSummaryPanel = ({ 
  behaviorData, 
  onOpenExport, 
  onRefresh, 
  isRefreshing, 
  lastSyncedTime 
}) => {
  const [viewMode, setViewMode] = useState("structured"); // "structured" | "raw"
  const [copied, setCopied] = useState(false);

  if (!behaviorData) return null;

  const {
    symbol,
    latest_close,
    latest_vwap,
    vwap_delta_pct,
    vwap_signal,
    buy_sell_pressure_index,
    pressure_signal,
    anomaly_count_30d,
    broker_breakdown,
    news_movement_checks,
    written_findings,
    predicted_next_day_direction
  } = behaviorData;

  const isVwapBullish = vwap_delta_pct >= 0;
  const isPressureBullish = buy_sell_pressure_index >= 50;

  // Dynamically parse Section 3 findings into structured pillars
  const findingsParsed = useMemo(() => {
    if (!written_findings) return null;
    const lines = written_findings.split("\n").filter(l => l.trim().length > 0);
    const header = lines.find(l => l.startsWith("Empirical Behavior Analysis")) || `Empirical Behavior Analysis for ${symbol}:`;
    
    const rawNews = lines.find(l => l.startsWith("1. News vs Next-Day Movement:")) || "";
    const rawAnomaly = lines.find(l => l.startsWith("2. Volume Anomaly & Floorsheet Dynamics:")) || "";
    const rawVwap = lines.find(l => l.startsWith("3. VWAP Accumulation Status:")) || "";

    const newsText = rawNews.replace(/^1\.\s*News vs Next-Day Movement:\s*/, "");
    const anomalyText = rawAnomaly.replace(/^2\.\s*Volume Anomaly & Floorsheet Dynamics:\s*/, "");
    const vwapText = rawVwap.replace(/^3\.\s*VWAP Accumulation Status:\s*/, "");

    return { header, rawNews, rawAnomaly, rawVwap, newsText, anomalyText, vwapText };
  }, [written_findings, symbol]);

  const handleCopyFindings = () => {
    if (written_findings) {
      navigator.clipboard.writeText(written_findings);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const topBuyer = broker_breakdown?.top_buyers?.[0];
  const topSeller = broker_breakdown?.top_sellers?.[0];
  const trackedNewsCount = news_movement_checks?.length || 0;
  const upEvents = news_movement_checks?.filter(c => c.direction === "UP").length || 0;
  const downEvents = news_movement_checks?.filter(c => c.direction === "DOWN").length || 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* KPI Cards Row */}
      <div className="kpi-cards-grid">
        {/* VWAP vs Close Card */}
        <div className="card">
          <div className="card-header">
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <Scale size={14} color="var(--vwap-cyan)" />
              VWAP SPREAD
            </span>
            <span className={`badge ${isVwapBullish ? "badge-bull" : "badge-bear"}`}>
              {vwap_signal.replace("_", " ")}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.6rem" }}>
            <span className="font-mono" style={{ fontSize: "1.5rem", fontWeight: "700" }}>
              {vwap_delta_pct > 0 ? `+${vwap_delta_pct}%` : `${vwap_delta_pct}%`}
            </span>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              vs VWAP रू {latest_vwap ? latest_vwap.toFixed(1) : "0.0"}
            </span>
          </div>
          <div style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
            {isVwapBullish
              ? "Close above VWAP: Buyers paying premium over average intraday cost (Accumulation)."
              : "Close below VWAP: Price executing below average volume price (Distribution)."}
          </div>
        </div>

        {/* Buy/Sell Pressure Index */}
        <div className="card">
          <div className="card-header">
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <Compass size={14} color="var(--blue-accent)" />
              BUY/SELL PRESSURE
            </span>
            <span className={`badge ${isPressureBullish ? "badge-bull" : "badge-bear"}`}>
              {pressure_signal.replace("_", " ")}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
            <span className="font-mono" style={{ fontSize: "1.5rem", fontWeight: "700", color: isPressureBullish ? "var(--bull-green)" : "var(--bear-red)" }}>
              {buy_sell_pressure_index.toFixed(1)}
            </span>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>/ 100</span>
          </div>
          {/* Visual Meter Bar */}
          <div style={{
            height: "6px",
            background: "var(--bg-input)",
            borderRadius: "3px",
            marginTop: "0.6rem",
            overflow: "hidden",
            position: "relative"
          }}>
            <div style={{
              width: `${Math.min(100, Math.max(0, buy_sell_pressure_index))}%`,
              height: "100%",
              background: isPressureBullish
                ? "linear-gradient(90deg, #3b82f6, #10b981)"
                : "linear-gradient(90deg, #ef4444, #f59e0b)",
              borderRadius: "3px",
              transition: "width 0.4s ease"
            }} />
          </div>
        </div>

        {/* 20-Day Volume Anomaly Counter */}
        <div className="card">
          <div className="card-header">
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <AlertCircle size={14} color="var(--anomaly-amber)" />
              VOLUME ANOMALIES
            </span>
            <span className="badge badge-anomaly">
              Z &gt; 2.0 SIGMA
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
            <span className="font-mono" style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--anomaly-amber)" }}>
              {anomaly_count_30d}
            </span>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Spikes detected (30D)
            </span>
          </div>
          <div style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
            Rolling 20-day standard deviation threshold exceeded with statistical significance.
          </div>
        </div>

        {/* Bonus ML Next-Day Direction Predictor */}
        {predicted_next_day_direction && (
          <div className="card" style={{ border: "1px solid rgba(139, 92, 246, 0.3)" }}>
            <div className="card-header" style={{ flexWrap: "wrap", gap: "0.35rem" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--ai-purple)", display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: "600" }}>
                <Cpu size={14} color="var(--ai-purple)" />
                AI DIRECTION MODEL (T+1)
              </span>
              <span className={`badge ${predicted_next_day_direction.prediction === "UP" ? "badge-bull" : "badge-bear"}`}>
                {predicted_next_day_direction.prediction === "UP" ? "PREDICTED UP" : "PREDICTED DOWN"}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
              <span className="font-mono" style={{ fontSize: "1.5rem", fontWeight: "700" }}>
                {(predicted_next_day_direction.confidence * 100).toFixed(0)}%
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Model Confidence
              </span>
            </div>
            <div style={{ marginTop: "0.5rem", fontSize: "0.72rem", color: "var(--text-secondary)" }}>
              Features: Ret 3D ({predicted_next_day_direction.features_used.return_3d}), Vol Ratio ({predicted_next_day_direction.features_used.vol_ratio_20d}x).
            </div>
          </div>
        )}
      </div>

      {/* Section 3 Written Findings Card - Dynamic Institutional Synthesis */}
      <div className="card" style={{ background: "var(--bg-card)", position: "relative" }}>
        <div className="card-header" style={{ flexWrap: "wrap", gap: "0.75rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.85rem" }}>
          <div className="card-title">
            <FileText size={18} color="var(--blue-accent)" />
            <span>Section 3: Empirical Behavior Findings &amp; Pattern Synthesis</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            {/* Live Indicator */}
            <span className="badge badge-ai" style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
              <Sparkles size={11} />
              <span>Live Quantitative Synthesis</span>
            </span>

            {/* Quick Live Re-synthesis Button */}
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: "0.73rem", padding: "0.25rem 0.6rem", gap: "0.35rem" }}
                title="Re-synthesize narrative with latest live market tick"
              >
                <RefreshCw size={12} className={isRefreshing ? "spin-fast" : ""} color="var(--vwap-cyan)" />
                <span>{isRefreshing ? "Syncing..." : "Re-Synthesize"}</span>
              </button>
            )}

            {/* View Mode Toggle: Structured vs Raw */}
            <div style={{
              display: "inline-flex",
              background: "var(--bg-input)",
              borderRadius: "6px",
              border: "1px solid var(--border-color)",
              padding: "2px"
            }}>
              <button
                type="button"
                onClick={() => setViewMode("structured")}
                style={{
                  background: viewMode === "structured" ? "var(--bg-card)" : "transparent",
                  color: viewMode === "structured" ? "var(--blue-accent)" : "var(--text-muted)",
                  border: "none",
                  padding: "0.2rem 0.5rem",
                  fontSize: "0.72rem",
                  fontWeight: viewMode === "structured" ? "700" : "500",
                  borderRadius: "4px",
                  cursor: "pointer"
                }}
              >
                Structured
              </button>
              <button
                type="button"
                onClick={() => setViewMode("raw")}
                style={{
                  background: viewMode === "raw" ? "var(--bg-card)" : "transparent",
                  color: viewMode === "raw" ? "var(--blue-accent)" : "var(--text-muted)",
                  border: "none",
                  padding: "0.2rem 0.5rem",
                  fontSize: "0.72rem",
                  fontWeight: viewMode === "raw" ? "700" : "500",
                  borderRadius: "4px",
                  cursor: "pointer"
                }}
              >
                Raw Narrative
              </button>
            </div>

            {/* Export Report Action */}
            {onOpenExport && (
              <button
                onClick={onOpenExport}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: "0.73rem", padding: "0.25rem 0.6rem" }}
                title="Export Institutional Market Report"
              >
                <Download size={12} />
                <span>Export</span>
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Metric Ribbon */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "0.5rem",
          margin: "0.85rem 0 1rem",
          padding: "0.6rem 0.85rem",
          background: "var(--bg-input)",
          borderRadius: "8px",
          border: "1px solid var(--border-color)",
          fontSize: "0.75rem"
        }}>
          <div>
            <span style={{ color: "var(--text-muted)", display: "block", fontSize: "0.68rem" }}>T+1 EVENT DRIFT</span>
            <strong style={{ color: upEvents >= downEvents ? "var(--bull-green)" : "var(--bear-red)" }}>
              {upEvents} Up / {downEvents} Down ({trackedNewsCount} total)
            </strong>
          </div>
          <div>
            <span style={{ color: "var(--text-muted)", display: "block", fontSize: "0.68rem" }}>30D VOLUME ANOMALIES</span>
            <strong style={{ color: anomaly_count_30d > 0 ? "var(--anomaly-amber)" : "var(--bull-green)" }}>
              {anomaly_count_30d} session(s) &gt; 2.0σ
            </strong>
          </div>
          <div>
            <span style={{ color: "var(--text-muted)", display: "block", fontSize: "0.68rem" }}>TOP ACCUMULATOR</span>
            <strong style={{ color: "var(--vwap-cyan)" }}>
              {topBuyer?.broker || "Institutional Desk"} {topBuyer?.net_quantity ? `(${topBuyer.net_quantity > 0 ? "+" : ""}${topBuyer.net_quantity.toLocaleString()} sh)` : ""}
            </strong>
          </div>
          <div>
            <span style={{ color: "var(--text-muted)", display: "block", fontSize: "0.68rem" }}>VWAP BIAS</span>
            <strong style={{ color: isVwapBullish ? "var(--bull-green)" : "var(--bear-red)" }}>
              {vwap_delta_pct > 0 ? `+${vwap_delta_pct}%` : `${vwap_delta_pct}%`} ({vwap_signal.replace("_", " ")})
            </strong>
          </div>
        </div>

        {/* Main Content Area */}
        {viewMode === "structured" && findingsParsed ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {/* Pillar 1: News Drift */}
            <div style={{
              background: "var(--bg-input)",
              border: "1px solid var(--border-color)",
              borderLeft: "4px solid var(--blue-accent)",
              borderRadius: "8px",
              padding: "0.85rem 1rem"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.35rem" }}>
                <Newspaper size={15} color="var(--blue-accent)" />
                <span style={{ fontWeight: "700", fontSize: "0.82rem", color: "var(--blue-accent)" }}>
                  Pillar 1: Corporate News vs. Next-Day (T+1) Drift
                </span>
              </div>
              <p style={{ fontSize: "0.85rem", lineHeight: "1.6", color: "var(--text-primary)", margin: 0 }}>
                {findingsParsed.newsText || findingsParsed.rawNews}
              </p>
            </div>

            {/* Pillar 2: Volume Anomaly & Floorsheet */}
            <div style={{
              background: "var(--bg-input)",
              border: "1px solid var(--border-color)",
              borderLeft: `4px solid ${anomaly_count_30d > 0 ? "var(--anomaly-amber)" : "var(--bull-green)"}`,
              borderRadius: "8px",
              padding: "0.85rem 1rem"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.35rem" }}>
                <Activity size={15} color={anomaly_count_30d > 0 ? "var(--anomaly-amber)" : "var(--bull-green)"} />
                <span style={{ fontWeight: "700", fontSize: "0.82rem", color: anomaly_count_30d > 0 ? "var(--anomaly-amber)" : "var(--bull-green)" }}>
                  Pillar 2: Volume Anomaly Detection (Z &gt; 2.0) &amp; Floorsheet Dynamics
                </span>
              </div>
              <p style={{ fontSize: "0.85rem", lineHeight: "1.6", color: "var(--text-primary)", margin: 0 }}>
                {findingsParsed.anomalyText || findingsParsed.rawAnomaly}
              </p>
            </div>

            {/* Pillar 3: VWAP Accumulation */}
            <div style={{
              background: "var(--bg-input)",
              border: "1px solid var(--border-color)",
              borderLeft: `4px solid ${isVwapBullish ? "var(--bull-green)" : "var(--bear-red)"}`,
              borderRadius: "8px",
              padding: "0.85rem 1rem"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.35rem" }}>
                <Scale size={15} color={isVwapBullish ? "var(--bull-green)" : "var(--bear-red)"} />
                <span style={{ fontWeight: "700", fontSize: "0.82rem", color: isVwapBullish ? "var(--bull-green)" : "var(--bear-red)" }}>
                  Pillar 3: Intraday VWAP Accumulation vs. Distribution Status
                </span>
              </div>
              <p style={{ fontSize: "0.85rem", lineHeight: "1.6", color: "var(--text-primary)", margin: 0 }}>
                {findingsParsed.vwapText || findingsParsed.rawVwap}
              </p>
            </div>
          </div>
        ) : (
          /* Raw Institutional Synthesis View */
          <div style={{ position: "relative" }}>
            <div style={{
              fontSize: "0.85rem",
              lineHeight: "1.65",
              color: "var(--text-primary)",
              whiteSpace: "pre-line",
              background: "var(--bg-input)",
              padding: "1rem",
              borderRadius: "8px",
              border: "1px solid var(--border-color)",
              fontFamily: "var(--font-mono, monospace)"
            }}>
              {written_findings}
            </div>
            <button
              onClick={handleCopyFindings}
              className="btn btn-secondary btn-sm"
              style={{
                position: "absolute",
                top: "0.6rem",
                right: "0.6rem",
                fontSize: "0.7rem",
                padding: "0.25rem 0.5rem"
              }}
              title="Copy narrative to clipboard"
            >
              {copied ? <Check size={12} color="var(--bull-green)" /> : <Copy size={12} />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
          </div>
        )}
      </div>

      {/* News vs Next-Day Movement Table */}
      {news_movement_checks && news_movement_checks.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <TrendingUp size={18} color="var(--bull-green)" />
              <span>Event Study: News Release vs. Next-Day (T+1) Market Drift</span>
            </div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              {news_movement_checks.length} Verified Events
            </span>
          </div>

          <div className="table-swipe-hint">
            <span>👈 Swipe table horizontally to inspect all metrics</span>
          </div>
          <div className="table-scroll-container">
            <table style={{ width: "100%", minWidth: "600px", borderCollapse: "collapse", fontSize: "0.8rem", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-color)", color: "var(--text-muted)" }}>
                  <th style={{ padding: "0.6rem" }}>News Date</th>
                  <th style={{ padding: "0.6rem" }}>Headline</th>
                  <th style={{ padding: "0.6rem" }}>Source</th>
                  <th style={{ padding: "0.6rem" }}>T+1 Date</th>
                  <th style={{ padding: "0.6rem" }}>Price Reaction</th>
                  <th style={{ padding: "0.6rem" }}>Volume Delta</th>
                </tr>
              </thead>
              <tbody>
                {news_movement_checks.slice(0, 5).map((chk, idx) => {
                  const isUp = chk.direction === "UP";
                  const isDown = chk.direction === "DOWN";
                  return (
                    <tr key={idx} style={{ borderBottom: "1px solid var(--border-color)" }}>
                      <td className="font-mono" style={{ padding: "0.6rem", color: "var(--text-muted)" }}>{chk.news_date}</td>
                      <td style={{ padding: "0.6rem", maxWidth: "320px", fontWeight: "500" }}>{chk.headline}</td>
                      <td style={{ padding: "0.6rem" }}>
                        <span style={{ fontSize: "0.7rem", color: "var(--vwap-cyan)" }}>{chk.source_portal}</span>
                      </td>
                      <td className="font-mono" style={{ padding: "0.6rem", color: "var(--text-muted)" }}>{chk.next_day_date}</td>
                      <td style={{ padding: "0.6rem" }}>
                        <span
                          className={`badge ${isUp ? "badge-bull" : isDown ? "badge-bear" : "badge-secondary"}`}
                          style={{ fontSize: "0.75rem" }}
                        >
                          {chk.next_day_price_change_pct > 0 ? `+${chk.next_day_price_change_pct}%` : `${chk.next_day_price_change_pct}%`}
                        </span>
                      </td>
                      <td className="font-mono" style={{ padding: "0.6rem", color: chk.next_day_volume_change_pct > 0 ? "var(--bull-green)" : "var(--text-muted)" }}>
                        {chk.next_day_volume_change_pct > 0 ? `+${chk.next_day_volume_change_pct}%` : `${chk.next_day_volume_change_pct}%`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
