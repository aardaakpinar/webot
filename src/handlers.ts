import type { Client, CommandInteraction, Message } from '@wecordy/core';
import { ADMIN_COMMAND_NAMES, COMMANDS } from './commands.js';
import { loadServerData, saveServerData } from './dataStore.js';
import { findBestMatchWithScore, generateId } from './faq.js';
import { checkServerOwner, isAdmin } from './permissions.js';
import type { FAQItem, ServerData } from './types.js';

export async function handleInteraction(client: Client, interaction: CommandInteraction): Promise<void> {
  const commandName = interaction.commandName();
  const userId = interaction.user?.id;
  const username = interaction.user?.username ?? 'Unknown';
  const serverId = interaction.serverId;
  const serverName = interaction.server?.name ?? 'Unknown';

  if (!userId) {
    await interaction.reply('Unable to identify the command user.');
    return;
  }

  if (!serverId) {
    await interaction.reply('This command can only be used in a server.');
    return;
  }

  const serverData = loadServerData(serverId, serverName);
  const isOwner = await checkServerOwner(client, userId, serverId, serverData);

  console.log(`[${serverName}] Command: /${commandName} by ${username}`);

  if (isCommand(commandName, COMMANDS.askFaq)) {
    await handleAskFaq(interaction, serverData);
    return;
  }

  if (ADMIN_COMMAND_NAMES.has(commandName) && !isOwner && !isAdmin(userId, serverData)) {
    await interaction.reply('This command can only be used by FAQ admins or the server owner.');
    return;
  }

  if (isCommand(commandName, COMMANDS.addFaq)) {
    await handleAddFaq(interaction, serverId, serverData, username);
    return;
  }

  if (isCommand(commandName, COMMANDS.removeFaq)) {
    await handleRemoveFaq(interaction, serverId, serverData);
    return;
  }

  if (isCommand(commandName, COMMANDS.listFaqs)) {
    await handleListFaqs(interaction, serverData);
    return;
  }

  if (isCommand(commandName, COMMANDS.addAdmin)) {
    await handleAddAdmin(client, interaction, serverId, serverName, serverData, isOwner);
    return;
  }

  if (isCommand(commandName, COMMANDS.removeAdmin)) {
    await handleRemoveAdmin(client, interaction, serverId, serverData, isOwner);
    return;
  }

  if (isCommand(commandName, COMMANDS.listAdmins)) {
    await handleListAdmins(client, interaction, serverData, isOwner);
  }
}

export async function handleMessage(message: Message): Promise<void> {
  if (message.isOwnMessage()) return;
  const serverId = message.serverId;
  if (!serverId) return;

  const serverData = loadServerData(serverId, message.server?.name);
  const content = message.content ?? '';

  const query = content.trim();
  if (!query || !query.includes('?')) return;

  const result = findBestMatchWithScore(query, serverData);
  const match = result.faq;
  const score = result.score;

  console.log(`[${message.server?.name ?? 'Unknown'}] FAQ match score: ${(score * 100).toFixed(1)}% for query: ${query}`);

  if (!match || score < 0.3) {
    return;
  }

  await message.reply(formatAnswer(match, false));
}

function isCommand(commandName: string, currentName: string): boolean {
  return commandName === currentName;
}

async function handleAskFaq(interaction: CommandInteraction, serverData: ServerData): Promise<void> {
  const question = interaction.getString('question')
    ?? interaction.getString('soru')
    ?? getInteractionStringOption(interaction, 'question')
    ?? getInteractionStringOption(interaction, 'soru');

  if (!question) {
    await interaction.reply('Question text is required.');
    return;
  }

  const result = findBestMatchWithScore(question, serverData);
  const match = result.faq;
  const score = result.score;

  console.log(`[${interaction.server?.name ?? '/list-faqs'}] FAQ match score: ${(score * 100).toFixed(1)}% for query: ${question}`);

  if (!match || score < 0.3) {
    await interaction.reply('No matching answer was found. Try different tags or ask an admin to add one.');
    return;
  }

  await interaction.reply(formatAnswer(match, true));
}

function getInteractionStringOption(interaction: CommandInteraction, name: string): string | null {
  const anyInteraction = interaction as any;
  const value = anyInteraction.getString?.(name)
    ?? anyInteraction.getOption?.(name)?.value
    ?? anyInteraction.data?.options?.find((opt: any) => opt.name === name)?.value
    ?? anyInteraction.options?.getString?.(name);

  return typeof value === 'string' ? value : null;
}

async function handleAddFaq(
  interaction: CommandInteraction,
  serverId: string,
  serverData: ServerData,
  username: string
): Promise<void> {
  const answer = interaction.getString('answer')
  const tagsText = interaction.getString('tags')
    ?? interaction.getString('keywords');

  if (!answer) {
    await interaction.reply('Answer text is required.');
    return;
  }

  if (!tagsText) {
    await interaction.reply('At least one tag is required.');
    return;
  }

  const keywords = parseTags(tagsText);
  if (keywords.length === 0) {
    await interaction.reply('At least one tag is required.');
    return;
  }

  const id = generateId();
  const newFAQ: FAQItem = {
    id,
    answer,
    keywords,
    createdBy: username,
    createdAt: Date.now()
  };

  serverData.faqs[id] = newFAQ;
  saveServerData(serverId, serverData);

  await interaction.reply(
    `FAQ added.\n\n` +
    `Answer: ${answer}\n` +
    `Tags: ${keywords.join(', ')}\n` +
    `Created by: ${username}\n` +
    `ID: ${id}`
  );
}

async function handleRemoveFaq(
  interaction: CommandInteraction,
  serverId: string,
  serverData: ServerData
): Promise<void> {
  const id = interaction.getString('id', true);
  const deleted = serverData.faqs[id];

  if (!deleted) {
    await interaction.reply(`FAQ ID '${id}' was not found.`);
    return;
  }

  delete serverData.faqs[id];
  saveServerData(serverId, serverData);

  await interaction.reply(`FAQ removed.\n\nID: ${id}`);
}

async function handleListFaqs(interaction: CommandInteraction, serverData: ServerData): Promise<void> {
  const faqList = Object.values(serverData.faqs);

  if (faqList.length === 0) {
    await interaction.reply('No FAQ answers have been added yet.');
    return;
  }

  let response = `FAQ list (${faqList.length} total)\n\n`;

  for (const faq of faqList.slice(0, 10)) {
    response += `--------------------\n`;
    response += `ID: ${faq.id}\n`;
    response += `Answer: ${faq.answer.substring(0, 80)}${faq.answer.length > 80 ? '...' : ''}\n`;
    response += `Tags: ${faq.keywords.join(', ')}\n\n`;
  }

  if (faqList.length > 10) {
    response += `Showing the first 10 results. Total: ${faqList.length}`;
  }

  await interaction.reply(response);
}

async function handleAddAdmin(
  client: Client,
  interaction: CommandInteraction,
  serverId: string,
  serverName: string,
  serverData: ServerData,
  isOwner: boolean
): Promise<void> {
  if (!isOwner) {
    await interaction.reply('This command can only be used by the server owner.');
    return;
  }

  const targetUserId = getUserOptionValue(interaction);
  if (!targetUserId) {
    await interaction.reply('User was not found.');
    return;
  }

  const targetUsername = await getUsername(client, targetUserId);
  if (serverData.admins.includes(targetUserId)) {
    await interaction.reply(`${targetUsername} is already an FAQ admin.`);
    return;
  }

  serverData.admins.push(targetUserId);
  saveServerData(serverId, serverData);

  await interaction.reply(`${targetUsername} was added as an FAQ admin.\nServer: ${serverName}`);
}

async function handleRemoveAdmin(
  client: Client,
  interaction: CommandInteraction,
  serverId: string,
  serverData: ServerData,
  isOwner: boolean
): Promise<void> {
  if (!isOwner) {
    await interaction.reply('This command can only be used by the server owner.');
    return;
  }

  const targetUserId = getUserOptionValue(interaction);
  if (!targetUserId) {
    await interaction.reply('User was not found.');
    return;
  }

  const targetUsername = await getUsername(client, targetUserId);
  if (!serverData.admins.includes(targetUserId)) {
    await interaction.reply(`${targetUsername} is not an FAQ admin.`);
    return;
  }

  serverData.admins = serverData.admins.filter(id => id !== targetUserId);
  saveServerData(serverId, serverData);

  await interaction.reply(`${targetUsername} was removed from FAQ admins.`);
}

async function handleListAdmins(
  client: Client,
  interaction: CommandInteraction,
  serverData: ServerData,
  isOwner: boolean
): Promise<void> {
  if (!isOwner) {
    await interaction.reply('This command can only be used by the server owner.');
    return;
  }

  if (serverData.admins.length === 0) {
    await interaction.reply('No FAQ admins have been added yet.');
    return;
  }

  let response = `FAQ admins (${serverData.admins.length} total)\n\n`;
  for (const adminId of serverData.admins) {
    response += `- ${await getUsername(client, adminId)}\n`;
  }

  await interaction.reply(response);
}

function parseTags(tagsText: string): string[] {
  return tagsText
    .split(',')
    .map(tag => tag.trim().toLowerCase())
    .filter(tag => tag.length > 0);
}

function getUserOptionValue(interaction: CommandInteraction): string | null {
  const value = interaction.getOption('user')?.value
    ?? interaction.getOption('kullanici')?.value;

  return typeof value === 'string' ? value : null;
}

async function getUsername(client: Client, userId: string): Promise<string> {
  const user = client.users.cache.get(userId)
    ?? await client.users.fetch(userId).catch(() => null);

  return user?.username ?? userId;
}

function formatAnswer(faq: FAQItem, includeId: boolean): string {
  let response = `${faq.answer}\n\n`;

  return response;
}
