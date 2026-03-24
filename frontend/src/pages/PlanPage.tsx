/* ======================================================
 * 日程规划页
 * 以选中活动为锚点，展示配套日程时间线
 * ====================================================== */

import { useParams, useNavigate } from "react-router"
import { Timeline } from "../components/Timeline"
import type { Activity, ScheduleItem } from "../types"

// 假数据——Phase 2 替换为 API 调用
const mockActivities: Record<string, Activity> = {
  "1": { id: "1", title: "AI 黑客松：大模型应用开发", category: "AI", date: "2026-03-28", time: "14:00-18:00", location: "海淀区中关村创业大街", price: 0, source: "豆瓣同城", image: null },
  "2": { id: "2", title: "三体精装典藏版读书会", category: "读书会", date: "2026-03-29", time: "10:00-12:00", location: "朝阳区三里屯 PageOne 书店", price: 39, source: "豆瓣同城", image: null },
  "3": { id: "3", title: "封神第三部：朝歌风云", category: "电影", date: "2026-03-28", time: "全天", location: "各大影院", price: 45, source: "猫眼电影", image: null },
  "4": { id: "4", title: "故宫博物院·春日限定夜场", category: "景点", date: "2026-03-29", time: "18:00-21:00", location: "东城区景山前街4号", price: 80, source: "小红书", image: null },
  "5": { id: "5", title: "簋街深夜美食探店团", category: "美食", date: "2026-03-28", time: "20:00-23:00", location: "东城区东直门内大街", price: 0, source: "公众号", image: null },
}

const mockSchedules: Record<string, ScheduleItem[]> = {
  "1": [
    { time: "11:30", type: "lunch", name: "云海肴·云南菜（中关村店）", reason: "人均68，4.5分，少油少盐选择多" },
    { time: "14:00", type: "activity", name: "AI 黑客松", reason: "主活动·带电脑和充电器" },
    { time: "18:30", type: "dinner", name: "胡同里·北京菜", reason: "人均85，4.7分，食材新鲜" },
    { time: "20:00", type: "explore", name: "五道口商圈散步", reason: "距活动地点步行15分钟，消食" },
  ],
  "2": [
    { time: "08:30", type: "explore", name: "三里屯太古里晨间逛街", reason: "早到先逛，人少体验好" },
    { time: "10:00", type: "activity", name: "三体读书会", reason: "主活动·带书和笔记本" },
    { time: "12:00", type: "lunch", name: "新元素·健康轻食", reason: "人均72，4.6分，沙拉和全麦面包" },
    { time: "14:00", type: "explore", name: "798艺术区", reason: "距三里屯打车15分钟，当季展览多" },
  ],
  "3": [
    { time: "11:00", type: "lunch", name: "南京大牌档", reason: "人均65，4.4分，经典淮扬菜" },
    { time: "13:30", type: "activity", name: "封神第三部 IMAX", reason: "主活动·建议选13:30场次" },
    { time: "16:30", type: "explore", name: "商场逛逛", reason: "等晚饭时间，就近购物" },
    { time: "18:00", type: "dinner", name: "海底捞（欢乐时光）", reason: "人均90，欢乐时光下午茶折扣" },
  ],
}

export function PlanPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const activity = id ? mockActivities[id] : null
  const schedule = id ? mockSchedules[id] ?? mockSchedules["1"] : []

  if (!activity) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400 mb-4">活动不存在</p>
        <button onClick={() => navigate("/")} className="text-sm text-gray-900 underline">
          返回首页
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {/* 返回按钮 */}
      <button
        onClick={() => navigate("/")}
        className="self-start text-sm text-gray-500 flex items-center gap-1"
      >
        ← 返回活动列表
      </button>

      {/* 锚点活动概要 */}
      <div className="bg-gray-900 text-white rounded-xl p-4">
        <div className="text-xs text-gray-400 mb-1">{activity.date} · {activity.category}</div>
        <h2 className="text-lg font-semibold mb-1">{activity.title}</h2>
        <div className="text-sm text-gray-300">📍 {activity.location}</div>
        <div className="text-sm text-gray-300">{activity.time} · {activity.price === 0 ? "免费" : `¥${activity.price}`}</div>
      </div>

      {/* 日程时间线 */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">为你规划的一天</h3>
        <Timeline items={schedule} />
      </div>

      {/* 调整按钮 */}
      <button
        onClick={() => navigate(`/chat/${id}`)}
        className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium active:bg-gray-200 transition-colors"
      >
        💬 不满意？聊聊调整一下
      </button>

      {/* 高德地图链接 */}
      <a
        href={`https://uri.amap.com/search?keyword=${encodeURIComponent(activity.location)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full py-3 bg-blue-50 text-blue-600 rounded-xl text-sm font-medium text-center block"
      >
        🗺️ 在高德地图中查看
      </a>
    </div>
  )
}
