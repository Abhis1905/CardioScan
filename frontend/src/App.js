import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, NavLink, Navigate, useNavigate, useLocation, Link } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { Heart, BarChart2, Database, History, LogOut, User, Settings, Shield, Moon, Sun, Bell, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import LanguageSwitcher from "./components/LanguageSwitcher";
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
import PrivacyPage from "./pages/PrivacyPage";
import TermsPage from "./pages/TermsPage";
import ReportVerificationPage from "./pages/ReportVerificationPage";
import NotFoundPage from "./pages/NotFoundPage";
import PageTransition from "./components/PageTransition";
import "./index.css";

const ADMIN_EMAIL = "admin@example.com";

function ThemeToggle() {
  const { dark, toggle } = useTheme();
  return (
    <motion.button
      type="button"
      onClick={toggle}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="w-8 h-8 rounded-lg flex items-center justify-center border border-[#E5E0D6] bg-white text-[#52665A] hover:text-[#35483E] hover:bg-[#F7F5F0] hover:border-[#D5D0C6] transition-all shadow-2xs"
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <motion.div
        key={dark ? "moon" : "sun"}
        initial={{ rotate: -90, opacity: 0 }}
        animate={{ rotate: 0, opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        {dark ? <Moon size={14} /> : <Sun size={14} />}
      </motion.div>
    </motion.button>
  );
}

function ECGLine() {
  return (
    <svg className="w-20 sm:w-28 h-6 opacity-45 hidden md:block" viewBox="0 0 120 30" fill="none" aria-hidden="true">
      <polyline
        points="0,15 10,15 15,5 20,25 25,15 30,15 38,2 42,28 46,15 56,15 60,10 64,20 68,15 120,15"
        stroke="#8A9990"
        strokeWidth="1.35"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Navbar() {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 15);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Auto-dismiss mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Dismiss mobile drawer on Escape key
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const links = [
    { to: "/predict", icon: Heart, label: t("nav.predict") },
    { to: "/metrics", icon: BarChart2, label: t("nav.metrics") },
    { to: "/data", icon: Database, label: t("nav.dataset") },
    { to: "/history", icon: History, label: t("nav.history") },
  ];
  if (user?.email === ADMIN_EMAIL) {
    links.push({ to: "/admin", icon: Shield, label: t("nav.admin") });
  }

  const userInitial = (user?.name?.[0] || user?.email?.[0] || "U").toUpperCase();
  const userName = user?.name?.split(" ")[0] || user?.email?.split("@")[0] || t("nav.profile", "Profile");

  return (
    <>
      <nav
        aria-label="Main Navigation"
        className="fixed top-0 left-0 right-0 z-50 border-b border-[#E5E0D6] transition-all duration-300"
        style={{
          backgroundColor: scrolled ? "rgba(247, 245, 240, 0.98)" : "rgba(247, 245, 240, 0.95)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          boxShadow: scrolled ? "0 4px 20px rgba(53, 72, 62, 0.06)" : "none",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Brand Logo */}
          <Link
            to="/predict"
            className="flex items-center gap-2.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#35483E]/30 rounded-lg p-0.5"
          >
            <div className="w-8 h-8 rounded-xl bg-[#35483E] text-white flex items-center justify-center transition-transform group-hover:scale-105 shadow-2xs">
              <Heart size={16} className="fill-[#D9A19A] text-[#D9A19A]" />
            </div>
            <span className="font-serif font-bold text-lg tracking-tight text-[#35483E]">
              Cardio<span className="text-[#B35D52]">Scan</span>
            </span>
            <ECGLine />
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden lg:flex items-center gap-1 relative">
            {links.map(({ to, icon: Icon, label }) => {
              const isCurrent = location.pathname === to || location.pathname.startsWith(to + "/");
              return (
                <NavLink
                  key={to}
                  to={to}
                  className={`relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs xl:text-sm font-medium transition-colors duration-150 ${
                    isCurrent ? "text-[#35483E] font-semibold" : "text-[#52665A] hover:text-[#35483E] hover:bg-black/5"
                  }`}
                >
                  {isCurrent && (
                    <motion.span
                      layoutId="activeNavIndicator"
                      className="absolute inset-0 rounded-lg bg-[#E4EDE5] border border-[#D3DFD5] shadow-2xs pointer-events-none"
                      transition={{ type: "spring", stiffness: 450, damping: 35 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    <Icon size={15} className={isCurrent ? "text-[#35483E]" : "text-[#6B7F74]"} />
                    <span>{label}</span>
                  </span>
                </NavLink>
              );
            })}

            {/* Desktop Right Actions */}
            <div className="ml-3 pl-3 rtl:ml-0 rtl:mr-3 rtl:pl-0 rtl:pr-3 border-l rtl:border-l-0 rtl:border-r border-[#E5E0D6] flex items-center gap-2">
              <motion.button
                onClick={() => navigate("/profile")}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-[#E5E0D6] bg-white hover:bg-[#F7F5F0] hover:border-[#D5D0C6] transition-all shadow-2xs text-xs font-medium text-[#35483E]"
                title={user?.email || t("nav.profile", "Profile")}
              >
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white bg-[#35483E]">
                  {userInitial}
                </div>
                <span className="max-w-[100px] truncate">{userName}</span>
              </motion.button>

              <motion.button
                onClick={logoutUser}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-transparent text-[#607368] hover:text-[#B35D52] hover:bg-[#FAF0EE] hover:border-[#F0D5D1] transition-all text-xs font-medium"
                title={t("nav.logout")}
              >
                <LogOut size={13} />
                <span>{t("nav.logout")}</span>
              </motion.button>

              <LanguageSwitcher variant="sage" />
              <ThemeToggle />
            </div>
          </div>

          {/* Mobile Right Controls: Language Switcher + Hamburger Toggle */}
          <div className="lg:hidden flex items-center gap-2">
            <LanguageSwitcher variant="sage" />
            <button
              type="button"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileOpen}
              className="w-9 h-9 rounded-lg border border-[#E5E0D6] bg-white text-[#35483E] hover:bg-[#F7F5F0] hover:border-[#D5D0C6] flex items-center justify-center transition-all shadow-2xs"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-[#35483E]/20 backdrop-blur-xs lg:hidden"
              aria-hidden="true"
            />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed top-20 left-3 right-3 sm:left-6 sm:right-6 z-50 rounded-2xl border border-[#E5E0D6] shadow-xl p-4 lg:hidden max-h-[calc(100vh-6rem)] overflow-y-auto"
              style={{
                backgroundColor: "rgba(247, 245, 240, 0.98)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
              }}
            >
              {/* User profile header in mobile drawer */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#E5E0D6]">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white bg-[#35483E] shrink-0">
                    {userInitial}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#35483E] truncate">{user?.name || user?.email?.split("@")[0] || "User"}</p>
                    <p className="text-xs text-[#6B7F74] truncate">{user?.email}</p>
                  </div>
                </div>
                <ThemeToggle />
              </div>

              {/* Navigation links */}
              <div className="space-y-1">
                {links.map(({ to, icon: Icon, label }) => {
                  const isCurrent = location.pathname === to || location.pathname.startsWith(to + "/");
                  return (
                    <NavLink
                      key={to}
                      to={to}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                        isCurrent
                          ? "bg-[#E4EDE5] text-[#35483E] font-semibold border border-[#D3DFD5] shadow-2xs"
                          : "text-[#52665A] hover:bg-white hover:text-[#35483E]"
                      }`}
                    >
                      <Icon size={16} className={isCurrent ? "text-[#35483E]" : "text-[#6B7F74]"} />
                      <span>{label}</span>
                    </NavLink>
                  );
                })}
                <NavLink
                  to="/profile"
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    location.pathname === "/profile"
                      ? "bg-[#E4EDE5] text-[#35483E] font-semibold border border-[#D3DFD5] shadow-2xs"
                      : "text-[#52665A] hover:bg-white hover:text-[#35483E]"
                  }`}
                >
                  <User size={16} className={location.pathname === "/profile" ? "text-[#35483E]" : "text-[#6B7F74]"} />
                  <span>{t("nav.profile", "Profile")}</span>
                </NavLink>
              </div>

              {/* Bottom logout action in mobile drawer */}
              <div className="pt-3 mt-3 border-t border-[#E5E0D6] flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    logoutUser();
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#F0D5D1] bg-[#FAF0EE] text-[#B35D52] hover:bg-[#F5E4E1] transition-all text-xs font-semibold"
                >
                  <LogOut size={14} />
                  <span>{t("nav.logout")}</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F5F0]">
        <div className="w-8 h-8 border-2 border-[#35483E]/20 border-t-[#35483E] rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppInner() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F5F0]">
        <div className="w-8 h-8 border-2 border-[#35483E]/20 border-t-[#35483E] rounded-full animate-spin" />
      </div>
    );
  }
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#FFFFFF",
            color: "#35483E",
            border: "1px solid #E5E0D6",
            borderRadius: "12px",
            boxShadow: "0 4px 14px rgba(53, 72, 62, 0.08)",
            fontSize: "14px",
          },
        }}
      />
      {user && <Navbar />}
      <main className={`${user ? "pt-16" : ""} min-h-screen bg-grid`}>
        <PageTransition>
          <Routes location={location} key={location.pathname}>
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
            <Route path="/dashboard" element={<ProtectedRoute><Navigate to="/profile" replace/></ProtectedRoute>}/>
            <Route path="/admin" element={<ProtectedRoute><AdminPage/></ProtectedRoute>}/>
            <Route path="/privacy" element={<PrivacyPage/>}/>
            <Route path="/terms" element={<TermsPage/>}/>
            <Route path="/reports/:reportId" element={<ReportVerificationPage/>}/>
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
