import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface User {
  id?: string
  email: string
  firstName?: string | null
  middleName?: string | null
  lastName?: string | null
  suffix?: string | null
  facePhoto?: string | null
  facePhotoUrl?: string | null
  userType?: string | null
  first_name?: string | null
  last_name?: string | null
  user_type?: string | null
}

interface AuthState {
  user: User | null
  token: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  setUser: (user: User | null) => void
  setToken: (token: string | null, refreshToken?: string | null) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setToken: (token, refreshToken = null) => set({ token, refreshToken }),
      logout: () => set({ user: null, token: null, refreshToken: null, isAuthenticated: false }),
    }),
    {
      name: "auth-storage",
    }
  )
)
