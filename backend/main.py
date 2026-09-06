from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .database import (
    init_db,
    get_sessions,
    reset_sessions,
    save_memory,
    get_memory,
    reset_memory
)

from .agent import run_agent


app = FastAPI(
    title="Workout Planner Agent",
    description="Agentic workout planning API",
    version="1.0.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


init_db()


class ChatRequest(BaseModel):
    session_id: str
    message: str


class ChatResponse(BaseModel):
    response: str


@app.get("/")
def root():
    return {
        "message": "Workout Planner Agent API is running",
        "status": "online"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }


@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):

    conversation = get_memory(
        request.session_id,
        limit=20
    )

    response = run_agent(
        request.message,
        conversation=conversation
    )

    save_memory(
        request.session_id,
        "user",
        request.message
    )

    save_memory(
        request.session_id,
        "assistant",
        response
    )

    return {
        "response": response
    }


@app.get("/history")
def history():
    return {
        "history": get_sessions()
    }


@app.get("/memory/{session_id}")
def memory(session_id: str):
    return {
        "session_id": session_id,
        "memory": get_memory(session_id)
    }


@app.post("/memory/{session_id}/reset")
def clear_memory(session_id: str):
    reset_memory(session_id)

    return {
        "message": "Conversation memory reset successfully"
    }


@app.post("/reset")
def reset():
    reset_sessions()

    return {
        "message": "Workout history reset successfully"
    }