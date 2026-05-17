import { SlashCommandBuilder } from '@wecordy/core';

export const COMMANDS = {
  askFaq: 'ask',
  listFaqs: 'list-faqs',
  addFaq: 'add-faq',
  removeFaq: 'remove-faq',
  addAdmin: 'add-admin',
  removeAdmin: 'remove-admin',
  listAdmins: 'list-admins'
} as const;

export const ADMIN_COMMAND_NAMES = new Set<string>([
  COMMANDS.addFaq,
  COMMANDS.removeFaq,
  COMMANDS.listFaqs,
  COMMANDS.addAdmin,
  COMMANDS.removeAdmin,
  COMMANDS.listAdmins
]);

export function buildCommands(): SlashCommandBuilder[] {
  return [
    new SlashCommandBuilder()
      .setName(COMMANDS.askFaq)
      .setDescription('Find the best FAQ answer for a question')
      .addStringOption(opt =>
        opt.setName('question')
          .setDescription('Question to search for')
          .setRequired(true)
      ),

    new SlashCommandBuilder()
      .setName(COMMANDS.addFaq)
      .setDescription('Add a new FAQ answer')
      .addStringOption(opt =>
        opt.setName('answer')
          .setDescription('Answer text')
          .setRequired(true)
      )
      .addStringOption(opt =>
        opt.setName('tags')
          .setDescription('Search tags separated by commas')
          .setRequired(true)
      ),

    new SlashCommandBuilder()
      .setName(COMMANDS.removeFaq)
      .setDescription('Remove an FAQ answer')
      .addStringOption(opt =>
        opt.setName('id')
          .setDescription('FAQ ID to remove')
          .setRequired(true)
      ),

    new SlashCommandBuilder()
      .setName(COMMANDS.listFaqs)
      .setDescription('List all FAQ answers'),

    new SlashCommandBuilder()
      .setName(COMMANDS.addAdmin)
      .setDescription('Add an FAQ admin')
      .addUserOption(opt =>
        opt.setName('user')
          .setDescription('User to add as an admin')
          .setRequired(true)
      ),

    new SlashCommandBuilder()
      .setName(COMMANDS.removeAdmin)
      .setDescription('Remove an FAQ admin')
      .addUserOption(opt =>
        opt.setName('user')
          .setDescription('User to remove from admins')
          .setRequired(true)
      ),

    new SlashCommandBuilder()
      .setName(COMMANDS.listAdmins)
      .setDescription('List FAQ admins')
  ];
}
