import { create } from "zustand"
import { persist } from "zustand/middleware"

interface AuthState {
  token: string | null
  refreshToken: string | null
  user: any | null
  setToken: (token: string | null, refreshToken?: string | null) => void
  setUser: (user: any | null) => void
  logout: () => void
  isLoggedIn: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      refreshToken: null,
      user: null,
      setToken: (token, refreshToken = null) => set({ token, refreshToken }),
      setUser: (user) => set({ user }),
      logout: () => set({ token: null, refreshToken: null, user: null }),
      isLoggedIn: () => !!get().token,
    }),
    {
      name: "auth-storage",
    }
  )
)
