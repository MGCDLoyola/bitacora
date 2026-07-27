from fastapi import FastAPI

from src.routers.roles import router as roles_router

app = FastAPI()

app.include_router(roles_router)