import { defineStore } from "pinia";
import { jwtDecode } from "jwt-decode";
import type { JwtPayload, LoginResponse } from "@/app/types/auth.types";

type AuthState = {
  accessToken: string | null;
  tokenType: string | null;
  expiresAt: number | null; // unix ms
  user: LoginResponse["user"] | null;
  bootstrapped: boolean;
};

const LS_KEY = "kpi_auth_v1";

export const useAuthStore = defineStore("auth", {
  state: (): AuthState => ({
    accessToken: null,
    tokenType: null,
    expiresAt: null,
    user: null,
    bootstrapped: false,
  }),

  getters: {
    isExpired(state): boolean {
      return state.expiresAt ? Date.now() >= state.expiresAt : true;
    },

    isAuthenticated(): boolean {
      // aquí `this` es el store (Pinia Options API)
      return !!this.accessToken && !!this.user && !this.isExpired;
    },

    userId(state): string | null {
      return state.user?.id ?? null;
    },
  },

  actions: {
    bootstrapFromStorage() {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) {
        this.bootstrapped = true;
        return;
      }

      try {
        const parsed = JSON.parse(raw) as Pick<
          AuthState,
          "accessToken" | "tokenType" | "expiresAt" | "user"
        >;

        this.accessToken = parsed.accessToken ?? null;
        this.tokenType = parsed.tokenType ?? null;
        this.expiresAt = parsed.expiresAt ?? null;
        this.user = parsed.user ?? null;

        // Evitamos depender del getter si quieres máxima compatibilidad:
        const expired = this.expiresAt ? Date.now() >= this.expiresAt : true;
        if (!this.accessToken || !this.user || expired) {
          this.logout();
        }
      } catch {
        this.logout();
      } finally {
        this.bootstrapped = true;
      }
    },

    setSession(login: LoginResponse) {
      this.accessToken = login.accessToken;
      this.tokenType = login.tokenType;
      this.user = login.user;

      const payload = jwtDecode<JwtPayload>(login.accessToken);
      const expSeconds = payload?.exp ?? 0;
      this.expiresAt = expSeconds ? expSeconds * 1000 : null;

      localStorage.setItem(
        LS_KEY,
        JSON.stringify({
          accessToken: this.accessToken,
          tokenType: this.tokenType,
          expiresAt: this.expiresAt,
          user: this.user,
        })
      );
    },

    logout() {
      this.accessToken = null;
      this.tokenType = null;
      this.expiresAt = null;
      this.user = null;
      localStorage.removeItem(LS_KEY);
    },
  },
});
