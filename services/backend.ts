import type { Movie } from './api';
import { enqueueConversation } from './offlineQueue';

const API_URL = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/$/, '');
let tokenGetter: (() => Promise<string | null>) | null = null;

export function setApiTokenGetter(getter: () => Promise<string | null>) {
  tokenGetter = getter;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL não configurada');
  const token = tokenGetter ? await tokenGetter() : null;
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!response.ok) {
    if (response.status === 401) throw new Error('Sessão expirada. Faça login novamente.');
    if (response.status === 403) throw new Error('Você não tem permissão para esta ação.');
    throw new Error(`API respondeu ${response.status}`);
  }
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
  try {
    const result = await request<{ messages: RemoteMessage[] }>(`/api/conversations/${encodeURIComponent(userId)}`);
    return result.messages;
  } catch { return null; }
}

export async function saveRemoteConversation(userId: string, messages: RemoteMessage[]): Promise<boolean> {
  if (!API_URL) {
    await enqueueConversation(userId, messages);
    return false;
  }
  try {
    await request(`/api/conversations/${encodeURIComponent(userId)}`, {
      method: 'PUT',
      body: JSON.stringify({ messages }),
    });
    return true;
  } catch {
    await enqueueConversation(userId, messages);
    return false;
  }
}

export async function clearRemoteConversation(userId: string): Promise<void> {
  if (!API_URL) return;
  try {
    await request(`/api/conversations/${encodeURIComponent(userId)}`, { method: 'DELETE' });
  } catch { /* no-op */ }
}

export interface UserProfile {
  userId: string;
  role: 'viewer' | 'curator';
  displayName?: string;
  email?: string;
}

export async function loadMyProfile(): Promise<UserProfile | null> {
  if (!API_URL) return null;
  try { return (await request<{ profile: UserProfile }>('/api/profile/me')).profile; } catch { return null; }
}

export async function getBackendRecommendations(userMessage: string, quantity: number, context: unknown) {
  return request<{ text: string; movies: Movie[]; detectedGenre?: string; detectedAudience?: string; detectedTone?: string }>('/api/recommendations', {
    method: 'POST',
    body: JSON.stringify({ userMessage, quantity, context }),
  });
}
