import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import LanguageSwitcher from "./LanguageSwitcher";
import { useTranslation } from "react-i18next";

export default function ScrollNavbar() {
  const { t } = useTranslation();
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const scrollY = window.scrollY;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      setScrolled(scrollY > 20);
      setProgress(maxScroll > 0 ? scrollY / maxScroll : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
      style={{
        background: scrolled ? "rgba(10,15,30,0.97)" : "rgba(10,15,30,0.7)",
        backdropFilter: "blur(20px)",
        borderBottom: scrolled ? "1px solid rgba(244,63,94,0.15)" : "1px solid rgba(244,63,94,0.05)",
        boxShadow: scrolled ? "0 4px 32px rgba(0,0,0,0.4)" : "none",
      }}>
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <motion.div className="flex items-center gap-3" whileHover={{ scale: 1.02 }}>
          <div className="animate-heartbeat">
            <Heart size={22} className="text-crimson-500 fill-crimson-500"/>
          </div>
          <span className="font-display text-xl font-bold text-white">
            Cardio<span className="gradient-text">Scan</span>
          </span>
        </motion.div>

        {/* Buttons */}
        <div className="flex items-center gap-3">
          <LanguageSwitcher/>

          {/* Sign In */}
          <motion.div whileHover="hover" initial="rest" animate="rest" className="relative">
            <Link to="/login" className="relative text-sm font-medium px-4 py-2 block overflow-hidden">
              <motion.span
                variants={{rest:{color:"#94a3b8"}, hover:{color:"#ffffff"}}}
                transition={{duration:0.2}} className="relative z-10 inline-block">
                Sign In
              </motion.span>
              <motion.span
                variants={{rest:{scaleX:0,originX:0}, hover:{scaleX:1,originX:0}}}
                transition={{duration:0.3, ease:[0.22,1,0.36,1]}}
                className="absolute bottom-1 left-4 right-4 h-px block"
                style={{background:"linear-gradient(90deg,#f43f5e,#fb7185)"}}
              />
            </Link>
          </motion.div>

          {/* Get Started */}
          <motion.div whileHover="hover" initial="rest" animate="rest" className="relative">
            <Link to="/register"
              className="relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white overflow-hidden"
              style={{background:"linear-gradient(135deg,#be123c,#f43f5e)"}}>
              <motion.span
                variants={{rest:{x:"-100%",opacity:0}, hover:{x:"200%",opacity:1}}}
                transition={{duration:0.5}}
                className="absolute inset-0 pointer-events-none"
                style={{background:"linear-gradient(105deg,transparent 40%,rgba(255,255,255,0.25) 50%,transparent 60%)"}}
              />
              <motion.span
                variants={{rest:{rotate:0}, hover:{rotate:360}}}
                transition={{duration:0.5, ease:[0.22,1,0.36,1]}}
                className="relative z-10">
                <Heart size={14} className="fill-white text-white"/>
              </motion.span>
              <motion.span
                variants={{rest:{letterSpacing:"0em"}, hover:{letterSpacing:"0.03em"}}}
                transition={{duration:0.2}} className="relative z-10">
                {t("landing.get_started")}
              </motion.span>
              <motion.span
                variants={{rest:{x:0}, hover:{x:3}}}
                transition={{duration:0.2}} className="relative z-10">
                <ChevronRight size={14}/>
              </motion.span>
            </Link>
            <motion.div
              variants={{rest:{opacity:0,scaleX:0.5}, hover:{opacity:1,scaleX:1}}}
              transition={{duration:0.3}}
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3/4 h-3 blur-lg pointer-events-none rounded-full"
              style={{background:"linear-gradient(90deg,#be123c,#f43f5e)"}}
            />
          </motion.div>
        </div>
      </div>

      {/* Scroll progress bar */}
      <AnimatePresence>
        {scrolled && (
          <motion.div
            initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            className="absolute bottom-0 left-0 h-px origin-left"
            style={{
              width: `${progress * 100}%`,
              background: "linear-gradient(90deg,#f43f5e,#fb7185,#fda4af)",
              transition: "width 0.1s linear",
            }}
          />
        )}
      </AnimatePresence>
    </nav>
  );
}
