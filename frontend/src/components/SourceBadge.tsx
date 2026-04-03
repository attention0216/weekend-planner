/* ======================================================
 *  SourceBadge — 信息来源标记
 *  小红书(绿) · 限时(琥珀) · 通用(灰)
 * ====================================================== */

interface Props {
  type?: string
}

export default function SourceBadge({ type }: Props) {
  if (type === 'xiaohongshu') {
    return (
      <span className="badge badge-xhs">小红书</span>
    )
  }
  if (type === 'time_limited') {
    return (
      <span className="badge badge-limited">限时</span>
    )
  }
  return null
}
