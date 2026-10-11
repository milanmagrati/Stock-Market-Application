import React, { useState, useEffect } from "react";
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
  FileWarning 
} from "lucide-react";

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
  const [actionMsg, setActionMsg] = useState("");

  const isAdmin = user?.role === "Admin";
  const isAnalystOrAdmin = user?.role === "Admin" || user?.role === "Analyst";

  const fetchLogs = async () => {
    if (!isAnalystOrAdmin) return;
    try {
      const logs = await api.getCrawlLogs(30);
      setCrawlLogs(logs);
    } catch (err) {
      console.warn("Could not load crawl logs:", err.message);
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

  const handleTriggerCrawl = async () => {
    if (!isAdmin) {
      setActionMsg("Error: Triggering crawl runs requires Admin role.");
      return;
    }
    setLoading(true);
    setActionMsg("");
    try {
      const res = await api.triggerCrawlRun(selectedPortal, selectedType);
      setActionMsg(`Success: ${res.message}`);
      setTimeout(() => fetchLogs(), 1500);
    } catch (err) {
      setActionMsg(`Error: ${err.message}`);
    } finally {
      setLoading(false);
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
        {PORTALS.map((p) => (
          <div key={p.name} className="card">
            <div className="card-header" style={{ marginBottom: "0.4rem" }}>
              <span style={{ fontWeight: "700", color: "#fff", fontSize: "0.9rem" }}>{p.name}</span>
              <span className="badge badge-bull">Active</span>
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
              {p.type}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "var(--text-secondary)", borderTop: "1px solid var(--border-color)", paddingTop: "0.4rem" }}>
              <span>Rate Limit: <strong style={{ color: "#fff" }}>{p.rateLimit}</strong></span>
              <span>Robots.txt: <strong style={{ color: "var(--bull-green)" }}>{p.robots}</strong></span>
            </div>
          </div>
        ))}
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
          borderRadius: "8px",
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
              className="btn btn-primary"
              disabled={!isAdmin || loading}
            >
              {loading ? <RefreshCw size={14} className="spin" /> : <Play size={14} />}
              <span>{loading ? "Queueing Job..." : "Dispatch Crawl Run"}</span>
            </button>
          </div>
        </div>

        {actionMsg && (
          <div style={{
            marginTop: "0.75rem",
            padding: "0.6rem",
            borderRadius: "6px",
            fontSize: "0.8rem",
            background: actionMsg.startsWith("Error") ? "var(--bear-red-bg)" : "var(--bull-green-bg)",
            color: actionMsg.startsWith("Error") ? "var(--bear-red)" : "var(--bull-green)",
          }}>
            {actionMsg}
          </div>
        )}
      </div>

      {/* Crawl Run Logs & Failure Inspector */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Server size={18} color="var(--blue-accent)" />
            <span>Crawl Monitoring &amp; Failure Log Inspector (Surfaced to UI)</span>
          </div>
          <button onClick={fetchLogs} className="btn btn-secondary btn-sm">
            <RefreshCw size={12} />
            <span>Refresh Logs</span>
          </button>
        </div>

        {crawlLogs.length === 0 ? (
          <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", padding: "1.5rem", textAlign: "center" }}>
            No crawl execution logs available or insufficient permission.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-color)", color: "var(--text-muted)" }}>
                  <th style={{ padding: "0.6rem" }}>Portal</th>
                  <th style={{ padding: "0.6rem" }}>Type</th>
                  <th style={{ padding: "0.6rem" }}>Status</th>
                  <th style={{ padding: "0.6rem" }}>Items Crawled</th>
                  <th style={{ padding: "0.6rem" }}>Started At</th>
                  <th style={{ padding: "0.6rem" }}>Failure / Error Message</th>
                </tr>
              </thead>
              <tbody>
                {crawlLogs.map((log) => {
                  const isSuccess = log.status === "SUCCESS";
                  const isFailed = log.status === "FAILED";
                  return (
                    <tr key={log.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                      <td style={{ padding: "0.6rem", fontWeight: "600" }}>{log.portal}</td>
                      <td style={{ padding: "0.6rem" }}>{log.crawl_type}</td>
                      <td style={{ padding: "0.6rem" }}>
                        <span
                          className={`badge ${isSuccess ? "badge-bull" : isFailed ? "badge-bear" : "badge-vwap"}`}
                          style={{ fontSize: "0.72rem" }}
                        >
                          {isSuccess && <CheckCircle size={10} />}
                          {isFailed && <XCircle size={10} />}
                          {log.status}
                        </span>
                      </td>
                      <td className="font-mono" style={{ padding: "0.6rem" }}>{log.items_crawled}</td>
                      <td className="font-mono" style={{ padding: "0.6rem", color: "var(--text-muted)" }}>
                        {new Date(log.started_at).toLocaleTimeString()}
                      </td>
                      <td style={{ padding: "0.6rem", color: isFailed ? "var(--bear-red)" : "var(--text-muted)", maxWidth: "320px" }}>
                        {log.error_message || "— No errors reported —"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
                    <td style={{ padding: "0.6rem", fontWeight: "600", color: "#fff" }}>{u.full_name}</td>
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
    </div>
  );
};
