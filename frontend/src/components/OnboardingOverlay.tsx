/* ======================================================
 *  OnboardingOverlay — 首次画像引导浮层
 *  三问三答：饮食 → 预算 → 社交，三次点选完成
 * ====================================================== */

import { useState } from 'react'
import { useUserStore } from '../stores/userStore'
import { api } from '../api/client'
import PillGroup from './PillGroup'

const DIET_OPTIONS = ['无忌口', '不吃辣', '海鲜过敏', '素食']
const BUDGET_OPTIONS = ['50以下', '50-100', '100-200', '200+']
const SOCIAL_OPTIONS = ['一个人', '约会', '和朋友']

type Step = 'diet' | 'budget' | 'social'

export default function OnboardingOverlay() {
  const { needsOnboarding, setProfile, setOnboarded } = useUserStore()
  const [step, setStep] = useState<Step>('diet')
  const [diet, setDiet] = useState('无忌口')
  const [budget, setBudget] = useState('50-100')

  if (!needsOnboarding) return null

  async function finish(social: string) {
    const data = { name: '', diet: [diet], budget, social }
    try {
      const profile = await api.updateProfile(data)
      setProfile(profile)
    } catch { /* 静默，至少本地更新 */ }
    setOnboarded()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div
        className="animate-slide-up"
        style={{
          background: 'var(--color-paper)',
          borderRadius: '16px 16px 0 0',
          padding: 'var(--spacing-6) var(--spacing-5) env(safe-area-inset-bottom, var(--spacing-6))',
          width: '100%', maxWidth: 480,
        }}
      >
        <h2 style={{ fontSize: 'var(--font-size-h2)', fontWeight: 700, color: 'var(--color-ink)' }}>
          快速了解你
        </h2>
        <p style={{ color: 'var(--color-muted)', marginTop: 'var(--spacing-2)', marginBottom: 'var(--spacing-5)' }}>
          三个问题，让推荐更贴心
        </p>

        {step === 'diet' && (
          <div className="animate-fade-up">
            <h3 style={{ fontSize: 'var(--font-size-h3)', fontWeight: 600 }}>饮食偏好</h3>
            <PillGroup
              options={DIET_OPTIONS}
              value={diet}
              onChange={(v) => { setDiet(v); setStep('budget') }}
            />
          </div>
        )}

        {step === 'budget' && (
          <div className="animate-fade-up">
            <h3 style={{ fontSize: 'var(--font-size-h3)', fontWeight: 600 }}>人均预算</h3>
            <PillGroup
              options={BUDGET_OPTIONS}
              value={budget}
              onChange={(v) => { setBudget(v); setStep('social') }}
            />
          </div>
        )}

        {step === 'social' && (
          <div className="animate-fade-up">
            <h3 style={{ fontSize: 'var(--font-size-h3)', fontWeight: 600 }}>通常和谁一起</h3>
            <PillGroup
              options={SOCIAL_OPTIONS}
              value=""
              onChange={finish}
            />
          </div>
        )}

        <button
          onClick={() => setOnboarded()}
          className="btn-ghost"
          style={{ marginTop: 'var(--spacing-4)', width: '100%', fontSize: 'var(--font-size-caption)' }}
        >
          先跳过
        </button>
      </div>
    </div>
  )
}
