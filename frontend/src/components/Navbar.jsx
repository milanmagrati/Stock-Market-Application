import React from "react";
import { useAuth, DEMO_USERS } from "../context/AuthContext";
import { 
  TrendingUp, 
  BarChart3, 
  Bot, 
  ShieldCheck, 
  Radio, 
  Layers, 
  UserCheck,
  Sun,
  Moon
} from "lucide-react";

export const Navbar = ({ activeTab, setActiveTab, wsConnected, theme, toggleTheme }) => {
  const { user, switchRole } = useAuth();

  return (
    <header style={{
      borderBottom: "1px solid var(--border-color)",
      background: "var(--bg-secondary)",
      backdropFilter: "blur(12px)",
      position: "sticky",
      top: 0,
      zIndex: 50,
      padding: "0.75rem 1.5rem"
    }}>
      <div style={{
        maxWidth: "1600px",
        margin: "0 auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "1rem",
        flexWrap: "wrap"
      }}>
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{
            background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
            width: "38px",
            height: "38px",
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 15px rgba(59, 130, 246, 0.3)"
          }}>
            <TrendingUp size={22} color="#fff" />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span className="font-display" style={{ fontSize: "1.15rem", fontWeight: "700", letterSpacing: "-0.02em" }}>
                OMWAY
              </span>
              <span style={{ fontSize: "0.8rem", color: "var(--vwap-cyan)", fontWeight: "600", letterSpacing: "0.08em" }}>
                NEPSE INTELLIGENCE
              </span>
            </div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
              Institutional Market & News Analytics Engine
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={() => setActiveTab("company")}
            className={`btn ${activeTab === "company" ? "btn-primary" : "btn-secondary"}`}
          >
            <BarChart3 size={16} />
            <span>Company Analytics</span>
          </button>
          <button
            onClick={() => setActiveTab("comparison")}
            className={`btn ${activeTab === "comparison" ? "btn-primary" : "btn-secondary"}`}
          >
            <Layers size={16} />
            <span>Market Matrix</span>
          </button>
          <button
            onClick={() => setActiveTab("crawler")}
            className={`btn ${activeTab === "crawler" ? "btn-primary" : "btn-secondary"}`}
          >
            <Bot size={16} />
            <span>Crawler Ops & RBAC</span>
          </button>
        </nav>

        {/* Live Status & Role Switcher */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {/* WebSocket Pulse */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            fontSize: "0.75rem",
            background: wsConnected ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)",
            padding: "0.3rem 0.65rem",
            borderRadius: "999px",
            border: `1px solid ${wsConnected ? "rgba(16, 185, 129, 0.25)" : "rgba(245, 158, 11, 0.25)"}`
          }}>
            <span className={wsConnected ? "live-dot" : ""} style={{
              background: wsConnected ? "var(--bull-green)" : "var(--anomaly-amber)"
            }} />
            <span style={{ color: wsConnected ? "var(--bull-green)" : "var(--anomaly-amber)", fontWeight: "600" }}>
              {wsConnected ? "WS LIVE" : "CONNECTING"}
            </span>
          </div>

          {/* RBAC Role Switcher */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "0.25rem",
            background: "var(--bg-input)",
            padding: "0.25rem",
            borderRadius: "10px",
            border: "1px solid var(--border-color)"
          }}>
            <div style={{ padding: "0 0.4rem", display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>
              <ShieldCheck size={14} color="var(--ai-purple)" />
              <span>Role:</span>
            </div>
            {DEMO_USERS.map((item) => (
              <button
                key={item.role}
                onClick={() => switchRole(item.role)}
                style={{
                  background: user?.role === item.role ? "var(--blue-accent)" : "transparent",
                  color: user?.role === item.role ? "#fff" : "var(--text-secondary)",
                  border: "none",
                  padding: "0.25rem 0.6rem",
                  borderRadius: "6px",
                  fontSize: "0.75rem",
                  fontWeight: user?.role === item.role ? "600" : "400",
                  cursor: "pointer",
                  transition: "all 0.15s ease"
                }}
              >
                {item.role}
              </button>
            ))}
          </div>

          {/* Animated Stylish Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="theme-toggle-btn"
            title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
          >
            <div className="theme-icon-container">
              {theme === "dark" ? (
                <Sun size={14} color="#f59e0b" />
              ) : (
                <Moon size={14} color="#3b82f6" />
              )}
            </div>
            <span>{theme === "dark" ? "Light" : "Dark"}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
