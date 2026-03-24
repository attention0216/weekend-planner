from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="周末去哪玩", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/activities")
def list_activities():
    """活动列表（暂用假数据）"""
    return [
        {
            "id": "1",
            "title": "AI 黑客松：大模型应用开发",
            "category": "AI",
            "date": "2026-03-28",
            "time": "14:00-18:00",
            "location": "海淀区中关村创业大街",
            "price": 0,
            "source": "豆瓣同城",
            "image": None,
        },
        {
            "id": "2",
            "title": "三体精装典藏版读书会",
            "category": "读书会",
            "date": "2026-03-29",
            "time": "10:00-12:00",
            "location": "朝阳区三里屯 PageOne 书店",
            "price": 39,
            "source": "豆瓣同城",
            "image": None,
        },
        {
            "id": "3",
            "title": "封神第三部：朝歌风云",
            "category": "电影",
            "date": "2026-03-28",
            "time": "全天",
            "location": "各大影院",
            "price": 45,
            "source": "猫眼电影",
            "image": None,
        },
    ]


@app.post("/api/plan")
def create_plan(activity_id: str):
    """根据活动生成配套日程（暂用假数据）"""
    return {
        "activity_id": activity_id,
        "schedule": [
            {"time": "11:30", "type": "lunch", "name": "云海肴·云南菜（中关村店）", "reason": "人均68，4.5分，少油少盐选择多"},
            {"time": "14:00", "type": "activity", "name": "AI 黑客松", "reason": "主活动"},
            {"time": "18:30", "type": "dinner", "name": "胡同里·北京菜", "reason": "人均85，4.7分，食材新鲜"},
            {"time": "20:00", "type": "explore", "name": "五道口商圈散步", "reason": "距活动地点步行15分钟"},
        ],
    }
