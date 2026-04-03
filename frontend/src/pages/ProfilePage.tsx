/* ======================================================
 *  ProfilePage — 画像设置 + 首次引导
 *  饮食偏好 · 预算范围 · 社交场景
 * ====================================================== */

import { useState, useEffect } from 'react'
import { useUserStore } from '../stores/userStore'
import { api } from '../api/client'
import { signOut } from '../hooks/useAuth'
import { showToast } from '../components/Toast'
import PillGroup from '../components/PillGroup'

const DIET_OPTIONS = ['无忌口', '不吃辣', '海鲜过敏', '素食']
const BUDGET_OPTIONS = ['50以下', '50-100', '100-200', '200+']
const SOCIAL_OPTIONS = ['一个人', '约会', '和朋友']

export default function ProfilePage() {
  const { userId, profile, setProfile } = useUserStore()
  const [diet, setDiet] = useState<string>(profile?.diet?.[0] || '无忌口')
  const [budget, setBudget] = useState(profile?.budget || '50-100')
  const [social, setSocial] = useState(profile?.social || '一个人')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!profile && userId) {
      api.getProfile()
        .then(data => {
          setProfile(data)
          if (data.diet?.[0]) setDiet(data.diet[0])
          if (data.budget) setBudget(data.budget)
          if (data.social) setSocial(data.social)
        })
        .catch(() => {})
    }
  }, [userId, profile, setProfile])

  async function handleSave() {
    setSaving(true)
    try {
      await api.updateProfile({ name: profile?.name || '', diet: [diet], budget, social })
      showToast('已保存')
    } catch {
      showToast('保存失败', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="animate-fade-up" style={{ paddingTop: 'var(--spacing-6)' }}>
      <h1 style={{ fontSize: 'var(--font-size-h1)', fontWeight: 700, color: 'var(--color-ink)' }}>
        我的
      </h1>

      <div className="card" style={{ marginTop: 'var(--spacing-6)' }}>
        <h2 style={{ fontSize: 'var(--font-size-h3)', fontWeight: 600 }}>饮食偏好</h2>
        <PillGroup options={DIET_OPTIONS} value={diet} onChange={setDiet} compact />
      </div>

      <div className="card" style={{ marginTop: 'var(--spacing-4)' }}>
        <h2 style={{ fontSize: 'var(--font-size-h3)', fontWeight: 600 }}>人均预算</h2>
        <PillGroup options={BUDGET_OPTIONS} value={budget} onChange={setBudget} compact />
      </div>

      <div className="card" style={{ marginTop: 'var(--spacing-4)' }}>
        <h2 style={{ fontSize: 'var(--font-size-h3)', fontWeight: 600 }}>社交场景</h2>
        <PillGroup options={SOCIAL_OPTIONS} value={social} onChange={setSocial} compact />
      </div>

      <div style={{ marginTop: 'var(--spacing-6)', display: 'flex', gap: 'var(--spacing-3)' }}>
        <button onClick={handleSave} disabled={saving} className="btn-primary" style={{ flex: 1 }}>
          {saving ? '保存中...' : '保存设置'}
        </button>
        <button onClick={signOut} className="btn-ghost" style={{ color: 'var(--color-red)' }}>
          退出
        </button>
      </div>
    </section>
  )
}
