from fastapi import APIRouter
from app.api.v1.endpoints import auth, rights, uploads, projects, clips, health, share, reports, admin

api_router = APIRouter()

api_router.include_router(health.router, tags=["Health & Storage"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(rights.router, prefix="/rights", tags=["Rights & Compliance"])
api_router.include_router(uploads.router, prefix="/uploads", tags=["Uploads"])
api_router.include_router(projects.router, prefix="/projects", tags=["Projects"])
api_router.include_router(clips.router, prefix="/clips", tags=["Clips & Rendering"])
api_router.include_router(share.router, prefix="/share", tags=["Public Share Preview"])
api_router.include_router(reports.router, prefix="/reports", tags=["Safety & Takedown Reports"])
api_router.include_router(admin.router, prefix="/admin", tags=["Admin & Retention Cleanup"])
