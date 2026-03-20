import { create } from 'zustand'

export const useAuthStore = create((set, get) => ({
  user: null,
  isLoggedIn: false,

  login: (user) => set({ user, isLoggedIn: true }),
  logout: () => set({ user: null, isLoggedIn: false }),

  isAdmin: () => get().user?.role === 'admin',
}))
