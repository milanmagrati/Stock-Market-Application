import React from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

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
      padding: "0.5rem 1rem",
      display: "flex",
      gap: "0.75rem",
      alignItems: "center"
    }}>
      <div style={{
        fontSize: "0.7rem",
        fontWeight: "700",
        color: "var(--text-muted)",
        letterSpacing: "0.06em",
        paddingRight: "0.5rem",
        borderRight: "1px solid var(--border-color)"
      }}>
        WATCHLIST ({companies.length})
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
              gap: "0.5rem",
              padding: "0.3rem 0.65rem",
              borderRadius: "8px",
              background: isSelected ? "rgba(59, 130, 246, 0.15)" : "var(--bg-card)",
              border: isSelected ? "1px solid var(--blue-accent)" : "1px solid var(--border-color)",
              cursor: "pointer",
              transition: "all 0.15s ease",
              fontSize: "0.8rem"
            }}
          >
            <span style={{ fontWeight: "700", color: isSelected ? "#fff" : "var(--text-primary)" }}>
              {c.symbol}
            </span>
            {stats && (
              <>
                <span className="font-mono" style={{ color: "var(--text-secondary)" }}>
                  रू {stats.latest_close.toFixed(1)}
                </span>
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    fontSize: "0.75rem",
                    fontWeight: "600",
                    color: isPositive ? "var(--bull-green)" : "var(--bear-red)"
                  }}
                >
                  {isPositive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
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
