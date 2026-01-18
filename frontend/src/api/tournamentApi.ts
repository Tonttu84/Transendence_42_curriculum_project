import axios from "axios";

export const tournamentApi = axios.create({
  baseURL: "/api/tournament",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

tournamentApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }

  return config;
});
