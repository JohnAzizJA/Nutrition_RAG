from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import uuid
from auth.middleware import get_current_user
from db.models import User
from db.repositories import ConversationRepository
from rag.graph import RAGGraph

router = APIRouter()
rag_graph = RAGGraph()
conversation_repo = ConversationRepository()

class ChatRequest(BaseModel):
    message: str
    thread_id: Optional[str] = None  # None = new chat

class ChatResponse(BaseModel):
    response: str
    thread_id: str

class ConversationSummary(BaseModel):
    thread_id: str
    last_message: str
    last_message_time: datetime
    message_count: int

class Message(BaseModel):
    role: str
    content: str
    created_at: datetime

class ConversationDetail(BaseModel):
    thread_id: str
    messages: List[Message]

@router.get("/conversations", response_model=List[ConversationSummary])
async def get_conversations(current_user: User = Depends(get_current_user)):
    """Get list of all conversations for current user"""
    try:
        # Get all unique thread IDs for user
        thread_ids = conversation_repo.get_user_threads(current_user.id)
        
        conversations = []
        for thread_id in thread_ids:
            # Get messages for this thread
            messages = conversation_repo.get_by_thread(thread_id)
            if messages:
                last_msg = messages[-1]
                conversations.append(ConversationSummary(
                    thread_id=thread_id,
                    last_message=last_msg.content[:100],  # Preview first 100 chars
                    last_message_time=last_msg.created_at,
                    message_count=len(messages)
                ))
        
        # Sort by most recent first
        conversations.sort(key=lambda x: x.last_message_time, reverse=True)
        return conversations
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get conversations: {str(e)}")

@router.get("/conversations/{thread_id}", response_model=ConversationDetail)
async def get_conversation_history(
    thread_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get full conversation history for a specific thread"""
    try:
        messages = conversation_repo.get_by_thread(thread_id)
        
        # Verify this conversation belongs to the user
        if messages and messages[0].user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        return ConversationDetail(
            thread_id=thread_id,
            messages=[
                Message(
                    role=msg.role,
                    content=msg.content,
                    created_at=msg.created_at
                )
                for msg in messages
            ]
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get conversation: {str(e)}")

@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    current_user: User = Depends(get_current_user)
):
    """Send message to AI nutrition coach"""
    try:
        # Generate new thread_id if not provided (new chat)
        thread_id = request.thread_id or f"chat_{uuid.uuid4().hex[:12]}"
        
        response = rag_graph.run(
            query=request.message,
            user_id=current_user.id,
            thread_id=thread_id
        )
        
        return ChatResponse(
            response=response,
            thread_id=thread_id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")
