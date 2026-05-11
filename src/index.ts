import { Client, EmbedBuilder, Events, GatewayIntentBits, SlashCommandBuilder } from '@wecordy/core';
import fs from 'fs';
import "dotenv/config";

const token = process.env.BOT_TOKEN ?? '';

const client = new Client({
  intents: [
    GatewayIntentBits.Servers,
    GatewayIntentBits.ServerMessages,
    GatewayIntentBits.ServerMembers
  ],
});

const DATA_FILE = './data.json';

// --------------------
// 📁 VERİ SİSTEMİ
// --------------------
function loadData() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({
      coin: {},
      luckFactor: {},
      socialCooldown: {
        pray: {},
        curse: {}
      }
    }, null, 2));
  }

  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}

function saveData(data: any) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

let data = loadData();

// --------------------
// UTILITY FUNCTIONS
// --------------------

function findUser(message: any, query: string) {
  const member = message.server?.members?.find((m: any) =>
    m.user.username.toLowerCase().includes(query.toLowerCase()) ||
    m.user.id === query
  );

  return member?.user ?? null;
}

// Şans faktörünü alma ve ayarlama fonksiyonları
function getLuck(userId: string): number {
  return data.luckFactor[userId] ?? 0;
}

function setLuck(userId: string, value: number) {
  const clamped = Math.max(-1, Math.min(1, value));

  data.luckFactor[userId] = clamped;
  saveData(data);
}

function decayLuck(userId: string) {
  const currentLuck = getLuck(userId);

  if (currentLuck > 0) {
    setLuck(userId, currentLuck - 0.02);
  } else if (currentLuck < 0) {
    setLuck(userId, currentLuck + 0.02);
  }
}

// Cooldown kontrol fonksiyonu
function checkCooldown(
  userId: string,
  type: 'pray' | 'curse',
  data: any
): boolean {

  const lastUsed = data.socialCooldown?.[type]?.[userId] || 0;

  const now = Date.now();
  const cooldownTime = 24 * 60 * 60 * 1000;

  if (now - lastUsed < cooldownTime) {
    return false;
  }

  if (!data.socialCooldown) {
    data.socialCooldown = {
      pray: {},
      curse: {}
    };
  }

  if (!data.socialCooldown[type]) {
    data.socialCooldown[type] = {};
  }

  data.socialCooldown[type][userId] = now;

  saveData(data);

  return true;
}

// --------------------
// BOT READY
// --------------------
client.on(Events.ClientReady, async (readyClient) => {
  console.log(`🚀 ${readyClient.user?.username} olarak başarıyla giriş yapıldı!`);
  console.log(`Sunucu sayısı: ${readyClient.servers.cache.size}`);

  const commands = [
    // -------------- BASIC COMMAND ----------------
    new SlashCommandBuilder()
      .setName('help')
      .setDescription('Komut listesini gösterir'),
    new SlashCommandBuilder()
      .setName('my')
      .setDescription('Kendi bilgilerini gösterir'),

    // -------------- SOCIAL ---------------
    new SlashCommandBuilder()
      .setName('pray')
      .setDescription('Dua et 🙏')
      .addUserOption(opt =>
        opt.setName('username')
          .setDescription('Dua edilecek kişi')
          .setRequired(false)
      ),

    new SlashCommandBuilder()
      .setName('curse')
      .setDescription('Lanet et')
      .addUserOption(opt =>
        opt.setName('username')
          .setDescription('Lanetlenecek kişi')
          .setRequired(false)
      ),

    // -------------- GAMBLING ---------------
    new SlashCommandBuilder()
      .setName('slots')
      .setDescription('Slot makinesi oyna 🎰')
      .addIntegerOption(opt =>
        opt.setName('bahis')
          .setDescription('Bahis miktarı')
          .setRequired(true)
      ),

    new SlashCommandBuilder()
      .setName('coinflip')
      .setDescription('Yazı tura oyna 🪙')
      .addIntegerOption(opt =>
        opt.setName('bahis')
          .setDescription('Bahis miktarı')
          .setRequired(true)
      )
      .addStringOption(opt =>
        opt.setName('taraf')
          .setDescription('Yazı veya Tura?')
          .setRequired(true)
          .addChoices(
            { name: 'Yazı', value: 'heads' },
            { name: 'Tura', value: 'tails' }
          )
      ),

    new SlashCommandBuilder()
      .setName('blackjack')
      .setDescription('Blackjack oyna 🃏')
      .addIntegerOption(opt =>
        opt.setName('bahis')
          .setDescription('Bahis miktarı')
          .setRequired(true)
      ),
  ];

  try {
    await client.application!.commands.set(commands);
  } catch (error) {
    console.error('❌ Slash komutları kaydedilirken hata oluştu:', error);
  }
});

// --------------------
// SLASH COMMANDS
// --------------------
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isCommand()) return;

  const commandName = interaction.commandName();
  const userId = interaction.user!.id;
  const username = interaction.user?.username;

  console.log(`Command invoked: /${commandName} by ${username}`);

  if (commandName === 'help') {
    return interaction.reply(
      `📜 **Komut Listesi** 📜\n\n` +
      `/help - Komut listesini gösterir\n` +
      `/my - Kendi bilgilerini gösterir\n` +
      `/pray - Dua et - şansını artır\n` +
      `/curse - Lanet et - şansını azalt\n` +
      `/slots - Slot makinesi oyna\n` +
      `/coinflip - Yazı tura oyna\n` +
      `/blackjack - Blackjack oyna\n\n` +
      `🎉 **Sosyal Komutlar** 🎉\n\n` +
      `hug, insult, kiss, slap, highfive, bite, greet, punch, tickle, kill (örn: hug @kullanıcı)`
    );
  }

  if (commandName === 'my') {
    const userCoin = data.coin[userId] ?? 0;
    const userLuck = getLuck(userId);
    const casinoBonus = (userLuck * 15).toFixed(1);
    return interaction.reply(
      `📊 **${username} Bilgileri** 📊\n\n` +
      `🪙 Para: ${userCoin}\n` +
      `🍀 Şans: ${userLuck} (${casinoBonus}%)`
    );
  }

  // ==================== SOCIAL ====================

  // -------------- PRAY ----------------
  if (commandName === 'pray') {
    const canUse = checkCooldown(userId, 'pray', data);

    if (!canUse) {
      return interaction.reply('⏰ **Günde sadece 1 kez dua edebilirsin!**');
    }

    const currentLuck = getLuck(userId);
    setLuck(userId, currentLuck + 0.1);

    const prayLines = [
      'Tanrıya dua etti ve şansını artırdı! 🙏',
      'Muhteşem bir dua yaptı, bereket geldi! 🙏',
      'Yüksek sesle dua ederek şansını katladı! 🙏',
      'Kalbi temiz bir şekilde dua etti! 🙏'
    ];

    const prayer = prayLines[Math.floor(Math.random() * prayLines.length)];
    return interaction.reply(`**${username}** ${prayer}`);
  }

  // -------------- CURSE ----------------
  if (commandName === 'curse') {
    const canUse = checkCooldown(userId, 'curse', data);

    if (!canUse) {
      return interaction.reply('⏰ **Günde sadece 1 kez lanet edebilirsin!**');
    }

    const query = interaction.getString('username');
    if (!query) {
      return interaction.reply("Bir kullanıcı belirtmelisin.");
    }
    const target = findUser(interaction, query);
    if (!target) return interaction.reply("Kullanıcı bulunamadı.");

    const currentLuck = getLuck(userId);
    setLuck(userId, currentLuck - 0.1);

    const curseLines = [
      `Kara bir lanet çekti, ${target} şansı azaldı... 😈`,
      `Korkunç bir laneti ${target} için kullandı! 😈`,
      `Karanlık güçleri çağırdı, ${target} şansı yandı! 😈`,
      `İçten ${target}'a lanet etti! 😈`
    ];

    const curse = curseLines[Math.floor(Math.random() * curseLines.length)];
    return interaction.reply(`**${username}** ${curse}`);
  }

  // ==================== GAMBLING ====================

  // -------------- SLOTS ----------------
  if (commandName === 'slots') {
    const bet = interaction.getInteger('bahis')!;
    const userCoin = data.coin[userId] ?? 0;

    if (bet <= 0) {
      return interaction.reply('❌ **Bahis pozitif olmalı!**');
    }

    if (bet > userCoin) {
      return interaction.reply(`❌ **Yeterli coin'in yok! Sahip olduğun coin: ${userCoin}**`);
    }

    const slots = ['🍎', '🍊', '🍋', '🍌', '🍉'];
    const luck = getLuck(userId);

    const jackpotChance = 0.05 + (luck * 0.10);
    const isJackpot = Math.random() < jackpotChance;

    let result;

    if (isJackpot) {
      const symbol = slots[Math.floor(Math.random() * slots.length)];
      result = [symbol, symbol, symbol];
    } else {
      do {
        result = [
          slots[Math.floor(Math.random() * slots.length)],
          slots[Math.floor(Math.random() * slots.length)],
          slots[Math.floor(Math.random() * slots.length)]
        ];
      } while (
        result[0] === result[1] &&
        result[1] === result[2]
      );
    }

    const isWin = result[0] === result[1] && result[1] === result[2];
    let winAmount = 0;

    decayLuck(userId);

    if (isWin) {
      winAmount = bet * 3;
      data.coin[userId] = (data.coin[userId] ?? 0) + winAmount;
      saveData(data);
      return interaction.reply(
        `🎰 **SLOT MAKINESI** 🎰\n\n${result.join(' ')}\n\n🎉 **JACKPOT!** +${winAmount} coin kazandın!`
      );
    } else {
      data.coin[userId] = (data.coin[userId] ?? 0) - bet;
      saveData(data);
      return interaction.reply(
        `🎰 **SLOT MAKINESI** 🎰\n\n${result.join(' ')}\n\n😔 **Kaybettin!** -${bet} coin`
      );
    }
  }

  // -------------- COINFLIP ----------------
  if (commandName === 'coinflip') {
    const bet = interaction.getInteger('bahis')!;
    const choice = interaction.getString('taraf')!;
    const userCoin = data.coin[userId] ?? 0;

    if (bet <= 0) {
      return interaction.reply('❌ **Bahis pozitif olmalı!**');
    }

    if (bet > userCoin) {
      return interaction.reply(`❌ **Yeterli coin'in yok! Sahip olduğun coin: ${userCoin}**`);
    }

    const luck = getLuck(userId);
    const winChance = 0.5 + (luck * 0.15);
    const didWin = Math.random() < winChance;

    const result = didWin ? choice : (choice === 'heads' ? 'tails' : 'heads');
    const resultEmoji = result === 'heads' ? '🪙 **YAZІ**' : '🪙 **TURA**';

    decayLuck(userId);

    if (result === choice) {
      data.coin[userId] = (data.coin[userId] ?? 0) + bet;
      saveData(data);
      return interaction.reply(
        `${resultEmoji}\n\n✅ **Doğru tahmin!** +${bet} coin kazandın!`
      );
    } else {
      data.coin[userId] = (data.coin[userId] ?? 0) - bet;
      saveData(data);
      return interaction.reply(
        `${resultEmoji}\n\n❌ **Yanlış tahmin!** -${bet} coin kaybettin!`
      );
    }
  }

  // -------------- BLACKJACK ----------------
  if (commandName === 'blackjack') {
    const bet = interaction.getInteger('bahis')!;
    const userCoin = data.coin[userId] ?? 0;

    if (bet <= 0) {
      return interaction.reply('❌ **Bahis pozitif olmalı!**');
    }

    if (bet > userCoin) {
      return interaction.reply(`❌ **Yeterli coin'in yok! Sahip olduğun coin: ${userCoin}**`);
    }

    // Basit blackjack mantığı
    const getCardValue = () => Math.floor(Math.random() * 13) + 1; // 1-13

    const playerCard1 = getCardValue();
    const playerCard2 = getCardValue();
    const dealerCard1 = getCardValue();
    const dealerCard2 = getCardValue();

    const playerTotal = Math.min(playerCard1 + playerCard2, 21);
    const dealerTotal = Math.min(dealerCard1 + dealerCard2, 21);

    let result = '';
    let winAmount = 0;

    if (playerTotal > 21) {
      result = `❌ **Bust! 21'i geçtin!** -${bet} coin`;
      data.coin[userId] = (data.coin[userId] ?? 0) - bet;
    } else if (dealerTotal > 21) {
      winAmount = bet * 2;
      result = `✅ **Dealer Bust! Kazandın!** +${winAmount} coin`;
      data.coin[userId] = (data.coin[userId] ?? 0) + winAmount;
    } else if (playerTotal > dealerTotal) {
      winAmount = bet * 2;
      result = `✅ **Kazandın!** +${winAmount} coin`;
      data.coin[userId] = (data.coin[userId] ?? 0) + winAmount;
    } else if (playerTotal < dealerTotal) {
      result = `❌ **Kaybettin!** -${bet} coin`;
      data.coin[userId] = (data.coin[userId] ?? 0) - bet;
    } else {
      result = `➖ **Berabere!** Coin'in korundu.`;
    }

    saveData(data);

    return interaction.reply(
      `🃏 **BLACKJACK** 🃏\n\n` +
      `**Senin Kartlar:** ${playerCard1} + ${playerCard2} = ${playerTotal}\n` +
      `**Dealer Kartları:** ${dealerCard1} + ${dealerCard2} = ${dealerTotal}\n\n` +
      result
    );
  }
});

// --------------------
// MESSAGE HANDLER
// --------------------
// --------------------
// MESSAGE HANDLER
// --------------------
client.on(Events.MessageCreate, async (message) => {
  if (message.isOwnMessage()) return;

  const args = message.content.split(' ');
  const command = args[0]?.toLowerCase();
  const targetUser = args[1] || 'birini';

  const random = (arr: string[]): string => {
    return arr[Math.floor(Math.random() * arr.length)];
  };

  if (command === '!ping') {
    return message.reply('🏓 Pong!');
  }

  // ==================== ACTIONS ====================

  // -------------- HUG ----------------
  if (command === 'hug') {
    const hugs = [
      `🤗 **${message.user?.username}**, **${targetUser}** kişisini sıcacık sarıldı.`,
      `💖 **${message.user?.username}**, **${targetUser}** için kocaman bir sarılma bıraktı.`,
      `🤍 **${targetUser}**, sevgi dolu bir kucaklama aldı.`,
      `✨ **${message.user?.username}**, **${targetUser}**'a en tatlı sarılmayı yaptı.`
    ];

    return message.reply(random(hugs));
  }

  // -------------- INSULT ----------------
  if (command === 'insult') {
    const insults = [
      `${targetUser}, beynin hâlâ yükleniyor galiba.`,
      `${targetUser}, senden daha hızlı çalışan bir hesap makinesi gördüm.`,
      `${targetUser}, bazen sessiz kalmak daha havalı olabilir.`,
      `${targetUser}, mantık seninle bağlantıyı kesmiş.`,
      `${targetUser}, NPC enerjisi veriyorsun.`,
      `${targetUser}, internet hızın kadar düşünüyorsun gibi.`,
      `${targetUser}, bu performansla tutorial bile geçilmez.`,
      `${targetUser}, sistem seni AFK sanıyor.`
    ];

    return message.reply(`😤 **${message.user?.username}** laf soktu:\n> ${random(insults)}`);
  }

  // -------------- KISS ----------------
  if (command === 'kiss') {
    const kissLines = [
      `💋 **${targetUser}** tatlı bir öpücük aldı.`,
      `😘 **${message.user?.username}**, sevgi dolu bir öpücük gönderdi.`,
      `💕 Ortam romantikleşti...`,
      `💖 Küçük ama etkili bir öpücük bırakıldı.`
    ];

    return message.reply(random(kissLines));
  }

  // -------------- SLAP ----------------
  if (command === 'slap') {
    const slapLines = [
      `👋 **${targetUser}** sağlam bir tokat yedi.`,
      `💥 Tokadın sesi karşı mahalleden duyuldu.`,
      `😵 **${message.user?.username}**, hızlı bir slap attı.`,
      `⚡ Refleksler yetersiz kaldı.`
    ];

    return message.reply(random(slapLines));
  }

  // -------------- HIGHFIVE ----------------
  if (command === 'highfive') {
    const fives = [
      `🙌 **${message.user?.username}** ve **${targetUser}** mükemmel bir high five yaptı!`,
      `🔥 Havada beşler çarpıştı!`,
      `✨ Efsanevi bir takım ruhu ortaya çıktı.`,
      `🤝 Enerji tavan yaptı!`
    ];

    return message.reply(random(fives));
  }

  // -------------- BITE ----------------
  if (command === 'bite') {
    const biteLines = [
      `😈 **${targetUser}** hafifçe ısırıldı.`,
      `🧛 Vampir modu aktif edildi.`,
      `😬 Isırık biraz fazla gerçekçiydi.`,
      `💢 Küçük bir saldırı gerçekleşti.`
    ];

    return message.reply(`**${message.user?.username}** ${random(biteLines)}`);
  }

  // -------------- GREET ----------------
  if (command === 'greet') {
    const greetLines = [
      '👋 Selam millet!',
      '✨ Herkese iyi günler!',
      '🔥 Nasılsınız?',
      '💖 Ortama enerji geldi!',
      '😎 Selamlar dostlar!'
    ];

    return message.reply(`**${message.user?.username}** dedi ki:\n> ${random(greetLines)}`);
  }

  // -------------- PUNCH ----------------
  if (command === 'punch') {
    const punchLines = [
      `👊 **${targetUser}** kritik hasar aldı.`,
      `💥 Çok güçlü bir yumruk geldi.`,
      `⚡ Hızlı ve etkili bir saldırı yapıldı.`,
      `🔥 Komboya devam edildi.`
    ];

    return message.reply(`**${message.user?.username}** ${random(punchLines)}`);
  }

  // -------------- TICKLE ----------------
  if (command === 'tickle') {
    const tickleLines = [
      `🤭 **${targetUser}** kahkahaya boğuldu.`,
      `😂 Gıdıklama seviyesi maksimuma ulaştı.`,
      `😆 Durmadan gülme efekti uygulandı.`,
      `✨ Ortam neşelendi.`
    ];

    return message.reply(`**${message.user?.username}** ${random(tickleLines)}`);
  }

  // -------------- KILL ----------------
  if (command === 'kill') {
    const killLines = [
      `💀 **${targetUser}** oyundan elendi.`,
      `⚰️ **${targetUser}** respawn bekliyor.`,
      `☠️ Kritik hasar alındı.`,
      `🪦 Maalesef kurtarılamadı...`
    ];

    return message.reply(random(killLines));
  }
});

// --------------------
// ERROR HANDLING
// --------------------
client.on(Events.Error, (error) => {
  console.error('❌ Bir hata oluştu:', error);
});

// --------------------
// LOGIN
// --------------------
client.login(token).catch((err) => {
  console.error('🔑 Giriş yapılamadı. Tokeninizi kontrol edin:', err.message);
});