const API_BASE = "http://localhost:8000";

export const getAuthHeaders = () => {
  const token = localStorage.getItem("nepse_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const api = {
  // Authentication
  login: async (email, password) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Authentication failed");
    }
    return res.json();
  },

  getProfile: async () => {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) throw new Error("Unauthorized");
    return res.json();
  },

  // Companies
  getCompanies: async () => {
    const res = await fetch(`${API_BASE}/api/companies`);
    if (!res.ok) throw new Error("Failed to load companies");
    return res.json();
  },

  getCompanyPrices: async (companyId, range = "30d") => {
    const res = await fetch(`${API_BASE}/api/companies/${companyId}/prices?range=${range}`);
    if (!res.ok) throw new Error("Failed to load prices");
    return res.json();
  },

  refreshTelemetry: async (companyId) => {
    const res = await fetch(`${API_BASE}/api/companies/${companyId}/refresh-telemetry`, {
      method: "POST",
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) throw new Error("Failed to refresh telemetry");
    return res.json();
  },

  // Behavior & Analytics
  getBehaviorSummary: async (companyId) => {
    const res = await fetch(`${API_BASE}/api/companies/${companyId}/behavior-summary`);
    if (!res.ok) throw new Error("Failed to load behavior summary");
    return res.json();
  },

  getComparison: async () => {
    const res = await fetch(`${API_BASE}/api/comparison`);
    if (!res.ok) throw new Error("Failed to load cross-company matrix");
    return res.json();
  },

  // News & Categorization
  getNews: async (companyId = null, limit = 50) => {
    const url = companyId
      ? `${API_BASE}/api/news?company_id=${companyId}&limit=${limit}`
      : `${API_BASE}/api/news?limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to load news");
    return res.json();
  },

  recategorizeArticle: async (articleId, { company_id, action, confidence_score, notes }) => {
    const res = await fetch(`${API_BASE}/api/news/${articleId}/recategorize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ company_id, action, confidence_score, notes }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Recategorization forbidden or failed");
    }
    return res.json();
  },

  // Admin & Crawlers
  triggerCrawlRun: async (portal = "all", crawl_type = "NEWS") => {
    const res = await fetch(`${API_BASE}/api/admin/crawl-runs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ portal, crawl_type }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Crawl trigger forbidden or failed");
    }
    return res.json();
  },

  getCrawlLogs: async (limit = 100, status_filter = null, portal = null) => {
    let url = `${API_BASE}/api/admin/crawl-logs?limit=${limit}`;
    if (status_filter && status_filter !== "ALL") {
      url += `&status_filter=${encodeURIComponent(status_filter)}`;
    }
    if (portal && portal !== "all") {
      url += `&portal=${encodeURIComponent(portal)}`;
    }
    const res = await fetch(url, {
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Failed to load crawl logs");
    }
    return res.json();
  },

  getAdminUsers: async () => {
    const res = await fetch(`${API_BASE}/api/admin/users`, {
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) throw new Error("Failed to load user roster");
    return res.json();
  },
};
