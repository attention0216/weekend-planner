/* ======================================================
 *  planStore — Zustand 日程状态
 *  三次点选 · 流式渲染 · 调整
 * ====================================================== */

import { create } from 'zustand'
import type { Mood, TimeSlot, Companion, ScheduleItem } from '../types'

type PlanStep = 'mood' | 'time' | 'companion' | 'generating' | 'done'

interface PlanState {
  /* 选择 */
  step: PlanStep
  mood: Mood | null
  timeSlot: TimeSlot | null
  companion: Companion | null

  /* 日程结果 */
  planId: string | null
  items: ScheduleItem[]
  generating: boolean

  /* 操作 */
  setMood: (m: Mood) => void
  setTimeSlot: (t: TimeSlot) => void
  setCompanion: (c: Companion) => void
  addItem: (item: ScheduleItem) => void
  setDone: (planId: string) => void
  setGenerating: (v: boolean) => void
  reset: () => void
}

const INITIAL = {
  step: 'mood' as PlanStep,
  mood: null,
  timeSlot: null,
  companion: null,
  planId: null,
  items: [],
  generating: false,
}

export const usePlanStore = create<PlanState>((set) => ({
  ...INITIAL,

  setMood: (mood) => set({ mood, step: 'time' }),
  setTimeSlot: (timeSlot) => set({ timeSlot, step: 'companion' }),
  setCompanion: (companion) => set({ companion, step: 'generating', generating: true }),
  addItem: (item) => set((s) => ({ items: [...s.items, item] })),
  setDone: (planId) => set({ planId, step: 'done', generating: false }),
  setGenerating: (generating) => set({ generating }),
  reset: () => set(INITIAL),
}))
