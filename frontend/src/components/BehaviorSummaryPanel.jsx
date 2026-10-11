import React from "react";
import { 
  Compass, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  FileText, 
  Cpu, 
  Scale 
} from "lucide-react";

export const BehaviorSummaryPanel = ({ behaviorData }) => {
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
    news_movement_checks,
    written_findings,
    predicted_next_day_direction
  } = behaviorData;

  const isVwapBullish = vwap_delta_pct >= 0;
  const isPressureBullish = buy_sell_pressure_index >= 50;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* KPI Cards Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
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
              vs VWAP रू {latest_vwap.toFixed(1)}
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
            <div className="card-header">
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

      {/* Section 3 Written Findings Card */}
      <div className="card" style={{ background: "var(--bg-card)" }}>
        <div className="card-header">
          <div className="card-title">
            <FileText size={18} color="var(--blue-accent)" />
            <span>Section 3: Empirical Behavior Findings &amp; Pattern Synthesis</span>
          </div>
          <span className="badge badge-ai">Automated AI Synthesis</span>
        </div>
        <div style={{
          fontSize: "0.86rem",
          lineHeight: "1.65",
          color: "var(--text-primary)",
          whiteSpace: "pre-line",
          background: "var(--bg-input)",
          padding: "1rem",
          borderRadius: "8px",
          border: "1px solid var(--border-color)"
        }}>
          {written_findings}
        </div>
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
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", textAlign: "left" }}>
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
