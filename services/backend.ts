import type { Movie } from './api';

const API_URL = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/$/, '');

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL não configurada');
  const response = await fetch(`${API_URL}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
  if (!response.ok) throw new Error(`API respondeu ${response.status}`);
  return response.status === 204 ? (undefined as T) : response.json();
}

export interface RemoteMessage {
  id: string;
  text: string;
  isUser: boolean;
  movies?: Movie[];
  userPrompt?: string;
  conversationContext?: string;
  isFollowUp?: boolean;
}

export async function loadRemoteConversation(userId: string): Promise<RemoteMessage[] | null> {
  if (!API_URL) return null;
  try { const result = await request<{ messages: RemoteMessage[] }>(`/api/conversations/${encodeURIComponent(userId)}`); return result.messages; } catch { return null; }
}

export async function saveRemoteConversation(userId: string, messages: RemoteMessage[]): Promise<void> {
  if (!API_URL) return;
  try { await request(`/api/conversations/${encodeURIComponent(userId)}`, { method: 'PUT', headers: { 'x-user-id': userId }, body: JSON.stringify({ messages }) }); } catch { /* cache local continua sendo a fonte de resiliência */ }
}

export async function clearRemoteConversation(userId: string): Promise<void> {
  if (!API_URL) return;
  try { await request(`/api/conversations/${encodeURIComponent(userId)}`, { method: 'DELETE', headers: { 'x-user-id': userId } }); } catch { /* no-op */ }
}

export async function getBackendRecommendations(userMessage: string, quantity: number, context: unknown) {
  return request<{ text: string; movies: Movie[]; detectedGenre?: string; detectedAudience?: string; detectedTone?: string }>('/api/recommendations', { method: 'POST', body: JSON.stringify({ userMessage, quantity, context }) });
}
