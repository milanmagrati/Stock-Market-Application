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
    try {
      const data = await api.login(demo.email, demo.pass);
      localStorage.setItem("nepse_token", data.access_token);
      setToken(data.access_token);
      setUser(data.user);
      return data.user;
    } catch (err) {
      console.error("Role switch failed", err);
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem("nepse_token");
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
