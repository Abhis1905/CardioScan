import React, { useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * AnatomicalHeart
 *
 * An editorial medical vector illustration of the human heart featuring:
 * - Aortic arch and branches, pulmonary trunk, coronary arterial tree, and myocardium.
 * - Subtle light tracer flowing along coronary vessels (5.2s slow cycle).
 * - Static heart body (no bouncing or simulated live heartbeat monitoring).
 * - Interactive exploration of three specific anatomical regions:
 *   1. Aortic arch
 *   2. Coronary arteries
 *   3. Heart muscle (myocardium)
 * - Complete keyboard accessibility (Tab, Enter, Space) and touch/hover support.
 * - Full prefers-reduced-motion compliance.
 */

export default function AnatomicalHeart({ className = "" }) {
  const { t } = useTranslation();
  const [activeRegionId, setActiveRegionId] = useState("coronary");

  const regions = [
    {
      id: "aorta",
      name: t("landing.heart.aorta_name", "Aortic arch"),
      dotColor: "#BE123C",
      pinX: 236,
      pinY: 82,
      labelX: 295,
      labelY: 72,
      explanation: t(
        "landing.heart.aorta_desc",
        "The aorta carries oxygen-rich blood from the heart to the body. CardioScan does not directly image or measure the aorta."
      ),
    },
    {
      id: "coronary",
      name: t("landing.heart.coronary_name", "Coronary arteries"),
      dotColor: "#BE123C",
      pinX: 195,
      pinY: 260,
      labelX: 85,
      labelY: 260,
      explanation: t(
        "landing.heart.coronary_desc",
        "Coronary arteries supply blood to the heart muscle. Some clinical measurements can provide indirect information relevant to coronary artery disease, but this illustration does not show an individual's arteries."
      ),
    },
    {
      id: "muscle",
      name: t("landing.heart.muscle_name", "Heart muscle"),
      dotColor: "#881337",
      pinX: 255,
      pinY: 330,
      labelX: 315,
      labelY: 340,
      explanation: t(
        "landing.heart.muscle_desc",
        "The myocardium is the heart's muscular wall. CardioScan uses measurements from a dataset to estimate a pattern; it does not directly measure the condition of your heart muscle."
      ),
    },
  ];

  const currentRegion = regions.find((r) => r.id === activeRegionId) || regions[1];

  return (
    <div className={`relative flex flex-col items-center select-none ${className}`}>
      {/* Background radial tint - restrained and calm */}
      <div
        className="absolute inset-0 rounded-2xl opacity-35 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 50% 45%, rgba(190, 18, 60, 0.06) 0%, rgba(244, 242, 236, 0.3) 60%, transparent 80%)",
        }}
      />

      {/* SVG Heart Illustration */}
      <div className="relative w-full max-w-[310px] sm:max-w-[340px] aspect-[4/4.1] flex items-center justify-center">
        <svg
          viewBox="0 0 380 410"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-[0_8px_20px_rgba(15,23,42,0.06)]"
          aria-label="Editorial anatomical illustration of the human heart showing aortic arch, coronary arteries, and heart muscle"
          role="img"
        >
          <defs>
            {/* Shading Gradients */}
            <linearGradient id="aortaGrad" x1="160" y1="40" x2="260" y2="160" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#BE123C" />
              <stop offset="50%" stopColor="#9F1239" />
              <stop offset="100%" stopColor="#881337" />
            </linearGradient>

            <linearGradient id="pulmonaryGrad" x1="140" y1="110" x2="240" y2="180" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="40%" stopColor="#0284C7" />
              <stop offset="100%" stopColor="#1E293B" />
            </linearGradient>

            <linearGradient id="svcGrad" x1="100" y1="60" x2="150" y2="150" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#64748B" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>

            <linearGradient id="muscleGradLeft" x1="220" y1="180" x2="310" y2="350" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#F1EDE4" />
              <stop offset="50%" stopColor="#E2DBD0" />
              <stop offset="100%" stopColor="#C8BEAF" />
            </linearGradient>

            <linearGradient id="muscleGradRight" x1="120" y1="180" x2="220" y2="360" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FAF7F2" />
              <stop offset="60%" stopColor="#EAE4D9" />
              <stop offset="100%" stopColor="#D5CBBF" />
            </linearGradient>

            {/* Tracer Glow Filter */}
            <filter id="vesselGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* ── 1. Superior Vena Cava (SVC) ─────────────────────────────────── */}
          <path
            d="M 122 55 L 122 135 C 122 155 130 168 145 178 L 155 185 C 145 175 140 160 140 135 L 140 55 Z"
            fill="url(#svcGrad)"
            stroke="#0F172A"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M 122 68 C 110 50 95 40 85 35 L 80 42 C 92 48 105 60 114 74 Z"
            fill="#475569"
            stroke="#0F172A"
            strokeWidth="1.5"
          />

          {/* ── 2. Aortic Arch & Supra-Aortic Branches ────────────────────── */}
          <g
            className={`transition-all duration-200 cursor-pointer ${
              activeRegionId === "aorta" ? "filter drop-shadow-[0_0_6px_rgba(190,18,60,0.35)]" : ""
            }`}
            onClick={() => setActiveRegionId("aorta")}
          >
            {/* Main Arch */}
            <path
              d="M 175 170 C 170 120 185 65 230 65 C 275 65 295 110 295 165 C 295 195 285 210 275 220 C 270 205 275 180 275 160 C 275 115 260 85 230 85 C 200 85 192 120 195 170 Z"
              fill="url(#aortaGrad)"
              stroke={activeRegionId === "aorta" ? "#BE123C" : "#0F172A"}
              strokeWidth={activeRegionId === "aorta" ? "2.6" : "2"}
              strokeLinejoin="round"
            />

            {/* Branch 1: Brachiocephalic Artery */}
            <path
              d="M 205 76 L 195 25 C 195 22 205 20 208 24 L 217 72 Z"
              fill="#9F1239"
              stroke="#0F172A"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            {/* Branch 2: Left Common Carotid Artery */}
            <path
              d="M 226 67 L 228 22 C 228 18 238 18 238 22 L 237 66 Z"
              fill="#BE123C"
              stroke="#0F172A"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            {/* Branch 3: Left Subclavian Artery */}
            <path
              d="M 248 69 L 260 25 C 262 20 272 23 270 28 L 258 75 Z"
              fill="#9F1239"
              stroke="#0F172A"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </g>

          {/* ── 3. Pulmonary Trunk & Arteries ─────────────────────────────── */}
          <path
            d="M 160 185 C 158 145 175 125 210 125 C 235 125 255 138 260 160 C 248 152 230 145 210 145 C 185 145 178 160 178 185 Z"
            fill="url(#pulmonaryGrad)"
            stroke="#0F172A"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M 245 145 C 270 140 295 145 310 152 L 312 162 C 298 155 272 152 250 155 Z"
            fill="#0284C7"
            stroke="#0F172A"
            strokeWidth="1.5"
          />
          <path
            d="M 165 145 C 145 140 120 145 105 152 L 102 142 C 122 135 145 135 165 138 Z"
            fill="#0284C7"
            stroke="#0F172A"
            strokeWidth="1.5"
          />

          {/* ── 4. Atria ──────────────────────────────────────────────────── */}
          <path
            d="M 125 150 C 105 160 95 185 98 215 C 102 245 115 260 135 270 C 130 250 128 225 132 195 C 134 175 140 160 148 150 Z"
            fill="#E5DDD2"
            stroke="#0F172A"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M 270 180 C 285 185 295 198 296 215 C 297 225 290 235 280 240 C 282 225 278 205 268 190 Z"
            fill="#E0D7CB"
            stroke="#0F172A"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />

          {/* ── 5. Main Ventricular Muscle Mass (Heart Muscle) ─────────────── */}
          <g
            className={`transition-all duration-200 cursor-pointer ${
              activeRegionId === "muscle" ? "filter drop-shadow-[0_0_6px_rgba(136,19,55,0.25)]" : ""
            }`}
            onClick={() => setActiveRegionId("muscle")}
          >
            {/* Left Ventricle & Apex */}
            <path
              d="M 205 190 C 240 190 285 210 295 250 C 305 290 285 345 255 385 C 235 410 215 422 205 425 C 200 422 192 390 190 350 C 188 310 195 240 205 190 Z"
              fill="url(#muscleGradLeft)"
              stroke={activeRegionId === "muscle" ? "#881337" : "#0F172A"}
              strokeWidth={activeRegionId === "muscle" ? "2.6" : "2"}
              strokeLinejoin="round"
            />

            {/* Right Ventricle */}
            <path
              d="M 135 265 C 130 275 135 305 150 335 C 165 365 185 400 205 425 C 195 385 190 320 190 260 C 190 220 185 200 165 190 C 145 200 138 230 135 265 Z"
              fill="url(#muscleGradRight)"
              stroke={activeRegionId === "muscle" ? "#881337" : "#0F172A"}
              strokeWidth={activeRegionId === "muscle" ? "2.6" : "2"}
              strokeLinejoin="round"
            />

            {/* Muscle Contour Striations */}
            <g stroke="#948B7E" strokeWidth="0.8" strokeLinecap="round" opacity="0.45">
              <path d="M 148 240 C 158 260 165 285 172 315" />
              <path d="M 158 230 C 168 255 178 290 185 330" />
              <path d="M 170 215 C 178 245 185 285 190 330" />
              <path d="M 230 225 C 245 250 260 280 270 315" />
              <path d="M 245 235 C 260 265 272 295 278 330" />
              <path d="M 215 250 C 230 285 242 330 248 375" />
              <path d="M 260 260 C 270 290 275 325 270 360" />
            </g>
          </g>

          {/* ── 6. Coronary Arterial Network ──────────────────────────────── */}
          <g
            className={`transition-all duration-200 cursor-pointer ${
              activeRegionId === "coronary" ? "filter drop-shadow-[0_0_8px_rgba(190,18,60,0.45)]" : ""
            }`}
            onClick={() => setActiveRegionId("coronary")}
          >
            {/* Sulcus groove */}
            <path
              d="M 195 190 Q 192 270 205 425"
              stroke="#D1C7B8"
              strokeWidth="10"
              strokeLinecap="round"
              opacity="0.6"
            />

            {/* Main Coronary Branch */}
            <path
              d="M 195 192 C 192 230 190 270 195 315 C 198 345 202 385 205 423"
              stroke="#9F1239"
              strokeWidth={activeRegionId === "coronary" ? "4" : "3.2"}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Diagonal branches */}
            <path d="M 193 235 C 210 245 230 260 245 280" stroke="#BE123C" strokeWidth="2" strokeLinecap="round" />
            <path d="M 195 275 C 215 290 235 310 248 335" stroke="#BE123C" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M 198 330 C 212 350 225 370 232 390" stroke="#BE123C" strokeWidth="1.5" strokeLinecap="round" />

            {/* Septal branches */}
            <path d="M 192 245 C 180 260 170 275 160 290" stroke="#BE123C" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M 194 295 C 182 315 175 335 170 355" stroke="#BE123C" strokeWidth="1.5" strokeLinecap="round" />

            {/* Right Coronary Artery (RCA) branch */}
            <path
              d="M 148 195 C 140 220 138 245 137 270 C 140 288 145 305 152 325"
              stroke="#9F1239"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path d="M 137 270 C 145 280 155 290 165 300" stroke="#BE123C" strokeWidth="1.6" strokeLinecap="round" />

            {/* Circumflex branch */}
            <path d="M 215 195 C 238 200 260 208 275 220" stroke="#BE123C" strokeWidth="2.2" strokeLinecap="round" />

            {/* Cardiac Veins */}
            <path
              d="M 198 200 C 196 240 195 280 200 325 C 204 355 208 395 209 420"
              stroke="#334155"
              strokeWidth="1.8"
              strokeLinecap="round"
              opacity="0.75"
            />
            <path
              d="M 200 325 C 215 340 230 355 240 375"
              stroke="#334155"
              strokeWidth="1.2"
              strokeLinecap="round"
              opacity="0.7"
            />
          </g>

          {/* ── 7. Subtle Animated Light Highlight along Coronary Vessel ── */}
          {/* Smooth, narrow travelling light highlight repeating slowly every ~5.2s */}
          <path
            d="M 195 192 C 192 230 190 270 195 315 C 198 345 202 385 205 423"
            stroke="#FECDD3"
            strokeWidth="3.4"
            strokeLinecap="round"
            className="cardioscan-vessel-tracer"
            filter="url(#vesselGlow)"
          />

          {/* ── 8. Interactive Hotspot Pins & Connector Lines ───────────── */}
          {regions.map((region) => {
            const isActive = activeRegionId === region.id;
            return (
              <g
                key={region.id}
                className="cursor-pointer group"
                onClick={() => setActiveRegionId(region.id)}
                onMouseEnter={() => setActiveRegionId(region.id)}
                role="button"
                tabIndex={0}
                aria-label={`Select ${region.name} to view clinical context`}
                aria-pressed={isActive}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setActiveRegionId(region.id);
                  }
                }}
              >
                {/* Active Outer Glow Pulse */}
                {isActive && (
                  <circle
                    cx={region.pinX}
                    cy={region.pinY}
                    r="9"
                    fill={region.dotColor}
                    opacity="0.22"
                    className="animate-ping"
                    style={{ animationDuration: "2.4s" }}
                  />
                )}

                {/* Visible Ring */}
                <circle
                  cx={region.pinX}
                  cy={region.pinY}
                  r={isActive ? "7" : "5"}
                  fill="#FFFFFF"
                  stroke={isActive ? "#0F172A" : region.dotColor}
                  strokeWidth={isActive ? "2" : "1.5"}
                  className="transition-all duration-200"
                />

                {/* Inner Pin Dot */}
                <circle
                  cx={region.pinX}
                  cy={region.pinY}
                  r="3"
                  fill={region.dotColor}
                />

                {/* Invisible larger hit target for effortless tapping/hovering */}
                <circle
                  cx={region.pinX}
                  cy={region.pinY}
                  r="18"
                  fill="transparent"
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* ── 9. Accessible Callout Selector Buttons ─────────────────────────── */}
      <div
        className="w-full flex items-center justify-center gap-1.5 pt-2"
        role="tablist"
        aria-label="Interactive anatomical heart regions"
      >
        {regions.map((region) => {
          const isActive = activeRegionId === region.id;
          return (
            <button
              key={region.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveRegionId(region.id)}
              onMouseEnter={() => setActiveRegionId(region.id)}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-[13px] font-medium transition-all focus:outline-none focus:ring-2 focus:ring-[#BE123C]/50 ${
                isActive
                  ? "bg-[#0F172A] text-white shadow-xs font-semibold"
                  : "bg-[#FAF9F6] text-[#334155] border border-[#E2DFD6] hover:bg-[#F4F2EC] hover:text-[#0F172A]"
              }`}
            >
              <span
                className="w-2 h-2 rounded-full inline-block mr-1.5 rtl:mr-0 rtl:ml-1.5"
                style={{ backgroundColor: region.dotColor }}
              />
              {region.name}
            </button>
          );
        })}
      </div>

      {/* ── 10. Integrated Explanation Panel ──────────────────────────────── */}
      <div
        className="w-full mt-3.5 p-3.5 sm:p-4 rounded-xl border border-[#E2DFD6] bg-[#FAF9F6] text-start transition-all duration-200"
        role="region"
        aria-live="polite"
        aria-label={`Explanation for ${currentRegion.name}`}
      >
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: currentRegion.dotColor }}
            />
            <h4 className="text-sm font-bold text-[#0F172A]">{currentRegion.name}</h4>
          </div>
          <span className="text-xs font-mono text-[#64748B]">
            {t("landing.heart.interactive_area", "Interactive Area")}
          </span>
        </div>
        <p className="text-sm text-[#334155] leading-relaxed">
          {currentRegion.explanation}
        </p>
      </div>

      {/* Embedded CSS for slow, restrained light animation along vessel */}
      <style>{`
        /* Soft, narrow light highlight travelling along vessel every ~5.2s */
        @keyframes vesselLightFlow {
          0%, 15% {
            stroke-dashoffset: 240;
            opacity: 0;
          }
          28% {
            opacity: 0.95;
          }
          55% {
            stroke-dashoffset: 0;
            opacity: 0.85;
          }
          72%, 100% {
            stroke-dashoffset: -130;
            opacity: 0;
          }
        }

        .cardioscan-vessel-tracer {
          stroke-dasharray: 40 200;
          animation: vesselLightFlow 5.2s ease-in-out infinite;
        }

        /* Respect prefers-reduced-motion: disable travelling light */
        @media (prefers-reduced-motion: reduce) {
          .cardioscan-vessel-tracer {
            animation: none !important;
            opacity: 0.25 !important;
            stroke-dasharray: none !important;
          }
        }
      `}</style>
    </div>
  );
}
