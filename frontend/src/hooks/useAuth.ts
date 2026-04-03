/* ======================================================
 *  useAuth — Supabase 认证 hook
 *  监听 auth 状态变化，驱动 userStore
 * ====================================================== */

import { useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useUserStore } from '../stores/userStore'

/* ── Supabase 客户端（单例）── */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey)
  : null

/* ── Hook ── */

export function useAuth() {
  const { setAuth, clearAuth, setLoading } = useUserStore()

  useEffect(() => {
    if (!supabase) {
      /* 开发模式：无 Supabase 配置时自动放行 */
      setAuth('dev-user', 'dev-token')
      return
    }

    /* 初始会话检查 */
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setAuth(session.user.id, session.access_token)
      } else {
        setLoading(false)
      }
    })

    /* 监听状态变化 */
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setAuth(session.user.id, session.access_token)
      } else {
        clearAuth()
      }
    })

    return () => subscription.unsubscribe()
  }, [setAuth, clearAuth, setLoading])
}

/* ── 登录/登出 ── */

export async function signInWithOtp(phone: string) {
  if (!supabase) throw new Error('Supabase 未配置')
  const { error } = await supabase.auth.signInWithOtp({ phone })
  if (error) throw error
}

export async function verifyOtp(phone: string, token: string) {
  if (!supabase) throw new Error('Supabase 未配置')
  const { error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' })
  if (error) throw error
}

export async function signOut() {
  if (!supabase) {
    useUserStore.getState().clearAuth()
    return
  }
  await supabase.auth.signOut()
}
