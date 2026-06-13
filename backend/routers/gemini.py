"""
SportShield AI Helper — powered by Google Gemini and LangGraph
"""

import os
from fastapi import APIRouter
from pydantic import BaseModel
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from langgraph.prebuilt import create_react_agent
from langchain_core.tools import tool

router = APIRouter()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

SYSTEM_PROMPT = """You are SportShield Assistant, a helpful AI navigator for the SportShield platform — a sports media protection tool built for the Google Solutions Challenge.

You help users understand and use SportShield's features:

CORE FEATURES:
- Upload & Protect: Users upload sports images/videos, which get fingerprinted (pHash) and monitored
- Web Scanning: Automated reverse image search finds unauthorized copies across the internet
- AI Detection: Detects AI-generated/manipulated images
- DMCA Notices: One-click generation of legal takedown notices
- C2PA Credentials: Content authenticity verification with tamper-proof metadata
- Forensic Watermarking: Invisible watermarks embedded in media for ownership proof
- CLIP Search: AI-powered visual similarity search across the asset library

ADVANCED FEATURES:
- Live Stream Piracy Radar: Real-time detection of pirated sports broadcasts using audio fingerprinting + multimodal AI
- Autonomous Enforcement Agent: Auto-files DMCA notices, escalates cases, tracks resolution
- Crowdsourced Detector Network: Community of pirate hunters earning points, ranks, and bounties
- Browser Extension: Right-click to protect images, scan pages, report pirates
- WhatsApp Alerts: Get piracy notifications on your phone
- War Room Dashboard: Live monitoring of all detection and enforcement activity

PAGES:
- Dashboard (/) — overview of protected assets, alerts, risk scores
- Community (/community) — public assets, leaderboard
- War Room (/radar) — live radar, enforcement, crowd network, public API docs
- Settings (/settings) — account preferences

You have tools to access Live Radar Statistics and trigger page navigation. 
If a user explicitly asks to go to a page or you feel taking them to a page is the best way to help them, use the trigger_navigation tool.
Keep answers concise (2-4 sentences). Be friendly and helpful. If asked about something unrelated to SportShield, gently redirect to how you can help with the platform. Never reveal API keys or internal implementation details.
"""

class ChatRequest(BaseModel):
    message: str
    history: list = []

@tool
def get_dashboard_stats() -> dict:
    """Provides statistics about radar detections and monitored events. Use this when the user asks about live monitoring or stats."""
    from services.radar_engine import get_radar_stats
    return get_radar_stats("demo_user")

@tool
def trigger_navigation(page_name: str) -> str:
    """Triggers navigation to a specific page on the frontend. Use this ONLY when the user explicitly asks to be taken to a page. Valid inputs: 'dashboard', 'war_room', 'community', 'settings'."""
    return f"NAVIGATE_TO:{page_name}"

tools = [get_dashboard_stats, trigger_navigation]

# Delay initialization of LLM until endpoint is called in case GEMINI_API_KEY is set after module load
def get_agent():
    if not os.getenv("GEMINI_API_KEY"):
        return None
    # 2.0-flash quota is 0, and 1.5 is deprecated or unavailable for this key, so we use gemini-2.5-flash
    llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", api_key=os.getenv("GEMINI_API_KEY"))
    
    # Use bind_tools directly instead of create_react_agent to enforce exactly 1 LLM call per request
    return llm.bind_tools(tools)

@router.post("/chat")
async def chat(req: ChatRequest):
    agent = get_agent()
    
    if not agent:
        return {"reply": "AI assistant is not configured yet. Please set the GEMINI_API_KEY environment variable."}

    messages = [SystemMessage(content=SYSTEM_PROMPT)]
    
    # Pre-emptively append that the system is ready
    messages.append(AIMessage(content="Understood. I'm SportShield Assistant, ready to help users navigate the platform."))

    for msg in req.history[-10:]:
        role = msg.get("role", "user")
        text = msg.get("text", "")
        if role == "model":
            messages.append(AIMessage(content=text))
        else:
            messages.append(HumanMessage(content=text))
            
    messages.append(HumanMessage(content=req.message))

    try:
        result = await agent.ainvoke(messages)
        
        reply_text = result.content
        navigate_to = None
        
        # Check if any tools were invoked and manually execute them to prevent a second roundtrip to the LLM
        if result.tool_calls:
            for tc in result.tool_calls:
                if tc["name"] == "trigger_navigation":
                    navigate_to = tc["args"].get("page_name")
                    reply_text = "Taking you there..."
                elif tc["name"] == "get_dashboard_stats":
                    # Execute tool manually and format string
                    from services.radar_engine import get_radar_stats
                    stats = get_radar_stats("demo_user")
                    reply_text = f"Here are your live stats: {stats.get('active_events', 0)} active events with {stats.get('total_suspects_analyzed', 0)} total suspects analyzed, and {stats.get('pirate_streams_found', 0)} pirate streams blocked."

        response_data = {"reply": reply_text if reply_text else "I couldn't process that command."}
        
        page_map = {
            "dashboard": "/",
            "war_room": "/radar",
            "community": "/community",
            "settings": "/settings"
        }
        
        if navigate_to and navigate_to in page_map:
            response_data["navigate_to"] = page_map[navigate_to]
            
        return response_data

    except Exception as e:
        print(f"[GEMINI] Error: {e}")
        return {"reply": "Sorry, I'm having trouble connecting right now. Please try again in a moment."}
