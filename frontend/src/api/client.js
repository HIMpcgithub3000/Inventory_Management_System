import axios from "axios";

// Backend base URL injected at build time. Falls back to local dev backend.
const baseURL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

// Normalize the backend's RFC-9457 problem envelope into a friendly message.
export function errorMessage(err) {
  const data = err?.response?.data;
  if (data?.detail) return data.detail;
  if (data?.title) return data.title;
  if (err?.message) return err.message;
  return "Something went wrong";
}
