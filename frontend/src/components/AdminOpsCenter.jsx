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
  Database
} from "lucide-react";
import { Pagination } from "./Pagination";

const PORTALS = [
  { name: "merolagani.com", type: "Financial News & Quotes", rateLimit: "2.0s", robots: "Compliant" },
  { name: "sharesansar.com", type: "Market News & Floorsheet", rateLimit: "2.0s", robots: "Compliant" },
  { name: "nepsealpha.com", type: "Technical Charts & News", rateLimit: "2.0s", robots: "Compliant" },
  { name: "bizmandu.com", type: "Economic Journalism", rateLimit: "2.0s", robots: "Compliant" },
];

export const AdminOpsCenter = () => {
  const { user } = useAuth();
  const [subTab, setSubTab] = useState("crawlers"); // "crawlers", "watchlist", "users", "corrections"
  
  // Crawler & Scheduler State
  const [crawlLogs, setCrawlLogs] = useState([]);
  const [selectedPortal, setSelectedPortal] = useState("all");
  const [selectedType, setSelectedType] = useState("NEWS");
  const [loading, setLoading] = useState(false);
  const [dispatchSuccess, setDispatchSuccess] = useState(false);
  const [actionMsg, setActionMsg] = useState(null);
  const [schedulerStatus, setSchedulerStatus] = useState(null);

  // Watchlist State
  const [companies, setCompanies] = useState([]);
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
  const [newCompany, setNewCompany] = useState({ symbol: "", name: "", sector: "Commercial Banks", aliases: "" });
  const [isSyncingConfig, setIsSyncingConfig] = useState(false);

  // User Governance State
  const [userList, setUserList] = useState([]);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUser, setNewUser] = useState({ full_name: "", email: "", password: "", role: "Analyst" });

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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Header and Operational Sub-tabs */}
      <div style={{
        background: "var(--bg-secondary)",
        borderRadius: "12px",
        padding: "1rem 1.25rem",
        border: "1px solid var(--border-color)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "1rem"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{
            background: "linear-gradient(135deg, #8b5cf6, #3b82f6)",
            width: "36px",
            height: "36px",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff"
          }}>
            <Bot size={20} />
          </div>
          <div>
            <div style={{ fontWeight: "700", fontSize: "1.05rem" }}>
              Operations &amp; Governance Center
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
              Data Pipeline Automation, Watchlist Config, Role RBAC &amp; AI Retraining
            </div>
          </div>
        </div>

        {/* Sub-tab Pills */}
        <div style={{ display: "flex", gap: "0.4rem", background: "var(--bg-input)", padding: "0.25rem", borderRadius: "10px", border: "1px solid var(--border-color)" }}>
          <button
            onClick={() => setSubTab("crawlers")}
            className={`btn btn-sm ${subTab === "crawlers" ? "btn-primary" : "btn-secondary"}`}
            style={{ fontSize: "0.76rem" }}
          >
            <Server size={13} />
            <span>Crawlers &amp; Scheduler</span>
          </button>
          
          {isAdmin && (
            <button
              onClick={() => setSubTab("watchlist")}
              className={`btn btn-sm ${subTab === "watchlist" ? "btn-primary" : "btn-secondary"}`}
              style={{ fontSize: "0.76rem" }}
            >
              <Database size={13} />
              <span>Watchlist Mgmt</span>
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => setSubTab("users")}
              className={`btn btn-sm ${subTab === "users" ? "btn-primary" : "btn-secondary"}`}
              style={{ fontSize: "0.76rem" }}
            >
              <Users size={13} />
              <span>RBAC User Governance</span>
            </button>
          )}

          {isAnalystOrAdmin && (
            <button
              onClick={() => setSubTab("corrections")}
              className={`btn btn-sm ${subTab === "corrections" ? "btn-primary" : "btn-secondary"}`}
              style={{ fontSize: "0.76rem" }}
            >
              <Tag size={13} />
              <span>News Audit &amp; Retraining ({corrections.length})</span>
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
              {isAdmin && (
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
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <Bot size={18} color="var(--blue-accent)" />
                <span>Distributed Ingestion Queue Dispatcher</span>
              </div>
              <span className="badge badge-ai">Async Queue (Redis / In-Memory Worker)</span>
            </div>

            <div style={{ display: "flex", gap: "1rem", alignItems: "flex-end", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: "180px" }}>
                <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.35rem" }}>
                  TARGET PORTAL
                </label>
                <select
                  value={selectedPortal}
                  onChange={(e) => setSelectedPortal(e.target.value)}
                  className="select"
                  disabled={!isAdmin}
                >
                  <option value="all">All Portals (Concurrent Distributed Queue)</option>
                  {PORTALS.map((p) => (
                    <option key={p.name} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ flex: 1, minWidth: "160px" }}>
                <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.35rem" }}>
                  INGESTION STREAM
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="select"
                  disabled={!isAdmin}
                >
                  <option value="NEWS">Financial News Articles</option>
                  <option value="OHLCV">Daily OHLCV Telemetry</option>
                  <option value="FLOORSHEET">Floorsheet Broker Transactions</option>
                </select>
              </div>

              <button
                onClick={handleTriggerCrawl}
                disabled={!isAdmin || loading}
                className="btn btn-primary"
                style={{ padding: "0.55rem 1.25rem", height: "38px" }}
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
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <Database size={18} color="var(--blue-accent)" />
                <span>Tracked NEPSE Companies Watchlist</span>
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

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-color)", color: "var(--text-muted)" }}>
                    <th style={{ padding: "0.6rem" }}>Symbol</th>
                    <th style={{ padding: "0.6rem" }}>Company Name</th>
                    <th style={{ padding: "0.6rem" }}>Sector</th>
                    <th style={{ padding: "0.6rem" }}>Aliases / Keywords</th>
                    <th style={{ padding: "0.6rem" }}>Status</th>
                    <th style={{ padding: "0.6rem", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((c) => (
                    <tr key={c.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                      <td className="font-mono" style={{ padding: "0.6rem", fontWeight: "700", color: "var(--text-primary)" }}>
                        {c.symbol}
                      </td>
                      <td style={{ padding: "0.6rem", fontWeight: "500" }}>{c.name}</td>
                      <td style={{ padding: "0.6rem", color: "var(--text-secondary)" }}>{c.sector}</td>
                      <td style={{ padding: "0.6rem", color: "var(--text-muted)", fontSize: "0.75rem" }}>
                        {c.aliases || "—"}
                      </td>
                      <td style={{ padding: "0.6rem" }}>
                        <span className={`badge ${c.is_active ? "badge-bull" : "badge-secondary"}`}>
                          {c.is_active ? "ACTIVE" : "INACTIVE"}
                        </span>
                      </td>
                      <td style={{ padding: "0.6rem", textAlign: "right" }}>
                        <div style={{ display: "flex", gap: "0.4rem", justifyContent: "flex-end" }}>
                          <button
                            onClick={() => handleToggleCompanyActive(c.id, c.is_active)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: "0.2rem 0.5rem", fontSize: "0.7rem" }}
                            title="Toggle active status"
                          >
                            {c.is_active ? "Deactivate" : "Activate"}
                          </button>
                          <button
                            onClick={() => handleDeleteCompany(c.id, c.symbol)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: "0.2rem 0.4rem", color: "var(--bear-red)" }}
                            title="Remove company"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-TAB 3: USER GOVERNANCE & ACCESS CONTROL (ADMIN)           */}
      {/* ============================================================== */}
      {subTab === "users" && isAdmin && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <Users size={18} color="var(--ai-purple)" />
                <span>RBAC User Accounts &amp; Permissions</span>
              </div>
              <button
                onClick={() => setShowAddUserModal(true)}
                className="btn btn-primary btn-sm"
              >
                <Plus size={14} />
                <span>Create User</span>
              </button>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-color)", color: "var(--text-muted)" }}>
                    <th style={{ padding: "0.6rem" }}>Full Name</th>
                    <th style={{ padding: "0.6rem" }}>Email</th>
                    <th style={{ padding: "0.6rem" }}>Assigned Role</th>
                    <th style={{ padding: "0.6rem" }}>Role Change</th>
                    <th style={{ padding: "0.6rem", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {userList.map((u) => (
                    <tr key={u.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                      <td style={{ padding: "0.6rem", fontWeight: "600" }}>{u.full_name}</td>
                      <td className="font-mono" style={{ padding: "0.6rem", color: "var(--text-secondary)" }}>{u.email}</td>
                      <td style={{ padding: "0.6rem" }}>
                        <span className={`badge ${u.role === "Admin" ? "badge-ai" : u.role === "Analyst" ? "badge-vwap" : "badge-secondary"}`}>
                          {u.role}
                        </span>
                      </td>
                      <td style={{ padding: "0.6rem" }}>
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
                      <td style={{ padding: "0.6rem", textAlign: "right" }}>
                        <button
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
                  ))}
                </tbody>
              </table>
            </div>
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
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0, 0, 0, 0.7)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "1rem"
        }}>
          <div className="card" style={{ maxWidth: "480px", width: "100%" }}>
            <div className="card-header" style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "0.75rem", marginBottom: "1rem" }}>
              <div className="card-title">
                <Plus size={18} color="var(--blue-accent)" />
                <span>Add Tracked Company to Watchlist</span>
              </div>
              <button onClick={() => setShowAddCompanyModal(false)} className="action-msg-close">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleAddCompany} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                  TICKER SYMBOL (e.g. HBL)
                </label>
                <input
                  type="text"
                  required
                  placeholder="HBL"
                  value={newCompany.symbol}
                  onChange={(e) => setNewCompany({ ...newCompany, symbol: e.target.value.toUpperCase() })}
                  className="input"
                  style={{ width: "100%" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                  OFFICIAL COMPANY NAME
                </label>
                <input
                  type="text"
                  required
                  placeholder="Himalayan Bank Limited"
                  value={newCompany.name}
                  onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                  className="input"
                  style={{ width: "100%" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                  SECTOR
                </label>
                <select
                  value={newCompany.sector}
                  onChange={(e) => setNewCompany({ ...newCompany, sector: e.target.value })}
                  className="select"
                  style={{ width: "100%" }}
                >
                  <option value="Commercial Banks">Commercial Banks</option>
                  <option value="Manufacturing and Processing">Manufacturing and Processing</option>
                  <option value="Hydro Power">Hydro Power</option>
                  <option value="Investment">Investment</option>
                  <option value="Development Banks">Development Banks</option>
                  <option value="Others">Others</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                  ALIASES / SEARCH KEYWORDS (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="Himalayan Bank, HBL"
                  value={newCompany.aliases}
                  onChange={(e) => setNewCompany({ ...newCompany, aliases: e.target.value })}
                  className="input"
                  style={{ width: "100%" }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
                <button type="button" onClick={() => setShowAddCompanyModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Provision Company &amp; Telemetry
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
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0, 0, 0, 0.7)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "1rem"
        }}>
          <div className="card" style={{ maxWidth: "440px", width: "100%" }}>
            <div className="card-header" style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "0.75rem", marginBottom: "1rem" }}>
              <div className="card-title">
                <Users size={18} color="var(--ai-purple)" />
                <span>Create System User Account</span>
              </div>
              <button onClick={() => setShowAddUserModal(false)} className="action-msg-close">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateUser} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                  FULL NAME
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                  className="input"
                  style={{ width: "100%" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                  EMAIL ACCOUNT
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@omway.com"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="input"
                  style={{ width: "100%" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                  INITIAL PASSWORD
                </label>
                <input
                  type="password"
                  required
                  placeholder="******"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="input"
                  style={{ width: "100%" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                  RBAC ROLE
                </label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="select"
                  style={{ width: "100%" }}
                >
                  <option value="Admin">Admin (Full Control, Watchlist, Users, Crawlers)</option>
                  <option value="Analyst">Analyst (All Data, News Recategorize, Report Export)</option>
                  <option value="Viewer">Viewer (Read-Only Dashboards)</option>
                </select>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
                <button type="button" onClick={() => setShowAddUserModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create User
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
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0, 0, 0, 0.7)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "1rem"
        }}>
          <div className="card" style={{ maxWidth: "640px", width: "100%", maxHeight: "85vh", overflowY: "auto" }}>
            <div className="card-header" style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "0.75rem", marginBottom: "1rem" }}>
              <div className="card-title" style={{ color: "var(--bear-red)" }}>
                <FileWarning size={18} />
                <span>Crawler Failure Diagnostic Traceback</span>
              </div>
              <button onClick={() => setSelectedError(null)} className="action-msg-close">
                <X size={16} />
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "0.75rem", marginBottom: "1rem" }}>
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

            <div style={{ marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "600" }}>ERROR DIAGNOSTIC TRACE</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(selectedError.error_message || "");
                    setCopiedError(true);
                    setTimeout(() => setCopiedError(false), 2000);
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: "0.7rem", padding: "0.2rem 0.5rem" }}
                >
                  {copiedError ? <Check size={12} color="var(--bull-green)" /> : <Copy size={12} />}
                  <span>{copiedError ? "Copied" : "Copy Error"}</span>
                </button>
              </div>
              <pre className="font-mono" style={{
                background: "var(--bg-input)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                padding: "0.85rem",
                borderRadius: "8px",
                color: "var(--bear-red)",
                fontSize: "0.78rem",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                lineHeight: "1.5"
              }}>
                {selectedError.error_message || "No specific error text surfaced."}
              </pre>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setSelectedError(null)} className="btn btn-secondary">
                Dismiss Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
