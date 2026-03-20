import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, NavLink, Navigate, useNavigate, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { Heart, BarChart2, Database, History, LogOut, User, Settings, Shield, Moon, Sun, Bell } from "lucide-react";
import { useRef } from "react";
import { motion } from "framer-motion";
import LanguageSwitcher from "./components/LanguageSwitcher";
import CursorGlow from "./components/CursorGlow";
import { ThemeProvider, useTheme } from "./context/ThemeContext";

import { useTranslation } from "react-i18next";
import { AuthProvider, useAuth } from "./context/AuthContext";
import PredictPage from "./pages/PredictPage";
import MetricsPage from "./pages/MetricsPage";
import DataPage from "./pages/DataPage";
import HistoryPage from "./pages/HistoryPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import ProfilePage from "./pages/ProfilePage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import AdminPage from "./pages/AdminPage";
import LandingPage from "./pages/LandingPage";
import NotFoundPage from "./pages/NotFoundPage";
import PageTransition from "./components/PageTransition";
import { AnimatePresence } from "framer-motion";
import "./index.css";

const ADMIN_EMAIL = "mabhi192005@gmail.com";

function ThemeToggle() {
  const { dark, toggle } = useTheme();
  return (
    <motion.button
      onClick={toggle}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      className="w-8 h-8 rounded-lg flex items-center justify-center border border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-500 transition-all"
      title={dark ? "Switch to light mode" : "Switch to dark mode"}>
      <motion.div
        key={dark ? "moon" : "sun"}
        initial={{ rotate: -90, opacity: 0 }}
        animate={{ rotate: 0, opacity: 1 }}
        transition={{ duration: 0.2 }}>
        {dark ? <Moon size={14}/> : <Sun size={14}/>}
      </motion.div>
    </motion.button>
  );
}

function ECGLine() {
  return (
    <svg className="w-32 h-8 opacity-40" viewBox="0 0 120 30" fill="none">
      <polyline points="0,15 10,15 15,5 20,25 25,15 30,15 38,2 42,28 46,15 56,15 60,10 64,20 68,15 120,15"
        stroke="#f43f5e" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function Navbar() {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const [pillStyle, setPillStyle] = useState({left:0, width:0});
  const navRef = useRef(null);
  const linkRefs = useRef({});

  const links = [
    { to: "/predict", icon: Heart, label: t("nav.predict") },
    { to: "/metrics", icon: BarChart2, label: t("nav.metrics") },
    { to: "/data", icon: Database, label: t("nav.dataset") },
    { to: "/history", icon: History, label: t("nav.history") },
  ];
  if (user?.email === ADMIN_EMAIL) links.push({ to: "/admin", icon: Shield, label: t("nav.admin") });

  useEffect(() => {
    const active = links.find(l => location.pathname === l.to || location.pathname.startsWith(l.to + "/"));
    if (active && linkRefs.current[active.to] && navRef.current) {
      const el = linkRefs.current[active.to];
      const nav = navRef.current;
      const elRect = el.getBoundingClientRect();
      const navRect = nav.getBoundingClientRect();
      setPillStyle({ left: elRect.left - navRect.left, width: elRect.width });
    }
  }, [location.pathname, t]);

  return (
    <nav className={`fixed top-0 z-50 transition-all duration-500 ${scrolled ? "left-4 right-4 top-2 rounded-2xl border border-crimson-900/20" : "left-0 right-0 border-b border-crimson-900/10"}`}
      style={{ background: "rgba(10,15,30,0.97)", backdropFilter: "blur(24px)" }}>
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <motion.div className="flex items-center gap-3" whileHover={{scale:1.02}}>
          <div className="animate-heartbeat"><Heart size={22} className="text-crimson-500 fill-crimson-500"/></div>
          <span className="font-display text-xl font-bold tracking-tight text-white">
            Cardio<span className="gradient-text">Scan</span>
          </span>
          <ECGLine/>
        </motion.div>

        {/* Nav links with sliding pill */}
        <div className="flex items-center gap-1 relative" ref={navRef}>
          {/* Sliding pill background */}
          <motion.div
            className="absolute top-1 bottom-1 rounded-lg pointer-events-none"
            animate={{ left: pillStyle.left, width: pillStyle.width }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            style={{
              background: "rgba(244,63,94,0.12)",
              border: "1px solid rgba(244,63,94,0.25)",
              boxShadow: "0 0 12px rgba(244,63,94,0.1)",
            }}
          />

          {links.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to} to={to}
              ref={el => { if (el) linkRefs.current[to] = el; }}
              className={({ isActive }) =>
                `relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150 z-10 ` +
                (isActive ? "text-crimson-400" : "text-slate-400 hover:text-slate-200")
              }>
              <motion.div className="flex items-center gap-2" whileHover={{scale:1.05}} whileTap={{scale:0.95}}>
                <Icon size={15}/>{label}
              </motion.div>
            </NavLink>
          ))}

          <div className="ml-3 pl-3 border-l border-slate-800/60 flex items-center gap-2">
            <motion.button
              onClick={() => navigate("/profile")}
              whileHover={{scale:1.02}} whileTap={{scale:0.97}}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-all">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{background:"linear-gradient(135deg,#be123c,#f43f5e)"}}>
                {user?.name?.[0]?.toUpperCase()}
              </div>
              <span className="text-slate-300 text-sm font-medium">{user?.name?.split(" ")[0]}</span>
            </motion.button>
            <motion.button onClick={logoutUser}
              whileHover={{scale:1.05}} whileTap={{scale:0.95}}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-400 hover:text-crimson-400 hover:bg-crimson-500/10 transition-all text-sm">
              <LogOut size={14}/> {t("nav.logout")}
            </motion.button>
            <LanguageSwitcher/>
            <ThemeToggle/>
          </div>
        </div>
      </div>
    </nav>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-crimson-500/30 border-t-crimson-500 rounded-full animate-spin"/></div>;
  if (!user) return <Navigate to="/login" replace/>;
  return children;
}

function AppInner() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-950"><div className="w-8 h-8 border-2 border-crimson-500/30 border-t-crimson-500 rounded-full animate-spin"/></div>;
  return (
    <>
      <CursorGlow/>
      <Toaster position="top-right" toastOptions={{ style: { background: "#0f172a", color: "#f1f5f9", border: "1px solid rgba(244,63,94,0.3)" } }}/>
      {user && <Navbar/>}
      <main className={`${user ? "pt-16" : ""} min-h-screen bg-grid`}>
        <PageTransition>
          <Routes>
            <Route path="/" element={user ? <Navigate to="/predict" replace/> : <LandingPage/>}/>
            <Route path="/login" element={user ? <Navigate to="/predict" replace/> : <LoginPage/>}/>
            <Route path="/register" element={user ? <Navigate to="/predict" replace/> : <RegisterPage/>}/>
            <Route path="/forgot-password" element={user ? <Navigate to="/predict" replace/> : <ForgotPasswordPage/>}/>
            <Route path="/verify-email" element={<VerifyEmailPage/>}/>
            <Route path="/reset-password" element={<ResetPasswordPage/>}/>
            <Route path="/predict" element={<ProtectedRoute><PredictPage/></ProtectedRoute>}/>
            <Route path="/metrics" element={<ProtectedRoute><MetricsPage/></ProtectedRoute>}/>
            <Route path="/data" element={<ProtectedRoute><DataPage/></ProtectedRoute>}/>
            <Route path="/history" element={<ProtectedRoute><HistoryPage/></ProtectedRoute>}/>
            <Route path="/profile" element={<ProtectedRoute><ProfilePage/></ProtectedRoute>}/>
            <Route path="/admin" element={<ProtectedRoute><AdminPage/></ProtectedRoute>}/>
            <Route path="*" element={user ? <NotFoundPage/> : <Navigate to="/" replace/>}/>
          </Routes>
        </PageTransition>
      </main>
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <BrowserRouter>
        <AppInner/>
      </BrowserRouter>
    </AuthProvider>
    </ThemeProvider>
  );
}
