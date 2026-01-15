const { Telegraf, Markup } = require('telegraf');

const bot = new Telegraf('8488987568:AAEyqbl5maD3bmiCucLelCOC7StOLWc9PEs');

// === ڕێکخستنەکان ===
const CHANNEL_USERNAME = '@RebazAsaadku';
const CHANNEL_LINK = 'https://t.me/RebazAsaadku';
const CHANNEL_ID = -1001861873095;
const SILENT_START_HOUR = 0;   // 12 شەو
const SILENT_END_HOUR = 7;     // 7 بەیانی

// === حاڵەتی جۆینی بەکارهێنەران ===
const userJoinCache = new Map();

// === تۆمارکردنی کاتی ئاگاداریەکان بۆ هەر گروپێک ===
const silentStartNotifications = new Map(); // گروپ → ڕۆژی دواین ئاگاداری
const silentEndNotifications = new Map();   // گروپ → ڕۆژی دواین ئاگاداری

// === پشکنینی کاتی خامۆشی ===
function isSilentTime() {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const localHour = (utcHour + 3) % 24; // +3 بۆ کاتی هەولێر (UTC+3)
    console.log(`🕒 کاتێکی ئێستا: UTC ${utcHour}:00, هەولێر ${localHour}:00`);
    return localHour >= SILENT_START_HOUR && localHour < SILENT_END_HOUR;
}

// === پشکنینی کاتی ئێستا ===
function getCurrentTime() {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const localHour = (utcHour + 3) % 24;
    const minutes = now.getMinutes();
    return { localHour, minutes };
}

// === پشکنین بۆ ئەوەی ئەمڕۆ ئاگاداری نێردراوە یان نا ===
function shouldSendNotification(notificationsMap, chatId) {
    const today = new Date().toDateString();
    const lastNotification = notificationsMap.get(chatId);
    
    if (lastNotification !== today) {
        notificationsMap.set(chatId, today);
        return true;
    }
    return false;
}

// === ئاگاداری دەستپێکی خامۆشی ===
async function sendSilentStartNotification(chatId) {
    try {
        // پشکنین بکە ئەمڕۆ ئاگاداری نێردراوە یان نا
        if (shouldSendNotification(silentStartNotifications, chatId)) {
            const message = await bot.telegram.sendMessage(
                chatId,
                `🔕 *دۆخی خامۆشی دەستی پێکرد!*\n\n` +
                `⏰ **کاتی خامۆشی:** ١٢ شەو تا ٧ بەیانی\n\n` +
                `⚠️ **تێبینی:** تەنها ئەدمینەکان دەتوانن لەم کاتەدا بنووسن. نامەکانی ئەندامان خۆکارانە دەسڕێنرێنەوە.`,
                { parse_mode: 'Markdown' }
            );
            
            console.log(`🔕 ئاگاداری دەستپێکی خامۆشی نێردرا بۆ گروپ: ${chatId} (یەکجار لە ڕۆژێکدا)`);
            console.log(`📝 IDی پەیام: ${message.message_id}`);
            return true;
        }
        return false;
    } catch (error) {
        console.log('❌ هەڵە لە ناردنی ئاگاداری دەستپێکی خامۆشی:', error.message);
        return false;
    }
}

// === ئاگاداری کۆتایی خامۆشی ===
async function sendSilentEndNotification(chatId) {
    try {
        // پشکنین بکە ئەمڕۆ ئاگاداری نێردراوە یان نا
        if (shouldSendNotification(silentEndNotifications, chatId)) {
            const message = await bot.telegram.sendMessage(
                chatId,
                `🔔 *دۆخی خامۆشی کۆتایی هات!*\n\n` +
                `⏰ **کاتی خامۆشی تەواو بوو**\n\n` +
                `✅ **ئێستا هەمووان دەتوانن چات بکەن!**`,
                { parse_mode: 'Markdown' }
            );
            
            console.log(`🔔 ئاگاداری کۆتایی خامۆشی نێردرا بۆ گروپ: ${chatId} (یەکجار لە ڕۆژێکدا)`);
            console.log(`📝 IDی پەیام: ${message.message_id}`);
            return true;
        }
        return false;
    } catch (error) {
        console.log('❌ هەڵە لە ناردنی ئاگاداری کۆتایی خامۆشی:', error.message);
        return false;
    }
}

// === پشکنینی ئەدمین ===
async function isAdmin(chatId, userId) {
    try {
        const chatMember = await bot.telegram.getChatMember(chatId, userId);
        return ['administrator', 'creator'].includes(chatMember.status);
    } catch (error) {
        console.log('❌ هەڵە لە پشکنینی ئەدمین:', error.message);
        return false;
    }
}

// === پشکنینی جۆینی چەناڵ ===
async function checkChannelMembership(userId) {
    try {
        const chatMember = await bot.telegram.getChatMember(CHANNEL_ID, userId);
        const isMember = ['creator', 'administrator', 'member'].includes(chatMember.status);
        userJoinCache.set(userId, isMember);
        return isMember;
    } catch (error) {
        return false;
    }
}

// === دوگمەی جۆین ===
function getJoinButton() {
    return Markup.inlineKeyboard([
        [Markup.button.url('📢 جۆینی چەناڵ', CHANNEL_LINK)]
    ]);
}

// === پشکنینی پۆستی کەناڵ ===
function isChannelPost(message) {
    if (message.forward_from_chat && message.forward_from_chat.type === 'channel') {
        return true;
    }
    if (message.forward_from_chat && message.forward_from_chat.username === CHANNEL_USERNAME.replace('@', '')) {
        return true;
    }
    return false;
}

// === پشکنینی لینک ===
function containsLink(text) {
    if (!text) return false;
    const linkPatterns = [
        /https?:\/\/[^\s]+/gi,
        /t\.me\/[^\s]+/gi,
        /@[a-zA-Z0-9_]{5,}/gi,
        /www\.[^\s]+\.[^\s]+/gi,
        /\.[a-z]{2,}(\/|$)/gi
    ];
    return linkPatterns.some(pattern => pattern.test(text));
}

// === لیستی گروپە چالاکەکان ===
const activeGroups = new Set();

// === چاودێری هەموو نامەکان ===
bot.on('message', async (ctx) => {
    if (ctx.chat.type !== 'group' && ctx.chat.type !== 'supergroup') {
        return;
    }
    
    const userId = ctx.from.id;
    const chatId = ctx.chat.id;
    const text = ctx.message.text || ctx.message.caption || '';
    const username = ctx.from.first_name || 'ناونەزانراو';
    const messageId = ctx.message.message_id;
    
    // === تۆمارکردنی گروپەکە وەک چالاک ===
    activeGroups.add(chatId);
    
    // === چێککردنی کاتی خامۆشی ===
    const silentTime = isSilentTime();
    
    try {
        // === پشکنینی ئەدمین ===
        const userIsAdmin = await isAdmin(chatId, userId);
        
        if (userIsAdmin) {
            return; // ئەدمینەکان دەتوانن بەردەوام بنووسن
        }
        
        // === پشکنینی پۆستی کەناڵ ===
        if (isChannelPost(ctx.message)) {
            return;
        }
        
        // === پشکنینی جۆینی چەناڵ ===
        const isChannelMember = await checkChannelMembership(userId);
        if (!isChannelMember) {
            await ctx.deleteMessage(messageId).catch(() => {});
            const warningMsg = await ctx.reply(
                `👤 *${username}*\n\n🚫 **نامەکەت سڕدرایەوە!**\n\n📌 **هۆکار:** تۆ جۆینی چەناڵت نەکردووە\n\n✅ **بۆ چاتکردن، تکایە جۆینی چەناڵ بکە:**`,
                { parse_mode: 'Markdown', ...getJoinButton() }
            );
            setTimeout(() => ctx.deleteMessage(warningMsg.message_id).catch(() => {}), 60000);
            return;
        }
        
        // === پشکنینی لینک ===
        if (containsLink(text)) {
            await ctx.deleteMessage(messageId).catch(() => {});
            await ctx.reply(
                `🚫 *${username}*\n\nلینکەکەت سڕدرایەوە!\n\n📌 **هۆکار:** تەنها ئەدمینەکان دەتوانن لینک بنێرن`,
                { parse_mode: 'Markdown' }
            ).catch(() => {});
            return;
        }
        
        // === پشکنینی دۆخی خامۆشی ===
        if (silentTime) {
            // تەنها نامەکە بسڕێتەوە، هیچ ئاگادارییەک نەدرێت
            await ctx.deleteMessage(messageId).catch(() => {});
            console.log(`🕒 دۆخی خامۆشی: نامەی ${username} سڕدرایەوە لە گروپ: ${chatId} (بێ ئاگاداری)`);
            return;
        }
        
        console.log(`✅ ${username}: نامەکە پەسند کرا لە گروپ: ${chatId}`);
        
    } catch (error) {
        console.log('❌ هەڵە:', error.message);
    }
});

// === سیستەمی کاتێکی خۆکار ===
let lastCheckMinute = -1;

setInterval(async () => {
    try {
        const now = new Date();
        const { localHour, minutes } = getCurrentTime();
        
        // تۆمارکردنی کات
        console.log(`⏰ پشکنینی کات: کاتژمێر ${localHour}:${minutes < 10 ? '0' + minutes : minutes}`);
        
        // تەنها کاتێک پشکنین بکە کە خولەک بگۆڕێت
        if (minutes === lastCheckMinute) {
            return;
        }
        
        lastCheckMinute = minutes;
        
        // پشکنین بۆ کاتی ئاگاداریەکان
        if (minutes === 0) { // تەنها لە سەرەتای کاتژمێردا
            console.log(`🔄 پشکنینی ئاگاداریە خۆکارەکان... گروپە چالاکەکان: ${activeGroups.size}`);
            
            // بۆ هەر گروپێکی چالاک
            for (const chatId of activeGroups) {
                try {
                    if (localHour === SILENT_START_HOUR) {
                        console.log(`🔕 پشکنین بۆ دەستپێکی خامۆشی بۆ گروپ: ${chatId}`);
                        await sendSilentStartNotification(chatId);
                    } else if (localHour === SILENT_END_HOUR) {
                        console.log(`🔔 پشکنین بۆ کۆتایی خامۆشی بۆ گروپ: ${chatId}`);
                        await sendSilentEndNotification(chatId);
                    }
                } catch (error) {
                    console.log(`❌ هەڵە لە ناردنی ئاگاداری بۆ گروپ ${chatId}:`, error.message);
                }
            }
        }
        
    } catch (error) {
        console.log('❌ هەڵە لە سیستەمی کاتێکی خۆکار:', error.message);
    }
}, 30000); // هەر 30 چرکە جارێک

// === پێشوازی لە نوێیەکان ===
bot.on('new_chat_members', async (ctx) => {
    try {
        const members = ctx.message.new_chat_members;
        const botInfo = await ctx.telegram.getMe();
        const chatId = ctx.chat.id;
        
        // تۆمارکردنی گروپ
        activeGroups.add(chatId);
        
        for (const member of members) {
            if (member.id === botInfo.id) {
                await ctx.reply(
                    '🤖 **بۆت چالاک کرا!**\n\n' +
                    '📋 **یاسای گروپ:**\n\n' +
                    '1. **پێویستە جۆینی چەناڵ بکەیت** بۆ چاتکردن\n' +
                    '2. **لینک = سڕینەوە** (تەنها ئەدمینەکان)\n' +
                    '3. **دۆخی خامۆشی:** ١٢ شەو - ٧ بەیانی\n\n' +
                    `⚠️ **تێبینی:** لە کاتی خامۆشیدا (١٢ شەو - ٧ بەیانی) نامەکان بەبێ ئاگاداری دەسڕێنرێنەوە!\n\n` +
                    `⏰ **سیستەمی خۆکار:** بۆت خۆکارانە پەیام دەنێرێت لە:\n` +
                    `• ١٢ شەو: "دۆخی خامۆشی دەستی پێکرد!"\n` +
                    `• ٧ بەیانی: "دۆخی خامۆشی کۆتایی هات!"`,
                    { parse_mode: 'Markdown' }
                );
            }
        }
    } catch (error) {
        console.log('New member error:', error.message);
    }
});

// === فەرمانەکان ===
bot.start(async (ctx) => {
    const username = ctx.from.first_name || 'هاوڕێ';
    const silentTime = isSilentTime();
    
    let message = `👋 *سڵاو ${username}!*\n\n`;
    
    if (silentTime) {
        message += `🔕 **کاتی خامۆشی جێبەجێ دەکرێت!**\n\n`;
        message += `⏰ **کاتی خامۆشی:** ١٢ شەو - ٧ بەیانی\n\n`;
        message += `⚠️ **تێبینی:**\n`;
        message += `• تەنها ئەدمینەکان دەتوانن بنووسن\n`;
        message += `• نامەکانی ئەندامان دەسڕێنرێنەوە\n\n`;
    } else {
        message += `🔔 **کاتی ئاسایی چاتکردنە**\n\n`;
    }
    
    message += `📋 **یاسای گروپ:**\n`;
    message += `1. پێویستە جۆینی چەناڵ بکەیت\n`;
    message += `2. لینکەکان تەنها بۆ ئەدمینەکان\n`;
    message += `3. ڕێز لە هاوڕێکانت بگرە\n\n`;
    message += `🔗 **کەناڵ:** ${CHANNEL_LINK}\n\n`;
    message += `⏰ **سیستەمی خۆکار:**\n`;
    message += `• ١٢ شەو: پەیامی دەستپێکی خامۆشی\n`;
    message += `• ٧ بەیانی: پەیامی کۆتایی خامۆشی`;
    
    await ctx.reply(message, { 
        parse_mode: 'Markdown',
        ...getJoinButton()
    });
});

// === فەرمانی تاقیکردنەوە ===
bot.command('test_silent_start', async (ctx) => {
    if (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup') {
        console.log(`🧪 فەرمانی تاقیکردنەوە: دەستپێکی خامۆشی بۆ گروپ ${ctx.chat.id}`);
        const sent = await sendSilentStartNotification(ctx.chat.id);
        if (sent) {
            await ctx.reply('✅ ئاگاداری دەستپێکی خامۆشی نێردرا!');
        } else {
            await ctx.reply('ℹ️ ئەمڕۆ پێشتر ئاگاداری نێردراوە.');
        }
    }
});

bot.command('test_silent_end', async (ctx) => {
    if (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup') {
        console.log(`🧪 فەرمانی تاقیکردنەوە: کۆتایی خامۆشی بۆ گروپ ${ctx.chat.id}`);
        const sent = await sendSilentEndNotification(ctx.chat.id);
        if (sent) {
            await ctx.reply('✅ ئاگاداری کۆتایی خامۆشی نێردرا!');
        } else {
            await ctx.reply('ℹ️ ئەمڕۆ پێشتر ئاگاداری نێردراوە.');
        }
    }
});

bot.command('time', async (ctx) => {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const localHour = (utcHour + 3) % 24;
    const minutes = now.getMinutes();
    
    await ctx.reply(
        `🕒 **کاتی ئێستا:**\n\n` +
        `• UTC: ${utcHour}:${minutes < 10 ? '0' + minutes : minutes}\n` +
        `• هەولێر: ${localHour}:${minutes < 10 ? '0' + minutes : minutes}\n\n` +
        `• دەستپێکی خامۆشی: ${SILENT_START_HOUR}:00\n` +
        `• کۆتایی خامۆشی: ${SILENT_END_HOUR}:00\n\n` +
        `• گروپە چالاکەکان: ${activeGroups.size}`,
        { parse_mode: 'Markdown' }
    );
});

bot.command('status', async (ctx) => {
    const silentTime = isSilentTime();
    const { localHour } = getCurrentTime();
    
    if (silentTime) {
        await ctx.reply(
            `🔕 **دۆخی خامۆشی چالاکە!**\n\n` +
            `⏰ **کات:** ١٢ شەو - ٧ بەیانی\n` +
            `🕒 **کاتی ئێستا:** ${localHour}:00\n\n` +
            `📌 **یاساکان:**\n` +
            `• تەنها ئەدمینەکان دەتوانن بنووسن\n` +
            `• نامەکانی ئەندامان خۆکارانە دەسڕێنرێنەوە`,
            { parse_mode: 'Markdown' }
        );
    } else {
        await ctx.reply(
            `🔔 **دۆخی خامۆشی ناچالاکە!**\n\n` +
            `✅ **ئێستا دەتوانیت چات بکەیت!**\n` +
            `🕒 **کاتی ئێستا:** ${localHour}:00\n\n` +
            `📌 **یاساکان:**\n` +
            `• پێویستە جۆینی چەناڵی کردبیت\n` +
            `• لینکەکان تەنها بۆ ئەدمینەکان`,
            { parse_mode: 'Markdown' }
        );
    }
});

// === دەستپێکردن ===
console.log('🚀 بۆت دەستی پێدەکات...');
console.log('================================');
console.log(`🔗 کەناڵ: ${CHANNEL_LINK}`);
console.log(`🆔 ID ی چەناڵ: ${CHANNEL_ID}`);
console.log(`🔕 دۆخی خامۆشی: ${SILENT_START_HOUR}:00 - ${SILENT_END_HOUR}:00`);
console.log(`📌 تایبەتمەندیەکان:`);
console.log(`   • کار لە هەموو گروپەکاندا دەکات`);
console.log(`   • ئاگاداری یەکجارە بۆ دەستپێکی خامۆشی (کاتژمێر ١٢ شەو)`);
console.log(`   • ئاگاداری یەکجارە بۆ کۆتایی خامۆشی (کاتژمێر ٧ بەیانی)`);
console.log(`   • ئاگاداریەکان لە گروپەکە دەنێردرێن`);
console.log(`   • لە کاتی خامۆشیدا: تەنها نامەکان دەسڕێنرێنەوە (بێ ئاگاداری)`);
console.log('================================');

bot.launch()
    .then(() => {
        console.log('✅ بۆت سەرکەوتووانە دەستی پێکرد!');
        console.log('\n📋 **سیستەمی کاتێکی خۆکار:**');
        console.log(`• کاتژمێر ${SILENT_START_HOUR}:00: ئاگاداری یەکجارە بۆ دەستپێکی خامۆشی`);
        console.log(`• کاتژمێر ${SILENT_END_HOUR}:00: ئاگاداری یەکجارە بۆ کۆتایی خامۆشی`);
        console.log(`• ئاگاداریەکان لە هەر گروپێکدا دەنێردرێن کە بۆتەکەی تێدایە`);
        console.log(`• لە کاتی خامۆشیدا: نامەکان بەبێ ئاگاداری دەسڕێنرێنەوە`);
        console.log('\n🔧 **فەرمانەکانی تاقیکردنەوە:**');
        console.log(`• /test_silent_start - تاقیکردنەوەی ئاگاداری دەستپێکی خامۆشی`);
        console.log(`• /test_silent_end - تاقیکردنەوەی ئاگاداری کۆتایی خامۆشی`);
        console.log(`• /time - پیشاندانی کاتی ئێستا`);
        console.log(`• /status - پیشاندانی دۆخی ئێستا`);
    })
    .catch((err) => {
        console.error('❌ هەڵە:', err.message);
    });

// وەستاندنی ڕێک
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
