import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Heart, CheckCircle, XCircle, Loader } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const { loginUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) { setStatus("error"); setMessage("Invalid verification link."); return; }

    axios.get(`http://localhost:8000/auth/verify-email?token=${token}`)
      .then(({ data }) => {
        loginUser(data.token, data.user);
        setStatus("success");
        setMessage(`Welcome to CardioScan, ${data.user.name}!`);
        setTimeout(() => navigate("/"), 3000);
      })
      .catch(err => {
        setStatus("error");
        setMessage(err?.response?.data?.error || "Verification failed. Link may have expired.");
      });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="glass-card p-10 text-center">
          {status === "loading" && (
            <>
              <div className="w-20 h-20 rounded-full bg-crimson-500/20 border border-crimson-500/30 flex items-center justify-center mx-auto mb-6">
                <Loader size={36} className="text-crimson-400 animate-spin"/>
              </div>
              <h2 className="font-display text-2xl font-bold text-white mb-3">Verifying your email...</h2>
              <p className="text-slate-400 text-sm">Please wait a moment.</p>
            </>
          )}
          {status === "success" && (
            <>
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
                <CheckCircle size={40} className="text-emerald-400"/>
              </div>
              <h2 className="font-display text-2xl font-bold text-white mb-3">Email Verified! 🎉</h2>
              <p className="text-slate-400 text-sm mb-2">{message}</p>
              <p className="text-slate-500 text-xs">Redirecting you to the app...</p>
            </>
          )}
          {status === "error" && (
            <>
              <div className="w-20 h-20 rounded-full bg-crimson-500/20 border border-crimson-500/30 flex items-center justify-center mx-auto mb-6">
                <XCircle size={40} className="text-crimson-400"/>
              </div>
              <h2 className="font-display text-2xl font-bold text-white mb-3">Verification Failed</h2>
              <p className="text-slate-400 text-sm mb-6">{message}</p>
              <Link to="/login" className="text-crimson-400 hover:text-crimson-300 font-medium text-sm">
                Back to Login →
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
