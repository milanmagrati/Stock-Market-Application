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

  createUser: async ({ email, full_name, password, role }) => {
    const res = await fetch(`${API_BASE}/api/admin/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ email, full_name, password, role }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Failed to create user");
    }
    return res.json();
  },

  updateUserRole: async (userId, role) => {
    const res = await fetch(`${API_BASE}/api/admin/users/${userId}/role`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Failed to update user role");
    }
    return res.json();
  },

  deleteUser: async (userId) => {
    const res = await fetch(`${API_BASE}/api/admin/users/${userId}`, {
      method: "DELETE",
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Failed to delete user");
    }
    return res.json();
  },

  // Watchlist Management
  addCompany: async ({ symbol, name, sector, aliases }) => {
    const res = await fetch(`${API_BASE}/api/companies`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ symbol, name, sector, aliases, is_active: true }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Failed to add company to watchlist");
    }
    return res.json();
  },

  updateCompany: async (companyId, updateData) => {
    const res = await fetch(`${API_BASE}/api/companies/${companyId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify(updateData),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Failed to update company");
    }
    return res.json();
  },

  toggleCompanyActive: async (companyId) => {
    const res = await fetch(`${API_BASE}/api/companies/${companyId}/toggle-active`, {
      method: "PATCH",
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Failed to toggle company status");
    }
    return res.json();
  },

  deleteCompany: async (companyId) => {
    const res = await fetch(`${API_BASE}/api/companies/${companyId}`, {
      method: "DELETE",
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Failed to delete company from watchlist");
    }
    return res.json();
  },

  syncCompanyConfig: async () => {
    const res = await fetch(`${API_BASE}/api/companies/sync-config`, {
      method: "POST",
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Failed to sync config");
    }
    return res.json();
  },

  // Institutional Report Export (Role-gated: Analyst / Admin)
  exportReport: async (companyId = null, format = "csv") => {
    let url = `${API_BASE}/api/reports/export?format=${format}`;
    if (companyId) {
      url += `&company_id=${companyId}`;
    }
    const res = await fetch(url, {
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Export failed with status ${res.status}`);
    }
    const blob = await res.blob();
    const disposition = res.headers.get("Content-Disposition");
    let filename = `nepse_market_report_${Date.now()}.${format}`;
    if (disposition && disposition.includes("filename=")) {
      filename = disposition.split("filename=")[1].replace(/["']/g, "").trim();
    }
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
    return { success: true, filename };
  },

  // Retraining Corrections & Dataset Export
  getNewsCorrections: async (limit = 100) => {
    const res = await fetch(`${API_BASE}/api/news/corrections?limit=${limit}`, {
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to load corrections");
    }
    return res.json();
  },

  exportRetrainingDataset: async (format = "json") => {
    const res = await fetch(`${API_BASE}/api/news/corrections/export?format=${format}`, {
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to export dataset");
    }
    const blob = await res.blob();
    const filename = `nepse_news_retraining_dataset.${format}`;
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
    return { success: true, filename };
  },

  // Unattended Scheduler Controls
  getSchedulerStatus: async () => {
    const res = await fetch(`${API_BASE}/api/admin/scheduler`, {
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to get scheduler status");
    }
    return res.json();
  },

  toggleScheduler: async (enabled) => {
    const res = await fetch(`${API_BASE}/api/admin/scheduler/toggle`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ enabled }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to toggle scheduler");
    }
    return res.json();
  },

  updateSchedulerInterval: async (intervalMinutes) => {
    const res = await fetch(`${API_BASE}/api/admin/scheduler/interval`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ interval_minutes: intervalMinutes }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to update interval");
    }
    return res.json();
  },
};
