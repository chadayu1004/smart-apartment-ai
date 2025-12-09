// src/services/api.ts
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000",
});

// ดักทุก request แล้วใส่ Authorization ให้อัตโนมัติ
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token"); // 👈 ต้องตรงกับ LS_TOKEN_KEY

  if (token) {
    if (!config.headers) {
      config.headers = {};
    }
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;
