/* ======================================================
 * 日程缓存 — 内存 + sessionStorage 双层
 * 解决：返回不重新推理 + ChatPage 修改回写
 * ====================================================== */

import type { Plan, ScheduleItem } from "../types"

const mem = new Map<string, Plan>()

const STORAGE_PREFIX = "plan:"

export function getCachedPlan(activityId: string): Plan | null {
  const hit = mem.get(activityId)
  if (hit) return hit

  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + activityId)
    if (raw) {
      const plan = JSON.parse(raw) as Plan
      mem.set(activityId, plan)
      return plan
    }
  } catch { /* sessionStorage 不可用时静默降级 */ }

  return null
}

export function setCachedPlan(activityId: string, plan: Plan) {
  mem.set(activityId, plan)
  try {
    sessionStorage.setItem(STORAGE_PREFIX + activityId, JSON.stringify(plan))
  } catch { /* 超出配额时静默降级 */ }
}

export function updateCachedSchedule(activityId: string, schedule: ScheduleItem[]) {
  const plan = getCachedPlan(activityId)
  if (plan) {
    setCachedPlan(activityId, { ...plan, schedule })
  }
}

export function clearPlanCache(activityId: string) {
  mem.delete(activityId)
  try { sessionStorage.removeItem(STORAGE_PREFIX + activityId) } catch {}
}
