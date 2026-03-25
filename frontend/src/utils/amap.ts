/* ======================================================
 * 高德地图导航 — 跨平台唤起
 * iOS → iosamap:// · Android → androidamap:// · 兜底网页
 * ====================================================== */

import type { ScheduleItem } from "../types"

/* ── 平台检测 ── */
function getPlatform(): "ios" | "android" | "desktop" {
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/.test(ua)) return "ios"
  if (/Android/.test(ua)) return "android"
  return "desktop"
}

/* ── 高德网页版 URI ── */
function webNavUrl(dest: string): string {
  return `https://uri.amap.com/navigation?to=0,0,${encodeURIComponent(dest)}&mode=walk&callnative=1`
}

/* ── 高德搜索 URI ── */
export function amapSearchUrl(keyword: string): string | null {
  return keyword
    ? `https://uri.amap.com/search?keyword=${encodeURIComponent(keyword)}`
    : null
}

/* ── 导航到目的地：优先唤起 App ── */
export function openAmapNavigation(dest: string): void {
  const encoded = encodeURIComponent(dest)
  const platform = getPlatform()

  if (platform === "desktop") {
    window.open(webNavUrl(dest), "_blank")
    return
  }

  /* 移动端：尝试 native scheme，失败后 fallback 网页 */
  const nativeUrl =
    platform === "ios"
      ? `iosamap://path?sourceApplication=weekend&dname=${encoded}&dev=0&style=2`
      : `androidamap://navi?sourceApplication=weekend&dname=${encoded}&dev=0&style=2`

  const fallbackUrl = webNavUrl(dest)

  /* 设置 fallback 定时器 */
  const start = Date.now()
  const timer = setTimeout(() => {
    /* 如果 300ms 后页面仍在前台，说明 scheme 没生效 */
    if (document.visibilityState !== "hidden" && Date.now() - start < 1500) {
      window.location.href = fallbackUrl
    }
  }, 300)

  /* 页面切到后台说明 App 唤起成功，清除 fallback */
  const cleanup = () => {
    clearTimeout(timer)
    document.removeEventListener("visibilitychange", cleanup)
  }
  document.addEventListener("visibilitychange", cleanup)

  /* 尝试唤起 */
  window.location.href = nativeUrl
}

/* ── 从 ScheduleItem 构造导航目的地 ── */
export function navigateToItem(item: ScheduleItem): void {
  openAmapNavigation(item.location || item.name)
}

/* ── 生成导航 <a> 的 href（用于不需要 JS 逻辑的场景） ── */
export function amapNavHref(dest: string): string {
  return webNavUrl(dest)
}
