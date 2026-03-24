/* ======================================================
 * 用户画像页 — 偏好设置
 * 饮食需求 · 社交偏好 · 预算范围
 * ====================================================== */

import { useState } from "react"
import { useNavigate } from "react-router"

/* ── 画像数据结构 ── */
export interface UserProfile {
  diet: string[]
  social: string
  budget: string
  customNote: string
}

const STORAGE_KEY = "user_profile"

export function loadProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as UserProfile
  } catch {}
  return { diet: [], social: "", budget: "经济", customNote: "" }
}

export function saveProfile(p: UserProfile) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
}

/* ── 选项定义 ── */
const dietOptions = [
  { value: "高蛋白", label: "高蛋白", desc: "增肌/健身需求" },
  { value: "低糖低油", label: "低糖低油", desc: "皮肤管理/控糖" },
  { value: "清淡", label: "清淡", desc: "肠胃敏感" },
  { value: "无辣", label: "无辣", desc: "忌辛辣刺激" },
  { value: "素食", label: "素食", desc: "素食主义" },
  { value: "无海鲜", label: "无海鲜", desc: "海鲜过敏" },
  { value: "无乳制品", label: "无乳制品", desc: "乳糖不耐" },
]

const socialOptions = [
  { value: "认识新朋友", label: "认识新朋友", desc: "社交活动、拼桌、线下聚会" },
  { value: "约会", label: "适合约会", desc: "浪漫氛围、双人活动" },
  { value: "独处", label: "一个人", desc: "安静、自由探索" },
  { value: "朋友", label: "和朋友", desc: "小团体活动" },
]

const budgetOptions = [
  { value: "经济", label: "经济", desc: "人均 ≤30" },
  { value: "适中", label: "适中", desc: "人均 30-80" },
  { value: "不限", label: "不限", desc: "体验优先" },
]

export function ProfilePage() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<UserProfile>(loadProfile)
  const [saved, setSaved] = useState(false)

  /* 多选 toggle */
  function toggleDiet(val: string) {
    setProfile((p) => ({
      ...p,
      diet: p.diet.includes(val) ? p.diet.filter((d) => d !== val) : [...p.diet, val],
    }))
    setSaved(false)
  }

  function handleSave() {
    saveProfile(profile)
    setSaved(true)
    setTimeout(() => navigate("/"), 600)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 返回 */}
      <button
        onClick={() => navigate("/")}
        className="self-start text-[13px] text-[var(--color-accent)] font-medium flex items-center gap-1 -ml-1 min-h-[44px]"
        aria-label="返回"
      >
        <svg width="7" height="12" viewBox="0 0 7 12" fill="none" className="mt-px">
          <path d="M6 1L1 6L6 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        返回
      </button>

      <div>
        <h2 className="text-[22px] font-bold tracking-[-0.03em] text-[var(--color-t1)]">我的偏好</h2>
        <p className="text-[13px] text-[var(--color-t3)] mt-1">帮我更懂你，推荐更合适的日程</p>
      </div>

      {/* 饮食需求 — 多选 */}
      <section>
        <h3 className="text-[15px] font-semibold text-[var(--color-t1)] mb-3">饮食需求</h3>
        <div className="flex flex-wrap gap-2">
          {dietOptions.map((opt) => {
            const active = profile.diet.includes(opt.value)
            return (
              <button
                key={opt.value}
                onClick={() => toggleDiet(opt.value)}
                className={`text-[13px] px-4 py-2 rounded-lg transition-all duration-200 ${
                  active
                    ? "bg-[var(--color-accent)] text-white"
                    : "bg-[var(--color-bg-dim)] text-[var(--color-t2)] hover:bg-[var(--color-border)]"
                }`}
                aria-pressed={active}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
        <p className="text-[11px] text-[var(--color-t3)] mt-2">
          {profile.diet.length > 0 ? profile.diet.join(" · ") : "未选择"}
        </p>
      </section>

      {/* 社交偏好 — 单选 */}
      <section>
        <h3 className="text-[15px] font-semibold text-[var(--color-t1)] mb-3">社交偏好</h3>
        <div className="flex flex-wrap gap-2">
          {socialOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setProfile((p) => ({ ...p, social: opt.value })); setSaved(false) }}
              className={`text-[13px] px-4 py-2 rounded-lg transition-all duration-200 ${
                profile.social === opt.value
                  ? "bg-[var(--color-accent)] text-white"
                  : "bg-[var(--color-bg-dim)] text-[var(--color-t2)] hover:bg-[var(--color-border)]"
              }`}
              aria-pressed={profile.social === opt.value}
            >
              {opt.label}
              <span className="block text-[11px] opacity-70 mt-0.5">{opt.desc}</span>
            </button>
          ))}
        </div>
      </section>

      {/* 预算 — 单选 */}
      <section>
        <h3 className="text-[15px] font-semibold text-[var(--color-t1)] mb-3">餐饮预算</h3>
        <div className="flex gap-2">
          {budgetOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setProfile((p) => ({ ...p, budget: opt.value })); setSaved(false) }}
              className={`flex-1 text-center text-[13px] py-3 rounded-lg transition-all duration-200 ${
                profile.budget === opt.value
                  ? "bg-[var(--color-accent)] text-white"
                  : "bg-[var(--color-bg-dim)] text-[var(--color-t2)] hover:bg-[var(--color-border)]"
              }`}
              aria-pressed={profile.budget === opt.value}
            >
              {opt.label}
              <span className="block text-[11px] opacity-70">{opt.desc}</span>
            </button>
          ))}
        </div>
      </section>

      {/* 自定义备注 */}
      <section>
        <h3 className="text-[15px] font-semibold text-[var(--color-t1)] mb-3">其他备注</h3>
        <textarea
          value={profile.customNote}
          onChange={(e) => { setProfile((p) => ({ ...p, customNote: e.target.value })); setSaved(false) }}
          placeholder="比如：有皮肤炎需要忌口、想认识异性、偏好户外..."
          rows={3}
          className="w-full text-[13px] bg-[var(--color-bg-dim)] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30 placeholder:text-[var(--color-t3)] resize-none"
        />
      </section>

      {/* 保存 */}
      <button
        onClick={handleSave}
        className={`w-full py-[13px] rounded-xl text-[14px] font-semibold transition-all duration-200 active:scale-[0.98] ${
          saved
            ? "bg-[var(--color-tech-green)] text-white"
            : "bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white"
        }`}
      >
        {saved ? "已保存 ✓" : "保存偏好"}
      </button>
    </div>
  )
}
