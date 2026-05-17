import fs from 'fs';
import type { ServerData } from './types.js';

const DATA_DIR = './server-data';

function getServerDataPath(serverId: string): string {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  return `${DATA_DIR}/${serverId}.json`;
}

export function loadServerData(serverId: string, serverName = 'Unknown'): ServerData {
  const filePath = getServerDataPath(serverId);

  if (!fs.existsSync(filePath)) {
    const newData: ServerData = {
      faqs: {},
      admins: [],
      serverName,
      serverId,
      createdAt: Date.now()
    };

    saveServerData(serverId, newData);
    console.log(`Created server data: ${serverName} (${serverId})`);
    return newData;
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as ServerData;
}

export function saveServerData(serverId: string, data: ServerData): void {
  const filePath = getServerDataPath(serverId);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}
