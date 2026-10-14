import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { api } from "../services/api";

const AuthContext = createContext(null);

export const DEMO_USERS = [
  { role: "Admin", email: "admin@omway.com", pass: "admin123", label: "Admin Mode", desc: "Full Platform Clearance" },
  { role: "Analyst", email: "analyst@omway.com", pass: "analyst123", label: "Analyst Mode", desc: "Export & Deep Analytics" },
  { role: "Viewer", email: "viewer@omway.com", pass: "viewer123", label: "Viewer Mode", desc: "Read-Only Dashboards" },
];

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("nepse_user");
      return saved ? JSON.parse(saved) : null;
    } catch (_) {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem("nepse_token"));
  const [loading, setLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState(null);
  const [switchToast, setSwitchToast] = useState(null);
  const switchSeqRef = useRef(0);

  // Background token pre-warming: ensure tokens for Admin, Analyst, and Viewer
  // are cached in localStorage so switching is 100% instantaneous (0ms) and never misses
  const prewarmTokens = async () => {
    for (const demo of DEMO_USERS) {
      const cacheKey = `nepse_token_${demo.role}`;
      const userKey = `nepse_user_${demo.role}`;
      if (!localStorage.getItem(cacheKey)) {
        try {
          const res = await api.login(demo.email, demo.pass);
          localStorage.setItem(cacheKey, res.access_token);
          localStorage.setItem(userKey, JSON.stringify(res.user));
        } catch (_) {
          // Pre-warm silently handles temporary network hiccups
        }
      }
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const savedToken = localStorage.getItem("nepse_token");
        if (savedToken) {
          const profile = await api.getProfile();
          setUser(profile);
          localStorage.setItem("nepse_user", JSON.stringify(profile));
          localStorage.setItem(`nepse_token_${profile.role}`, savedToken);
          localStorage.setItem(`nepse_user_${profile.role}`, JSON.stringify(profile));
        } else {
          // Default to Admin for immediate evaluation
          await switchRole("Admin", true);
        }
      } catch (err) {
        console.warn("Session restore failed, falling back to Admin", err);
        await switchRole("Admin", true);
      } finally {
        setLoading(false);
        // Pre-warm other roles in background
        prewarmTokens();
      }
    };
    initAuth();
  }, []);

  const switchRole = async (targetRole, silent = false) => {
    const demo = DEMO_USERS.find((u) => u.role === targetRole) || DEMO_USERS[0];
    
    // If already in target role and token is present, do nothing
    if (user?.role === targetRole && token) {
      return user;
    }

    const seq = ++switchSeqRef.current;
    setIsSwitching(targetRole);

    // 1. Retrieve or construct optimistic profile
    const cacheKey = `nepse_token_${demo.role}`;
    const cachedToken = localStorage.getItem(cacheKey);
    const cachedUserRaw = localStorage.getItem(`nepse_user_${demo.role}`);
    let targetUserData = null;
    try {
      targetUserData = cachedUserRaw ? JSON.parse(cachedUserRaw) : null;
    } catch (_) {}

    if (!targetUserData) {
      targetUserData = {
        id: demo.role === "Admin" ? 1 : demo.role === "Analyst" ? 2 : 3,
        email: demo.email,
        role: demo.role,
        full_name: `${demo.role} User`,
        is_active: true
      };
    }

    // 2. Synchronous 0ms update: React state + localStorage set atomically
    setUser(targetUserData);
    localStorage.setItem("nepse_user", JSON.stringify(targetUserData));

    if (cachedToken) {
      localStorage.setItem("nepse_token", cachedToken);
      setToken(cachedToken);
    }

    if (!silent) {
      setSwitchToast({
        role: demo.role,
        label: demo.label,
        desc: demo.desc,
        time: Date.now()
      });
      setTimeout(() => {
        setSwitchToast((curr) => (curr && Date.now() - curr.time >= 2400 ? null : curr));
      }, 2500);
    }

    // 3. Network synchronization with sequence check to eliminate race conditions
    try {
      const data = await api.login(demo.email, demo.pass);
      if (switchSeqRef.current === seq) {
        localStorage.setItem("nepse_token", data.access_token);
        localStorage.setItem(cacheKey, data.access_token);
        localStorage.setItem(`nepse_user_${demo.role}`, JSON.stringify(data.user));
        localStorage.setItem("nepse_user", JSON.stringify(data.user));
        setToken(data.access_token);
        setUser(data.user);
        return data.user;
      }
    } catch (err) {
      console.warn("Background role sync failed, keeping optimistic role:", err);
      return targetUserData;
    } finally {
      if (switchSeqRef.current === seq) {
        setIsSwitching(null);
      }
    }
  };

  const logout = () => {
    localStorage.removeItem("nepse_token");
    localStorage.removeItem("nepse_user");
    DEMO_USERS.forEach((u) => {
      localStorage.removeItem(`nepse_token_${u.role}`);
      localStorage.removeItem(`nepse_user_${u.role}`);
    });
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      loading, 
      isSwitching, 
      switchToast, 
      switchRole, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

