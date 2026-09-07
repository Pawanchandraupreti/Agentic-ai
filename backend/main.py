from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .database import (
    init_db,
    get_sessions,
    reset_sessions,
    create_chat_session,
    get_chat_sessions,
    update_chat_title,
    delete_chat_session,
    reset_all_chat_sessions,
    save_memory,
    get_memory,
    reset_memory
)

from .agent import run_agent


app = FastAPI(
    title="Workout Planner Agent",
    description="Agentic workout planning API",
    version="2.0.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://fit-agent-q6vs.onrender.com"
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


class CreateChatRequest(BaseModel):
    session_id: str
    title: str = "New Workout Chat"


class UpdateTitleRequest(BaseModel):
    title: str


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

    create_chat_session(
        request.session_id
    )

    conversation = get_memory(
        request.session_id,
        limit=50
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


@app.post("/chats")
def create_chat(request: CreateChatRequest):

    create_chat_session(
        request.session_id,
        request.title
    )

    return {
        "message": "Chat created successfully",
        "session_id": request.session_id
    }


@app.get("/chats")
def chats():

    return {
        "chats": get_chat_sessions()
    }


@app.get("/chats/{session_id}")
def get_chat(session_id: str):

    return {
        "session_id": session_id,
        "messages": get_memory(
            session_id
        )
    }


@app.put("/chats/{session_id}")
def update_chat(
    session_id: str,
    request: UpdateTitleRequest
):

    update_chat_title(
        session_id,
        request.title
    )

    return {
        "message": "Chat title updated successfully"
    }


@app.delete("/chats/{session_id}")
def delete_chat(session_id: str):

    delete_chat_session(
        session_id
    )

    return {
        "message": "Chat deleted successfully"
    }


@app.post("/chats/{session_id}/reset")
def clear_chat(session_id: str):

    reset_memory(
        session_id
    )

    return {
        "message": "Chat history reset successfully"
    }


@app.post("/chats/reset/all")
def reset_all_chats():

    reset_all_chat_sessions()

    return {
        "message": "All chats deleted successfully"
    }


@app.get("/history")
def history():

    return {
        "history": get_sessions()
    }


@app.post("/reset")
def reset_workouts():

    reset_sessions()

    return {
        "message": "Workout history reset successfully"
    }