/* ======================================================
 * 工具函数
 * ====================================================== */

const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"]

/**
 * 将 ISO 日期转为友好格式
 * "2026-03-28" → "3月28日 周六" 或 "明天" / "后天" / "本周六"
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return ""

  const [y, m, d] = dateStr.split("-").map(Number)
  const target = new Date(y, m - 1, d)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000)
  const weekday = WEEKDAYS[target.getDay()]

  if (diff === 0) return "今天"
  if (diff === 1) return "明天"
  if (diff === 2) return "后天"
  if (diff > 0 && diff <= 7) return `本${weekday}`

  return `${m}月${d}日 ${weekday}`
}
