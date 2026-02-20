import axios from "axios";
import { env } from "@/app/config/env";
import { useAuthStore } from "@/app/stores/auth.store";

export const api = axios.create({
  baseURL: env.baseUrl,
  timeout: 30_000,
});

api.interceptors.request.use((config) => {
  const auth = useAuthStore();
  if (auth.accessToken) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${auth.accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    // Si expira/invalid token
    if (err?.response?.status === 401) {
      const auth = useAuthStore();
      auth.logout();
      // no import router aquí para evitar ciclos: redirige por guard
    }
    return Promise.reject(err);
  }
);
