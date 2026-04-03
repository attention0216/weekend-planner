/* ======================================================
 *  LoginPage — 手机号 OTP 登录
 *  Supabase 未配置时显示开发者快速入口
 * ====================================================== */

import { useState } from 'react'
import { signInWithOtp, verifyOtp, supabase } from '../hooks/useAuth'

export default function LoginPage() {
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSendCode() {
    if (!phone.trim()) return
    setLoading(true)
    setError('')
    try {
      await signInWithOtp(phone.startsWith('+') ? phone : `+86${phone}`)
      setStep('code')
    } catch (e: any) {
      setError(e.message || '发送失败')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify() {
    if (!code.trim()) return
    setLoading(true)
    setError('')
    try {
      await verifyOtp(phone.startsWith('+') ? phone : `+86${phone}`, code)
    } catch (e: any) {
      setError(e.message || '验证失败')
    } finally {
      setLoading(false)
    }
  }

  /* Supabase 未配置 → 开发模式自动入口（由 useAuth dev 分支处理） */
  if (!supabase) return null

  return (
    <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: 'var(--color-paper)', padding: 'var(--spacing-5)' }}>
      <div className="w-full" style={{ maxWidth: 360 }}>
        {/* Logo */}
        <div className="text-center" style={{ marginBottom: 'var(--spacing-8)' }}>
          <div
            className="inline-flex items-center justify-center"
            style={{
              width: 64, height: 64, borderRadius: 'var(--radius-lg)',
              background: 'var(--color-forest)', color: 'white',
              fontSize: 'var(--font-size-h1)', fontWeight: 700,
              marginBottom: 'var(--spacing-4)',
            }}
          >
            W
          </div>
          <h1 style={{ fontSize: 'var(--font-size-h1)', fontWeight: 700, color: 'var(--color-ink)' }}>
            周末去哪玩
          </h1>
          <p style={{ color: 'var(--color-muted)', marginTop: 'var(--spacing-2)' }}>
            登录开始规划你的周末
          </p>
        </div>

        {/* 表单 */}
        <div className="card-paper" style={{ padding: 'var(--spacing-6)' }}>
          {step === 'phone' ? (
            <>
              <label style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-ink-light)', fontWeight: 500 }}>
                手机号
              </label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="输入手机号"
                autoFocus
                style={{
                  width: '100%', marginTop: 'var(--spacing-2)',
                  padding: 'var(--spacing-3) var(--spacing-4)',
                  border: '1.5px solid var(--color-muted)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--font-size-body)',
                  outline: 'none', background: 'var(--color-paper)',
                }}
              />
              <button
                onClick={handleSendCode}
                disabled={loading || !phone.trim()}
                className="btn-primary"
                style={{ width: '100%', marginTop: 'var(--spacing-4)', opacity: loading ? 0.6 : 1 }}
              >
                {loading ? '发送中...' : '获取验证码'}
              </button>
            </>
          ) : (
            <>
              <label style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-ink-light)', fontWeight: 500 }}>
                验证码
              </label>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="输入 6 位验证码"
                autoFocus
                maxLength={6}
                style={{
                  width: '100%', marginTop: 'var(--spacing-2)',
                  padding: 'var(--spacing-3) var(--spacing-4)',
                  border: '1.5px solid var(--color-muted)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--font-size-h2)',
                  letterSpacing: '0.3em', textAlign: 'center',
                  outline: 'none', background: 'var(--color-paper)',
                }}
              />
              <button
                onClick={handleVerify}
                disabled={loading || code.length < 6}
                className="btn-primary"
                style={{ width: '100%', marginTop: 'var(--spacing-4)', opacity: loading ? 0.6 : 1 }}
              >
                {loading ? '验证中...' : '登录'}
              </button>
              <button
                onClick={() => { setStep('phone'); setCode(''); setError('') }}
                className="btn-ghost"
                style={{ width: '100%', marginTop: 'var(--spacing-2)' }}
              >
                重新输入手机号
              </button>
            </>
          )}

          {error && (
            <p style={{ color: 'var(--color-red)', fontSize: 'var(--font-size-caption)', marginTop: 'var(--spacing-3)', textAlign: 'center' }}>
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
