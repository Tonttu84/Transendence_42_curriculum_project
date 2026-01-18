import axios from "axios";

export const authApi = axios.create({
  baseURL: "/api/users",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

authApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }

  return config;
});
