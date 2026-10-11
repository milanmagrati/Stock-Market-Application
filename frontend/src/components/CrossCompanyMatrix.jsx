import React from "react";
import { 
  Flame, 
  TrendingUp, 
  Newspaper, 
  ArrowUpRight, 
  ArrowDownRight, 
  Layers, 
  ExternalLink 
} from "lucide-react";

export const CrossCompanyMatrix = ({ comparisonData, onSelectCompany, companies }) => {
  if (!comparisonData || !comparisonData.all_companies) {
    return (
      <div className="card" style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
        Loading market matrix telemetry...
      </div>
    );
  }

  const { most_volatile, most_active, most_in_the_news, all_companies } = comparisonData;

  const handleRowClick = (item) => {
    const matched = companies.find((c) => c.id === item.company_id);
    if (matched && onSelectCompany) {
      onSelectCompany(matched);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* 3 Top Leaderboard Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
        {/* Most Volatile */}
        <div className="card" style={{ borderLeft: "4px solid var(--anomaly-amber)" }}>
          <div className="card-header">
            <div className="card-title">
              <Flame size={18} color="var(--anomaly-amber)" />
              <span>MOST VOLATILE (30-DAY σ)</span>
            </div>
            <span className="badge badge-anomaly">High Beta</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {most_volatile.map((c, i) => (
              <div
                key={c.company_id}
                onClick={() => handleRowClick(c)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.4rem 0.6rem",
                  background: "var(--bg-input)",
                  borderRadius: "6px",
                  cursor: "pointer"
                }}
              >
                <div>
                  <strong style={{ color: "var(--text-primary)" }}>#{i + 1} {c.symbol}</strong>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginLeft: "0.5rem" }}>{c.sector}</span>
                </div>
                <div className="font-mono" style={{ color: "var(--anomaly-amber)", fontWeight: "700", fontSize: "0.85rem" }}>
                  {c.volatility_pct}% σ
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Most Active */}
        <div className="card" style={{ borderLeft: "4px solid var(--bull-green)" }}>
          <div className="card-header">
            <div className="card-title">
              <TrendingUp size={18} color="var(--bull-green)" />
              <span>MOST ACTIVE (TURNOVER)</span>
            </div>
            <span className="badge badge-bull">Institutional Flow</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {most_active.map((c, i) => (
              <div
                key={c.company_id}
                onClick={() => handleRowClick(c)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.4rem 0.6rem",
                  background: "var(--bg-input)",
                  borderRadius: "6px",
                  cursor: "pointer"
                }}
              >
                <div>
                  <strong style={{ color: "var(--text-primary)" }}>#{i + 1} {c.symbol}</strong>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginLeft: "0.5rem" }}>
                    {c.anomaly_count} Anomalies
                  </span>
                </div>
                <div className="font-mono" style={{ color: "var(--bull-green)", fontWeight: "700", fontSize: "0.85rem" }}>
                  रू {(c.total_turnover / 10000000).toFixed(2)} Cr
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Most In-The-News */}
        <div className="card" style={{ borderLeft: "4px solid var(--ai-purple)" }}>
          <div className="card-header">
            <div className="card-title">
              <Newspaper size={18} color="var(--ai-purple)" />
              <span>MOST IN-THE-NEWS (MEDIA SENTIMENT)</span>
            </div>
            <span className="badge badge-ai">High Attention</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {most_in_the_news.map((c, i) => (
              <div
                key={c.company_id}
                onClick={() => handleRowClick(c)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.4rem 0.6rem",
                  background: "var(--bg-input)",
                  borderRadius: "6px",
                  cursor: "pointer"
                }}
              >
                <div>
                  <strong style={{ color: "var(--text-primary)" }}>#{i + 1} {c.symbol}</strong>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginLeft: "0.5rem" }}>{c.name.slice(0, 16)}...</span>
                </div>
                <div className="font-mono" style={{ color: "var(--ai-purple)", fontWeight: "700", fontSize: "0.85rem" }}>
                  {c.news_count} Articles
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Full Cross-Company Comparative Table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Layers size={18} color="var(--blue-accent)" />
            <span>Complete Cross-Company Intelligence Matrix ({all_companies.length} Companies)</span>
          </div>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Click any row to open in-depth company view
          </span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-color)", color: "var(--text-muted)" }}>
                <th style={{ padding: "0.75rem" }}>Symbol</th>
                <th style={{ padding: "0.75rem" }}>Company Name</th>
                <th style={{ padding: "0.75rem" }}>Sector</th>
                <th style={{ padding: "0.75rem" }}>Latest Close</th>
                <th style={{ padding: "0.75rem" }}>30D Return</th>
                <th style={{ padding: "0.75rem" }}>Volatility (σ)</th>
                <th style={{ padding: "0.75rem" }}>30D Turnover</th>
                <th style={{ padding: "0.75rem" }}>Volume Anomalies</th>
                <th style={{ padding: "0.75rem" }}>News Count</th>
                <th style={{ padding: "0.75rem" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {all_companies.map((row) => {
                const isPositive = row.month_change_pct >= 0;
                return (
                  <tr
                    key={row.company_id}
                    onClick={() => handleRowClick(row)}
                    style={{
                      borderBottom: "1px solid var(--border-color)",
                      cursor: "pointer",
                      transition: "background 0.15s ease"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-input)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    <td style={{ padding: "0.75rem", fontWeight: "700", color: "#fff" }}>
                      {row.symbol}
                    </td>
                    <td style={{ padding: "0.75rem", color: "var(--text-secondary)" }}>
                      {row.name}
                    </td>
                    <td style={{ padding: "0.75rem" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{row.sector}</span>
                    </td>
                    <td className="font-mono" style={{ padding: "0.75rem", fontWeight: "600" }}>
                      रू {row.latest_close.toFixed(1)}
                    </td>
                    <td style={{ padding: "0.75rem" }}>
                      <span
                        className={`badge ${isPositive ? "badge-bull" : "badge-bear"}`}
                        style={{ fontSize: "0.75rem" }}
                      >
                        {isPositive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                        {Math.abs(row.month_change_pct)}%
                      </span>
                    </td>
                    <td className="font-mono" style={{ padding: "0.75rem", color: "var(--anomaly-amber)" }}>
                      {row.volatility_pct}%
                    </td>
                    <td className="font-mono" style={{ padding: "0.75rem", color: "var(--text-secondary)" }}>
                      रू {(row.total_turnover / 10000000).toFixed(2)} Cr
                    </td>
                    <td className="font-mono" style={{ padding: "0.75rem" }}>
                      <span className={row.anomaly_count > 0 ? "badge badge-anomaly" : ""} style={{ fontSize: "0.75rem" }}>
                        {row.anomaly_count}
                      </span>
                    </td>
                    <td className="font-mono" style={{ padding: "0.75rem", color: "var(--ai-purple)", fontWeight: "600" }}>
                      {row.news_count}
                    </td>
                    <td style={{ padding: "0.75rem" }}>
                      <button className="btn btn-secondary btn-sm" style={{ fontSize: "0.72rem" }}>
                        <span>Analyze</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
