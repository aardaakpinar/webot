import type { Client } from '@wecordy/core';
import { saveServerData } from './dataStore.js';
import type { ServerData } from './types.js';

export function isAdmin(userId: string, serverData: ServerData): boolean {
  return serverData.admins.includes(userId);
}

export async function checkServerOwner(
  client: Client,
  userId: string,
  serverId: string,
  serverData: ServerData
): Promise<boolean> {
  const ownerId = client.servers.cache.get(serverId)?.userId
    ?? serverData.ownerId
    ?? await fetchServerOwnerId(client, serverId);

  if (ownerId && serverData.ownerId !== ownerId) {
    serverData.ownerId = ownerId;
    saveServerData(serverId, serverData);
  }

  return ownerId === userId;
}

async function fetchServerOwnerId(client: Client, serverId: string): Promise<string | null> {
  const server = await client.servers.fetch(serverId, true).catch(() => null);
  return server?.userId ?? null;
}
