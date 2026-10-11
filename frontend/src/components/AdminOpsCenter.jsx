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
  Check
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
  const [crawlLogs, setCrawlLogs] = useState([]);
  const [userList, setUserList] = useState([]);
  const [selectedPortal, setSelectedPortal] = useState("all");
  const [selectedType, setSelectedType] = useState("NEWS");
  const [loading, setLoading] = useState(false);
  const [dispatchSuccess, setDispatchSuccess] = useState(false);
  const [activeScan, setActiveScan] = useState(false);
  const [actionMsg, setActionMsg] = useState(null);

  // Pagination & Filtering state for logs
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

  const fetchUsers = async () => {
    if (!isAdmin) return;
    try {
      const users = await api.getAdminUsers();
      setUserList(users);
    } catch (err) {
      console.warn("Could not load users:", err.message);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchUsers();
  }, [user]);

  // Filter logs based on search, portal, and status
  const filteredLogs = useMemo(() => {
    return crawlLogs.filter((log) => {
      if (statusFilter !== "ALL" && log.status !== statusFilter) {
        return false;
      }
      if (filterPortal !== "all" && log.portal !== filterPortal) {
        return false;
      }
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
      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredLogs, sortField, sortDirection]);

  // Auto-clamp page if sortedLogs length decreases
  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(sortedLogs.length / logPageSize));
    if (logPage > totalPages) {
      setLogPage(1);
    }
  }, [sortedLogs.length, logPageSize]);

  // Paginated window
  const paginatedLogs = useMemo(() => {
    const start = (logPage - 1) * logPageSize;
    return sortedLogs.slice(start, start + logPageSize);
  }, [sortedLogs, logPage, logPageSize]);

  const successCount = crawlLogs.filter((l) => l.status === "SUCCESS").length;
  const failedCount = crawlLogs.filter((l) => l.status === "FAILED").length;

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection(field === "started_at" ? "desc" : "asc");
    }
  };

  const renderSortIndicator = (field) => {
    if (sortField !== field) {
      return (
        <span className="sort-icon-box" style={{ opacity: 0.35 }}>
          <ArrowUpDown size={11} />
        </span>
      );
    }
    return (
      <span className="sort-icon-box" style={{ color: "var(--blue-accent)" }}>
        {sortDirection === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
      </span>
    );
  };

  const handleTriggerCrawl = async () => {
    if (!isAdmin) {
      setActionMsg({ type: "error", text: "Error: Triggering crawl runs requires Admin role." });
      return;
    }
    setLoading(true);
    setActiveScan(true);
    setActionMsg(null);
    try {
      const res = await api.triggerCrawlRun(selectedPortal, selectedType);
      setDispatchSuccess(true);
      setActionMsg({
        type: "success",
        text: `Success: ${res.message} (Target: ${selectedPortal})`
      });
      setTimeout(() => fetchLogs(), 1200);
      setTimeout(() => setDispatchSuccess(false), 2400);
      setTimeout(() => setActionMsg(null), 6000);
    } catch (err) {
      setActionMsg({ type: "error", text: `Error: ${err.message}` });
    } finally {
      setLoading(false);
      setTimeout(() => setActiveScan(false), 2500);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* RBAC Notice Banner if not Admin */}
      {!isAdmin && (
        <div style={{
          background: "rgba(245, 158, 11, 0.15)",
          border: "1px solid rgba(245, 158, 11, 0.4)",
          borderRadius: "8px",
          padding: "0.75rem 1rem",
          display: "flex",
          alignItems: "center",
          gap: "0.6rem",
          fontSize: "0.85rem",
          color: "var(--anomaly-amber)"
        }}>
          <ShieldAlert size={18} />
          <div>
            <strong>RBAC Notice:</strong> You are currently logged in as <strong>{user?.role || "Viewer"}</strong>.
            Crawl execution is restricted to <strong>Admin</strong>. Switch role in the top header to test administrative permissions.
          </div>
        </div>
      )}

      {/* Target Portals Health Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem" }}>
        {PORTALS.map((p) => {
          const isTargeted = activeScan && (selectedPortal === "all" || selectedPortal === p.name);
          return (
            <div
              key={p.name}
              className={`card ${isTargeted ? "telemetry-pulse" : ""}`}
              style={{
                transition: "all 0.3s ease",
                borderColor: isTargeted ? "var(--blue-accent)" : "var(--border-color)"
              }}
            >
              <div className="card-header" style={{ marginBottom: "0.4rem" }}>
                <span style={{ fontWeight: "700", color: "var(--text-primary)", fontSize: "0.9rem" }}>{p.name}</span>
                <span className="badge badge-bull">Active</span>
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                {p.type}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "var(--text-secondary)", borderTop: "1px solid var(--border-color)", paddingTop: "0.4rem" }}>
                <span>Rate Limit: <strong style={{ color: "var(--text-primary)" }}>{p.rateLimit}</strong></span>
                <span>Robots.txt: <strong style={{ color: "var(--bull-green)" }}>{p.robots}</strong></span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Crawl Control Console (Role-gated: Admin) */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Bot size={18} color="var(--blue-accent)" />
            <span>Distributed Crawler Job Dispatcher</span>
          </div>
          <span className="badge badge-ai">Async Queue / Token Bucket</span>
        </div>

        <div style={{
          display: "flex",
          gap: "1rem",
          alignItems: "center",
          flexWrap: "wrap",
          background: "var(--bg-input)",
          padding: "1rem",
          borderRadius: "10px",
          border: "1px solid var(--border-color)"
        }}>
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
              Select Portal Target
            </label>
            <select
              value={selectedPortal}
              onChange={(e) => setSelectedPortal(e.target.value)}
              className="select"
              disabled={!isAdmin}
            >
              <option value="all">All Portals (Merolagani, ShareSansar, NepseAlpha, Bizmandu)</option>
              <option value="merolagani.com">merolagani.com</option>
              <option value="sharesansar.com">sharesansar.com</option>
              <option value="nepsealpha.com">nepsealpha.com</option>
              <option value="bizmandu.com">bizmandu.com</option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
              Crawl Ingestion Type
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="select"
              disabled={!isAdmin}
            >
              <option value="NEWS">Financial News Articles</option>
              <option value="OHLCV">30-Day OHLCV Price Bars</option>
              <option value="FLOORSHEET">Floorsheet Transactions</option>
            </select>
          </div>

          <div style={{ alignSelf: "flex-end" }}>
            <button
              onClick={handleTriggerCrawl}
              className={`btn-dispatch-crawl ${loading ? "dispatching" : ""} ${dispatchSuccess ? "dispatched-success" : ""}`}
              disabled={!isAdmin || loading}
              title={isAdmin ? "Initiate parallel distributed crawl run" : "Requires Admin role"}
            >
              {loading && <span className="dispatch-radar-ping" />}

              <div className="dispatch-btn-content">
                {loading ? (
                  <>
                    <RefreshCw size={15} className="spin-fast" />
                    <span>Dispatching Crawlers...</span>
                  </>
                ) : dispatchSuccess ? (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Crawl Run Dispatched!</span>
                  </>
                ) : (
                  <>
                    <Play size={15} />
                    <span>Dispatch Crawl Run</span>
                  </>
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Radar Scanner Beam when crawl is triggered */}
        {activeScan && (
          <div className="crawler-radar-scanner">
            <div className="crawler-scanner-beam" />
          </div>
        )}

        {/* Action Status Banner with auto-dismiss */}
        {actionMsg && (
          <div className={`action-msg-banner ${actionMsg.type}`}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
              {actionMsg.type === "error" ? (
                <AlertTriangle size={16} />
              ) : (
                <CheckCircle2 size={16} />
              )}
              <span>{actionMsg.text}</span>
            </div>
            <button
              onClick={() => setActionMsg(null)}
              className="action-msg-close"
              title="Dismiss notice"
            >
              <X size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Crawl Run Logs & Failure Inspector */}
      <div className="card" style={{ paddingBottom: 0 }}>
        <div className="card-header" style={{ marginBottom: "0.85rem" }}>
          <div className="card-title">
            <Server size={18} color="var(--blue-accent)" />
            <span>Crawl Monitoring &amp; Failure Log Inspector (Surfaced to UI)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              {crawlLogs.length} Total Logs
            </span>
            <button 
              onClick={fetchLogs} 
              className="btn btn-secondary btn-sm"
              disabled={isRefreshingLogs}
              title="Reload recent crawl execution logs"
            >
              <RefreshCw size={12} className={isRefreshingLogs ? "spin-fast" : ""} />
              <span>{isRefreshingLogs ? "Refreshing..." : "Refresh Logs"}</span>
            </button>
          </div>
        </div>

        {/* Filters & Search Toolbar */}
        <div className="logs-toolbar">
          <div className="logs-toolbar-left">
            {/* Status Pills */}
            <button
              onClick={() => { setStatusFilter("ALL"); setLogPage(1); }}
              className={`status-pill-btn ${statusFilter === "ALL" ? "active" : ""}`}
            >
              All ({crawlLogs.length})
            </button>
            <button
              onClick={() => { setStatusFilter("SUCCESS"); setLogPage(1); }}
              className={`status-pill-btn success ${statusFilter === "SUCCESS" ? "active" : ""}`}
            >
              <CheckCircle size={11} />
              Success ({successCount})
            </button>
            <button
              onClick={() => { setStatusFilter("FAILED"); setLogPage(1); }}
              className={`status-pill-btn failed ${statusFilter === "FAILED" ? "active" : ""}`}
            >
              <XCircle size={11} />
              Failed ({failedCount})
            </button>

            {/* Portal Filter Select */}
            <select
              value={filterPortal}
              onChange={(e) => {
                setFilterPortal(e.target.value);
                setLogPage(1);
              }}
              className="select"
              style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem", height: "30px" }}
              title="Filter by target portal"
            >
              <option value="all">All Portals</option>
              <option value="merolagani.com">merolagani.com</option>
              <option value="sharesansar.com">sharesansar.com</option>
              <option value="nepsealpha.com">nepsealpha.com</option>
              <option value="bizmandu.com">bizmandu.com</option>
            </select>
          </div>

          <div className="logs-toolbar-right">
            {/* Search Input */}
            <div className="logs-search-wrapper">
              <Search size={13} style={{ position: "absolute", left: "9px", color: "var(--text-muted)" }} />
              <input
                type="text"
                placeholder="Search portal, type, error..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setLogPage(1);
                }}
                className="logs-search-input"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  style={{
                    position: "absolute",
                    right: "7px",
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    display: "flex"
                  }}
                  title="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Clear All Filters Button */}
            {(statusFilter !== "ALL" || filterPortal !== "all" || searchQuery) && (
              <button
                onClick={() => {
                  setStatusFilter("ALL");
                  setFilterPortal("all");
                  setSearchQuery("");
                  setLogPage(1);
                }}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: "0.72rem", padding: "0.25rem 0.5rem" }}
                title="Reset all active filters"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {crawlLogs.length === 0 ? (
          <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", padding: "1.5rem", textAlign: "center" }}>
            No crawl execution logs available or insufficient permission.
          </div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", padding: "2rem", textAlign: "center" }}>
            No crawl logs match the selected filters or search query.
            <div style={{ marginTop: "0.5rem" }}>
              <button
                onClick={() => {
                  setStatusFilter("ALL");
                  setFilterPortal("all");
                  setSearchQuery("");
                }}
                className="btn btn-secondary btn-sm"
              >
                Clear Filters
              </button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-color)", color: "var(--text-muted)" }}>
                    <th 
                      onClick={() => handleSort("portal")} 
                      className="th-sortable" 
                      style={{ padding: "0.6rem 0.8rem" }}
                      title="Click to sort by Portal"
                    >
                      Portal {renderSortIndicator("portal")}
                    </th>
                    <th 
                      onClick={() => handleSort("crawl_type")} 
                      className="th-sortable" 
                      style={{ padding: "0.6rem 0.8rem" }}
                      title="Click to sort by Ingestion Type"
                    >
                      Type {renderSortIndicator("crawl_type")}
                    </th>
                    <th 
                      onClick={() => handleSort("status")} 
                      className="th-sortable" 
                      style={{ padding: "0.6rem 0.8rem" }}
                      title="Click to sort by Status"
                    >
                      Status {renderSortIndicator("status")}
                    </th>
                    <th 
                      onClick={() => handleSort("items_crawled")} 
                      className="th-sortable" 
                      style={{ padding: "0.6rem 0.8rem" }}
                      title="Click to sort by Items Crawled"
                    >
                      Items Crawled {renderSortIndicator("items_crawled")}
                    </th>
                    <th 
                      onClick={() => handleSort("started_at")} 
                      className="th-sortable" 
                      style={{ padding: "0.6rem 0.8rem" }}
                      title="Click to sort by Started At"
                    >
                      Started At {renderSortIndicator("started_at")}
                    </th>
                    <th style={{ padding: "0.6rem 0.8rem" }}>Failure / Error Message</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedLogs.map((log) => {
                    const isSuccess = log.status === "SUCCESS";
                    const isFailed = log.status === "FAILED";
                    return (
                      <tr key={log.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                        <td style={{ padding: "0.6rem 0.8rem", fontWeight: "600", color: "var(--text-primary)" }}>
                          {log.portal}
                        </td>
                        <td style={{ padding: "0.6rem 0.8rem" }}>
                          <span style={{ 
                            fontSize: "0.72rem", 
                            fontWeight: "600",
                            padding: "0.15rem 0.45rem", 
                            borderRadius: "4px", 
                            background: "var(--bg-input)", 
                            border: "1px solid var(--border-color)" 
                          }}>
                            {log.crawl_type}
                          </span>
                        </td>
                        <td style={{ padding: "0.6rem 0.8rem" }}>
                          <span
                            className={`badge ${isSuccess ? "badge-bull" : isFailed ? "badge-bear" : "badge-vwap"}`}
                            style={{ fontSize: "0.72rem" }}
                          >
                            {isSuccess && <CheckCircle size={10} />}
                            {isFailed && <XCircle size={10} />}
                            {log.status}
                          </span>
                        </td>
                        <td className="font-mono" style={{ padding: "0.6rem 0.8rem", fontWeight: "600" }}>
                          {log.items_crawled}
                        </td>
                        <td className="font-mono" style={{ padding: "0.6rem 0.8rem", color: "var(--text-muted)" }}>
                          {new Date(log.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                        <td style={{ padding: "0.6rem 0.8rem", color: isFailed ? "var(--bear-red)" : "var(--text-muted)", maxWidth: "340px" }}>
                          {log.error_message ? (
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                              <span style={{ 
                                overflow: "hidden", 
                                textOverflow: "ellipsis", 
                                whiteSpace: "nowrap", 
                                maxWidth: "240px",
                                fontSize: "0.75rem"
                              }}>
                                {log.error_message}
                              </span>
                              <button
                                onClick={() => setSelectedError(log)}
                                className="btn btn-secondary btn-sm"
                                style={{ padding: "0.15rem 0.45rem", fontSize: "0.68rem" }}
                                title="Inspect failure traceback details"
                              >
                                <Eye size={11} />
                                <span>Inspect</span>
                              </button>
                            </div>
                          ) : (
                            "— No errors reported —"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Component */}
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
          </>
        )}
      </div>

      {/* Role Governance & Users Roster */}
      {isAdmin && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Users size={18} color="var(--ai-purple)" />
              <span>RBAC User Governance &amp; Permissions Roster</span>
            </div>
            <span className="badge badge-ai">Server-Side Enforced</span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-color)", color: "var(--text-muted)" }}>
                  <th style={{ padding: "0.6rem" }}>User Name</th>
                  <th style={{ padding: "0.6rem" }}>Email Account</th>
                  <th style={{ padding: "0.6rem" }}>Role</th>
                  <th style={{ padding: "0.6rem" }}>Permissions Granted</th>
                </tr>
              </thead>
              <tbody>
                {userList.map((u) => (
                  <tr key={u.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                    <td style={{ padding: "0.6rem", fontWeight: "600", color: "var(--text-primary)" }}>{u.full_name}</td>
                    <td className="font-mono" style={{ padding: "0.6rem", color: "var(--text-secondary)" }}>{u.email}</td>
                    <td style={{ padding: "0.6rem" }}>
                      <span className={`badge ${u.role === "Admin" ? "badge-ai" : u.role === "Analyst" ? "badge-vwap" : "badge-secondary"}`}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ padding: "0.6rem", color: "var(--text-muted)", fontSize: "0.75rem" }}>
                      {u.role === "Admin"
                        ? "Manage watchlist, trigger/monitor crawl runs, manage users"
                        : u.role === "Analyst"
                        ? "View all data, correct news categorization, export reports"
                        : "Read-only dashboards and behavior reports"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Failure Diagnostic Inspector Modal */}
      {selectedError && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.7)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 100,
          padding: "1rem"
        }}>
          <div className="card" style={{ maxWidth: "640px", width: "100%", maxHeight: "85vh", overflowY: "auto" }}>
            <div className="card-header" style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "0.75rem", marginBottom: "1rem" }}>
              <div className="card-title" style={{ color: "var(--bear-red)" }}>
                <FileWarning size={18} />
                <span>Crawler Failure Diagnostic Traceback</span>
              </div>
              <button
                onClick={() => setSelectedError(null)}
                className="action-msg-close"
                title="Close inspector"
              >
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
              <button
                onClick={() => setSelectedError(null)}
                className="btn btn-secondary"
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
