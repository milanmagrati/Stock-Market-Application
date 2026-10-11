import React, { useState, useEffect, useRef } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { api } from "./services/api";
import { Navbar } from "./components/Navbar";
import { TickerBar } from "./components/TickerBar";
import { InteractiveChart } from "./components/InteractiveChart";
import { BehaviorSummaryPanel } from "./components/BehaviorSummaryPanel";
import { FloorsheetPanel } from "./components/FloorsheetPanel";
import { NewsFeed } from "./components/NewsFeed";
import { CrossCompanyMatrix } from "./components/CrossCompanyMatrix";
import { AdminOpsCenter } from "./components/AdminOpsCenter";
import { LiveAlertToast } from "./components/LiveAlertToast";
import { RefreshCw, Filter } from "lucide-react";

function DashboardContent() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("company"); // "company", "comparison", "crawler"
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);

  // Per-company telemetry
  const [prices, setPrices] = useState([]);
  const [behaviorData, setBehaviorData] = useState(null);
  const [news, setNews] = useState([]);
  const [comparisonData, setComparisonData] = useState(null);

  // WebSocket state & alerts
  const [wsConnected, setWsConnected] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const wsRef = useRef(null);

  // 1. Load initial watchlist and comparison
  const loadInitialData = async () => {
    try {
      const compList = await api.getCompanies();
      setCompanies(compList);
      if (compList.length > 0 && !selectedCompany) {
        setSelectedCompany(compList[0]);
      }
      const compMatrix = await api.getComparison();
      setComparisonData(compMatrix);
    } catch (err) {
      console.error("Initial load error:", err);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // 2. Fetch data whenever selected company changes
  const fetchCompanyData = async (comp) => {
    if (!comp) return;
    try {
      const [priceData, behavior, newsData] = await Promise.all([
        api.getCompanyPrices(comp.id, "30d"),
        api.getBehaviorSummary(comp.id),
        api.getNews(comp.id, 50),
      ]);
      setPrices(priceData);
      setBehaviorData(behavior);
      setNews(newsData);
    } catch (err) {
      console.error("Failed loading company telemetry:", err);
    }
  };

  useEffect(() => {
    if (selectedCompany) {
      fetchCompanyData(selectedCompany);
    }
  }, [selectedCompany]);

  // 3. Setup WebSocket connection for live telemetry
  useEffect(() => {
    const wsUrl = "ws://localhost:8000/ws/updates";
    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;

    socket.onopen = () => {
      setWsConnected(true);
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const alertId = Date.now() + Math.random();

        if (payload.type === "CRAWL_COMPLETED") {
          addAlert({
            id: alertId,
            type: "CRAWL_COMPLETED",
            title: `Crawl Job Finished: ${payload.portal}`,
            message: `Successfully crawled & categorized ${payload.items_crawled} articles.`,
            time: new Date().toLocaleTimeString(),
          });
          // Refresh news & comparison
          if (selectedCompany) fetchCompanyData(selectedCompany);
          api.getComparison().then(setComparisonData).catch(() => {});
        } else if (payload.type === "ARTICLE_RECATEGORIZED") {
          addAlert({
            id: alertId,
            type: "ARTICLE_RECATEGORIZED",
            title: "News Retagged by Analyst",
            message: `Action: ${payload.action} for article #${payload.article_id}.`,
            time: new Date().toLocaleTimeString(),
          });
          if (selectedCompany) fetchCompanyData(selectedCompany);
        } else if (payload.type === "VOLUME_ANOMALY") {
          addAlert({
            id: alertId,
            type: "VOLUME_ANOMALY",
            title: "Volume Anomaly Triggered!",
            message: `Z-Score > 2.0 exceeded on trading floor.`,
            time: new Date().toLocaleTimeString(),
          });
        }
      } catch (e) {
        // Ping response
      }
    };

    socket.onclose = () => {
      setWsConnected(false);
    };

    return () => {
      if (socket) socket.close();
    };
  }, [selectedCompany]);

  const addAlert = (alert) => {
    setAlerts((prev) => [alert, ...prev.slice(0, 4)]);
  };

  const dismissAlert = (id) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div>
      {/* Top Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        wsConnected={wsConnected}
      />

      {/* Ticker Bar */}
      <TickerBar
        companies={companies}
        comparisonData={comparisonData}
        selectedCompany={selectedCompany}
        onSelectCompany={(c) => setSelectedCompany(c)}
      />

      {/* Main Viewport Container */}
      <main className="app-container" style={{ marginTop: "1.5rem" }}>
        {/* VIEW 1: PER-COMPANY INTELLIGENCE */}
        {activeTab === "company" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {/* Company Filter Selector Header */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "1rem"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  <Filter size={15} /> Select Asset:
                </span>
                <select
                  value={selectedCompany?.id || ""}
                  onChange={(e) => {
                    const found = companies.find((c) => c.id === Number(e.target.value));
                    if (found) setSelectedCompany(found);
                  }}
                  className="select"
                  style={{ fontSize: "0.95rem", fontWeight: "600", padding: "0.45rem 1rem" }}
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.symbol} — {c.name} ({c.sector})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={() => selectedCompany && fetchCompanyData(selectedCompany)}
                  className="btn btn-secondary btn-sm"
                >
                  <RefreshCw size={13} />
                  <span>Refresh Telemetry</span>
                </button>
              </div>
            </div>

            {/* Interactive Candlestick & Volume Chart with VWAP */}
            <InteractiveChart
              prices={prices}
              anomalies={behaviorData?.volume_anomalies}
              symbol={selectedCompany?.symbol || "NABIL"}
            />

            {/* Behavioral Summary: VWAP, Pressure Index, Anomalies, Section 3 Findings */}
            <BehaviorSummaryPanel behaviorData={behaviorData} />

            {/* Grid 2 Columns: Floorsheet Concentration & Categorized News Feed */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
              <FloorsheetPanel brokerData={behaviorData?.broker_breakdown} />
              <NewsFeed
                news={news}
                companies={companies}
                onNewsUpdated={() => selectedCompany && fetchCompanyData(selectedCompany)}
              />
            </div>
          </div>
        )}

        {/* VIEW 2: CROSS-COMPANY COMPARISON MATRIX */}
        {activeTab === "comparison" && (
          <CrossCompanyMatrix
            comparisonData={comparisonData}
            companies={companies}
            onSelectCompany={(comp) => {
              setSelectedCompany(comp);
              setActiveTab("company");
            }}
          />
        )}

        {/* VIEW 3: CRAWLER OPERATIONS & RBAC CONSOLE */}
        {activeTab === "crawler" && <AdminOpsCenter />}
      </main>

      {/* Real-time Alerts Toast */}
      <LiveAlertToast alerts={alerts} onDismiss={dismissAlert} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DashboardContent />
    </AuthProvider>
  );
}
