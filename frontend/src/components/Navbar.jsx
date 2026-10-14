import React, { useState } from "react";
import { useAuth, DEMO_USERS } from "../context/AuthContext";
import { 
  TrendingUp, 
  BarChart3, 
  Bot, 
  ShieldCheck, 
  Shield,
  Eye,
  Layers, 
  Sun, 
  Moon, 
  Download, 
  Lock,
  Menu,
  X,
  Radio,
  Sparkles
} from "lucide-react";

export const Navbar = ({ activeTab, setActiveTab, wsConnected, theme, toggleTheme, onOpenExportModal }) => {
  const { user, switchRole, isSwitching, switchToast } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSelectTab = (tab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  const handleSelectRole = (role) => {
    switchRole(role);
    setMobileMenuOpen(false);
  };

  const handleExportClick = () => {
    setMobileMenuOpen(false);
    onOpenExportModal();
  };

  return (
    <>
      <header className="navbar-header">
        <div className="navbar-container">
          {/* Brand Identity */}
          <div className="navbar-brand-section">
            <div className="navbar-logo-icon">
              <TrendingUp size={18} color="#fff" />
            </div>
            <div className="navbar-brand-text-col">
              <div className="navbar-brand-row">
                <span className="font-display navbar-brand-title">
                  OMWAY
                </span>
                <span className="navbar-brand-badge">
                  NEPSE INTELLIGENCE
                </span>
              </div>
              <div className="brand-subtitle-desktop" style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                Institutional Market &amp; News Analytics Engine
              </div>
            </div>
          </div>

          {/* Tab Navigation - Desktop */}
          <nav className="navbar-nav-desktop">
            <button
              onClick={() => handleSelectTab("company")}
              className={`btn ${activeTab === "company" ? "btn-primary" : "btn-secondary"}`}
              style={{ fontSize: "0.82rem", padding: "0.4rem 0.85rem" }}
            >
              <BarChart3 size={15} />
              <span>Company Analytics</span>
            </button>
            <button
              onClick={() => handleSelectTab("comparison")}
              className={`btn ${activeTab === "comparison" ? "btn-primary" : "btn-secondary"}`}
              style={{ fontSize: "0.82rem", padding: "0.4rem 0.85rem" }}
            >
              <Layers size={15} />
              <span>Market Matrix</span>
            </button>
            <button
              onClick={() => handleSelectTab("crawler")}
              className={`btn ${activeTab === "crawler" ? "btn-primary" : "btn-secondary"}`}
              style={{ fontSize: "0.82rem", padding: "0.4rem 0.85rem" }}
            >
              <Bot size={15} />
              <span>Crawler Ops &amp; RBAC</span>
            </button>
          </nav>

          {/* Action Cluster - Desktop */}
          <div className="navbar-actions-desktop">
            {/* WebSocket Pulse */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              fontSize: "0.74rem",
              background: wsConnected ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)",
              padding: "0.28rem 0.6rem",
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

            {/* Institutional Report Export Action */}
            <button
              onClick={onOpenExportModal}
              className="btn btn-secondary btn-sm"
              style={{
                borderColor: user?.role === "Viewer" ? "rgba(245, 158, 11, 0.4)" : "rgba(59, 130, 246, 0.4)",
                fontSize: "0.75rem",
                padding: "0.32rem 0.65rem",
                gap: "0.35rem"
              }}
              title={user?.role === "Viewer" ? "Viewer: Read-only dashboards (Click to see RBAC details)" : "Export Quantitative Market Report (CSV / JSON)"}
            >
              {user?.role === "Viewer" ? <Lock size={13} color="var(--anomaly-amber)" /> : <Download size={13} color="var(--blue-accent)" />}
              <span>Export Report</span>
            </button>

            {/* RBAC Role Switcher */}
            <div className="rbac-switcher-container" role="radiogroup" aria-label="Access Role Selector">
              <div className="rbac-label">
                <ShieldCheck size={13} color="var(--ai-purple)" />
                <span className="rbac-label-text">Role:</span>
              </div>
              {DEMO_USERS.map((item) => {
                const isActive = user?.role === item.role;
                const isItemSwitching = isSwitching === item.role;
                return (
                  <button
                    key={item.role}
                    type="button"
                    onClick={() => switchRole(item.role)}
                    className={`rbac-pill-btn role-${item.role.toLowerCase()} ${isActive ? "active" : ""}`}
                    title={`Switch to ${item.label} (${item.desc})`}
                    disabled={isItemSwitching}
                  >
                    {isItemSwitching ? (
                      <span className="role-micro-spin" />
                    ) : item.role === "Admin" ? (
                      <Shield size={11} className="role-btn-icon" />
                    ) : item.role === "Analyst" ? (
                      <BarChart3 size={11} className="role-btn-icon" />
                    ) : (
                      <Eye size={11} className="role-btn-icon" />
                    )}
                    <span>{item.role}</span>
                  </button>
                );
              })}
            </div>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="theme-toggle-btn"
              title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
            >
              <div className="theme-icon-container">
                {theme === "dark" ? (
                  <Sun size={13} color="#f59e0b" />
                ) : (
                  <Moon size={13} color="#3b82f6" />
                )}
              </div>
              <span>{theme === "dark" ? "Light" : "Dark"}</span>
            </button>
          </div>

          {/* Mobile Right Controls: Theme Toggle + Menu Hamburger Button */}
          <div className="navbar-mobile-right">
            {/* Quick Mobile Active Role Badge (tap to open role manager) */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="navbar-role-badge-mobile"
              title={`Current Role: ${user?.role || "Viewer"} (Tap to change)`}
              aria-label="Switch Role"
            >
              <ShieldCheck size={12} color="var(--ai-purple)" />
              <span>{user?.role || "Viewer"}</span>
            </button>

            {/* Mobile Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="navbar-theme-toggle-mobile"
              title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
              aria-label="Toggle Theme"
            >
              <div className="theme-icon-container" style={{ width: "20px", height: "20px", border: "none", background: "transparent" }}>
                {theme === "dark" ? (
                  <Sun size={15} color="#f59e0b" />
                ) : (
                  <Moon size={15} color="#3b82f6" />
                )}
              </div>
            </button>

            {/* Mobile Hamburger Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="navbar-mobile-toggle-btn"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              title="Toggle Menu & Role Controls"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </header>

      {/* Dynamic Role Switch Notification Toast */}
      {switchToast && (
        <div className="role-switch-toast-wrapper">
          <div className="role-switch-toast">
            <span className={`live-dot role-dot-${switchToast.role.toLowerCase()}`} />
            <span>
              <strong>{switchToast.label}</strong> Active — {switchToast.desc}
            </span>
          </div>
        </div>
      )}

      {/* Mobile Sticky Tab Segmented Bar (Always accessible with 1 tap on Mobile) */}
      <div className="navbar-mobile-subbar">
        <div className="mobile-tabs-segmented" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === "company"}
            onClick={() => handleSelectTab("company")}
            className={`mobile-tab-btn ${activeTab === "company" ? "active" : ""}`}
          >
            <BarChart3 size={14} />
            <span>Analytics</span>
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "comparison"}
            onClick={() => handleSelectTab("comparison")}
            className={`mobile-tab-btn ${activeTab === "comparison" ? "active" : ""}`}
          >
            <Layers size={14} />
            <span>Matrix</span>
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "crawler"}
            onClick={() => handleSelectTab("crawler")}
            className={`mobile-tab-btn ${activeTab === "crawler" ? "active" : ""}`}
          >
            <Bot size={14} />
            <span>Operations</span>
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu (Roles, Export Report, Status) */}
      {mobileMenuOpen && (
        <div className="navbar-mobile-drawer open" onClick={() => setMobileMenuOpen(false)}>
          <div className="navbar-mobile-drawer-content" onClick={(e) => e.stopPropagation()}>
            {/* Header with Title and Close */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Sparkles size={16} color="var(--blue-accent)" />
                <span style={{ fontWeight: "700", fontSize: "0.95rem" }}>Quick Controls &amp; Roles</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="action-msg-close"
                style={{ padding: "0.3rem" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Current Active Role Card */}
            <div className="drawer-role-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "600" }}>
                  ACTIVE ACCESS ROLE
                </span>
                <span className={`badge ${user?.role === "Admin" ? "badge-ai" : user?.role === "Analyst" ? "badge-vwap" : "badge-secondary"}`}>
                  {user?.role || "Viewer"}
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.4rem" }}>
                {DEMO_USERS.map((item) => (
                  <button
                    key={item.role}
                    type="button"
                    onClick={() => handleSelectRole(item.role)}
                    className={`drawer-role-btn role-${item.role.toLowerCase()} ${user?.role === item.role ? "active" : ""}`}
                  >
                    {item.role === "Admin" ? (
                      <Shield size={12} />
                    ) : item.role === "Analyst" ? (
                      <BarChart3 size={12} />
                    ) : (
                      <Eye size={12} />
                    )}
                    <span>{item.role}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Export Institutional Report Action */}
            <button
              onClick={handleExportClick}
              className="btn btn-secondary"
              style={{
                width: "100%",
                justifyContent: "center",
                padding: "0.6rem",
                fontSize: "0.85rem",
                borderColor: user?.role === "Viewer" ? "rgba(245, 158, 11, 0.4)" : "rgba(59, 130, 246, 0.4)"
              }}
            >
              {user?.role === "Viewer" ? <Lock size={15} color="var(--anomaly-amber)" /> : <Download size={15} color="var(--blue-accent)" />}
              <span>{user?.role === "Viewer" ? "Export Report (Viewer: Read-Only)" : "Export Market Report (CSV / JSON)"}</span>
            </button>

            {/* Live WebSocket Telemetry Status Card */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "var(--bg-input)",
              padding: "0.6rem 0.85rem",
              borderRadius: "8px",
              border: "1px solid var(--border-color)",
              fontSize: "0.78rem"
            }}>
              <span style={{ color: "var(--text-muted)" }}>Live Telemetry Socket</span>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span className={wsConnected ? "live-dot" : ""} style={{
                  background: wsConnected ? "var(--bull-green)" : "var(--anomaly-amber)"
                }} />
                <strong style={{ color: wsConnected ? "var(--bull-green)" : "var(--anomaly-amber)" }}>
                  {wsConnected ? "CONNECTED" : "CONNECTING"}
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
