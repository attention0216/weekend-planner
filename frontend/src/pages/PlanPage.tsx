/* ======================================================
 *  PlanPage — 三次点选 + 日程时间线 + 调整
 *  心情 → 时间 → 同伴 → 生成 → 展示 → 调整
 * ====================================================== */

import { useEffect, useState } from 'react'
import { usePlanStore } from '../stores/planStore'
import { useUserStore } from '../stores/userStore'
import MoodCard from '../components/MoodCard'
import PillGroup from '../components/PillGroup'
import AdjustBar from '../components/AdjustBar'
import TimelineNode from '../components/TimelineNode'
import TimelineLine from '../components/TimelineLine'
import type { TimeSlot, Companion, AdjustAction } from '../types'

const TIME_OPTIONS: TimeSlot[] = ['上午', '下午', '全天']
const COMPANION_OPTIONS: Companion[] = ['一个人', '约会', '和朋友']

export default function PlanPage() {
  const store = usePlanStore()
  const { step, mood, timeSlot, companion, items, generating, planId } = store
  const { setMood, setTimeSlot, setCompanion, addItem, setDone, setGenerating, reset } = store
  const { accessToken } = useUserStore()

  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  /* 选完同伴后触发生成 */
  useEffect(() => {
    if (step !== 'generating' || !mood || !timeSlot || !companion) return

    const ctrl = new AbortController()

    ;(async () => {
      try {
        const resp = await fetch('/api/plan', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ mood, time_slot: timeSlot, companion }),
          signal: ctrl.signal,
        })

        if (!resp.ok) throw new Error('生成失败')

        const data = await resp.json()
        for (const item of data.items || []) addItem(item)
        setDone(data.id)
      } catch (e: any) {
        if (e.name !== 'AbortError') setGenerating(false)
      }
    })()

    return () => ctrl.abort()
  }, [step, mood, timeSlot, companion, accessToken, addItem, setDone, setGenerating])

  /* 调整处理 */
  async function handleAdjust(action: AdjustAction) {
    if (activeIndex === null || !planId) return
    setActiveIndex(null)

    try {
      const resp = await fetch('/api/plan/adjust', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ plan_id: planId, item_index: activeIndex, action }),
      })
      if (resp.ok) {
        const data = await resp.json()
        if (data.items) {
          /* 重置 items 并重新填充 */
          usePlanStore.setState({ items: data.items })
        }
      }
    } catch {
      /* 静默 */
    }
  }

  /* 确认日程 */
  async function handleConfirm() {
    if (!planId) return
    await fetch(`/api/plan/${planId}/confirm`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}` },
    })
    setConfirmed(true)
  }

  return (
    <section className="animate-fade-up" style={{ paddingTop: 'var(--spacing-6)' }}>
      {/* 标题 */}
      <h1 style={{ fontSize: 'var(--font-size-display)', fontWeight: 700, color: 'var(--color-ink)' }}>
        {confirmed ? '周末愉快！' : step === 'done' ? '你的周末日程' : '明天想怎么过？'}
      </h1>

      {/* Step 1: 心情 */}
      {step === 'mood' && (
        <div className="animate-fade-up">
          <p style={{ color: 'var(--color-muted)', margin: 'var(--spacing-2) 0 var(--spacing-4)' }}>
            选一个心情开始
          </p>
          <MoodCard selected={mood} onSelect={setMood} />
        </div>
      )}

      {/* Step 2: 时间 */}
      {step === 'time' && (
        <div className="animate-fade-up">
          <p style={{ color: 'var(--color-muted)', margin: 'var(--spacing-2) 0 var(--spacing-4)' }}>
            什么时候出发？
          </p>
          <PillGroup options={TIME_OPTIONS} value={timeSlot} onChange={(v) => setTimeSlot(v as TimeSlot)} />
        </div>
      )}

      {/* Step 3: 同伴 */}
      {step === 'companion' && (
        <div className="animate-fade-up">
          <p style={{ color: 'var(--color-muted)', margin: 'var(--spacing-2) 0 var(--spacing-4)' }}>
            谁和你一起？
          </p>
          <PillGroup options={COMPANION_OPTIONS} value={companion} onChange={(v) => setCompanion(v as Companion)} />
        </div>
      )}

      {/* 生成中 */}
      {step === 'generating' && generating && items.length === 0 && (
        <div className="animate-fade-up" style={{ textAlign: 'center', padding: 'var(--spacing-8) 0' }}>
          <div className="skeleton" style={{ width: 200, height: 16, margin: '0 auto', borderRadius: 8 }} />
          <p style={{ color: 'var(--color-muted)', marginTop: 'var(--spacing-4)' }}>
            正在为你编排日程...
          </p>
        </div>
      )}

      {/* 时间线 */}
      {items.length > 0 && (
        <div style={{ marginTop: 'var(--spacing-6)' }}>
          {items.map((item, i) => (
            <div key={i} className="animate-slide-up" style={{ animationDelay: `${i * 100}ms` }}>
              {i > 0 && <TimelineLine transitMinutes={item.transit_minutes} />}
              <TimelineNode
                item={item}
                active={activeIndex === i}
                editable={step === 'done' && !confirmed}
                onTap={() => setActiveIndex(i)}
              />
            </div>
          ))}

          {/* CTA */}
          {step === 'done' && !confirmed && (
            <div className="animate-scale-in" style={{ marginTop: 'var(--spacing-6)', display: 'flex', gap: 'var(--spacing-3)' }}>
              <button onClick={handleConfirm} className="btn-primary" style={{ flex: 1 }}>
                出发吧
              </button>
              <button onClick={reset} className="btn-secondary">
                重新规划
              </button>
            </div>
          )}

          {confirmed && (
            <div className="animate-scale-in" style={{ marginTop: 'var(--spacing-6)', textAlign: 'center' }}>
              <p style={{ color: 'var(--color-forest)', fontWeight: 600 }}>已确认，印章已记录到集邮册</p>
              <button onClick={() => { reset(); setConfirmed(false) }} className="btn-ghost" style={{ marginTop: 'var(--spacing-3)' }}>
                规划下一个周末
              </button>
            </div>
          )}
        </div>
      )}

      {/* 调整操作栏 */}
      <AdjustBar
        visible={activeIndex !== null}
        onAction={handleAdjust}
        onClose={() => setActiveIndex(null)}
      />
    </section>
  )
}
