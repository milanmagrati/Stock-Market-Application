import React from "react";
import { ArrowUpRight, ArrowDownRight, TrendingUp } from "lucide-react";

export const TickerBar = ({ companies, comparisonData, selectedCompany, onSelectCompany }) => {
  if (!companies || companies.length === 0) return null;

  const compMap = {};
  if (comparisonData && comparisonData.all_companies) {
    comparisonData.all_companies.forEach((item) => {
      compMap[item.company_id] = item;
    });
  }

  return (
    <div style={{
      background: "var(--bg-secondary)",
      borderBottom: "1px solid var(--border-color)",
      overflowX: "auto",
      whiteSpace: "nowrap",
      padding: "0.45rem 0.85rem",
      display: "flex",
      gap: "0.6rem",
      alignItems: "center",
      WebkitOverflowScrolling: "touch",
      scrollbarWidth: "none",
      msOverflowStyle: "none"
    }}>
      <div style={{
        fontSize: "0.68rem",
        fontWeight: "700",
        color: "var(--text-muted)",
        letterSpacing: "0.06em",
        paddingRight: "0.5rem",
        borderRight: "1px solid var(--border-color)",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: "0.3rem"
      }}>
        <TrendingUp size={12} color="var(--blue-accent)" />
        <span>WATCHLIST ({companies.length})</span>
      </div>

      {companies.map((c) => {
        const stats = compMap[c.id];
        const isSelected = selectedCompany?.id === c.id;
        const change = stats ? stats.month_change_pct : 0;
        const isPositive = change >= 0;

        return (
          <div
            key={c.id}
            onClick={() => onSelectCompany(c)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.45rem",
              padding: "0.28rem 0.6rem",
              borderRadius: "7px",
              background: isSelected ? "rgba(59, 130, 246, 0.16)" : "var(--bg-card)",
              border: isSelected ? "1px solid var(--blue-accent)" : "1px solid var(--border-color)",
              cursor: "pointer",
              transition: "all 0.15s ease",
              fontSize: "0.78rem",
              flexShrink: 0,
              userSelect: "none"
            }}
          >
            <span style={{ fontWeight: "700", color: isSelected ? "#fff" : "var(--text-primary)" }}>
              {c.symbol}
            </span>
            {stats && (
              <>
                <span className="font-mono" style={{ color: "var(--text-secondary)", fontSize: "0.74rem" }}>
                  रू {stats.latest_close.toFixed(1)}
                </span>
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    fontSize: "0.72rem",
                    fontWeight: "600",
                    color: isPositive ? "var(--bull-green)" : "var(--bear-red)"
                  }}
                >
                  {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {Math.abs(change)}%
                </span>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};
