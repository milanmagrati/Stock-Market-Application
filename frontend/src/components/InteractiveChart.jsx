import React, { useState, useRef, useEffect } from "react";
import { Activity, Eye, Zap, AlertTriangle } from "lucide-react";

export const InteractiveChart = ({ prices, anomalies, symbol }) => {
  const containerRef = useRef(null);
  const [hoverIndex, setHoverIndex] = useState(null);
  const [showVwap, setShowVwap] = useState(true);
  const [showAnomalies, setShowAnomalies] = useState(true);

  if (!prices || prices.length === 0) {
    return (
      <div className="card" style={{ height: "420px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "var(--text-muted)" }}>Loading chart telemetry...</span>
      </div>
    );
  }

  // Create lookup for anomalies by date
  const anomalyDateSet = new Set(
    (anomalies || []).filter((a) => a.is_anomaly).map((a) => a.date)
  );

  // Layout metrics
  const width = 900;
  const height = 420;
  const padding = { top: 30, right: 70, bottom: 60, left: 15 };
  const priceHeight = height - padding.top - padding.bottom - 70; // top chart
  const volumeHeight = 60; // bottom volume chart
  const volumeTop = height - padding.bottom - volumeHeight;

  // Min and Max scales
  const minPrice = Math.min(...prices.map((p) => p.low)) * 0.985;
  const maxPrice = Math.max(...prices.map((p) => p.high)) * 1.015;
  const maxVolume = Math.max(...prices.map((p) => p.volume)) * 1.15;

  const numCandles = prices.length;
  const chartWidth = width - padding.left - padding.right;
  const candleSpacing = chartWidth / numCandles;
  const candleWidth = Math.max(4, candleSpacing * 0.65);

  const getYPrice = (val) => {
    return padding.top + priceHeight - ((val - minPrice) / (maxPrice - minPrice)) * priceHeight;
  };

  const getYVolume = (vol) => {
    return height - padding.bottom - (vol / maxVolume) * volumeHeight;
  };

  // Generate VWAP SVG Path
  const vwapPoints = prices.map((p, i) => {
    const x = padding.left + i * candleSpacing + candleSpacing / 2;
    const y = getYPrice(p.vwap || (p.high + p.low + p.close) / 3);
    return `${i === 0 ? "M" : "L"} ${x} ${y}`;
  }).join(" ");

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const scaledX = (mouseX / rect.width) * width;
    const idx = Math.floor((scaledX - padding.left) / candleSpacing);
    if (idx >= 0 && idx < numCandles) {
      setHoverIndex(idx);
    } else {
      setHoverIndex(null);
    }
  };

  const handleMouseLeave = () => setHoverIndex(null);

  const activeData = hoverIndex !== null ? prices[hoverIndex] : prices[prices.length - 1];
  const isHoverAnomaly = activeData && anomalyDateSet.has(activeData.date);

  return (
    <div className="card" style={{ position: "relative" }}>
      {/* Chart Header Bar */}
      <div className="card-header" style={{ marginBottom: "0.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <div className="card-title">
            <Activity size={18} color="var(--blue-accent)" />
            <span>{symbol} — 30-Day TradingView & VWAP Analytics</span>
          </div>
          {activeData && (
            <div className="font-mono" style={{ display: "flex", gap: "0.75rem", fontSize: "0.78rem" }}>
              <span style={{ color: "var(--text-muted)" }}>Date: <strong style={{ color: "#fff" }}>{activeData.date}</strong></span>
              <span>O: <strong style={{ color: "var(--text-primary)" }}>{activeData.open}</strong></span>
              <span>H: <strong style={{ color: "var(--bull-green)" }}>{activeData.high}</strong></span>
              <span>L: <strong style={{ color: "var(--bear-red)" }}>{activeData.low}</strong></span>
              <span>C: <strong style={{ color: activeData.close >= activeData.open ? "var(--bull-green)" : "var(--bear-red)" }}>{activeData.close}</strong></span>
              <span style={{ color: "var(--vwap-cyan)" }}>VWAP: <strong>{activeData.vwap}</strong></span>
              <span>Vol: <strong style={{ color: isHoverAnomaly ? "var(--anomaly-amber)" : "var(--text-secondary)" }}>{activeData.volume.toLocaleString()}</strong></span>
            </div>
          )}
        </div>

        {/* View Controls */}
        <div style={{ display: "flex", gap: "0.4rem" }}>
          <button
            onClick={() => setShowVwap(!showVwap)}
            style={{
              background: showVwap ? "var(--vwap-cyan-bg)" : "transparent",
              color: showVwap ? "var(--vwap-cyan)" : "var(--text-muted)",
              border: `1px solid ${showVwap ? "rgba(6, 182, 212, 0.4)" : "var(--border-color)"}`,
              padding: "0.2rem 0.5rem",
              borderRadius: "6px",
              fontSize: "0.72rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.3rem"
            }}
          >
            <Zap size={12} />
            <span>VWAP Line</span>
          </button>
          <button
            onClick={() => setShowAnomalies(!showAnomalies)}
            style={{
              background: showAnomalies ? "var(--anomaly-amber-bg)" : "transparent",
              color: showAnomalies ? "var(--anomaly-amber)" : "var(--text-muted)",
              border: `1px solid ${showAnomalies ? "rgba(245, 158, 11, 0.4)" : "var(--border-color)"}`,
              padding: "0.2rem 0.5rem",
              borderRadius: "6px",
              fontSize: "0.72rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.3rem"
            }}
          >
            <AlertTriangle size={12} />
            <span>Anomalies (Z&gt;2)</span>
          </button>
        </div>
      </div>

      {/* SVG Chart Surface */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ cursor: "crosshair", position: "relative", width: "100%", overflow: "hidden" }}
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: "100%", height: "auto", display: "block" }}
        >
          {/* Background Grid Lines */}
          {[0.25, 0.5, 0.75, 1.0].map((frac, idx) => {
            const priceVal = minPrice + (maxPrice - minPrice) * frac;
            const y = getYPrice(priceVal);
            return (
              <g key={idx}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="var(--border-color)"
                  strokeDasharray="3 3"
                  strokeWidth="0.8"
                />
                <text
                  x={width - padding.right + 8}
                  y={y + 4}
                  fill="var(--text-muted)"
                  fontSize="10"
                  fontFamily="var(--font-mono)"
                >
                  {priceVal.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Volume Baseline Line */}
          <line
            x1={padding.left}
            y1={volumeTop}
            x2={width - padding.right}
            y2={volumeTop}
            stroke="var(--border-color)"
            strokeWidth="0.8"
          />
          <text
            x={padding.left}
            y={volumeTop - 6}
            fill="var(--text-muted)"
            fontSize="9"
            fontFamily="var(--font-mono)"
          >
            VOLUME HISTOGRAM &amp; ANOMALY THRESHOLD (Z &gt; 2.0)
          </text>

          {/* Render Candlesticks and Volume Bars */}
          {prices.map((p, i) => {
            const xCenter = padding.left + i * candleSpacing + candleSpacing / 2;
            const xBar = xCenter - candleWidth / 2;
            const isBull = p.close >= p.open;
            const candleColor = isBull ? "var(--bull-green)" : "var(--bear-red)";

            const yHigh = getYPrice(p.high);
            const yLow = getYPrice(p.low);
            const yOpen = getYPrice(p.open);
            const yClose = getYPrice(p.close);
            const bodyTop = Math.min(yOpen, yClose);
            const bodyHeight = Math.max(2, Math.abs(yClose - yOpen));

            const yVol = getYVolume(p.volume);
            const volHeight = height - padding.bottom - yVol;
            const isAnomaly = anomalyDateSet.has(p.date);

            return (
              <g key={p.id || i}>
                {/* Candlestick Wick */}
                <line
                  x1={xCenter}
                  y1={yHigh}
                  x2={xCenter}
                  y2={yLow}
                  stroke={candleColor}
                  strokeWidth="1.2"
                />
                {/* Candlestick Body */}
                <rect
                  x={xBar}
                  y={bodyTop}
                  width={candleWidth}
                  height={bodyHeight}
                  fill={candleColor}
                  rx="1"
                />

                {/* Volume Bar */}
                <rect
                  x={xBar}
                  y={yVol}
                  width={candleWidth}
                  height={volHeight}
                  fill={
                    isAnomaly && showAnomalies
                      ? "var(--anomaly-amber)"
                      : isBull
                      ? "rgba(16, 185, 129, 0.45)"
                      : "rgba(239, 68, 68, 0.45)"
                  }
                  rx="1"
                />

                {/* Anomaly Highlight Ring if flagged */}
                {isAnomaly && showAnomalies && (
                  <circle
                    cx={xCenter}
                    cy={yHigh - 10}
                    r="4"
                    fill="var(--anomaly-amber)"
                    stroke="#fff"
                    strokeWidth="1.5"
                  />
                )}
              </g>
            );
          })}

          {/* VWAP Overlay Line */}
          {showVwap && (
            <path
              d={vwapPoints}
              fill="none"
              stroke="var(--vwap-cyan)"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Interactive Crosshair & Cursor Marker */}
          {hoverIndex !== null && (
            <g>
              <line
                x1={padding.left + hoverIndex * candleSpacing + candleSpacing / 2}
                y1={padding.top}
                x2={padding.left + hoverIndex * candleSpacing + candleSpacing / 2}
                y2={height - padding.bottom}
                stroke="rgba(255, 255, 255, 0.4)"
                strokeDasharray="2 2"
                strokeWidth="1"
              />
              <line
                x1={padding.left}
                y1={getYPrice(activeData.close)}
                x2={width - padding.right}
                y2={getYPrice(activeData.close)}
                stroke="rgba(255, 255, 255, 0.4)"
                strokeDasharray="2 2"
                strokeWidth="1"
              />
              {/* Floating Price Tag on Y axis */}
              <rect
                x={width - padding.right + 2}
                y={getYPrice(activeData.close) - 9}
                width="60"
                height="18"
                fill="var(--blue-accent)"
                rx="3"
              />
              <text
                x={width - padding.right + 32}
                y={getYPrice(activeData.close) + 4}
                fill="#fff"
                fontSize="10"
                fontWeight="700"
                textAnchor="middle"
                fontFamily="var(--font-mono)"
              >
                {activeData.close.toFixed(1)}
              </text>
            </g>
          )}

          {/* X Axis Dates Sample */}
          {prices.filter((_, idx) => idx % 5 === 0 || idx === prices.length - 1).map((p, idx) => {
            const origIndex = prices.indexOf(p);
            const x = padding.left + origIndex * candleSpacing + candleSpacing / 2;
            return (
              <text
                key={idx}
                x={x}
                y={height - padding.bottom + 20}
                fill="var(--text-muted)"
                fontSize="9"
                textAnchor="middle"
                fontFamily="var(--font-mono)"
              >
                {p.date.slice(5)}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
