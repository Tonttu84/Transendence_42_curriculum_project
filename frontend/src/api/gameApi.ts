import axios from "axios";

export const gameApi = axios.create({
  baseURL: "/api/game",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

gameApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }

  return config;
});
