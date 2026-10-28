import React, { createContext, useContext, useState, useEffect } from "react";
import { getMe, logout } from "../api";
import { auth, signOut } from "../firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      getMe().then(r => setUser(r.data)).catch(() => localStorage.removeItem("token")).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const loginUser = (token, userData) => {
    localStorage.setItem("token", token);
    setUser(userData);
  };

  const logoutUser = async () => {
    let serverRevocationFailed = false;
    try {
      await logout();
    } catch (err) {
      serverRevocationFailed = true;
      console.warn("Server-side token revocation failed or timed out during logout:", err?.message || err);
    }
    localStorage.removeItem("token");
    try {
      if (auth) {
        signOut(auth).catch(() => {});
      }
    } catch (_) {}
    setUser(null);
    if (serverRevocationFailed) {
      sessionStorage.setItem("session_notice", "offline_logout");
    }
    window.location.href = "/";
  };

  const refreshUser = async () => {
    try {
      const res = await getMe();
      setUser(res.data);
      return res.data;
    } catch (_) {
      return null;
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, loginUser, logoutUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
