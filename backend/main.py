from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import media, alerts

app = FastAPI(title="SportShield API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(media.router, prefix="/api/media")
app.include_router(alerts.router, prefix="/api/alerts")

@app.get("/health")
def health():
    return {"status": "ok"}