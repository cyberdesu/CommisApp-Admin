import axios from "axios"
import { clearSession, getAccessToken, getRefreshToken, setSession } from "@/lib/auth/token-storage"

// Since auth is now cookie-based (HttpOnly), we use relative /api paths.
// The browser will automatically send the admin_session cookie with each request.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api"

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // <-- ensures cookies are sent cross-origin if needed
})

// No Authorization header interceptor needed — server reads the cookie directly.

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Cookie expired or invalid — redirect to login
      if (typeof window !== "undefined") {
        window.location.href = "/login"
      }
    }
    return Promise.reject(error)
  },
)
