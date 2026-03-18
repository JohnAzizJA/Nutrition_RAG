import axios from '@/src/api/axios';
import { ENDPOINTS } from '@/src/api/endpoints';

export interface Message {
  role: string;
  content: string;
  created_at: string;
}

export interface ConversationSummary {
  thread_id: string;
  last_message: string;
  last_message_time: string;
  message_count: number;
}

export interface ConversationDetail {
  thread_id: string;
  messages: Message[];
}

export interface ChatRequest {
  message: string;
  thread_id?: string;
}

export interface ChatResponse {
  response: string;
  thread_id: string;
}

export const chatService = {
  async getConversations(): Promise<ConversationSummary[]> {
    const response = await axios.get(ENDPOINTS.CHAT.CONVERSATIONS);
    return response.data;
  },

  async getConversationHistory(threadId: string): Promise<ConversationDetail> {
    const response = await axios.get(ENDPOINTS.CHAT.CONVERSATION(threadId));
    return response.data;
  },

  async sendMessage(data: ChatRequest): Promise<ChatResponse> {
    const response = await axios.post(ENDPOINTS.CHAT.SEND, data, { timeout: 120000 });
    return response.data;
  },

  async deleteConversation(threadId: string): Promise<void> {
    await axios.delete(ENDPOINTS.CHAT.CONVERSATION(threadId));
  },
};
