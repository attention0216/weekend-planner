/* ======================================================
 *  userStore — Zustand 用户状态
 *  认证 + 画像，全局单例
 * ====================================================== */

import { create } from 'zustand'
import type { UserProfile } from '../types'

interface UserState {
  /* 认证 */
  userId: string | null
  accessToken: string | null
  loading: boolean

  /* 画像 */
  profile: UserProfile | null
  profileReady: boolean
  needsOnboarding: boolean

  /* 操作 */
  setAuth: (userId: string, token: string) => void
  clearAuth: () => void
  setProfile: (profile: UserProfile) => void
  setLoading: (v: boolean) => void
  setOnboarded: () => void
}

export const useUserStore = create<UserState>((set) => ({
  userId: null,
  accessToken: null,
  loading: true,
  profile: null,
  profileReady: false,
  needsOnboarding: false,

  setAuth: (userId, accessToken) => set({ userId, accessToken, loading: false }),
  clearAuth: () => set({ userId: null, accessToken: null, loading: false, profile: null, profileReady: false, needsOnboarding: false }),
  setProfile: (profile) => set({ profile, profileReady: true }),
  setLoading: (loading) => set({ loading }),
  setOnboarded: () => set({ needsOnboarding: false }),
}))
