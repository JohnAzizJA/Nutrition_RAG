import axios from '@/src/api/axios';
import { ENDPOINTS } from '@/src/api/endpoints';

// ── Types ────────────────────────────────────────────────────────────────────

export interface Community {
  id: number;
  name: string;
  description?: string;
  creator_id: number;
  created_at: string;
}

export interface CommunityMember {
  user_id: number;
  username: string;
  joined_at: string;
}

export interface CommunityInfo extends Community {
  members: CommunityMember[];
}

export interface LeaderboardEntry {
  user_id: number;
  username: string;
  points: number;
}

export type ReactionType = 'celebrate' | 'love';

export interface Announcement {
  id: number;
  community_id: number;
  user_id: number;
  username: string | null;
  event_type: string;
  content: Record<string, any>;
  points_delta: number;
  created_at: string;
  reactions: Record<ReactionType, number>;
  my_reaction: ReactionType | null;
}

export interface CommunityFeed {
  community: Pick<Community, 'id' | 'name' | 'description' | 'creator_id'>;
  leaderboard: LeaderboardEntry[];
  announcements: Announcement[];
}

export interface CreateCommunityRequest {
  name: string;
  description?: string;
}

export interface Reactor {
  user_id: number;
  username: string | null;
  reaction_type: ReactionType;
}

// ── Service ──────────────────────────────────────────────────────────────────

export const communityService = {
  listCommunities: async (): Promise<Community[]> => {
    const res = await axios.get(ENDPOINTS.COMMUNITY.LIST);
    return res.data;
  },

  createCommunity: async (data: CreateCommunityRequest): Promise<Community> => {
    const res = await axios.post(ENDPOINTS.COMMUNITY.CREATE, data);
    return res.data;
  },

  deleteCommunity: async (id: number): Promise<void> => {
    await axios.delete(ENDPOINTS.COMMUNITY.DELETE(id));
  },

  getCommunityInfo: async (id: number): Promise<CommunityInfo> => {
    const res = await axios.get(ENDPOINTS.COMMUNITY.INFO(id));
    return res.data;
  },

  getCommunityFeed: async (id: number): Promise<CommunityFeed> => {
    const res = await axios.get(ENDPOINTS.COMMUNITY.FEED(id));
    return res.data;
  },

  addMember: async (communityId: number, username: string): Promise<{ message: string }> => {
    const res = await axios.post(ENDPOINTS.COMMUNITY.ADD_MEMBER(communityId), { username });
    return res.data;
  },

  removeMember: async (communityId: number, userId: number): Promise<void> => {
    await axios.delete(ENDPOINTS.COMMUNITY.REMOVE_MEMBER(communityId, userId));
  },

  upsertReaction: async (communityId: number, announcementId: number, reaction_type: ReactionType): Promise<void> => {
    await axios.post(ENDPOINTS.COMMUNITY.REACT(communityId, announcementId), { reaction_type });
  },

  deleteReaction: async (communityId: number, announcementId: number): Promise<void> => {
    await axios.delete(ENDPOINTS.COMMUNITY.DELETE_REACTION(communityId, announcementId));
  },

  getReactors: async (communityId: number, announcementId: number): Promise<Reactor[]> => {
    const res = await axios.get(ENDPOINTS.COMMUNITY.GET_REACTIONS(communityId, announcementId));
    return res.data;
  },
};
