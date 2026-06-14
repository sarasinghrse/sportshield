"""
SportShield AI Helper — powered by Google Gemini and LangGraph
Heavy deps (langchain, langgraph) are lazy-loaded to keep startup memory low.
"""

import os
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

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


_agent_cache = {}

def _get_tools():
    from langchain_core.tools import tool

    @tool
    def get_dashboard_stats() -> dict:
        """Provides statistics about radar detections and monitored events. Use this when the user asks about live monitoring or stats."""
        from services.radar_engine import get_radar_stats
        return get_radar_stats("demo_user")

    @tool
    def trigger_navigation(page_name: str) -> str:
        """Triggers navigation to a specific page on the frontend. Use this ONLY when the user explicitly asks to be taken to a page. Valid inputs: 'dashboard', 'war_room', 'community', 'settings'."""
        return f"NAVIGATE_TO:{page_name}"

    return [get_dashboard_stats, trigger_navigation]


def get_agent():
    if not os.getenv("GEMINI_API_KEY"):
        return None
    if "agent" in _agent_cache:
        return _agent_cache["agent"]
    from langchain_google_genai import ChatGoogleGenerativeAI
    llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", api_key=os.getenv("GEMINI_API_KEY"))
    tools = _get_tools()
    agent = llm.bind_tools(tools)
    _agent_cache["agent"] = agent
    _agent_cache["tools"] = tools
    return agent


@router.post("/chat")
async def chat(req: ChatRequest):
    agent = get_agent()

    if not agent:
        return {"reply": "AI assistant is not configured yet. Please set the GEMINI_API_KEY environment variable."}

    from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

    messages = [SystemMessage(content=SYSTEM_PROMPT)]
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

        if result.tool_calls:
            for tc in result.tool_calls:
                if tc["name"] == "trigger_navigation":
                    navigate_to = tc["args"].get("page_name")
                    reply_text = "Taking you there..."
                elif tc["name"] == "get_dashboard_stats":
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
