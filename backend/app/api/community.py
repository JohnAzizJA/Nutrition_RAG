import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
from auth.middleware import get_current_user
from db.models import User
from db.repositories import CommunityRepository, AnnouncementRepository, UserRepository

router = APIRouter()
community_repo = CommunityRepository()
ann_repo = AnnouncementRepository()
user_repo = UserRepository()

VALID_REACTIONS = {"celebrate", "love", "sad", "angry", "funny"}


# ── Request schemas ─────────────────────────────────────────────────────────

class CreateCommunityRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)


class AddMemberRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=100)


class ReactRequest(BaseModel):
    reaction_type: str = Field(..., pattern="^(celebrate|love|sad|angry|funny)$")


# ── Helpers ──────────────────────────────────────────────────────────────────

def _require_member(community_id: int, user_id: int):
    if not community_repo.is_member(community_id, user_id):
        raise HTTPException(status_code=403, detail="Not a member of this community")


def _serialize_announcement(ann, current_user_id: int) -> dict:
    try:
        content = json.loads(ann.content) if ann.content else {}
    except Exception:
        content = {}

    reaction_counts: dict = {}
    my_reaction: Optional[str] = None
    for r in ann.reactions:
        reaction_counts[r.reaction_type] = reaction_counts.get(r.reaction_type, 0) + 1
        if r.user_id == current_user_id:
            my_reaction = r.reaction_type

    return {
        "id": ann.id,
        "community_id": ann.community_id,
        "user_id": ann.user_id,
        "username": ann.user.name if ann.user else None,
        "event_type": ann.event_type,
        "content": content,
        "points_delta": ann.points_delta,
        "created_at": ann.created_at.isoformat(),
        "reactions": reaction_counts,
        "my_reaction": my_reaction,
    }


# ── Community CRUD ───────────────────────────────────────────────────────────

@router.get("/communities")
async def list_communities(current_user: User = Depends(get_current_user)):
    """List all communities the current user belongs to."""
    try:
        communities = community_repo.get_user_communities(current_user.id)
        return [
            {
                "id": c.id,
                "name": c.name,
                "description": c.description,
                "creator_id": c.creator_id,
                "created_at": c.created_at.isoformat(),
            }
            for c in communities
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list communities: {str(e)}")


@router.post("/communities", status_code=201)
async def create_community(
    request: CreateCommunityRequest,
    current_user: User = Depends(get_current_user),
):
    """Create a new community. Creator is auto-added as first member."""
    try:
        community = community_repo.create(
            name=request.name,
            description=request.description,
            creator_id=current_user.id,
        )
        return {
            "id": community.id,
            "name": community.name,
            "description": community.description,
            "creator_id": community.creator_id,
            "created_at": community.created_at.isoformat(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create community: {str(e)}")


@router.delete("/communities/{community_id}", status_code=204)
async def delete_community(
    community_id: int,
    current_user: User = Depends(get_current_user),
):
    """Delete a community (creator only)."""
    deleted = community_repo.delete(community_id, current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Community not found or you are not the creator")


# ── Community info ────────────────────────────────────────────────────────────

@router.get("/communities/{community_id}/info")
async def get_community_info(
    community_id: int,
    current_user: User = Depends(get_current_user),
):
    """Get community name, description, and member list."""
    _require_member(community_id, current_user.id)
    community = community_repo.get_by_id(community_id)
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")
    return {
        "id": community.id,
        "name": community.name,
        "description": community.description,
        "creator_id": community.creator_id,
        "created_at": community.created_at.isoformat(),
        "members": [
            {
                "user_id": m.user_id,
                "username": m.user.name if m.user else None,
                "joined_at": m.joined_at.isoformat(),
            }
            for m in community.members
        ],
    }


# ── Leaderboard + announcements ───────────────────────────────────────────────

@router.get("/communities/{community_id}/feed")
async def get_community_feed(
    community_id: int,
    current_user: User = Depends(get_current_user),
):
    """Return leaderboard and recent announcements for a community."""
    _require_member(community_id, current_user.id)

    community = community_repo.get_by_id(community_id)
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")

    try:
        leaderboard = community_repo.get_leaderboard(community_id)
        announcements_raw = ann_repo.get_community_announcements(community_id, limit=50)
        announcements = [_serialize_announcement(a, current_user.id) for a in announcements_raw]

        return {
            "community": {
                "id": community.id,
                "name": community.name,
                "description": community.description,
                "creator_id": community.creator_id,
            },
            "leaderboard": leaderboard,
            "announcements": announcements,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load feed: {str(e)}")


# ── Member management ─────────────────────────────────────────────────────────

@router.post("/communities/{community_id}/members", status_code=201)
async def add_member(
    community_id: int,
    request: AddMemberRequest,
    current_user: User = Depends(get_current_user),
):
    """Add a user to a community by username. Only existing members can add."""
    _require_member(community_id, current_user.id)

    target = user_repo.get_by_name(request.username)
    if not target:
        raise HTTPException(status_code=404, detail=f"User '{request.username}' not found")

    added = community_repo.add_member(community_id, target.id)
    if not added:
        raise HTTPException(status_code=409, detail="User is already a member")

    return {"message": f"{target.name} added to community"}


@router.delete("/communities/{community_id}/members/{user_id}", status_code=204)
async def remove_member(
    community_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
):
    """Remove a member from a community (self-leave or creator can remove anyone)."""
    community = community_repo.get_by_id(community_id)
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")

    is_creator = community.creator_id == current_user.id
    is_self = user_id == current_user.id
    if not is_creator and not is_self:
        raise HTTPException(status_code=403, detail="Not authorized to remove this member")

    # Creator cannot leave their own community
    if is_self and community.creator_id == current_user.id:
        raise HTTPException(status_code=400, detail="Creator cannot leave the community. Delete it instead.")

    removed = community_repo.remove_member(community_id, user_id)
    if not removed:
        raise HTTPException(status_code=404, detail="Member not found")


# ── Reactions ─────────────────────────────────────────────────────────────────

@router.post("/communities/{community_id}/announcements/{announcement_id}/reactions", status_code=201)
async def upsert_reaction(
    community_id: int,
    announcement_id: int,
    request: ReactRequest,
    current_user: User = Depends(get_current_user),
):
    """Add or update a reaction on an announcement."""
    _require_member(community_id, current_user.id)
    try:
        ann_repo.upsert_reaction(announcement_id, current_user.id, request.reaction_type)
        return {"message": "Reaction saved"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save reaction: {str(e)}")


@router.delete("/communities/{community_id}/announcements/{announcement_id}/reactions", status_code=204)
async def delete_reaction(
    community_id: int,
    announcement_id: int,
    current_user: User = Depends(get_current_user),
):
    """Remove the current user's reaction from an announcement."""
    _require_member(community_id, current_user.id)
    deleted = ann_repo.delete_reaction(announcement_id, current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Reaction not found")
