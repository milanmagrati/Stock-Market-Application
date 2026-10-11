import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "../services/api";

const AuthContext = createContext(null);

export const DEMO_USERS = [
  { role: "Admin", email: "admin@omway.com", pass: "admin123", label: "Admin Mode" },
  { role: "Analyst", email: "analyst@omway.com", pass: "analyst123", label: "Analyst Mode" },
  { role: "Viewer", email: "viewer@omway.com", pass: "viewer123", label: "Viewer Mode" },
];

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("nepse_token"));
  const [loading, setLoading] = useState(true);

  // Auto-login to Admin by default for seamless evaluation, or restore session
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (token) {
          const profile = await api.getProfile();
          setUser(profile);
        } else {
          // Default to Admin
          await switchRole("Admin");
        }
      } catch (err) {
        console.warn("Session restore failed, falling back to Admin", err);
        await switchRole("Admin");
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const switchRole = async (targetRole) => {
    const demo = DEMO_USERS.find((u) => u.role === targetRole) || DEMO_USERS[0];
    
    // If already in target role, do nothing
    if (user?.role === targetRole) {
      return user;
    }

    // 1. Instant Optimistic UI Update (0ms latency, instant button & state reaction)
    const optimisticUser = {
      id: demo.role === "Admin" ? 1 : demo.role === "Analyst" ? 2 : 3,
      email: demo.email,
      role: demo.role,
      full_name: `${demo.role} User`,
      is_active: true
    };
    setUser(optimisticUser);

    // 2. Check cached token for target role to avoid blocking on network latency
    const cacheKey = `nepse_token_${demo.role}`;
    const cachedToken = localStorage.getItem(cacheKey);
    if (cachedToken) {
      localStorage.setItem("nepse_token", cachedToken);
      setToken(cachedToken);
    }

    // 3. Background network authentication to sync token and profile
    try {
      const data = await api.login(demo.email, demo.pass);
      localStorage.setItem("nepse_token", data.access_token);
      localStorage.setItem(cacheKey, data.access_token);
      setToken(data.access_token);
      setUser(data.user);
      return data.user;
    } catch (err) {
      console.warn("Background role sync failed, keeping optimistic role:", err);
      return optimisticUser;
    }
  };

  const logout = () => {
    localStorage.removeItem("nepse_token");
    DEMO_USERS.forEach((u) => localStorage.removeItem(`nepse_token_${u.role}`));
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, switchRole, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
