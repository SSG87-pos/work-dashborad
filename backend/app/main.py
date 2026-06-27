from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes_auth import router as auth_router
from app.api.routes_ai import router as ai_router
from app.api.routes_briefing import router as briefing_router
from app.api.routes_calendar import router as calendar_router
from app.api.routes_canvas import router as canvas_router
from app.api.routes_dashboard import router as dashboard_router
from app.api.routes_health import router as health_router
from app.api.routes_notifications import router as notifications_router
from app.api.routes_posts import rollup_router, router as posts_router
from app.api.routes_preferences import memos_router, preferences_router
from app.api.routes_roster import router as roster_router
from app.api.routes_tags import groups_router, router as tags_router
from app.api.routes_tasks import router as tasks_router
from app.api.routes_workstreams import router as workstreams_router
from app.api.routes_wiki import router as wiki_router
from app.core.config import settings


def create_app() -> FastAPI:
    app = FastAPI(title=settings.app_name)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(auth_router, prefix="/api/v1")
    app.include_router(ai_router, prefix="/api/v1")
    app.include_router(wiki_router, prefix="/api/v1")
    app.include_router(briefing_router, prefix="/api/v1")
    app.include_router(calendar_router, prefix="/api/v1")
    app.include_router(canvas_router, prefix="/api/v1")
    app.include_router(health_router, prefix="/api/v1")
    app.include_router(notifications_router, prefix="/api/v1")
    app.include_router(posts_router, prefix="/api/v1")
    app.include_router(preferences_router, prefix="/api/v1")
    app.include_router(memos_router, prefix="/api/v1")
    app.include_router(rollup_router, prefix="/api/v1")
    app.include_router(roster_router, prefix="/api/v1")
    app.include_router(dashboard_router, prefix="/api/v1")
    app.include_router(groups_router, prefix="/api/v1")
    app.include_router(tags_router, prefix="/api/v1")
    app.include_router(workstreams_router, prefix="/api/v1")
    app.include_router(tasks_router, prefix="/api/v1")
    return app


app = create_app()
