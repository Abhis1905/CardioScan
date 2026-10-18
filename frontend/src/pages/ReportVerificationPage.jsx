import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ShieldCheck, AlertTriangle, Heart, Calendar, CheckCircle2, Copy, Check, ArrowLeft, ExternalLink, Activity } from "lucide-react";
import { motion } from "framer-motion";
import { verifyReport } from "../api";

export default function ReportVerificationPage() {
  const { reportId } = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    verifyReport(reportId)
      .then((res) => {
        if (isMounted) {
          setData(res.data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(
            err.response?.data?.message ||
            "Unable to verify report. No active assessment record corresponds to this identifier."
          );
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [reportId]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedDate = data?.assessment_date
    ? new Date(data.assessment_date).toLocaleString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
      })
    : "—";

  return (
    <div className="min-h-screen bg-[#F7F5F0] dark:bg-[#141D18] text-[#1A241E] dark:text-[#F7F5F0] flex flex-col justify-between py-8 px-4 sm:px-6 transition-colors duration-200">
      <div className="max-w-2xl mx-auto w-full">
        {/* Brand Bar */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#E5E0D6] dark:border-[#2E3F35]">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-xl bg-[#35483E] dark:bg-[#203126] text-white flex items-center justify-center transition-transform group-hover:scale-105 shadow-2xs">
              <Heart size={16} className="fill-[#D9A19A] text-[#D9A19A]" />
            </div>
            <span className="font-serif font-bold text-lg tracking-tight text-[#35483E] dark:text-[#F7F5F0]">
              Cardio<span className="text-[#B35D52]">Scan</span>
            </span>
          </Link>
          <span className="text-xs uppercase tracking-wider font-semibold text-[#52665A] dark:text-[#A3B8A6] bg-[#E4EDE5] dark:bg-[#1B2920] px-3 py-1 rounded-full border border-[#D3DFD5] dark:border-[#2E3F35]">
            Official Record Verification
          </span>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white dark:bg-[#1D2821] rounded-2xl border border-[#E5E0D6] dark:border-[#2E3F35] p-12 text-center shadow-xs">
            <div className="w-10 h-10 border-3 border-[#35483E]/20 dark:border-white/20 border-t-[#35483E] dark:border-t-white rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm font-medium text-[#52665A] dark:text-[#A3B8A6]">
              Verifying report identifier against CardioScan Registry...
            </p>
          </div>
        )}

        {/* Error / Not Found State */}
        {!loading && error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-[#1D2821] rounded-2xl border border-[#E5E0D6] dark:border-[#2E3F35] p-8 shadow-xs"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#FDF3F2] dark:bg-[#2a1716] border border-[#F0D5D1] dark:border-[#522522] text-[#B35D52] flex items-center justify-center mx-auto mb-4 shadow-2xs">
              <AlertTriangle size={24} />
            </div>
            <h1 className="text-xl font-serif font-bold text-[#35483E] dark:text-[#F7F5F0] text-center mb-2">
              Unverified Assessment Identifier
            </h1>
            <p className="text-xs text-[#6B7F74] dark:text-[#A3B8A6] text-center max-w-md mx-auto mb-6">
              The report identifier <code className="bg-[#F7F5F0] dark:bg-[#24322A] px-1.5 py-0.5 rounded border border-[#E5E0D6] dark:border-[#2E3F35] font-mono text-[#35483E] dark:text-[#F7F5F0]">{reportId}</code> could not be validated against any persisted clinical assessment log.
            </p>
            <div className="p-4 rounded-xl bg-[#FBF5EE] dark:bg-[#261e16] border border-[#EBD3BC] dark:border-[#523d24] text-xs text-[#825226] dark:text-[#e2b885] mb-6 leading-relaxed">
              <strong>Verification Advisory:</strong> Ensure you scanned an authentic CardioScan PDF report QR code or entered the exact report reference (e.g. <code>CS-REP-000001</code>). If this assessment was conducted anonymously without saving, no permanent verification record exists.
            </div>
            <div className="flex justify-center">
              <Link
                to="/"
                className="glossy-btn-secondary inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-[#35483E] dark:text-[#F7F5F0]"
              >
                <ArrowLeft size={14} /> Back to CardioScan
              </Link>
            </div>
          </motion.div>
        )}

        {/* Verified Success State */}
        {!loading && data && data.valid && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Verification Banner */}
            <div className="bg-white dark:bg-[#1D2821] rounded-2xl border border-[#C4DFCD] dark:border-[#2E3F35] p-6 shadow-xs relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#E4EDE5]/50 dark:bg-[#24372C]/40 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#F0F7F2] dark:bg-[#1B2920] border border-[#C4DFCD] dark:border-[#2E3F35] text-[#2D7A58] dark:text-[#4ade80] flex items-center justify-center shrink-0 shadow-2xs">
                  <ShieldCheck size={26} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#2D7A58] dark:text-[#4ade80] bg-[#F0F7F2] dark:bg-[#1B2920] px-2 py-0.5 rounded border border-[#C4DFCD] dark:border-[#2E3F35]">
                      Verified Registry Record
                    </span>
                    <span className="text-[11px] text-[#8A9990] dark:text-[#A3B8A6]">Logged in CardioScan Database</span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#35483E] dark:text-[#F7F5F0]">
                    Assessment Report Verification
                  </h1>
                  <p className="text-xs text-[#52665A] dark:text-[#A3B8A6] mt-1 leading-relaxed">
                    This public registry entry confirms that a cardiovascular risk evaluation was generated and saved on the timestamp below.
                  </p>
                </div>
              </div>
            </div>

            {/* Key Identifiers Grid */}
            <div className="bg-white dark:bg-[#1D2821] rounded-2xl border border-[#E5E0D6] dark:border-[#2E3F35] p-6 shadow-xs">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#52665A] dark:text-[#A3B8A6] mb-4 flex items-center gap-1.5 pb-2 border-b border-[#E5E0D6] dark:border-[#2E3F35]">
                <Activity size={14} className="text-[#35483E] dark:text-[#4ade80]" />
                Verified Assessment Parameters
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* UHID / Report ID */}
                <div className="p-3.5 rounded-xl bg-[#FAF8F5] dark:bg-[#24322A] border border-[#E5E0D6] dark:border-[#2E3F35]">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#6B7F74] dark:text-[#A3B8A6] block mb-1">
                    UHID / Report ID
                  </span>
                  <span className="font-mono text-sm font-bold text-[#35483E] dark:text-[#F7F5F0]">
                    {data.report_id}
                  </span>
                </div>

                {/* Patient ID (Account level) */}
                <div className="p-3.5 rounded-xl bg-[#FAF8F5] dark:bg-[#24322A] border border-[#E5E0D6] dark:border-[#2E3F35]">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#6B7F74] dark:text-[#A3B8A6] block mb-1">
                    Patient ID
                  </span>
                  <span className="font-mono text-sm font-bold text-[#35483E] dark:text-[#F7F5F0]">
                    {data.patient_id}
                  </span>
                </div>

                {/* Patient Name (Masked for privacy) */}
                <div className="p-3.5 rounded-xl bg-[#FAF8F5] dark:bg-[#24322A] border border-[#E5E0D6] dark:border-[#2E3F35]">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#6B7F74] dark:text-[#A3B8A6] block mb-1">
                    Patient Legal Name (Masked)
                  </span>
                  <span className="font-medium text-sm text-[#1A241E] dark:text-[#F7F5F0]">
                    {data.patient_masked_name}
                  </span>
                </div>

                {/* Assessment Date */}
                <div className="p-3.5 rounded-xl bg-[#FAF8F5] dark:bg-[#24322A] border border-[#E5E0D6] dark:border-[#2E3F35]">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#6B7F74] dark:text-[#A3B8A6] block mb-1">
                    Assessment Timestamp
                  </span>
                  <span className="font-medium text-xs text-[#1A241E] dark:text-[#F7F5F0] flex items-center gap-1.5">
                    <Calendar size={13} className="text-[#6B7F74] dark:text-[#A3B8A6]" />
                    {formattedDate}
                  </span>
                </div>

                {/* Inference Model */}
                <div className="p-3.5 rounded-xl bg-[#FAF8F5] dark:bg-[#24322A] border border-[#E5E0D6] dark:border-[#2E3F35]">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#6B7F74] dark:text-[#A3B8A6] block mb-1">
                    Evaluated ML Classifier
                  </span>
                  <span className="font-medium text-xs text-[#1A241E] dark:text-[#F7F5F0]">
                    {data.model_label || data.model_used}
                  </span>
                </div>

                {/* Risk Stratification */}
                <div className="p-3.5 rounded-xl bg-[#FAF8F5] dark:bg-[#24322A] border border-[#E5E0D6] dark:border-[#2E3F35]">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#6B7F74] dark:text-[#A3B8A6] block mb-1">
                    Stratified Risk Outcome
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md font-bold text-xs ${
                        data.risk_level === "High"
                          ? "bg-[#FDF3F2] dark:bg-[#2a1716] text-[#A84438] dark:text-[#f87171] border border-[#EACAC6] dark:border-[#522522]"
                          : data.risk_level === "Moderate"
                          ? "bg-[#FBF5EE] dark:bg-[#261e16] text-[#B56E2B] dark:text-[#fbbf24] border border-[#EBD3BC] dark:border-[#523d24]"
                          : "bg-[#F0F7F2] dark:bg-[#16251b] text-[#2D7A58] dark:text-[#4ade80] border border-[#C4DFCD] dark:border-[#2D4534]"
                      }`}
                    >
                      {data.risk_level} Risk ({data.probability_percent}%)
                    </span>
                    <span className="text-[11px] text-[#52665A] dark:text-[#cbd5e1]">
                      {data.indication}
                    </span>
                  </div>
                </div>
              </div>

              {/* Privacy Notice on Clinical Metrics */}
              <div className="mt-4 p-3 rounded-xl bg-[#E4EDE5]/40 dark:bg-[#16251b]/40 border border-[#D3DFD5] dark:border-[#2D4534] text-[11px] text-[#52665A] dark:text-[#cbd5e1] leading-relaxed">
                <strong>Patient Privacy Safeguard:</strong> In strict compliance with healthcare data minimization standards, raw physiological measurements (resting blood pressure, serum cholesterol, electrocardiographic tracings) and clinical notes are <strong>never exposed</strong> via public verification URLs. Full clinical parameters are restricted to the authenticated patient account.
              </div>
            </div>

            {/* Regulatory & Educational Limitation */}
            <div className="p-4 rounded-xl bg-[#FBF5EE] dark:bg-[#261e16] border border-[#EBD3BC] dark:border-[#523d24] text-xs text-[#825226] dark:text-[#e2b885] leading-relaxed">
              <strong>Medical & Regulatory Disclaimer:</strong> {data.disclaimer}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className="glossy-btn-secondary w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#35483E] dark:text-white shadow-2xs"
              >
                {copied ? <Check size={14} className="text-[#2D7A58] dark:text-[#4ade80]" /> : <Copy size={14} />}
                <span>{copied ? "Link Copied to Clipboard" : "Copy Verification URL"}</span>
              </button>

              <Link
                to="/"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#35483E] hover:bg-[#28372F] transition-colors shadow-2xs"
              >
                <span>Open CardioScan Health Portal</span>
                <ExternalLink size={13} />
              </Link>
            </div>
          </motion.div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-12 text-center text-[11px] text-[#8A9990] dark:text-[#64748b]">
        CardioScan Automated Clinical Registry · Secure Report Verification Subsystem · V2.0
      </footer>
    </div>
  );
}
