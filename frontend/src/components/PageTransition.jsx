import React, { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useLocation } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";

const ROUTE_RANKS = {
  "/": 0,
  "/login": 10,
  "/register": 20,
  "/forgot-password": 15,
  "/reset-password": 25,
  "/verify-email": 25,
  "/privacy": 5,
  "/terms": 5,
};

const pageVariants = {
  initial: (dir) => ({
    opacity: 0,
    x: dir * 36,
    y: 6,
    scale: 0.985,
  }),
  animate: {
    opacity: 1,
    x: 0,
    y: 0,
    scale: 1,
    transition: {
      opacity: { duration: 0.32, ease: "easeOut" },
      x: { duration: 0.38, ease: [0.16, 1, 0.3, 1] },
      y: { duration: 0.38, ease: [0.16, 1, 0.3, 1] },
      scale: { duration: 0.38, ease: [0.16, 1, 0.3, 1] },
    },
    transitionEnd: {
      transform: "none",
    },
  },
  exit: (dir) => ({
    opacity: 0,
    x: -dir * 30,
    scale: 0.98,
    pointerEvents: "none",
    transition: {
      opacity: { duration: 0.24, ease: "easeIn" },
      x: { duration: 0.30, ease: [0.4, 0, 0.2, 1] },
      scale: { duration: 0.30, ease: [0.4, 0, 0.2, 1] },
    },
  }),
};

const reducedMotionVariants = {
  initial: { opacity: 1, x: 0, y: 0, scale: 1 },
  animate: { opacity: 1, x: 0, y: 0, scale: 1, transition: { duration: 0 }, transitionEnd: { transform: "none" } },
  exit: { opacity: 1, x: 0, y: 0, scale: 1, pointerEvents: "none", transition: { duration: 0 } },
};

const SAGE_IVORY_ROUTES = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/privacy",
  "/terms",
  "/predict",
  "/profile",
  "/dashboard",
  "/metrics",
];

export default function PageTransition({ children }) {
  const location = useLocation();
  const shouldReduceMotion = useReducedMotion();
  const theme = useTheme();
  const isDark = theme?.dark;

  const prevPathRef = useRef(location.pathname);
  const prevHistoryIdxRef = useRef(window.history.state?.idx || 0);
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    const currentPath = location.pathname;
    const prevPath = prevPathRef.current;
    const currentHistoryIdx = window.history.state?.idx || 0;
    const prevHistoryIdx = prevHistoryIdxRef.current;

    let computedDir = 1;

    // Check history index delta first
    if (typeof currentHistoryIdx === "number" && typeof prevHistoryIdx === "number" && currentHistoryIdx !== prevHistoryIdx) {
      computedDir = currentHistoryIdx > prevHistoryIdx ? 1 : -1;
    } else {
      // Fallback to route rank comparison
      const currentRank = ROUTE_RANKS[currentPath] ?? 10;
      const prevRank = ROUTE_RANKS[prevPath] ?? 10;
      computedDir = currentRank >= prevRank ? 1 : -1;
    }

    // Mirror for Arabic RTL layout
    const isRTL = document.documentElement.dir === "rtl";
    const effectiveDir = isRTL ? -computedDir : computedDir;

    setDirection(effectiveDir);
    prevPathRef.current = currentPath;
    prevHistoryIdxRef.current = currentHistoryIdx;

    try {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    } catch {
      window.scrollTo(0, 0);
    }
  }, [location.pathname]);

  const isSageIvoryRoute =
    SAGE_IVORY_ROUTES.includes(location.pathname) ||
    location.pathname.startsWith("/profile") ||
    location.pathname.startsWith("/predict") ||
    location.pathname.startsWith("/metrics");

  return (
    <div
      className="relative w-full min-h-screen"
      style={{
        backgroundColor: isDark ? "#141D18" : (isSageIvoryRoute ? "#F7F5F0" : "#f1f5f9"),
        overflowX: "clip",
      }}
    >
      {/* Subtle ambient sage-tinted wash or dark ambient wash */}
      <div
        className="fixed inset-0 pointer-events-none -z-10 transition-opacity duration-700"
        style={{
          background: isDark
            ? "radial-gradient(ellipse 85% 65% at 50% 12%, rgba(53, 72, 62, 0.3) 0%, rgba(20, 29, 24, 0) 80%), #141D18"
            : isSageIvoryRoute
            ? "radial-gradient(ellipse 85% 65% at 50% 12%, rgba(228, 237, 229, 0.55) 0%, rgba(247, 245, 240, 0) 80%), #F7F5F0"
            : "radial-gradient(ellipse 85% 65% at 50% 12%, rgba(241, 245, 249, 0.9) 0%, rgba(255, 255, 255, 0) 80%), #f1f5f9",
        }}
        aria-hidden="true"
      />

      <AnimatePresence
        mode="popLayout"
        custom={direction}
        initial={false}
      >
        <motion.div
          key={location.pathname}
          custom={direction}
          variants={shouldReduceMotion ? reducedMotionVariants : pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          style={{ width: "100%", minHeight: "100vh" }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}



