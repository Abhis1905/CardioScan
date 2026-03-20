import axios from "axios";

const API = axios.create({ baseURL: "http://localhost:8000" });

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const predict = (data) => API.post("/predict", data);
export const whatif = (data) => API.post("/whatif", data);
export const getMetrics = () => API.get("/metrics");
export const getModelMetrics = (model) => API.get(`/metrics/${model}`);
export const getFeatureImportance = (model) => API.get(`/feature-importance/${model}`);
export const getDatasetStats = () => API.get("/dataset-stats");
export const listModels = () => API.get("/models");
export const chatWithBot = (system, messages) => API.post("/chat", { system, messages });
export const register = (data) => API.post("/auth/register", data);
export const login = (data) => API.post("/auth/login", data);
export const googleAuth = (credential) => API.post("/auth/google", { credential });
export const getMe = () => API.get("/auth/me");
export const getHistory = () => API.get("/history");
export const getPrediction = (id) => API.get(`/history/${id}`);
export const deletePrediction = (id) => API.delete(`/history/${id}`);
export const updateNotes = (id, notes) => API.put(`/history/${id}/notes`, { notes });
export const deleteAccount = () => API.delete("/auth/delete-account");
export const forgotPassword = (email) => API.post("/auth/forgot-password", { email });
export const resetPassword = (token, password) => API.post("/auth/reset-password", { token, password });
export const adminStats = () => API.get("/admin/stats");
export const adminUsers = (search) => API.get(`/admin/users${search ? `?search=${search}` : ""}`);
export const adminDeleteUser = (id) => API.delete(`/admin/users/${id}`);
export const adminPredictions = (params) => API.get("/admin/predictions", { params });
export const adminDeletePrediction = (id) => API.delete(`/admin/predictions/${id}`);
export const adminExportUsers = async () => {
  const resp = await API.get("/admin/export/users", { responseType: "blob" });
  const url = window.URL.createObjectURL(new Blob([resp.data]));
  const a = document.createElement("a"); a.href = url; a.download = "cardioscan_users.csv"; a.click();
};
export const adminExportPredictions = async () => {
  const resp = await API.get("/admin/export/predictions", { responseType: "blob" });
  const url = window.URL.createObjectURL(new Blob([resp.data]));
  const a = document.createElement("a"); a.href = url; a.download = "cardioscan_predictions.csv"; a.click();
};
export const adminCheck = () => API.get("/admin/check");
