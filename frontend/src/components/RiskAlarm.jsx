import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import React, { useState } from "react";

export default function RiskAlarm({ trigger, riskLevel }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (trigger && riskLevel === "High") {
      setShow(true);
      const t = setTimeout(() => setShow(false), 1800);
      return () => clearTimeout(t);
    }
  }, [trigger]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 pointer-events-none z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.15, 0, 0.1, 0, 0.08, 0] }}
          transition={{ duration: 1.8, times: [0, 0.1, 0.3, 0.5, 0.7, 0.85, 1] }}
          style={{ background: "radial-gradient(ellipse at center, #f43f5e, #be123c)" }}
        />
      )}
    </AnimatePresence>
  );
}
