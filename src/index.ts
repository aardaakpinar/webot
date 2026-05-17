import { Client, Events, GatewayIntentBits } from '@wecordy/core';
import 'dotenv/config';
import { buildCommands } from './commands.js';
import { handleInteraction, handleMessage } from './handlers.js';

const token = process.env.BOT_TOKEN ?? '';

const client = new Client({
  intents: [
    GatewayIntentBits.Servers,
    GatewayIntentBits.ServerMessages,
    GatewayIntentBits.ServerMembers
  ]
});

client.on(Events.ClientReady, async readyClient => {
  console.log(`Logged in as ${readyClient.user?.username}`);
  console.log(`Server count: ${readyClient.servers.cache.size}`);

  try {
    await client.application?.commands.set(buildCommands());
    console.log('Commands registered successfully.');
  } catch (error) {
    console.error('Failed to register commands:', error);
  }
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isCommand()) return;
  await handleInteraction(client, interaction);
});

client.on(Events.MessageCreate, handleMessage);

client.on(Events.Error, error => {
  console.error('Client error:', error);
});

client.login(token).catch(error => {
  console.error('Login failed. Check your bot token:', error.message);
});
