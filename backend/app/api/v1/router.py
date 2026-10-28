from fastapi import APIRouter

from app.api.v1.endpoints import (
    activity_logs,
    auth,
    charts,
    dashboard,
    gamification,
    reminders,
    sleep_logs,
    targets,
    users,
    water_logs,
)

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(activity_logs.router)
api_router.include_router(water_logs.router)
api_router.include_router(sleep_logs.router)
api_router.include_router(targets.router)
api_router.include_router(gamification.router)
api_router.include_router(dashboard.router)
api_router.include_router(charts.router)
api_router.include_router(reminders.router)