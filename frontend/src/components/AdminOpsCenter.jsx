import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { 
  Bot, 
  Play, 
  ShieldAlert, 
  Clock, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Users, 
  Lock, 
  Server, 
  FileWarning,
  CheckCircle2,
  AlertTriangle,
  X,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  Eye,
  EyeOff,
  Copy,
  Check,
  Plus,
  Trash2,
  Sliders,
  Download,
  Calendar,
  Layers,
  Tag,
  ToggleLeft,
  ToggleRight,
  Database,
  UserPlus,
  Shield,
  ShieldCheck,
  Mail,
  User,
  ChevronDown,
  Building2,
  Sparkles
} from "lucide-react";
import { Pagination } from "./Pagination";

const PORTALS = [
  { name: "merolagani.com", type: "Financial News & Quotes", rateLimit: "2.0s", robots: "Compliant" },
  { name: "sharesansar.com", type: "Market News & Floorsheet", rateLimit: "2.0s", robots: "Compliant" },
  { name: "nepsealpha.com", type: "Technical Charts & News", rateLimit: "2.0s", robots: "Compliant" },
  { name: "bizmandu.com", type: "Economic Journalism", rateLimit: "2.0s", robots: "Compliant" },
];

export const AdminOpsCenter = () => {
  const { user, switchRole } = useAuth();
  const [subTab, setSubTab] = useState("crawlers"); // "crawlers", "watchlist", "users", "corrections"
  
  // Crawler & Scheduler State
  const [crawlLogs, setCrawlLogs] = useState([]);
  const [selectedPortal, setSelectedPortal] = useState("all");
  const [selectedType, setSelectedType] = useState("NEWS");
  const [loading, setLoading] = useState(false);
  const [dispatchSuccess, setDispatchSuccess] = useState(false);
  const [actionMsg, setActionMsg] = useState(null);
  const [schedulerStatus, setSchedulerStatus] = useState(null);

  // Watchlist State & Pagination
  const [companies, setCompanies] = useState([]);
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
  const [newCompany, setNewCompany] = useState({ symbol: "", name: "", sector: "Commercial Banks", aliases: "" });
  const [isSyncingConfig, setIsSyncingConfig] = useState(false);
  const [watchPage, setWatchPage] = useState(1);
  const [watchPageSize, setWatchPageSize] = useState(10);
  const [watchSearch, setWatchSearch] = useState("");
  const [watchSector, setWatchSector] = useState("ALL");
  const [watchStatus, setWatchStatus] = useState("ALL");
  const [watchSortField, setWatchSortField] = useState("symbol");
  const [watchSortDir, setWatchSortDir] = useState("asc");

  // User Governance State & Pagination
  const [userList, setUserList] = useState([]);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUser, setNewUser] = useState({ full_name: "", email: "", password: "", role: "Analyst" });
  const [showPassword, setShowPassword] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [userPage, setUserPage] = useState(1);
  const [userPageSize, setUserPageSize] = useState(10);

  // News Corrections State
  const [corrections, setCorrections] = useState([]);
  const [corrPage, setCorrPage] = useState(1);
  const [corrPageSize, setCorrPageSize] = useState(10);
  const [corrSearch, setCorrSearch] = useState("");

  // Crawler Logs Pagination & Filtering state
  const [logPage, setLogPage] = useState(1);
  const [logPageSize, setLogPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [filterPortal, setFilterPortal] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState("started_at");
  const [sortDirection, setSortDirection] = useState("desc");
  const [selectedError, setSelectedError] = useState(null);
  const [copiedError, setCopiedError] = useState(false);
  const [isRefreshingLogs, setIsRefreshingLogs] = useState(false);

  const isAdmin = user?.role === "Admin";
  const isAnalystOrAdmin = user?.role === "Admin" || user?.role === "Analyst";

  // Data Fetching
  const fetchLogs = async () => {
    if (!isAnalystOrAdmin) return;
    setIsRefreshingLogs(true);
    try {
      const logs = await api.getCrawlLogs(100);
      setCrawlLogs(logs);
    } catch (err) {
      console.warn("Could not load crawl logs:", err.message);
    } finally {
      setTimeout(() => setIsRefreshingLogs(false), 500);
    }
  };

  const fetchScheduler = async () => {
    if (!isAnalystOrAdmin) return;
    try {
      const status = await api.getSchedulerStatus();
      setSchedulerStatus(status);
    } catch (err) {
      console.warn("Could not load scheduler status:", err.message);
    }
  };

  const fetchUsers = async () => {
    if (!isAdmin) return;
    try {
      const users = await api.getAdminUsers();
      setUserList(users);
    } catch (err) {
      console.warn("Could not load users:", err.message);
    }
  };

  const fetchWatchlist = async () => {
    try {
      const compList = await api.getCompanies();
      setCompanies(compList);
    } catch (err) {
      console.warn("Could not load companies:", err.message);
    }
  };

  const fetchCorrections = async () => {
    if (!isAnalystOrAdmin) return;
    try {
      const data = await api.getNewsCorrections(200);
      setCorrections(data);
    } catch (err) {
      console.warn("Could not load corrections:", err.message);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchScheduler();
    fetchWatchlist();
    if (isAdmin) fetchUsers();
    if (isAnalystOrAdmin) fetchCorrections();
  }, [user]);

  // Crawler Trigger Handler
  const handleTriggerCrawl = async () => {
    if (!isAdmin) return;
    setLoading(true);
    setActionMsg(null);
    try {
      const res = await api.triggerCrawlRun(selectedPortal, selectedType);
      setDispatchSuccess(true);
      setActionMsg({
        type: "success",
        title: "Crawl Job Enqueued Successfully",
        text: `Job #${res.task_id} successfully queued for portal '${selectedPortal}'. Queue workers are executing crawler pipelines.`
      });
      setTimeout(() => {
        setDispatchSuccess(false);
        fetchLogs();
        fetchScheduler();
      }, 2500);
    } catch (err) {
      setActionMsg({
        type: "error",
        title: "Crawl Trigger Failed",
        text: err.message
      });
    } finally {
      setLoading(false);
    }
  };

  // Scheduler Controls
  const handleToggleScheduler = async () => {
    if (!isAdmin || !schedulerStatus) return;
    try {
      const updated = await api.toggleScheduler(!schedulerStatus.is_active);
      setSchedulerStatus(updated);
      setActionMsg({
        type: "success",
        title: updated.is_active ? "Unattended Scheduler Activated" : "Unattended Scheduler Paused",
        text: updated.message
      });
    } catch (err) {
      setActionMsg({ type: "error", title: "Scheduler Update Error", text: err.message });
    }
  };

  // Watchlist Actions
  const handleAddCompany = async (e) => {
    e.preventDefault();
    if (!isAdmin || !newCompany.symbol.trim() || !newCompany.name.trim()) return;
    try {
      await api.addCompany(newCompany);
      setShowAddCompanyModal(false);
      setNewCompany({ symbol: "", name: "", sector: "Commercial Banks", aliases: "" });
      await fetchWatchlist();
      setActionMsg({
        type: "success",
        title: "Company Added to Watchlist",
        text: `Successfully provisioned ${newCompany.symbol.toUpperCase()} with 30-day baseline telemetry and floorsheets.`
      });
    } catch (err) {
      setActionMsg({ type: "error", title: "Add Company Failed", text: err.message });
    }
  };

  const handleToggleCompanyActive = async (id, currentStatus) => {
    if (!isAdmin) return;
    try {
      await api.toggleCompanyActive(id);
      await fetchWatchlist();
    } catch (err) {
      setActionMsg({ type: "error", title: "Update Failed", text: err.message });
    }
  };

  const handleDeleteCompany = async (id, symbol) => {
    if (!isAdmin) return;
    if (!window.confirm(`Are you sure you want to remove ${symbol} from the active watchlist?`)) return;
    try {
      await api.deleteCompany(id);
      await fetchWatchlist();
      setActionMsg({
        type: "success",
        title: "Watchlist Updated",
        text: `Company ${symbol} removed from watchlist.`
      });
    } catch (err) {
      setActionMsg({ type: "error", title: "Delete Failed", text: err.message });
    }
  };

  const handleSyncConfig = async () => {
    if (!isAdmin) return;
    setIsSyncingConfig(true);
    try {
      const res = await api.syncCompanyConfig();
      await fetchWatchlist();
      setActionMsg({
        type: "success",
        title: "Watchlist Config Sync Complete",
        text: res.message
      });
    } catch (err) {
      setActionMsg({ type: "error", title: "Config Sync Failed", text: err.message });
    } finally {
      setIsSyncingConfig(false);
    }
  };

  // User Governance Actions
  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    try {
      await api.createUser(newUser);
      setShowAddUserModal(false);
      setNewUser({ full_name: "", email: "", password: "", role: "Analyst" });
      await fetchUsers();
      setActionMsg({
        type: "success",
        title: "User Created Successfully",
        text: `Account for ${newUser.email} (${newUser.role}) provisioned.`
      });
    } catch (err) {
      setActionMsg({ type: "error", title: "User Creation Failed", text: err.message });
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    if (!isAdmin) return;
    try {
      await api.updateUserRole(userId, newRole);
      await fetchUsers();
      setActionMsg({
        type: "success",
        title: "Role Updated Server-Side",
        text: `User permissions modified to '${newRole}'.`
      });
    } catch (err) {
      setActionMsg({ type: "error", title: "Role Update Failed", text: err.message });
    }
  };

  const handleDeleteUser = async (userId, userEmail) => {
    if (!isAdmin) return;
    if (!window.confirm(`Delete system user '${userEmail}'?`)) return;
    try {
      await api.deleteUser(userId);
      await fetchUsers();
      setActionMsg({
        type: "success",
        title: "User Removed",
        text: `User ${userEmail} was deleted successfully.`
      });
    } catch (err) {
      setActionMsg({ type: "error", title: "Delete User Failed", text: err.message });
    }
  };

  // Filter logs based on search, portal, and status
  const filteredLogs = useMemo(() => {
    return crawlLogs.filter((log) => {
      if (statusFilter !== "ALL" && log.status !== statusFilter) return false;
      if (filterPortal !== "all" && log.portal !== filterPortal) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const inPortal = log.portal?.toLowerCase().includes(q);
        const inType = log.crawl_type?.toLowerCase().includes(q);
        const inStatus = log.status?.toLowerCase().includes(q);
        const inError = log.error_message?.toLowerCase().includes(q);
        if (!inPortal && !inType && !inStatus && !inError) return false;
      }
      return true;
    });
  }, [crawlLogs, statusFilter, filterPortal, searchQuery]);

  // Sort logs
  const sortedLogs = useMemo(() => {
    return [...filteredLogs].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (sortField === "started_at") {
        aVal = new Date(aVal || 0).getTime();
        bVal = new Date(bVal || 0).getTime();
      } else if (sortField === "items_crawled") {
        aVal = Number(aVal || 0);
        bVal = Number(bVal || 0);
      } else {
        aVal = String(aVal || "").toLowerCase();
        bVal = String(bVal || "").toLowerCase();
      }
      return sortDirection === "asc" ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });
  }, [filteredLogs, sortField, sortDirection]);

  const pagedLogs = useMemo(() => {
    const start = (logPage - 1) * logPageSize;
    return sortedLogs.slice(start, start + logPageSize);
  }, [sortedLogs, logPage, logPageSize]);

  // Filter corrections
  const filteredCorrections = useMemo(() => {
    if (!corrSearch.trim()) return corrections;
    const q = corrSearch.toLowerCase().trim();
    return corrections.filter((c) => 
      c.company_symbol?.toLowerCase().includes(q) ||
      c.article_headline?.toLowerCase().includes(q) ||
      c.user_email?.toLowerCase().includes(q) ||
      c.action?.toLowerCase().includes(q)
    );
  }, [corrections, corrSearch]);

  const pagedCorrections = useMemo(() => {
    const start = (corrPage - 1) * corrPageSize;
    return filteredCorrections.slice(start, start + corrPageSize);
  }, [filteredCorrections, corrPage, corrPageSize]);

  // Watchlist: Dynamic Sectors Extraction
  const availableSectors = useMemo(() => {
    const set = new Set(companies.map(c => c.sector).filter(Boolean));
    return Array.from(set).sort();
  }, [companies]);

  // Watchlist: Filter companies
  const filteredCompanies = useMemo(() => {
    return companies.filter((c) => {
      if (watchSector !== "ALL" && c.sector !== watchSector) return false;
      if (watchStatus === "ACTIVE" && !c.is_active) return false;
      if (watchStatus === "INACTIVE" && c.is_active) return false;
      if (watchSearch.trim()) {
        const q = watchSearch.toLowerCase().trim();
        const inSym = c.symbol?.toLowerCase().includes(q);
        const inName = c.name?.toLowerCase().includes(q);
        const inSec = c.sector?.toLowerCase().includes(q);
        const inAliases = c.aliases?.toLowerCase().includes(q);
        if (!inSym && !inName && !inSec && !inAliases) return false;
      }
      return true;
    });
  }, [companies, watchSector, watchStatus, watchSearch]);

  // Watchlist: Sort companies
  const sortedCompanies = useMemo(() => {
    return [...filteredCompanies].sort((a, b) => {
      let aVal = a[watchSortField];
      let bVal = b[watchSortField];
      if (typeof aVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = (bVal || "").toLowerCase();
      }
      if (watchSortField === "is_active") {
        aVal = a.is_active ? 1 : 0;
        bVal = b.is_active ? 1 : 0;
      }
      if (aVal < bVal) return watchSortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return watchSortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredCompanies, watchSortField, watchSortDir]);

  // Watchlist: Sliced Page
  const pagedCompanies = useMemo(() => {
    const start = (watchPage - 1) * watchPageSize;
    return sortedCompanies.slice(start, start + watchPageSize);
  }, [sortedCompanies, watchPage, watchPageSize]);

  const handleWatchSort = (field) => {
    if (watchSortField === field) {
      setWatchSortDir(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setWatchSortField(field);
      setWatchSortDir("asc");
    }
  };

  // User Governance: Filter users
  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return userList;
    const q = userSearch.toLowerCase().trim();
    return userList.filter((u) => 
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q)
    );
  }, [userList, userSearch]);

  const pagedUsers = useMemo(() => {
    const start = (userPage - 1) * userPageSize;
    return filteredUsers.slice(start, start + userPageSize);
  }, [filteredUsers, userPage, userPageSize]);

  // Modal ESC Key listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (showAddUserModal) setShowAddUserModal(false);
        if (showAddCompanyModal) setShowAddCompanyModal(false);
        if (selectedError) setSelectedError(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showAddUserModal, showAddCompanyModal, selectedError]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Header and Operational Sub-tabs */}
      <div className="ops-governance-header">
        <div className="ops-header-brand">
          <div className="ops-brand-icon">
            <Bot size={22} />
          </div>
          <div>
            <div className="ops-header-title">
              <span>Operations &amp; Governance Center</span>
              <div className="ops-live-badge">
                <span className="ops-pulse-dot" />
                <span>Engine Active</span>
              </div>
            </div>
            <div className="ops-header-subtitle">
              <span>Data Pipeline Automation</span>
              <span className="dot-separator">•</span>
              <span>Watchlist Telemetry</span>
              <span className="dot-separator">•</span>
              <span>RBAC User Control</span>
              <span className="dot-separator">•</span>
              <span>AI Fine-Tuning Corpus</span>
            </div>
          </div>
        </div>

        {/* Sub-tab Segmented Control Pills */}
        <div className="ops-nav-tabs" role="tablist" aria-label="Governance sub-tabs">
          <button
            role="tab"
            aria-selected={subTab === "crawlers"}
            onClick={() => setSubTab("crawlers")}
            className={`ops-tab-btn ${subTab === "crawlers" ? "active" : ""}`}
          >
            <Server size={14} />
            <span>Crawlers &amp; Scheduler</span>
            {schedulerStatus?.is_active && (
              <span className="tab-badge" style={{ background: "rgba(16, 185, 129, 0.25)", color: "var(--bull-green)" }}>
                LIVE
              </span>
            )}
          </button>
          
          {isAdmin && (
            <button
              role="tab"
              aria-selected={subTab === "watchlist"}
              onClick={() => setSubTab("watchlist")}
              className={`ops-tab-btn ${subTab === "watchlist" ? "active" : ""}`}
            >
              <Database size={14} />
              <span>Watchlist Mgmt</span>
              <span className="tab-badge">{companies.length}</span>
            </button>
          )}

          {isAdmin && (
            <button
              role="tab"
              aria-selected={subTab === "users"}
              onClick={() => setSubTab("users")}
              className={`ops-tab-btn ${subTab === "users" ? "active" : ""}`}
            >
              <Users size={14} />
              <span>RBAC User Governance</span>
              <span className="tab-badge">{userList.length}</span>
            </button>
          )}

          {isAnalystOrAdmin && (
            <button
              role="tab"
              aria-selected={subTab === "corrections"}
              onClick={() => setSubTab("corrections")}
              className={`ops-tab-btn ${subTab === "corrections" ? "active" : ""}`}
            >
              <Tag size={14} />
              <span>News Audit &amp; Retraining</span>
              <span className="tab-badge">{corrections.length}</span>
            </button>
          )}
        </div>
      </div>

      {/* Global Action Message Banner */}
      {actionMsg && (
        <div style={{
          background: actionMsg.type === "success" ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
          border: `1px solid ${actionMsg.type === "success" ? "rgba(16, 185, 129, 0.4)" : "rgba(239, 68, 68, 0.4)"}`,
          borderRadius: "10px",
          padding: "0.75rem 1rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "0.82rem"
        }}>
          <div>
            <strong style={{ color: actionMsg.type === "success" ? "var(--bull-green)" : "var(--bear-red)" }}>
              {actionMsg.title}:{" "}
            </strong>
            <span style={{ color: "var(--text-primary)" }}>{actionMsg.text}</span>
          </div>
          <button onClick={() => setActionMsg(null)} className="action-msg-close">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-TAB 1: CRAWLERS & AUTOMATED UNATTENDED SCHEDULER           */}
      {/* ============================================================== */}
      {subTab === "crawlers" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Unattended Scheduler Banner & Rate Limits */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1rem"
          }}>
            {/* Automated Periodic Scheduler Card */}
            <div className="card" style={{ border: "1px solid rgba(59, 130, 246, 0.3)" }}>
              <div className="card-header">
                <div className="card-title">
                  <Clock size={16} color="var(--blue-accent)" />
                  <span>Unattended Background Scheduler</span>
                </div>
                <span className={`badge ${schedulerStatus?.is_active ? "badge-bull" : "badge-anomaly"}`}>
                  {schedulerStatus?.is_active ? "ACTIVE & RUNNING" : "PAUSED"}
                </span>
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                {schedulerStatus?.message || "Running automated queue-based ingestion without manual intervention."}
              </div>
              <div style={{ display: "flex", gap: "1rem", marginTop: "0.75rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                <div>Interval: <strong style={{ color: "var(--text-primary)" }}>{schedulerStatus?.interval_minutes || 30}m</strong></div>
                <div>Completed Runs: <strong style={{ color: "var(--bull-green)" }}>{schedulerStatus?.total_scheduled_runs || 0}</strong></div>
              </div>
              {isAdmin ? (
                <div style={{ marginTop: "0.75rem" }}>
                  <button
                    onClick={handleToggleScheduler}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: "0.75rem" }}
                  >
                    {schedulerStatus?.is_active ? <ToggleRight size={14} color="var(--bull-green)" /> : <ToggleLeft size={14} />}
                    <span>{schedulerStatus?.is_active ? "Pause Auto-Scheduler" : "Activate Auto-Scheduler"}</span>
                  </button>
                </div>
              ) : (
                <div style={{ marginTop: "0.75rem", display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.72rem", color: "var(--text-muted)", background: "rgba(245, 158, 11, 0.08)", padding: "0.3rem 0.65rem", borderRadius: "6px", border: "1px solid rgba(245, 158, 11, 0.2)" }}>
                  <Lock size={12} color="var(--anomaly-amber)" />
                  <span>Scheduler toggle restricted to Admin role</span>
                </div>
              )}
            </div>

            {/* Target Portals Rate Limit Summary Card */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  <Server size={16} color="var(--ai-purple)" />
                  <span>Configured Target Media Portals</span>
                </div>
                <span className="badge badge-ai">robots.txt Compliant</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", fontSize: "0.75rem" }}>
                {PORTALS.map((p) => (
                  <div key={p.name} style={{ background: "var(--bg-input)", padding: "0.4rem 0.6rem", borderRadius: "6px", border: "1px solid var(--border-color)" }}>
                    <div style={{ fontWeight: "600", color: "var(--text-primary)" }}>{p.name}</div>
                    <div style={{ color: "var(--text-muted)", fontSize: "0.68rem" }}>Rate: {p.rateLimit} token bucket</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Crawler Dispatcher Trigger Console */}
          <div
            className="card"
            style={{
              border: isAdmin ? "1px solid var(--border-color)" : "1px solid rgba(245, 158, 11, 0.35)",
              background: isAdmin
                ? "var(--bg-card)"
                : "linear-gradient(180deg, rgba(245, 158, 11, 0.04) 0%, var(--bg-card) 100%)",
              boxShadow: isAdmin ? "var(--shadow-card)" : "0 4px 20px -2px rgba(245, 158, 11, 0.09)",
              position: "relative",
              overflow: "hidden",
              transition: "all 0.25s ease"
            }}
          >
            <div className="card-header">
              <div className="card-title">
                <Bot size={18} color={isAdmin ? "var(--blue-accent)" : "var(--anomaly-amber)"} />
                <span>Distributed Ingestion Queue Dispatcher</span>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                {isAdmin ? (
                  <span className="badge badge-bull" style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                    <ShieldCheck size={12} />
                    <span>Admin Clearance Active</span>
                  </span>
                ) : (
                  <span className="badge badge-anomaly" style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "0.25rem 0.65rem", fontWeight: "600" }}>
                    <Lock size={12} />
                    <span>RBAC Level 3 • Admin Access Only</span>
                  </span>
                )}
                <span className="badge badge-ai">Async Queue (Redis / In-Memory Worker)</span>
              </div>
            </div>

            {/* Non-Admin Security Enclave Notice with 1-Click Role Switch */}
            {!isAdmin && (
              <div style={{
                background: "rgba(245, 158, 11, 0.08)",
                border: "1px solid rgba(245, 158, 11, 0.25)",
                borderRadius: "10px",
                padding: "0.85rem 1rem",
                marginBottom: "1rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "1rem",
                flexWrap: "wrap"
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", flex: 1, minWidth: "260px" }}>
                  <div style={{
                    background: "rgba(245, 158, 11, 0.15)",
                    border: "1px solid rgba(245, 158, 11, 0.3)",
                    borderRadius: "8px",
                    padding: "0.5rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    color: "var(--anomaly-amber)"
                  }}>
                    <Lock size={18} />
                  </div>
                  <div style={{ fontSize: "0.8rem", lineHeight: "1.45" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: "600", color: "var(--anomaly-amber)" }}>
                      <span>Protected Ingestion Dispatch Enclave</span>
                      <span style={{
                        fontSize: "0.68rem",
                        background: "rgba(245, 158, 11, 0.2)",
                        color: "var(--anomaly-amber)",
                        padding: "0.1rem 0.45rem",
                        borderRadius: "4px",
                        fontWeight: "700",
                        letterSpacing: "0.03em"
                      }}>
                        ROLE: {user?.role ? user.role.toUpperCase() : "VIEWER"}
                      </span>
                    </div>
                    <div style={{ color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                      Manual spider dispatch triggers concurrent headless scrapers across external portals with strict token-bucket rate limits (2.0s). In accordance with platform governance, dispatch controls are locked for <strong>{user?.role || "Viewer"}</strong> sessions.
                    </div>
                  </div>
                </div>

                {/* Recruiter Evaluation Fast-Switch Button */}
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await switchRole("Admin");
                      setActionMsg({
                        type: "success",
                        title: "Role Elevated to Admin",
                        text: "Switched session to Admin mode. Distributed Ingestion Queue Dispatcher unlocked."
                      });
                    } catch (e) {
                      console.error(e);
                    }
                  }}
                  className="btn btn-sm"
                  style={{
                    background: "linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(59, 130, 246, 0.25))",
                    border: "1px solid rgba(245, 158, 11, 0.5)",
                    color: "var(--text-primary)",
                    fontWeight: "600",
                    padding: "0.5rem 0.9rem",
                    fontSize: "0.78rem",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.45rem",
                    boxShadow: "0 2px 8px rgba(245, 158, 11, 0.15)",
                    cursor: "pointer",
                    borderRadius: "7px"
                  }}
                  title="Switch to Admin role to evaluate real-time crawler pipeline dispatch"
                >
                  <ShieldCheck size={14} color="var(--bull-green)" />
                  <span>Switch to Admin (Demo 1-Click)</span>
                </button>
              </div>
            )}

            <div style={{ display: "flex", gap: "1rem", alignItems: "flex-end", flexWrap: "wrap" }}>
              {/* Target Portal Selector */}
              <div style={{ flex: 1, minWidth: "180px", opacity: isAdmin ? 1 : 0.85 }}>
                <label style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  fontSize: "0.75rem",
                  color: isAdmin ? "var(--text-muted)" : "var(--anomaly-amber)",
                  marginBottom: "0.35rem",
                  fontWeight: "600"
                }}>
                  {!isAdmin && <Lock size={11} />}
                  <span>TARGET PORTAL</span>
                  {!isAdmin && <span style={{ fontSize: "0.68rem", opacity: 0.85 }}>(LOCKED)</span>}
                </label>
                <select
                  value={selectedPortal}
                  onChange={(e) => setSelectedPortal(e.target.value)}
                  className="select"
                  disabled={!isAdmin}
                  style={{
                    width: "100%",
                    cursor: isAdmin ? "pointer" : "not-allowed",
                    background: isAdmin ? "var(--bg-input)" : "rgba(13, 19, 34, 0.65)",
                    borderColor: isAdmin ? "var(--border-color)" : "rgba(245, 158, 11, 0.35)"
                  }}
                  title={!isAdmin ? "Requires Admin privilege to modify target crawler portals" : undefined}
                >
                  <option value="all">All Portals (Concurrent Distributed Queue)</option>
                  {PORTALS.map((p) => (
                    <option key={p.name} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Ingestion Stream Selector */}
              <div style={{ flex: 1, minWidth: "160px", opacity: isAdmin ? 1 : 0.85 }}>
                <label style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  fontSize: "0.75rem",
                  color: isAdmin ? "var(--text-muted)" : "var(--anomaly-amber)",
                  marginBottom: "0.35rem",
                  fontWeight: "600"
                }}>
                  {!isAdmin && <Lock size={11} />}
                  <span>INGESTION STREAM</span>
                  {!isAdmin && <span style={{ fontSize: "0.68rem", opacity: 0.85 }}>(LOCKED)</span>}
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="select"
                  disabled={!isAdmin}
                  style={{
                    width: "100%",
                    cursor: isAdmin ? "pointer" : "not-allowed",
                    background: isAdmin ? "var(--bg-input)" : "rgba(13, 19, 34, 0.65)",
                    borderColor: isAdmin ? "var(--border-color)" : "rgba(245, 158, 11, 0.35)"
                  }}
                  title={!isAdmin ? "Requires Admin privilege to modify ingestion stream" : undefined}
                >
                  <option value="NEWS">Financial News Articles</option>
                  <option value="OHLCV">Daily OHLCV Telemetry</option>
                  <option value="FLOORSHEET">Floorsheet Broker Transactions</option>
                </select>
              </div>

              {/* Action Button: Admin Active vs Non-Admin Locked */}
              {isAdmin ? (
                <button
                  onClick={handleTriggerCrawl}
                  disabled={loading}
                  className="btn btn-primary"
                  style={{
                    padding: "0.55rem 1.25rem",
                    height: "38px",
                    boxShadow: "0 0 14px rgba(59, 130, 246, 0.35)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.5rem"
                  }}
                >
                  {loading ? (
                    <>
                      <RefreshCw size={15} className="spin-fast" />
                      <span>Enqueuing Job...</span>
                    </>
                  ) : (
                    <>
                      <Play size={15} />
                      <span>Trigger Distributed Crawl Run</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setActionMsg({
                      type: "error",
                      title: "RBAC Security Enforcement",
                      text: `Current session (${user?.role || "Viewer"}) cannot dispatch crawler tasks. Elevate to Admin using the button above or the navbar role switcher.`
                    });
                  }}
                  className="btn"
                  style={{
                    padding: "0.55rem 1.25rem",
                    height: "38px",
                    background: "rgba(245, 158, 11, 0.12)",
                    border: "1px dashed rgba(245, 158, 11, 0.5)",
                    color: "var(--anomaly-amber)",
                    fontWeight: "600",
                    cursor: "not-allowed",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    transition: "all 0.2s ease"
                  }}
                  title="Operation Locked: Requires System Administrator role (RBAC Level 3)"
                >
                  <Lock size={15} />
                  <span>Locked (Admin Clearance Required)</span>
                </button>
              )}
            </div>
          </div>

          {/* Live Execution Logs & Failure Inspector */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <Clock size={18} color="var(--vwap-cyan)" />
                <span>Crawl Execution History &amp; Diagnostic Logs</span>
              </div>
              <button
                onClick={fetchLogs}
                disabled={isRefreshingLogs}
                className="btn btn-secondary btn-sm"
              >
                <RefreshCw size={13} className={isRefreshingLogs ? "spin-fast" : ""} />
                <span>Refresh Logs</span>
              </button>
            </div>

            {/* Filter and Search Bar */}
            <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ flex: 1, minWidth: "220px", position: "relative" }}>
                <Search size={14} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <input
                  type="text"
                  placeholder="Search logs by portal, error, or status..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setLogPage(1);
                  }}
                  className="input"
                  style={{ paddingLeft: "2rem", fontSize: "0.8rem", width: "100%" }}
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setLogPage(1);
                }}
                className="select"
                style={{ width: "130px", fontSize: "0.8rem" }}
              >
                <option value="ALL">All Status</option>
                <option value="SUCCESS">SUCCESS</option>
                <option value="FAILED">FAILED</option>
                <option value="RUNNING">RUNNING</option>
              </select>
            </div>

            {/* Logs Table */}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-color)", color: "var(--text-muted)" }}>
                    <th style={{ padding: "0.6rem" }}>Timestamp</th>
                    <th style={{ padding: "0.6rem" }}>Target Portal</th>
                    <th style={{ padding: "0.6rem" }}>Type</th>
                    <th style={{ padding: "0.6rem" }}>Status</th>
                    <th style={{ padding: "0.6rem" }}>Items</th>
                    <th style={{ padding: "0.6rem" }}>Diagnostic Trace / Error</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedLogs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                      <td className="font-mono" style={{ padding: "0.6rem", color: "var(--text-muted)" }}>
                        {new Date(log.started_at).toLocaleTimeString()}
                      </td>
                      <td style={{ padding: "0.6rem", fontWeight: "600" }}>{log.portal}</td>
                      <td style={{ padding: "0.6rem" }}>{log.crawl_type}</td>
                      <td style={{ padding: "0.6rem" }}>
                        <span className={`badge ${log.status === "SUCCESS" ? "badge-bull" : log.status === "FAILED" ? "badge-bear" : "badge-secondary"}`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="font-mono" style={{ padding: "0.6rem" }}>{log.items_crawled}</td>
                      <td style={{ padding: "0.6rem" }}>
                        {log.error_message ? (
                          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            <span style={{ color: "var(--bear-red)", fontSize: "0.75rem", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {log.error_message}
                            </span>
                            <button
                              onClick={() => setSelectedError(log)}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: "0.15rem 0.4rem", fontSize: "0.68rem" }}
                            >
                              <Eye size={11} /> Inspect
                            </button>
                          </div>
                        ) : "— Clean —"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={logPage}
              totalItems={sortedLogs.length}
              pageSize={logPageSize}
              pageSizeOptions={[5, 10, 20, 50]}
              onPageChange={(p) => setLogPage(p)}
              onPageSizeChange={(s) => {
                setLogPageSize(s);
                setLogPage(1);
              }}
              itemLabel="logs"
            />
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-TAB 2: WATCHLIST CONFIGURATION & MANAGEMENT (ADMIN)        */}
      {/* ============================================================== */}
      {subTab === "watchlist" && isAdmin && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div className="card-header" style={{ padding: "1rem 1.25rem", margin: 0, borderBottom: "1px solid var(--border-color)" }}>
              <div className="card-title">
                <Database size={18} color="var(--blue-accent)" />
                <span>Tracked NEPSE Companies Watchlist</span>
                <span className="badge badge-bull" style={{ fontSize: "0.72rem" }}>
                  {filteredCompanies.length} of {companies.length} Tracked
                </span>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={handleSyncConfig}
                  disabled={isSyncingConfig}
                  className="btn btn-secondary btn-sm"
                  title="Sync with companies.json file"
                >
                  <RefreshCw size={13} className={isSyncingConfig ? "spin-fast" : ""} />
                  <span>Sync with companies.json</span>
                </button>
                <button
                  onClick={() => setShowAddCompanyModal(true)}
                  className="btn btn-primary btn-sm"
                >
                  <Plus size={14} />
                  <span>Add Company</span>
                </button>
              </div>
            </div>

            {/* Smart Search & Filter Toolbar */}
            <div className="watchlist-toolbar">
              <div className="watchlist-toolbar-left">
                {/* Search Bar */}
                <div className="watchlist-search-box">
                  <Search size={14} style={{ position: "absolute", left: "0.75rem", color: "var(--text-muted)" }} />
                  <input
                    type="text"
                    placeholder="Search by symbol, company name, sector, or keyword..."
                    value={watchSearch}
                    onChange={(e) => {
                      setWatchSearch(e.target.value);
                      setWatchPage(1);
                    }}
                  />
                  {watchSearch && (
                    <button
                      type="button"
                      onClick={() => { setWatchSearch(""); setWatchPage(1); }}
                      className="watchlist-clear-btn"
                      title="Clear search"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Sector Filter */}
                <select
                  value={watchSector}
                  onChange={(e) => {
                    setWatchSector(e.target.value);
                    setWatchPage(1);
                  }}
                  className="select"
                  style={{ fontSize: "0.78rem", padding: "0.38rem 0.75rem", minWidth: "150px" }}
                >
                  <option value="ALL">All Sectors ({companies.length})</option>
                  {availableSectors.map(sec => (
                    <option key={sec} value={sec}>{sec}</option>
                  ))}
                </select>

                {/* Status Filter Pills */}
                <div style={{ display: "flex", gap: "0.3rem" }}>
                  <button
                    type="button"
                    onClick={() => { setWatchStatus("ALL"); setWatchPage(1); }}
                    className={`status-pill-btn ${watchStatus === "ALL" ? "active" : ""}`}
                  >
                    All ({companies.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => { setWatchStatus("ACTIVE"); setWatchPage(1); }}
                    className={`status-pill-btn success ${watchStatus === "ACTIVE" ? "active" : ""}`}
                  >
                    Active ({companies.filter(c => c.is_active).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => { setWatchStatus("INACTIVE"); setWatchPage(1); }}
                    className={`status-pill-btn failed ${watchStatus === "INACTIVE" ? "active" : ""}`}
                  >
                    Inactive ({companies.filter(c => !c.is_active).length})
                  </button>
                </div>
              </div>

              {(watchSearch || watchSector !== "ALL" || watchStatus !== "ALL") && (
                <button
                  type="button"
                  onClick={() => {
                    setWatchSearch("");
                    setWatchSector("ALL");
                    setWatchStatus("ALL");
                    setWatchPage(1);
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: "0.72rem", padding: "0.25rem 0.55rem" }}
                >
                  <X size={12} />
                  <span>Reset Filters</span>
                </button>
              )}
            </div>

            {/* Table */}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-color)", color: "var(--text-muted)", background: "var(--bg-input)" }}>
                    <th onClick={() => handleWatchSort("symbol")} className="th-sortable" style={{ padding: "0.7rem 0.85rem" }}>
                      Symbol
                      <span className="sort-icon-box">
                        {watchSortField === "symbol" ? (watchSortDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} opacity={0.4} />}
                      </span>
                    </th>
                    <th onClick={() => handleWatchSort("name")} className="th-sortable" style={{ padding: "0.7rem 0.85rem" }}>
                      Company Name
                      <span className="sort-icon-box">
                        {watchSortField === "name" ? (watchSortDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} opacity={0.4} />}
                      </span>
                    </th>
                    <th onClick={() => handleWatchSort("sector")} className="th-sortable" style={{ padding: "0.7rem 0.85rem" }}>
                      Sector
                      <span className="sort-icon-box">
                        {watchSortField === "sector" ? (watchSortDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} opacity={0.4} />}
                      </span>
                    </th>
                    <th style={{ padding: "0.7rem 0.85rem" }}>Aliases / Keywords</th>
                    <th onClick={() => handleWatchSort("is_active")} className="th-sortable" style={{ padding: "0.7rem 0.85rem" }}>
                      Status
                      <span className="sort-icon-box">
                        {watchSortField === "is_active" ? (watchSortDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} opacity={0.4} />}
                      </span>
                    </th>
                    <th style={{ padding: "0.7rem 0.85rem", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedCompanies.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ padding: "2.5rem 1rem", textAlign: "center", color: "var(--text-muted)" }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
                          <Database size={28} opacity={0.3} />
                          <div>No tracked companies match your filter criteria.</div>
                          <button
                            type="button"
                            onClick={() => { setWatchSearch(""); setWatchSector("ALL"); setWatchStatus("ALL"); }}
                            className="btn btn-secondary btn-sm"
                            style={{ marginTop: "0.5rem" }}
                          >
                            Clear Filters
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    pagedCompanies.map((c) => (
                      <tr key={c.id} style={{ borderBottom: "1px solid var(--border-color)", transition: "background 0.15s ease" }}>
                        <td className="font-mono" style={{ padding: "0.7rem 0.85rem", fontWeight: "700", color: "var(--text-primary)" }}>
                          <span style={{
                            display: "inline-block",
                            padding: "0.2rem 0.45rem",
                            borderRadius: "5px",
                            background: "rgba(59, 130, 246, 0.12)",
                            color: "var(--blue-accent)",
                            border: "1px solid rgba(59, 130, 246, 0.25)"
                          }}>
                            {c.symbol}
                          </span>
                        </td>
                        <td style={{ padding: "0.7rem 0.85rem", fontWeight: "500" }}>{c.name}</td>
                        <td style={{ padding: "0.7rem 0.85rem" }}>
                          <span style={{
                            display: "inline-block",
                            padding: "0.15rem 0.5rem",
                            borderRadius: "9999px",
                            fontSize: "0.72rem",
                            background: "var(--bg-input)",
                            border: "1px solid var(--border-color)",
                            color: "var(--text-secondary)"
                          }}>
                            {c.sector}
                          </span>
                        </td>
                        <td style={{ padding: "0.7rem 0.85rem" }}>
                          {c.aliases ? (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem", maxWidth: "260px" }}>
                              {c.aliases.split(",").map((alias, aIdx) => (
                                <span key={aIdx} className="watchlist-chip">
                                  {alias.trim()}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: "0.7rem 0.85rem" }}>
                          <span className={`badge ${c.is_active ? "badge-bull" : "badge-secondary"}`}>
                            {c.is_active ? "ACTIVE" : "INACTIVE"}
                          </span>
                        </td>
                        <td style={{ padding: "0.7rem 0.85rem", textAlign: "right" }}>
                          <div style={{ display: "flex", gap: "0.4rem", justifyContent: "flex-end" }}>
                            <button
                              type="button"
                              onClick={() => handleToggleCompanyActive(c.id, c.is_active)}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: "0.25rem 0.55rem", fontSize: "0.72rem" }}
                              title="Toggle active status"
                            >
                              {c.is_active ? "Deactivate" : "Activate"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCompany(c.id, c.symbol)}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: "0.25rem 0.45rem", color: "var(--bear-red)" }}
                              title="Remove company"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Smart Functional Pagination Component */}
            <Pagination
              currentPage={watchPage}
              totalItems={filteredCompanies.length}
              pageSize={watchPageSize}
              pageSizeOptions={[5, 10, 20, 50]}
              onPageChange={(p) => setWatchPage(p)}
              onPageSizeChange={(s) => {
                setWatchPageSize(s);
                setWatchPage(1);
              }}
              itemLabel="companies"
              showJump={true}
            />
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-TAB 3: USER GOVERNANCE & ACCESS CONTROL (ADMIN)           */}
      {/* ============================================================== */}
      {subTab === "users" && isAdmin && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div className="card-header" style={{ padding: "1rem 1.25rem", margin: 0, borderBottom: "1px solid var(--border-color)" }}>
              <div className="card-title">
                <Users size={18} color="var(--ai-purple)" />
                <span>RBAC User Accounts &amp; Permissions</span>
                <span className="badge badge-ai" style={{ fontSize: "0.72rem" }}>
                  {filteredUsers.length} Users
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowAddUserModal(true)}
                className="btn btn-primary btn-sm"
              >
                <Plus size={14} />
                <span>Create User</span>
              </button>
            </div>

            {/* User Search Bar */}
            <div style={{ padding: "0.75rem 1rem", background: "var(--bg-input)", borderBottom: "1px solid var(--border-color)" }}>
              <div style={{ position: "relative", maxWidth: "320px", display: "flex", alignItems: "center" }}>
                <Search size={14} style={{ position: "absolute", left: "0.75rem", color: "var(--text-muted)" }} />
                <input
                  type="text"
                  placeholder="Search users by name, email, or role..."
                  value={userSearch}
                  onChange={(e) => {
                    setUserSearch(e.target.value);
                    setUserPage(1);
                  }}
                  className="input"
                  style={{ width: "100%", paddingLeft: "2.2rem", fontSize: "0.8rem" }}
                />
                {userSearch && (
                  <button
                    type="button"
                    onClick={() => { setUserSearch(""); setUserPage(1); }}
                    className="watchlist-clear-btn"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-color)", color: "var(--text-muted)", background: "var(--bg-input)" }}>
                    <th style={{ padding: "0.7rem 0.85rem" }}>Full Name</th>
                    <th style={{ padding: "0.7rem 0.85rem" }}>Email</th>
                    <th style={{ padding: "0.7rem 0.85rem" }}>Assigned Role</th>
                    <th style={{ padding: "0.7rem 0.85rem" }}>Role Change</th>
                    <th style={{ padding: "0.7rem 0.85rem", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedUsers.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ padding: "2rem 1rem", textAlign: "center", color: "var(--text-muted)" }}>
                        No users matching "{userSearch}"
                      </td>
                    </tr>
                  ) : (
                    pagedUsers.map((u) => (
                      <tr key={u.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                        <td style={{ padding: "0.7rem 0.85rem", fontWeight: "600" }}>{u.full_name}</td>
                        <td className="font-mono" style={{ padding: "0.7rem 0.85rem", color: "var(--text-secondary)" }}>{u.email}</td>
                        <td style={{ padding: "0.7rem 0.85rem" }}>
                          <span className={`badge ${u.role === "Admin" ? "badge-ai" : u.role === "Analyst" ? "badge-vwap" : "badge-secondary"}`}>
                            {u.role}
                          </span>
                        </td>
                        <td style={{ padding: "0.7rem 0.85rem" }}>
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            className="select"
                            style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem", width: "120px" }}
                          >
                            <option value="Admin">Admin</option>
                            <option value="Analyst">Analyst</option>
                            <option value="Viewer">Viewer</option>
                          </select>
                        </td>
                        <td style={{ padding: "0.7rem 0.85rem", textAlign: "right" }}>
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u.id, u.email)}
                            disabled={u.id === user?.id}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: "0.2rem 0.4rem", color: "var(--bear-red)" }}
                            title={u.id === user?.id ? "Cannot delete self" : "Delete user"}
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={userPage}
              totalItems={filteredUsers.length}
              pageSize={userPageSize}
              pageSizeOptions={[5, 10, 20]}
              onPageChange={(p) => setUserPage(p)}
              onPageSizeChange={(s) => {
                setUserPageSize(s);
                setUserPage(1);
              }}
              itemLabel="users"
            />
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-TAB 4: NEWS-CATEGORY CORRECTIONS & RETRAINING (ANALYST/ADMIN)*/}
      {/* ============================================================== */}
      {subTab === "corrections" && isAnalystOrAdmin && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <Tag size={18} color="var(--bull-green)" />
                <span>Audited Categorization Corrections &amp; AI Fine-Tuning Corpus</span>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={() => api.exportRetrainingDataset("json")}
                  className="btn btn-secondary btn-sm"
                  title="Export training corpus as structured JSON"
                >
                  <Download size={13} />
                  <span>Export JSON Dataset</span>
                </button>
                <button
                  onClick={() => api.exportRetrainingDataset("csv")}
                  className="btn btn-secondary btn-sm"
                  title="Export training corpus as tabular CSV"
                >
                  <Download size={13} />
                  <span>Export CSV Dataset</span>
                </button>
              </div>
            </div>

            {/* Filter Search */}
            <div style={{ marginBottom: "0.75rem" }}>
              <input
                type="text"
                placeholder="Filter corrections by symbol, headline, or analyst..."
                value={corrSearch}
                onChange={(e) => {
                  setCorrSearch(e.target.value);
                  setCorrPage(1);
                }}
                className="input"
                style={{ width: "100%", fontSize: "0.8rem" }}
              />
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-color)", color: "var(--text-muted)" }}>
                    <th style={{ padding: "0.6rem" }}>Timestamp</th>
                    <th style={{ padding: "0.6rem" }}>Company</th>
                    <th style={{ padding: "0.6rem" }}>Article Headline</th>
                    <th style={{ padding: "0.6rem" }}>Action</th>
                    <th style={{ padding: "0.6rem" }}>Prev &rarr; New Conf</th>
                    <th style={{ padding: "0.6rem" }}>Analyst</th>
                    <th style={{ padding: "0.6rem" }}>Audit Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedCorrections.map((c) => (
                    <tr key={c.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                      <td className="font-mono" style={{ padding: "0.6rem", color: "var(--text-muted)" }}>
                        {new Date(c.created_at).toLocaleDateString()}
                      </td>
                      <td className="font-mono" style={{ padding: "0.6rem", fontWeight: "700", color: "var(--blue-accent)" }}>
                        {c.company_symbol}
                      </td>
                      <td style={{ padding: "0.6rem", maxWidth: "260px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {c.article_headline}
                      </td>
                      <td style={{ padding: "0.6rem" }}>
                        <span className="badge badge-ai" style={{ fontSize: "0.7rem" }}>
                          {c.action}
                        </span>
                      </td>
                      <td className="font-mono" style={{ padding: "0.6rem" }}>
                        {c.previous_confidence ?? "—"} &rarr; {c.new_confidence ?? "—"}
                      </td>
                      <td style={{ padding: "0.6rem", color: "var(--text-secondary)" }}>
                        {c.user_email}
                      </td>
                      <td style={{ padding: "0.6rem", color: "var(--text-muted)", fontSize: "0.75rem" }}>
                        {c.notes || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={corrPage}
              totalItems={filteredCorrections.length}
              pageSize={corrPageSize}
              pageSizeOptions={[5, 10, 20, 50]}
              onPageChange={(p) => setCorrPage(p)}
              onPageSizeChange={(s) => {
                setCorrPageSize(s);
                setCorrPage(1);
              }}
              itemLabel="corrections"
            />
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: ADD COMPANY TO WATCHLIST (ADMIN)                        */}
      {/* ============================================================== */}
      {showAddCompanyModal && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddCompanyModal(false);
          }}
        >
          <div className="modal-container" role="dialog" aria-modal="true" aria-labelledby="add-company-title">
            <div className="modal-header">
              <div className="modal-title-group">
                <div className="modal-icon-badge blue">
                  <Building2 size={18} />
                </div>
                <div>
                  <div id="add-company-title" className="modal-title-text">
                    Add Tracked Company
                  </div>
                  <div className="modal-subtitle-text">
                    Provision telemetry &amp; crawler monitoring for a new NEPSE ticker.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCompanyModal(false)}
                className="modal-close-btn"
                title="Close modal (Esc)"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddCompany} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
              <div className="modal-body">
                {/* Ticker Symbol */}
                <div className="modal-field">
                  <label className="modal-label">
                    <span>Ticker Symbol</span>
                    <span style={{ fontSize: "0.68rem", color: "var(--blue-accent)", textTransform: "none", fontWeight: 500 }}>Required</span>
                  </label>
                  <div className="modal-input-wrapper">
                    <Tag size={15} className="modal-input-icon" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. HBL, UPPER"
                      value={newCompany.symbol}
                      onChange={(e) => setNewCompany({ ...newCompany, symbol: e.target.value.toUpperCase() })}
                      className="modal-input font-mono"
                      style={{ fontWeight: "700", letterSpacing: "0.04em" }}
                    />
                  </div>
                </div>

                {/* Company Name */}
                <div className="modal-field">
                  <label className="modal-label">
                    <span>Official Company Name</span>
                    <span style={{ fontSize: "0.68rem", color: "var(--blue-accent)", textTransform: "none", fontWeight: 500 }}>Required</span>
                  </label>
                  <div className="modal-input-wrapper">
                    <Building2 size={15} className="modal-input-icon" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Himalayan Bank Limited"
                      value={newCompany.name}
                      onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                      className="modal-input"
                    />
                  </div>
                </div>

                {/* Sector */}
                <div className="modal-field">
                  <label className="modal-label">
                    <span>Sector Classification</span>
                  </label>
                  <div className="modal-select-wrapper">
                    <Layers size={15} className="modal-input-icon" />
                    <select
                      value={newCompany.sector}
                      onChange={(e) => setNewCompany({ ...newCompany, sector: e.target.value })}
                      className="modal-select"
                    >
                      <option value="Commercial Banks">Commercial Banks</option>
                      <option value="Manufacturing and Processing">Manufacturing and Processing</option>
                      <option value="Hydro Power">Hydro Power</option>
                      <option value="Investment">Investment</option>
                      <option value="Development Banks">Development Banks</option>
                      <option value="Others">Others</option>
                    </select>
                    <ChevronDown size={14} className="modal-select-chevron" />
                  </div>
                </div>

                {/* Search Keywords / Aliases */}
                <div className="modal-field">
                  <label className="modal-label">
                    <span>Aliases &amp; Search Keywords</span>
                    <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "none", fontWeight: 400 }}>Comma-separated</span>
                  </label>
                  <div className="modal-input-wrapper">
                    <Search size={15} className="modal-input-icon" />
                    <input
                      type="text"
                      placeholder="Himalayan Bank, HBL, Himalayan"
                      value={newCompany.aliases}
                      onChange={(e) => setNewCompany({ ...newCompany, aliases: e.target.value })}
                      className="modal-input"
                    />
                  </div>
                </div>
              </div>

              {/* Anchored Footer */}
              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setShowAddCompanyModal(false)}
                  className="btn btn-secondary"
                  style={{ padding: "0.5rem 1rem", fontSize: "0.8rem" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: "0.5rem 1.25rem", fontSize: "0.8rem" }}
                >
                  <Plus size={14} />
                  <span>Provision Company</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CREATE USER (ADMIN)                                    */}
      {/* ============================================================== */}
      {showAddUserModal && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddUserModal(false);
          }}
        >
          <div className="modal-container" role="dialog" aria-modal="true" aria-labelledby="create-user-modal-title">
            {/* Modal Header */}
            <div className="modal-header">
              <div className="modal-title-group">
                <div className="modal-icon-badge purple">
                  <UserPlus size={18} />
                </div>
                <div>
                  <div id="create-user-modal-title" className="modal-title-text">
                    Create System User Account
                  </div>
                  <div className="modal-subtitle-text">
                    Provision institutional credentials with role-based permissions.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddUserModal(false)}
                className="modal-close-btn"
                title="Close modal (Esc)"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body (Scrollable & Formatted) */}
            <form onSubmit={handleCreateUser} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
              <div className="modal-body">
                {/* Full Name */}
                <div className="modal-field">
                  <label className="modal-label">
                    <span>Full Name</span>
                    <span style={{ fontSize: "0.68rem", color: "var(--blue-accent)", textTransform: "none", fontWeight: 500 }}>Required</span>
                  </label>
                  <div className="modal-input-wrapper">
                    <User size={15} className="modal-input-icon" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. John Doe"
                      value={newUser.full_name}
                      onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                      className="modal-input"
                    />
                  </div>
                </div>

                {/* Email Account */}
                <div className="modal-field">
                  <label className="modal-label">
                    <span>Email Account</span>
                    <span style={{ fontSize: "0.68rem", color: "var(--blue-accent)", textTransform: "none", fontWeight: 500 }}>Required</span>
                  </label>
                  <div className="modal-input-wrapper">
                    <Mail size={15} className="modal-input-icon" />
                    <input
                      type="email"
                      required
                      placeholder="name@omway.com"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      className="modal-input"
                    />
                  </div>
                </div>

                {/* Initial Password */}
                <div className="modal-field">
                  <label className="modal-label">
                    <span>Initial Password</span>
                    <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "none", fontWeight: 400 }}>Min. 6 chars</span>
                  </label>
                  <div className="modal-input-wrapper">
                    <Lock size={15} className="modal-input-icon" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      className="modal-input"
                      style={{ paddingRight: "2.4rem" }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: "absolute",
                        right: "0.75rem",
                        background: "transparent",
                        border: "none",
                        color: "var(--text-muted)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center"
                      }}
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                {/* RBAC Role Selector */}
                <div className="modal-field">
                  <label className="modal-label">
                    <span>RBAC Role Permission</span>
                  </label>
                  <div className="modal-select-wrapper">
                    <Shield size={15} className="modal-input-icon" />
                    <select
                      value={newUser.role}
                      onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                      className="modal-select"
                    >
                      <option value="Admin">Admin (Full System Authority)</option>
                      <option value="Analyst">Analyst (Data Curation &amp; Exports)</option>
                      <option value="Viewer">Viewer (Read-Only Access)</option>
                    </select>
                    <ChevronDown size={14} className="modal-select-chevron" />
                  </div>

                  {/* Dynamic Role Capability Card */}
                  <div className="modal-role-card">
                    {newUser.role === "Admin" && (
                      <div>
                        <strong style={{ color: "var(--ai-purple)" }}>🛡️ Admin Privileges:</strong> Full control over data crawlers, unattended scheduler, company watchlists, and user credential management.
                      </div>
                    )}
                    {newUser.role === "Analyst" && (
                      <div>
                        <strong style={{ color: "var(--blue-accent)" }}>📊 Analyst Privileges:</strong> Full market matrix telemetry, news categorization auditing, model fine-tuning corpus curation, and PDF report exports.
                      </div>
                    )}
                    {newUser.role === "Viewer" && (
                      <div>
                        <strong style={{ color: "var(--bull-green)" }}>👁️ Viewer Privileges:</strong> Read-only real-time NEPSE charts, VWAP anomaly alerts, and institutional sentiment telemetry.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Anchored Modal Footer */}
              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="btn btn-secondary"
                  style={{ padding: "0.5rem 1rem", fontSize: "0.8rem" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: "0.5rem 1.25rem", fontSize: "0.8rem" }}
                >
                  <UserPlus size={14} />
                  <span>Provision Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: FAILURE DIAGNOSTIC TRACEBACK INSPECTOR                 */}
      {/* ============================================================== */}
      {selectedError && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedError(null);
          }}
        >
          <div className="modal-container modal-lg" role="dialog" aria-modal="true" aria-labelledby="error-trace-title">
            <div className="modal-header">
              <div className="modal-title-group">
                <div className="modal-icon-badge red">
                  <FileWarning size={18} />
                </div>
                <div>
                  <div id="error-trace-title" className="modal-title-text" style={{ color: "var(--bear-red)" }}>
                    Crawler Failure Diagnostic Traceback
                  </div>
                  <div className="modal-subtitle-text">
                    Detailed system stack trace and ingestion failure metadata.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedError(null)}
                className="modal-close-btn"
                title="Dismiss inspector"
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "0.75rem" }}>
                <div style={{ background: "var(--bg-input)", padding: "0.6rem", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>TARGET PORTAL</div>
                  <div style={{ fontWeight: "600", fontSize: "0.85rem" }}>{selectedError.portal}</div>
                </div>
                <div style={{ background: "var(--bg-input)", padding: "0.6rem", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>INGESTION TYPE</div>
                  <div style={{ fontWeight: "600", fontSize: "0.85rem" }}>{selectedError.crawl_type}</div>
                </div>
                <div style={{ background: "var(--bg-input)", padding: "0.6rem", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>TIMESTAMP</div>
                  <div className="font-mono" style={{ fontSize: "0.8rem" }}>{new Date(selectedError.started_at).toLocaleString()}</div>
                </div>
                <div style={{ background: "var(--bg-input)", padding: "0.6rem", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>STATUS</div>
                  <div><span className="badge badge-bear">{selectedError.status}</span></div>
                </div>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.45rem" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "600" }}>ERROR DIAGNOSTIC TRACE</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedError.error_message || "");
                      setCopiedError(true);
                      setTimeout(() => setCopiedError(false), 2000);
                    }}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: "0.7rem", padding: "0.2rem 0.55rem" }}
                  >
                    {copiedError ? <Check size={12} color="var(--bull-green)" /> : <Copy size={12} />}
                    <span>{copiedError ? "Copied" : "Copy Trace"}</span>
                  </button>
                </div>
                <pre className="font-mono" style={{
                  background: "var(--bg-input)",
                  border: "1px solid rgba(239, 68, 68, 0.35)",
                  padding: "0.85rem",
                  borderRadius: "8px",
                  color: "var(--bear-red)",
                  fontSize: "0.78rem",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  lineHeight: "1.5",
                  maxHeight: "220px",
                  overflowY: "auto"
                }}>
                  {selectedError.error_message || "No specific error trace surfaced."}
                </pre>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                onClick={() => setSelectedError(null)}
                className="btn btn-secondary"
                style={{ padding: "0.5rem 1rem", fontSize: "0.8rem" }}
              >
                Dismiss Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
