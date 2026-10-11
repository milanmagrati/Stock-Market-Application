import React from "react";
import { Users, ArrowUpRight, ArrowDownRight, Briefcase } from "lucide-react";

export const FloorsheetPanel = ({ brokerData }) => {
  if (!brokerData || !brokerData.top_buyers) {
    return (
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Users size={18} color="var(--blue-accent)" />
            <span>Floorsheet Broker Concentration</span>
          </div>
        </div>
        <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", padding: "1rem" }}>
          No floorsheet data available for selected day.
        </div>
      </div>
    );
  }

  const {
    date,
    top_buyers,
    top_sellers,
    total_transactions,
    total_volume,
    total_turnover
  } = brokerData;

  const maxBuyerQty = Math.max(...(top_buyers.map((b) => b.buy_quantity)), 1);
  const maxSellerQty = Math.max(...(top_sellers.map((s) => s.sell_quantity)), 1);

  return (
    <div className="card">
      {/* Header */}
      <div className="card-header">
        <div className="card-title">
          <Users size={18} color="var(--blue-accent)" />
          <span>Floorsheet Broker Accumulation vs. Distribution</span>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Snapshot Date: <strong style={{ color: "#fff" }}>{date || "Latest"}</strong>
          </span>
          <span className="badge badge-vwap">
            {total_transactions} Contracts
          </span>
        </div>
      </div>

      {/* Summary KPI row */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "0.75rem",
        marginBottom: "1.25rem",
        background: "var(--bg-input)",
        padding: "0.75rem",
        borderRadius: "8px",
        border: "1px solid var(--border-color)"
      }}>
        <div>
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>FLOORSHEET VOLUME</div>
          <div className="font-mono" style={{ fontSize: "1.1rem", fontWeight: "700" }}>
            {total_volume.toLocaleString()} shares
          </div>
        </div>
        <div>
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>FLOORSHEET TURNOVER</div>
          <div className="font-mono" style={{ fontSize: "1.1rem", fontWeight: "700", color: "var(--vwap-cyan)" }}>
            रू {total_turnover.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Two Columns: Buyers vs Sellers */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        {/* Top Accumulators (Buyers) */}
        <div>
          <div style={{
            fontSize: "0.78rem",
            fontWeight: "700",
            color: "var(--bull-green)",
            marginBottom: "0.6rem",
            display: "flex",
            alignItems: "center",
            gap: "0.3rem"
          }}>
            <ArrowUpRight size={15} />
            <span>TOP 5 ACCUMULATING BROKERS (BUY-SIDE)</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {top_buyers.map((b, idx) => {
              const pct = (b.buy_quantity / maxBuyerQty) * 100;
              return (
                <div key={idx} style={{ fontSize: "0.78rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.2rem" }}>
                    <span style={{ fontWeight: "600" }}>{b.broker}</span>
                    <span className="font-mono" style={{ color: "var(--bull-green)", fontWeight: "600" }}>
                      +{b.buy_quantity.toLocaleString()}
                    </span>
                  </div>
                  <div style={{
                    height: "5px",
                    background: "var(--bg-input)",
                    borderRadius: "3px",
                    overflow: "hidden"
                  }}>
                    <div style={{
                      width: `${pct}%`,
                      height: "100%",
                      background: "var(--bull-green)",
                      borderRadius: "3px"
                    }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                    <span>Net: {b.net_quantity > 0 ? `+${b.net_quantity}` : b.net_quantity}</span>
                    <span>रू {(b.total_amount / 100000).toFixed(2)} Lakhs</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Distributers (Sellers) */}
        <div>
          <div style={{
            fontSize: "0.78rem",
            fontWeight: "700",
            color: "var(--bear-red)",
            marginBottom: "0.6rem",
            display: "flex",
            alignItems: "center",
            gap: "0.3rem"
          }}>
            <ArrowDownRight size={15} />
            <span>TOP 5 DISTRIBUTING BROKERS (SELL-SIDE)</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {top_sellers.map((s, idx) => {
              const pct = (s.sell_quantity / maxSellerQty) * 100;
              return (
                <div key={idx} style={{ fontSize: "0.78rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.2rem" }}>
                    <span style={{ fontWeight: "600" }}>{s.broker}</span>
                    <span className="font-mono" style={{ color: "var(--bear-red)", fontWeight: "600" }}>
                      -{s.sell_quantity.toLocaleString()}
                    </span>
                  </div>
                  <div style={{
                    height: "5px",
                    background: "var(--bg-input)",
                    borderRadius: "3px",
                    overflow: "hidden"
                  }}>
                    <div style={{
                      width: `${pct}%`,
                      height: "100%",
                      background: "var(--bear-red)",
                      borderRadius: "3px"
                    }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                    <span>Net: {s.net_quantity}</span>
                    <span>रू {(s.total_amount / 100000).toFixed(2)} Lakhs</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
