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

// === پشکنینی کاتی خامۆشی ===
function isSilentTime() {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const localHour = (utcHour + 3) % 24;
    return localHour >= SILENT_START_HOUR && localHour < SILENT_END_HOUR;
}

// === ئاگاداری خۆکار بۆ دەستپێکی خامۆشی ===
async function sendAutoSilentStartNotification(chatId) {
    try {
        const notification = await bot.telegram.sendMessage(
            chatId,
            `🔕 *دۆخی خامۆشی دەستی پێکرد!*\n\n` +
            `⏰ **کاتی خامۆشی:** ١٢ شەو تا ٧ بەیانی\n\n` +
            `⚠️ **تێبینی:** تەنها ئەدمینەکان دەتوانن لەم کاتەدا بنووسن. نامەکانی ئەندامان خۆکارانە دەسڕێنرێنەوە.`,
            { parse_mode: 'Markdown' }
        );
        
        console.log(`🔕 ئاگاداری دەستپێکی خامۆشی نێردرا بۆ گروپ: ${chatId}`);
        
        // ئەگەر ویست پەیامەکە دوای ماوەیەک بسڕیتەوە:
        // setTimeout(async () => {
        //     try {
        //         await bot.telegram.deleteMessage(chatId, notification.message_id);
        //     } catch (e) {}
        // }, 1800000); // 30 خولەک
        
    } catch (error) {
        console.log('❌ هەڵە لە ناردنی ئاگاداری دەستپێکی خامۆشی:', error.message);
    }
}

// === ئاگاداری خۆکار بۆ کۆتایی خامۆشی ===
async function sendAutoSilentEndNotification(chatId) {
    try {
        const notification = await bot.telegram.sendMessage(
            chatId,
            `🔔 *دۆخی خامۆشی کۆتایی هات!*\n\n` +
            `⏰ **کاتی خامۆشی تەواو بوو**\n\n` +
            `✅ **ئێستا هەمووان دەتوانن چات بکەن!**`,
            { parse_mode: 'Markdown' }
        );
        
        console.log(`🔔 ئاگاداری کۆتایی خامۆشی نێردرا بۆ گروپ: ${chatId}`);
        
        // ئەگەر ویست پەیامەکە دوای ماوەیەک بسڕیتەوە:
        // setTimeout(async () => {
        //     try {
        //         await bot.telegram.deleteMessage(chatId, notification.message_id);
        //     } catch (e) {}
        // }, 1800000); // 30 خولەک
        
    } catch (error) {
        console.log('❌ هەڵە لە ناردنی ئاگاداری کۆتایی خامۆشی:', error.message);
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
                `🚫 *${username}*\n\nلینکەکەت سڕدرایەوە!\n\n📌 **هۆکار:** تەنھا ئەدمینەکان دەتوانن لینک بنێرن`,
                { parse_mode: 'Markdown' }
            ).catch(() => {});
            return;
        }
        
        // === پشکنینی دۆخی خامۆشی ===
        if (silentTime) {
            // لە کاتی خامۆشیدا نامەکە بسڕەوە و ئاگاداری بکە
            await ctx.deleteMessage(messageId).catch(() => {});
            
            const silentWarning = await ctx.reply(
                `🔕 *${username}*\n\n🚫 **نامەکەت سڕدرایەوە!**\n\n` +
                `⏰ **کاتی خامۆشی:** ١٢ شەو تا ٧ بەیانی\n\n` +
                `📌 **تێبینی:** تەنها ئەدمینەکان دەتوانن لەم کاتەدا بنووسن.`,
                { parse_mode: 'Markdown' }
            ).catch(() => {});
            
            // ئەگەر ویست ئاگاداریەکە دوای ماوەیەک بسڕیتەوە:
            if (silentWarning) {
                setTimeout(() => {
                    ctx.deleteMessage(silentWarning.message_id).catch(() => {});
                }, 30000); // 30 چرکە
            }
            
            console.log(`🕒 دۆخی خامۆشی: نامەی ${username} سڕدرایەوە`);
            return;
        }
        
        console.log(`✅ ${username}: نامەکە پەسند کرا`);
        
    } catch (error) {
        console.log('❌ هەڵە:', error.message);
    }
});

// === پێشوازی لە نوێیەکان ===
bot.on('new_chat_members', async (ctx) => {
    try {
        const members = ctx.message.new_chat_members;
        const botInfo = await ctx.telegram.getMe();
        
        for (const member of members) {
            if (member.id === botInfo.id) {
                await ctx.reply(
                    '🤖 **بۆت چالاک کرا!**\n\n' +
                    '📋 **یاسای گروپ:**\n\n' +
                    '1. **پێویستە جۆینی چەناڵ بکەیت** بۆ چاتکردن\n' +
                    '2. **لینک = سڕینەوە** (تەنها ئەدمینەکان)\n' +
                    '3. **دۆخی خامۆشی:** ١٢ شەو - ٧ بەیانی\n\n' +
                    '⚠️ **تێبینی:** لە کاتی خامۆشیدا نامەکان خۆکارانە دەسڕێنرێنەوە!',
                    { parse_mode: 'Markdown' }
                );
            }
        }
    } catch (error) {
        console.log('New member error:', error.message);
    }
});

// === سیستەمی کاتێکی خۆکار بۆ ئاگاداریەکان ===
let lastSilentStartNotification = null;
let lastSilentEndNotification = null;

setInterval(async () => {
    try {
        const now = new Date();
        const utcHour = now.getUTCHours();
        const localHour = (utcHour + 3) % 24;
        const currentDate = now.toDateString();

        // === ئاگاداری دەستپێکی خامۆشی لە ١٢ شەو ===
        if (localHour === SILENT_START_HOUR && now.getMinutes() === 0) {
            // تەنها یەک جار لە ڕۆژێکدا ئاگاداری بنێرە
            if (lastSilentStartNotification !== currentDate) {
                // پێویستە لیستی گروپەکانت هەبێت یان بەشێوەیەکی تر گروپەکان بدۆزیتەوە
                // لەم نموونەدا، تەنها لە گروپی ئێستا ئاگاداری دەنێرێت
                const chatId = -1001861873095; // IDی گروپەکەت لێرە دابنێ
                
                await sendAutoSilentStartNotification(chatId);
                lastSilentStartNotification = currentDate;
                console.log(`📅 ئاگاداری دەستپێکی خامۆشی نێردرا لە ${now.toLocaleTimeString()}`);
            }
        }

        // === ئاگاداری کۆتایی خامۆشی لە ٧ بەیانی ===
        if (localHour === SILENT_END_HOUR && now.getMinutes() === 0) {
            // تەنها یەک جار لە ڕۆژێکدا ئاگاداری بنێرە
            if (lastSilentEndNotification !== currentDate) {
                const chatId = -1001861873095; // IDی گروپەکەت لێرە دابنێ
                
                await sendAutoSilentEndNotification(chatId);
                lastSilentEndNotification = currentDate;
                console.log(`📅 ئاگاداری کۆتایی خامۆشی نێردرا لە ${now.toLocaleTimeString()}`);
            }
        }

    } catch (error) {
        console.log('❌ هەڵە لە سیستەمی کاتێکی خۆکار:', error.message);
    }
}, 60000); // هەر 1 خولەک جارێک پشکنین بکە

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
    message += `🔗 **کەناڵ:** ${CHANNEL_LINK}`;
    
    await ctx.reply(message, { 
        parse_mode: 'Markdown',
        ...getJoinButton()
    });
});

bot.command('status', async (ctx) => {
    const silentTime = isSilentTime();
    const chatId = ctx.chat.id;
    
    if (silentTime) {
        await ctx.reply(
            `🔕 **دۆخی خامۆشی چالاکە!**\n\n` +
            `⏰ **کات:** ١٢ شەو - ٧ بەیانی\n\n` +
            `📌 **یاساکان:**\n` +
            `• تەنها ئەدمینەکان دەتوانن بنووسن\n` +
            `• نامەکانی ئەندامان خۆکارانە دەسڕێنرێنەوە`,
            { parse_mode: 'Markdown' }
        );
    } else {
        await ctx.reply(
            `🔔 **دۆخی خامۆشی ناچالاکە!**\n\n` +
            `✅ **ئێستا دەتوانیت چات بکەیت!**\n\n` +
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
console.log(`   • ئاگاداری خۆکار بۆ دەستپێکی خامۆشی (کاتژمێر ١٢ شەو)`);
console.log(`   • ئاگاداری خۆکار بۆ کۆتایی خامۆشی (کاتژمێر ٧ بەیانی)`);
console.log(`   • لە کاتی خامۆشیدا نامەکان دەسڕێنرێنەوە و ئاگاداری دەدرێت`);
console.log('================================');

bot.launch()
    .then(() => {
        console.log('✅ بۆت سەرکەوتووانە دەستی پێکرد!');
        console.log('\n📋 **سیستەمی کاتێکی خۆکار چالاکە:**');
        console.log(`• کاتژمێر ${SILENT_START_HOUR}:00: ئاگاداری دەستپێکی خامۆشی`);
        console.log(`• کاتژمێر ${SILENT_END_HOUR}:00: ئاگاداری کۆتایی خامۆشی`);
        console.log(`• ئاگاداریەکان یەک جار لە ڕۆژێکدا نێردرێن`);
    })
    .catch((err) => {
        console.error('❌ هەڵە:', err.message);
    });

// وەستاندنی ڕێک
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
