import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

const ROUTE_VARIANTS = {
  "/predict":  { color: "#f43f5e", angle: 0 },
  "/metrics":  { color: "#6366f1", angle: 45 },
  "/history":  { color: "#10b981", angle: -45 },
  "/data":     { color: "#f59e0b", angle: 90 },
  "/profile":  { color: "#ec4899", angle: -90 },
  "/admin":    { color: "#f43f5e", angle: 180 },
};

function LoadingBar() {
  const location = useLocation();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 600);
    return () => clearTimeout(t);
  }, [location.pathname]);

  const route = ROUTE_VARIANTS[location.pathname] || ROUTE_VARIANTS["/predict"];

  return visible ? (
    <motion.div
      className="page-loading-bar"
      initial={{ scaleX: 0, originX: 0 }}
      animate={{ scaleX: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      style={{
        width: "100%",
        background: `linear-gradient(90deg, ${route.color}88, ${route.color}, #fff8, ${route.color})`,
      }}
    />
  ) : null;
}

function RouteFlash() {
  const location = useLocation();
  const [flash, setFlash] = useState(false);
  const [color, setColor] = useState("#f43f5e");

  useEffect(() => {
    const route = ROUTE_VARIANTS[location.pathname];
    if (route) setColor(route.color);
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 500);
    return () => clearTimeout(t);
  }, [location.pathname]);

  return (
    <AnimatePresence>
      {flash && (
        <motion.div
          className="fixed inset-0 pointer-events-none z-30"
          initial={{ opacity: 0.12 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{ background: color }}
        />
      )}
    </AnimatePresence>
  );
}

const pageVariants = {
  initial: (direction) => ({
    opacity: 0,
    x: direction > 0 ? 60 : -60,
    scale: 0.97,
    filter: "blur(6px)",
  }),
  animate: {
    opacity: 1,
    x: 0,
    scale: 1,
    filter: "blur(0px)",
  },
  exit: (direction) => ({
    opacity: 0,
    x: direction > 0 ? -60 : 60,
    scale: 0.97,
    filter: "blur(6px)",
  }),
};

const ROUTE_ORDER = ["/", "/predict", "/metrics", "/data", "/history", "/profile", "/admin"];

function getDirection(from, to) {
  const a = ROUTE_ORDER.indexOf(from);
  const b = ROUTE_ORDER.indexOf(to);
  if (a === -1 || b === -1) return 1;
  return b > a ? 1 : -1;
}

export default function PageTransition({ children }) {
  const location = useLocation();
  const [prevPath, setPrevPath] = useState(location.pathname);
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    setDirection(getDirection(prevPath, location.pathname));
    setPrevPath(location.pathname);
  }, [location.pathname]);

  return (
    <>
      <LoadingBar />
      <RouteFlash />
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={location.pathname}
          custom={direction}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{
            duration: 0.35,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
          style={{ width: "100%", minHeight: "100vh" }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </>
  );
}
