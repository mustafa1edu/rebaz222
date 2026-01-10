const { Telegraf, Markup } = require('telegraf');

const bot = new Telegraf('8544992144:AAG2fBwQBc7cyHOU6u7gkbzlODA3LtC-qaU');

// === ڕێکخستنەکان ===
const CHANNEL_USERNAME = '@RebazAsaadku';
const CHANNEL_LINK = 'https://t.me/RebazAsaadku';
const CHANNEL_ID = -1001861873095;
const SILENT_START_HOUR = 0;   // 12 شەو
const SILENT_END_HOUR = 7;     // 7 بەیانی

// === حاڵەتی جۆینی بەکارهێنەران ===
const userJoinCache = new Map();
const silentModeNotifiedUsers = new Set(); // بۆ ڕێگری لە ئاگاداری دووبارە

// === پشکنینی کاتی خامۆشی ===
function isSilentTime() {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const localHour = (utcHour + 3) % 24;
    return localHour >= SILENT_START_HOUR && localHour < SILENT_END_HOUR;
}

// === ئاگاداری خۆکارانە بۆ دەستپێکی خامۆشی ===
async function sendSilentStartNotification(chatId) {
    try {
        const notification = await bot.telegram.sendMessage(
            chatId,
            `🔕 *دۆخی خامۆشی دەستی پێکرد!*\n\n` +
            `⏰ **کاتی خامۆشی:** ١٢ شەو تا ٧ بەیانی\n\n` +
            `📌 **یاساکان:**\n` +
            `• تەنها ئەدمینەکان دەتوانن بنووسن\n` +
            `• نامەکانی ئەندامان خۆکارانە دەسڕێنرێنەوە\n` +
            `• چاتکردن دووبارە لە کاتژمێر ٧ بەیانی دەکرێتەوە\n\n` +
            `⚠️ تکایە لەم کاتەدا نامە مەنێرە!`,
            { parse_mode: 'Markdown' }
        );
        
        // سڕینەوەی ئاگاداریەکە دوای 5 خولەک
        setTimeout(async () => {
            try {
                await bot.telegram.deleteMessage(chatId, notification.message_id);
            } catch (e) {
                console.log('❌ هەڵە لە سڕینەوەی ئاگاداری:', e.message);
            }
        }, 300000);
        
    } catch (error) {
        console.log('❌ هەڵە لە ناردنی ئاگاداری:', error.message);
    }
}

// === ئاگاداری خۆکارانە بۆ کۆتایی خامۆشی ===
async function sendSilentEndNotification(chatId) {
    try {
        const notification = await bot.telegram.sendMessage(
            chatId,
            `🔔 *دۆخی خامۆشی کۆتایی هات!*\n\n` +
            `⏰ **کاتی خامۆشی تەواو بوو**\n\n` +
            `✅ **ئێستا دەتوانیت چات بکەیت!**\n\n` +
            `📌 **تێبینی:**\n` +
            `• هەموو یاساکانی گروپ جێبەجێ دەبن\n` +
            `• پێویستە جۆینی چەناڵی کردبیت\n` +
            `• لینکەکان تەنها بۆ ئەدمینەکان\n\n` +
            `🎉 چاتەکان دەتوانن بەردەوام بن!`,
            { parse_mode: 'Markdown' }
        );
        
        // سڕینەوەی ئاگاداریەکە دوای 5 خولەک
        setTimeout(async () => {
            try {
                await bot.telegram.deleteMessage(chatId, notification.message_id);
            } catch (e) {
                console.log('❌ هەڵە لە سڕینەوەی ئاگاداری:', e.message);
            }
        }, 300000);
        
    } catch (error) {
        console.log('❌ هەڵە لە ناردنی ئاگاداری:', error.message);
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
    const currentHour = new Date().getHours();
    
    // === ئاگاداری خۆکارانە بۆ دەستپێکی خامۆشی ===
    if (currentHour === SILENT_START_HOUR && !silentModeNotifiedUsers.has(chatId)) {
        silentModeNotifiedUsers.add(chatId);
        await sendSilentStartNotification(chatId);
        
        // دوای 24 کاتژمێر پاکردنەوە
        setTimeout(() => {
            silentModeNotifiedUsers.delete(chatId);
        }, 24 * 60 * 60 * 1000);
    }
    
    // === ئاگاداری خۆکارانە بۆ کۆتایی خامۆشی ===
    if (currentHour === SILENT_END_HOUR && silentModeNotifiedUsers.has(chatId + '_end')) {
        silentModeNotifiedUsers.delete(chatId + '_end');
        await sendSilentEndNotification(chatId);
    }
    
    try {
        // === پشکنینی ئەدمین ===
        const userIsAdmin = await isAdmin(chatId, userId);
        if (userIsAdmin) {
            // ئەگەر ئەدمینە و کاتی خامۆشیە، ئاگاداریەکی تایبەت بنێرە
            if (silentTime) {
                const adminNotification = await ctx.reply(
                    `👑 *ئەدمین ${username}*\n\n` +
                    `🔕 **کاتی خامۆشی جێبەجێ دەکرێت** (١٢ شەو - ٧ بەیانی)\n\n` +
                    `⚠️ تەنها ئەدمینەکان دەتوانن لەم کاتەدا بنووسن.\n` +
                    `نامەکانی ئەندامان خۆکارانە دەسڕێنرێنەوە.`,
                    { parse_mode: 'Markdown' }
                );
                
                // سڕینەوەی ئاگاداریەکە دوای 30 چرکە
                setTimeout(async () => {
                    try {
                        await ctx.deleteMessage(adminNotification.message_id);
                    } catch (e) {}
                }, 30000);
            }
            return;
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
            console.log(`🕒 دۆخی خامۆشی: نامەی ${username} سڕدرایەوە`);
            
            // سڕینەوەی نامەکە
            await ctx.deleteMessage(messageId).catch(() => {});
            
            // ئاگاداری بۆ بەکارهێنەر
            const silentWarning = await ctx.reply(
                `🔕 *${username}*\n\n` +
                `**نامەکەت سڕدرایەوە لەبەر دۆخی خامۆشی!**\n\n` +
                `⏰ **کاتی خامۆشی:** ١٢ شەو - ٧ بەیانی\n\n` +
                `📌 **یاساکان:**\n` +
                `• تەنها ئەدمینەکان دەتوانن بنووسن\n` +
                `• چاتکردن لە کاتژمێر ٧ بەیانی دەکرێتەوە\n\n` +
                `⚠️ تکایە لەم کاتەدا نامە مەنێرە!`,
                { parse_mode: 'Markdown' }
            ).catch(() => {});
            
            // سڕینەوەی ئاگاداریەکە دوای 1 خولەک
            if (silentWarning) {
                setTimeout(async () => {
                    try {
                        await ctx.deleteMessage(silentWarning.message_id);
                    } catch (e) {}
                }, 60000);
            }
            
            // بۆ کۆتایی خامۆشی تۆمار بکە
            silentModeNotifiedUsers.add(chatId + '_end');
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
                    '⚠️ **تێبینی:** لە کاتی خامۆشیدا نامەکانی ئەندامان خۆکارانە دەسڕێنرێنەوە!',
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
        message += `⚠️ **تێبینیەکان:**\n`;
        message += `• تەنها ئەدمینەکان دەتوانن بنووسن\n`;
        message += `• نامەکانی ئەندامان دەسڕێنرێنەوە\n`;
        message += `• چاتکردن لە کاتژمێر ٧ بەیانی دەکرێتەوە\n\n`;
    }
    
    message += `📋 **یاسای گروپ:**\n`;
    message += `1. پێویستە جۆینی چەناڵ بکەیت\n`;
    message += `2. لینکەکان تەنها بۆ ئەدمینەکان\n`;
    message += `3. ڕێز لە هاوڕێکانت بگرە\n\n`;
    message += `🔗 **کەناڵ:** ${CHANNEL_LINK}`;
    
    await ctx.reply(message, { 
        parse_mode: 'Markdown',
        ...(silentTime ? {} : getJoinButton())
    });
});

bot.command('silent', async (ctx) => {
    const chatId = ctx.chat.id;
    const userIsAdmin = await isAdmin(chatId, ctx.from.id);
    
    if (!userIsAdmin) {
        return ctx.reply('🚫 تەنها ئەدمینەکان!').catch(() => {});
    }
    
    const silentTime = isSilentTime();
    
    if (silentTime) {
        await ctx.reply(
            `🔕 **دۆخی خامۆشی چالاکە!**\n\n` +
            `⏰ **کات:** ١٢ شەو - ٧ بەیانی\n\n` +
            `📌 **یاساکان:**\n` +
            `• تەنها ئەدمینەکان دەتوانن بنووسن\n` +
            `• نامەکانی ئەندامان خۆکارانە دەسڕێنرێنەوە\n` +
            `• چاتکردن دووبارە لە کاتژمێر ٧ دەکرێتەوە`,
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

// === کۆدی خۆکارانە بۆ چێککردنی کات ===
setInterval(() => {
    const now = new Date();
    const hour = now.getHours();
    
    // چێککردنی ئەگەر کاتی ئاگاداری دەستپێکی خامۆشی بێت
    if (hour === SILENT_START_HOUR) {
        console.log('🕒 چێککردنی کاتی خامۆشی...');
    }
    
    // چێککردنی ئەگەر کاتی ئاگاداری کۆتایی خامۆشی بێت
    if (hour === SILENT_END_HOUR) {
        console.log('🔔 چێککردنی کۆتایی خامۆشی...');
    }
}, 600000); // هەر 10 خولەک جارێک

// === دەستپێکردن ===
console.log('🚀 بۆت دەستی پێدەکات...');
console.log('================================');
console.log(`🔗 کەناڵ: ${CHANNEL_LINK}`);
console.log(`🆔 ID ی چەناڵ: ${CHANNEL_ID}`);
console.log(`🔕 دۆخی خامۆشی: ${SILENT_START_HOUR}:00 - ${SILENT_END_HOUR}:00`);
console.log(`📌 تایبەتمەندیەکان:`);
console.log(`   • ئاگاداری خۆکارانە بۆ دەستپێکی خامۆشی`);
console.log(`   • سڕینەوەی نامەکانی ئەندامان لە کاتی خامۆشیدا`);
console.log(`   • ئاگاداری خۆکارانە بۆ کۆتایی خامۆشی`);
console.log(`   • دووبارەکردنەوەی چات لە کاتژمێر ${SILENT_END_HOUR}`);
console.log('================================');

bot.launch()
    .then(() => {
        console.log('✅ بۆت سەرکەوتووانە دەستی پێکرد!');
        console.log('\n📋 **ڕێنمایی:**');
        console.log(`• لە کاتی خامۆشیدا (${SILENT_START_HOUR}:00 - ${SILENT_END_HOUR}:00):`);
        console.log('  - ئاگاداری خۆکارانە دەنێردرێت');
        console.log('  - نامەکانی ئەندامان دەسڕێنرێنەوە');
        console.log('  - تەنها ئەدمینەکان دەتوانن بنووسن');
        console.log(`• لە کاتژمێر ${SILENT_END_HOUR}:00:`);
        console.log('  - ئاگاداری کۆتایی خامۆشی دەنێردرێت');
        console.log('  - چاتکردن دووبارە دەکرێتەوە');
    })
    .catch((err) => {
        console.error('❌ هەڵە:', err.message);
    });

// وەستاندنی ڕێک
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
