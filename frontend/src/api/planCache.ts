/* ======================================================
 * 日程缓存 — 内存 + sessionStorage 双层
 * ====================================================== */

import type { ScheduleItem } from '../types'

interface CachedPlan {
  id: string
  items: ScheduleItem[]
}

const mem = new Map<string, CachedPlan>()
const STORAGE_PREFIX = 'plan:'

export function getCachedPlan(planId: string): CachedPlan | null {
  const hit = mem.get(planId)
  if (hit) return hit

  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + planId)
    if (raw) {
      const plan = JSON.parse(raw) as CachedPlan
      mem.set(planId, plan)
      return plan
    }
  } catch { /* 静默降级 */ }

  return null
}

export function setCachedPlan(planId: string, plan: CachedPlan) {
  mem.set(planId, plan)
  try {
    sessionStorage.setItem(STORAGE_PREFIX + planId, JSON.stringify(plan))
  } catch { /* 超出配额时静默降级 */ }
}

export function clearPlanCache(planId: string) {
  mem.delete(planId)
  try { sessionStorage.removeItem(STORAGE_PREFIX + planId) } catch {}
}
