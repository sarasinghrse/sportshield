from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import media, alerts, contact, whatsapp
from services.scheduler import start_scheduler

app = FastAPI(title="SportShield API")

@app.on_event("startup")
async def startup_event():
    start_scheduler()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(media.router, prefix="/api/media")
app.include_router(alerts.router,  prefix="/api/alerts")
app.include_router(contact.router,   prefix="/api/contact")
app.include_router(whatsapp.router, prefix="/api/whatsapp")

@app.get("/health")
def health():
    return {"status": "ok"}