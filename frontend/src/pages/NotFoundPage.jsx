import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, Home } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-grid">
      <div className="text-center">
        {/* Giant 404 */}
        <div className="relative mb-8">
          <motion.div
            initial={{opacity:0, scale:0.5}}
            animate={{opacity:1, scale:1}}
            transition={{type:"spring", stiffness:150, damping:15}}
            className="font-display text-[180px] font-bold leading-none select-none"
            style={{
              background:"linear-gradient(135deg, rgba(244,63,94,0.15), rgba(244,63,94,0.05))",
              WebkitBackgroundClip:"text",
              WebkitTextFillColor:"transparent",
              backgroundClip:"text",
              textShadow:"none",
            }}>
            404
          </motion.div>
          {/* Floating heart in the middle */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            animate={{y:[0,-12,0]}}
            transition={{duration:2.5, repeat:Infinity, ease:"easeInOut"}}>
            <div className="w-20 h-20 rounded-2xl bg-crimson-500/20 border border-crimson-500/30 flex items-center justify-center"
              style={{boxShadow:"0 0 40px rgba(244,63,94,0.2)"}}>
              <Heart size={36} className="text-crimson-400 fill-crimson-400 animate-heartbeat"/>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{opacity:0, y:20}}
          animate={{opacity:1, y:0}}
          transition={{delay:0.2}}>
          <h2 className="font-display text-2xl font-bold text-white mb-3">
            Page not found
          </h2>
          <p className="text-slate-400 text-sm mb-8 max-w-sm mx-auto">
            This page doesn't exist or has been moved. Let's get your heart back on track.
          </p>

          <motion.div whileHover={{scale:1.03}} whileTap={{scale:0.97}}>
            <Link to="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all"
              style={{background:"linear-gradient(135deg,#be123c,#f43f5e)"}}>
              <Home size={16}/> Back to Home
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
