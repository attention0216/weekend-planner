/* ======================================================
 *  PlanPage — 三次点选 + SSE 流式时间线 + 调整
 *  心情 → 时间 → 同伴 → SSE 生成 → 展示 → 调整
 * ====================================================== */

import { useEffect, useState } from 'react'
import { usePlanStore } from '../stores/planStore'
import { useSSE } from '../hooks/useSSE'
import { api } from '../api/client'
import { showToast } from '../components/Toast'
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
  const { start: startSSE, abort: abortSSE } = useSSE()

  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  /* ── 选完同伴后 SSE 流式生成 ── */
  useEffect(() => {
    if (step !== 'generating' || !mood || !timeSlot || !companion) return

    startSSE('/api/plan', { mood, time_slot: timeSlot, companion }, {
      onItem: (_index, item) => addItem(item),
      onDone: (id) => setDone(id),
      onError: (msg) => {
        setGenerating(false)
        showToast(msg || '生成失败', 'error')
      },
    })

    return () => abortSSE()
  }, [step, mood, timeSlot, companion, addItem, setDone, setGenerating, startSSE, abortSSE])

  /* ── 调整处理 ── */
  async function handleAdjust(action: AdjustAction) {
    if (activeIndex === null || !planId) return
    setActiveIndex(null)

    try {
      const data = await api.adjustPlan(planId, activeIndex, action)
      if (data.items) usePlanStore.setState({ items: data.items })
      showToast('已调整')
    } catch {
      showToast('调整失败', 'error')
    }
  }

  /* ── 确认日程 ── */
  async function handleConfirm() {
    if (!planId) return
    try {
      await api.confirmPlan(planId)
      setConfirmed(true)
      showToast('已确认，印章已记录到集邮册')
    } catch {
      showToast('确认失败', 'error')
    }
  }

  return (
    <section className="animate-fade-up" style={{ paddingTop: 'var(--spacing-6)' }}>
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

      {/* 生成中骨架 */}
      {step === 'generating' && generating && items.length === 0 && (
        <div className="animate-fade-up" style={{ textAlign: 'center', padding: 'var(--spacing-8) 0' }}>
          <div className="skeleton" style={{ width: 200, height: 16, margin: '0 auto', borderRadius: 8 }} />
          <p style={{ color: 'var(--color-muted)', marginTop: 'var(--spacing-4)' }}>
            正在为你编排日程...
          </p>
        </div>
      )}

      {/* SSE 流式时间线 */}
      {items.length > 0 && (
        <div style={{ marginTop: 'var(--spacing-6)' }} aria-live="polite">
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

      <AdjustBar
        visible={activeIndex !== null}
        onAction={handleAdjust}
        onClose={() => setActiveIndex(null)}
      />
    </section>
  )
}
