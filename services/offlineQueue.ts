import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RemoteMessage } from './backend';

const QUEUE_KEY = 'reelai:sync-queue:v1';

type PendingConversation = {
  key: string;
  userId: string;
  messages: RemoteMessage[];
  queuedAt: number;
};

async function readQueue(): Promise<PendingConversation[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

async function writeQueue(items: PendingConversation[]) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(items.slice(-20)));
}

export async function enqueueConversation(userId: string, messages: RemoteMessage[]) {
  const queue = await readQueue();
  const next = queue.filter((item) => item.key !== userId);
  next.push({ key: userId, userId, messages, queuedAt: Date.now() });
  await writeQueue(next);
}

export async function pendingConversationCount(userId?: string) {
  const queue = await readQueue();
  return userId ? queue.filter((item) => item.userId === userId).length : queue.length;
}

export async function flushConversationQueue(
  userId: string,
  save: (id: string, messages: RemoteMessage[]) => Promise<boolean>,
) {
  const queue = await readQueue();
  const pending = queue.filter((item) => item.userId === userId);
  let sent = 0;
  for (const item of pending) {
    if (await save(item.userId, item.messages)) sent += 1;
    else break;
  }
  if (sent > 0) {
    const sentKeys = new Set(pending.slice(0, sent).map((item) => item.key));
    await writeQueue(queue.filter((item) => !sentKeys.has(item.key)));
  }
  return { sent, remaining: Math.max(0, pending.length - sent) };
}
