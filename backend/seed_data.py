from __future__ import annotations
"""
种子数据 — RSSHub 不可用时的降级数据
确保产品在无外部依赖时也能正常运行
"""
from datetime import datetime, timedelta


def _next_saturday() -> str:
    today = datetime.now()
    days = (5 - today.weekday()) % 7
    if days == 0 and today.hour > 12:
        days = 7
    return (today + timedelta(days=days)).strftime("%Y-%m-%d")


def _next_sunday() -> str:
    today = datetime.now()
    days = (6 - today.weekday()) % 7
    if days == 0 and today.hour > 12:
        days = 7
    return (today + timedelta(days=days)).strftime("%Y-%m-%d")


def get_seed_activities() -> list[dict]:
    """内置种子活动，每次调用动态计算日期"""
    sat = _next_saturday()
    sun = _next_sunday()

    return [
        {
            "id": "seed_ai_01",
            "title": "AI 应用开发者 Meetup",
            "category": "AI",
            "date": sat,
            "time": "14:00-17:00",
            "location": "海淀区中关村创业大街 昊海楼",
            "latitude": 39.9836,
            "longitude": 116.3105,
            "price": 0,
            "source": "种子数据",
            "url": "",
            "image": None,
            "description": "本期主题：Agent 工作流实战。分享大模型应用开发经验，现场 Demo 展示。免费参加，名额有限。",
        },
        {
            "id": "seed_ai_02",
            "title": "LLM 编程工作坊：从零搭建 RAG 系统",
            "category": "AI",
            "date": sun,
            "time": "10:00-16:00",
            "location": "朝阳区望京 SOHO T2",
            "latitude": 39.9930,
            "longitude": 116.4740,
            "price": 99,
            "source": "种子数据",
            "url": "",
            "image": None,
            "description": "动手实战 RAG 系统搭建，覆盖向量数据库、Embedding、检索增强生成全流程。自带电脑。",
        },
        {
            "id": "seed_book_01",
            "title": "《系统之美》共读会",
            "category": "读书会",
            "date": sat,
            "time": "10:00-12:00",
            "location": "朝阳区三里屯 PageOne 书店",
            "latitude": 39.9334,
            "longitude": 116.4551,
            "price": 39,
            "source": "种子数据",
            "url": "",
            "image": None,
            "description": "德内拉·梅多斯经典著作深度共读。系统思考如何帮助我们理解复杂世界。",
        },
        {
            "id": "seed_book_02",
            "title": "科幻文学沙龙：刘慈欣作品赏析",
            "category": "读书会",
            "date": sun,
            "time": "14:00-16:00",
            "location": "西城区西单图书大厦 5F",
            "latitude": 39.9097,
            "longitude": 116.3746,
            "price": 0,
            "source": "种子数据",
            "url": "",
            "image": None,
            "description": "从《三体》到《球状闪电》，深度解析刘慈欣笔下的宇宙观与文明思考。",
        },
        {
            "id": "seed_movie_01",
            "title": "哪吒之魔童闹海",
            "category": "电影",
            "date": sat,
            "time": "全天",
            "location": "各大影院",
            "latitude": None,
            "longitude": None,
            "price": 45,
            "source": "种子数据",
            "url": "",
            "image": None,
            "description": "国产动画巅峰续作。IMAX/杜比全景声推荐。",
        },
        {
            "id": "seed_movie_02",
            "title": "沙丘3",
            "category": "电影",
            "date": sat,
            "time": "全天",
            "location": "各大影院",
            "latitude": None,
            "longitude": None,
            "price": 55,
            "source": "种子数据",
            "url": "",
            "image": None,
            "description": "维伦纽瓦科幻史诗三部曲终章。推荐 IMAX 厅。",
        },
        {
            "id": "seed_spot_01",
            "title": "故宫博物院·春日特展",
            "category": "景点",
            "date": sat,
            "time": "08:30-17:00",
            "location": "东城区景山前街4号",
            "latitude": 39.9163,
            "longitude": 116.3972,
            "price": 60,
            "source": "种子数据",
            "url": "",
            "image": None,
            "description": "「千里江山」春日特展。需提前预约，建议上午场人少。",
        },
        {
            "id": "seed_spot_02",
            "title": "798 艺术区·当代艺术双年展",
            "category": "景点",
            "date": sun,
            "time": "10:00-18:00",
            "location": "朝阳区酒仙桥路2号",
            "latitude": 39.9842,
            "longitude": 116.4949,
            "price": 0,
            "source": "种子数据",
            "url": "",
            "image": None,
            "description": "免费开放。汇集国内外当代艺术家作品，适合拍照打卡。",
        },
        {
            "id": "seed_food_01",
            "title": "簋街夜市美食探店",
            "category": "美食",
            "date": sat,
            "time": "18:00-22:00",
            "location": "东城区东直门内大街",
            "latitude": 39.9390,
            "longitude": 116.4310,
            "price": 0,
            "source": "种子数据",
            "url": "",
            "image": None,
            "description": "簋街经典美食一条街。推荐：胡大、花家怡园、仔仔烧烤。",
        },
        {
            "id": "seed_food_02",
            "title": "护国寺小吃街·老北京味道",
            "category": "美食",
            "date": sun,
            "time": "09:00-21:00",
            "location": "西城区护国寺大街",
            "latitude": 39.9363,
            "longitude": 116.3710,
            "price": 0,
            "source": "种子数据",
            "url": "",
            "image": None,
            "description": "炒肝、豆汁、驴打滚、艾窝窝。百年老字号集中地。",
        },
    ]
