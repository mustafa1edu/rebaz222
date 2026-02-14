const { Telegraf, Markup } = require('telegraf');
const cron = require('node-cron');
require('dotenv').config();

// === ڕێکخستنەکان لە .envەوە ===
const config = {
    token: process.env.BOT_TOKEN,
    channel: {
        username: process.env.CHANNEL_USERNAME,
        link: process.env.CHANNEL_LINK,
        id: parseInt(process.env.CHANNEL_ID)
    },
    group: {
        username: process.env.GROUP_USERNAME,
        link: process.env.GROUP_LINK,
        id: null // دەدۆزرێتەوە دواتر
    },
    silent: {
        start: parseInt(process.env.SILENT_START),
        end: parseInt(process.env.SILENT_END),
        timezone: parseInt(process.env.TIMEZONE_OFFSET)
    }
};

const bot = new Telegraf(config.token);

// === کش (Cache) بۆ زانیاریەکان ===
const cache = {
    groupId: null,
    admins: new Map(), // chatId => Set(adminIds)
    userMembership: new Map(), // userId => {isMember: boolean, lastCheck: Date}
    silentNotifications: {
        startSent: false,
        endSent: false,
        date: null
    },
    stats: {
        messagesDeleted: 0,
        warningsSent: 0,
        usersJoined: 0,
        startTime: new Date()
    }
};

// === کاتی هەولێر (UTC+3) ===
function getErbilTime() {
    const now = new Date();
    const erbilTime = new Date(now.getTime() + (config.silent.timezone * 60 * 60 * 1000));
    return {
        hour: erbilTime.getUTCHours(),
        minute: erbilTime.getUTCMinutes(),
        second: erbilTime.getUTCSeconds(),
        date: erbilTime.toLocaleDateString('ckb'),
        time: erbilTime.toLocaleTimeString('ckb')
    };
}

// === پشکنینی کاتی خامۆشی ===
function isSilentTime() {
    const { hour } = getErbilTime();
    if (config.silent.start < config.silent.end) {
        return hour >= config.silent.start && hour < config.silent.end;
    } else {
        return hour >= config.silent.start || hour < config.silent.end;
    }
}

// === بەڕێوەبردنی ڕۆژی نوێ ===
function checkNewDay() {
    const today = new Date().toDateString();
    if (cache.silentNotifications.date !== today) {
        cache.silentNotifications = {
            startSent: false,
            endSent: false,
            date: today
        };
        console.log(`📅 ڕۆژی نوێ: ${today} - تۆمارەکان پاککرانەوە`);
        return true;
    }
    return false;
}

// === پشکنینی ئەدمین بە کش ===
async function isAdmin(chatId, userId) {
    const cacheKey = `${chatId}_${userId}`;
    const cached = cache.admins.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < 5 * 60 * 1000) {
        return cached.isAdmin;
    }
    
    try {
        const chatMember = await bot.telegram.getChatMember(chatId, userId);
        const isAdmin = ['administrator', 'creator'].includes(chatMember.status);
        
        cache.admins.set(cacheKey, {
            isAdmin,
            timestamp: Date.now()
        });
        
        return isAdmin;
    } catch (error) {
        console.error('❌ هەڵە لە پشکنینی ئەدمین:', error.message);
        return false;
    }
}

// === پشکنینی جۆینی چەناڵ بە کش ===
async function checkChannelMembership(userId) {
    const cached = cache.userMembership.get(userId);
    
    if (cached && (Date.now() - cached.lastCheck) < 10 * 60 * 1000) {
        return cached.isMember;
    }
    
    try {
        const chatMember = await bot.telegram.getChatMember(config.channel.id, userId);
        const isMember = ['creator', 'administrator', 'member', 'restricted'].includes(chatMember.status);
        
        cache.userMembership.set(userId, {
            isMember,
            lastCheck: Date.now()
        });
        
        return isMember;
    } catch (error) {
        return false;
    }
}

// === دوگمەکان ===
const getJoinButton = () => Markup.inlineKeyboard([
    [Markup.button.url('📢 جۆینی چەناڵ', config.channel.link)],
    [Markup.button.url('👥 جۆینی گروپ', config.group.link)]
]);

const getAdminButtons = (userId) => Markup.inlineKeyboard([
    [Markup.button.callback('📊 ئامار', `stats_${userId}`)],
    [Markup.button.callback('🔄 ڕێست', `reset_${userId}`)],
    [Markup.button.callback('🔍 پشکنین', `check_${userId}`)]
]);

// === پشکنینی پۆستی کەناڵ ===
function isChannelPost(message) {
    if (!message) return false;
    if (message.forward_from_chat?.type === 'channel') return true;
    if (message.forward_from_chat?.username === config.channel.username.replace('@', '')) return true;
    return false;
}

// === پشکنینی لینک ===
function containsLink(text) {
    if (!text) return false;
    const patterns = [
        /https?:\/\/[^\s]+/gi,
        /t\.me\/[^\s]+/gi,
        /@[a-zA-Z0-9_]{5,}/gi,
        /www\.[^\s]+\.[^\s]+/gi,
        /\.[a-z]{2,}(\/|$)/gi,
        /telegram\.me\/[^\s]+/gi,
        /youtu\.be\/[^\s]+/gi,
        /youtube\.com\/[^\s]+/gi,
        /instagram\.com\/[^\s]+/gi,
        /facebook\.com\/[^\s]+/gi,
        /x\.com\/[^\s]+/gi,
        /twitter\.com\/[^\s]+/gi
    ];
    return patterns.some(pattern => pattern.test(text));
}

// === پاککردنی کەش ===
function clearUserCache(userId) {
    cache.userMembership.delete(userId);
    for (let [key, value] of cache.admins) {
        if (key.endsWith(`_${userId}`)) {
            cache.admins.delete(key);
        }
    }
}

// === هەندلەری پەیامەکان ===
bot.on('message', async (ctx) => {
    try {
        // تەنها گروپ
        if (ctx.chat.type !== 'group' && ctx.chat.type !== 'supergroup') {
            return;
        }

        const userId = ctx.from.id;
        const chatId = ctx.chat.id;
        const messageId = ctx.message.message_id;
        const username = ctx.from.first_name || 'ناونەزانراو';
        const text = ctx.message.text || ctx.message.caption || '';
        
        // تۆمارکردنی IDی گروپ
        if (ctx.chat.username?.toLowerCase() === config.group.username.toLowerCase() || 
            ctx.chat.title?.includes('ArabicRebazAsaad')) {
            if (!cache.groupId || cache.groupId !== chatId) {
                cache.groupId = chatId;
                console.log(`🎯 گروپی دیاریکراو دۆزرایەوە!`);
                console.log(`   ناو: ${ctx.chat.title}`);
                console.log(`   ID: ${chatId}`);
                console.log(`   ئەندامان: ${await getMemberCount(chatId)}`);
            }
        }

        // پشکنینی ئەدمین
        const userIsAdmin = await isAdmin(chatId, userId);
        if (userIsAdmin) return;

        // پشکنینی پۆستی کەناڵ
        if (isChannelPost(ctx.message)) return;

        // پشکنینی جۆینی چەناڵ
        const isMember = await checkChannelMembership(userId);
        if (!isMember) {
            await ctx.deleteMessage(messageId).catch(() => {});
            cache.stats.messagesDeleted++;
            
            const warningMsg = await ctx.reply(
                `👤 *${username}*\n\n` +
                `🚫 **نامەکەت سڕدرایەوە!**\n\n` +
                `📌 **هۆکار:** جۆینی چەناڵت نەکردووە\n\n` +
                `✅ **بۆ چاتکردن، تکایە یەکەم جار جۆینی چەناڵ بکە:**`,
                { 
                    parse_mode: 'Markdown',
                    ...getJoinButton()
                }
            );
            
            cache.stats.warningsSent++;
            
            // سڕینەوەی ئاگاداری دوای ٢ خولەک
            setTimeout(async () => {
                try {
                    await ctx.deleteMessage(warningMsg.message_id);
                } catch (e) {}
            }, 120000);
            
            return;
        }

        // پشکنینی لینک
        if (containsLink(text)) {
            await ctx.deleteMessage(messageId).catch(() => {});
            cache.stats.messagesDeleted++;
            
            await ctx.reply(
                `🚫 *${username}*\n\n` +
                `لینکەکەت سڕدرایەوە!\n\n` +
                `📌 **هۆکار:** تەنها ئەدمینەکان دەتوانن لینک بنێرن`,
                { parse_mode: 'Markdown' }
            ).catch(() => {});
            
            return;
        }

        // پشکنینی دۆخی خامۆشی
        if (isSilentTime()) {
            await ctx.deleteMessage(messageId).catch(() => {});
            cache.stats.messagesDeleted++;
            console.log(`🕒 دۆخی خامۆشی: نامەی ${username} سڕدرایەوە (بێ ئاگاداری)`);
            return;
        }

    } catch (error) {
        console.error('❌ هەڵە:', error);
    }
});

// === پێشوازی لە نوێیەکان ===
bot.on('new_chat_members', async (ctx) => {
    try {
        const members = ctx.message.new_chat_members;
        const botInfo = await ctx.telegram.getMe();
        const chatId = ctx.chat.id;
        
        for (const member of members) {
            cache.stats.usersJoined++;
            
            if (member.id === botInfo.id) {
                // بۆت زیادکرا
                const { hour } = getErbilTime();
                const silentStatus = isSilentTime() ? '🔕 چالاک' : '🔔 ناچالاک';
                
                await ctx.reply(
                    '🤖 **بۆتی چاودێری گروپ چالاک کرا!**\n\n' +
                    '📋 **یاساکان:**\n\n' +
                    '1️⃣ **پێویستە جۆینی چەناڵ بکەیت** بۆ چاتکردن\n' +
                    '2️⃣ **لینک = سڕینەوە** (تەنها ئەدمینەکان)\n' +
                    '3️⃣ **دۆخی خامۆشی:** ١٢ شەو - ٧ بەیانی\n\n' +
                    `⏰ **کاتی ئێستا:** ${hour}:00\n` +
                    `🔕 **دۆخی خامۆشی:** ${silentStatus}\n\n` +
                    `🔗 **چەناڵ:** ${config.channel.link}\n` +
                    `👥 **گروپ:** ${config.group.link}`,
                    { 
                        parse_mode: 'Markdown',
                        ...getJoinButton()
                    }
                );
            } else {
                // ئەندامی نوێ
                const isMember = await checkChannelMembership(member.id);
                if (!isMember) {
                    setTimeout(async () => {
                        try {
                            await ctx.reply(
                                `👋 *بەخێربێیت ${member.first_name || 'هاوڕێ'}!*\n\n` +
                                `⚠️ **تێبینی:** بۆ چاتکردن پێویستە جۆینی چەناڵ بکەیت!`,
                                { 
                                    parse_mode: 'Markdown',
                                    ...getJoinButton()
                                }
                            );
                        } catch (e) {}
                    }, 5000);
                }
            }
        }
    } catch (error) {
        console.error('❌ هەڵە لە پێشوازی:', error);
    }
});

// === callback query (کلیک لەسەر دوگمەکان) ===
bot.on('callback_query', async (ctx) => {
    try {
        const data = ctx.callbackQuery.data;
        const userId = ctx.callbackQuery.from.id;
        
        if (data.startsWith('stats_')) {
            const targetUserId = parseInt(data.split('_')[1]);
            if (userId === targetUserId) {
                const stats = cache.stats;
                const uptime = Math.floor((Date.now() - stats.startTime) / 1000 / 60);
                
                await ctx.answerCbQuery();
                await ctx.reply(
                    `📊 **ئامارەکانی بۆت:**\n\n` +
                    `• 🗑 سڕدراوی نامە: ${stats.messagesDeleted}\n` +
                    `• ⚠️ ئاگاداری: ${stats.warningsSent}\n` +
                    `• 👥 بەکارهێنەری نوێ: ${stats.usersJoined}\n` +
                    `• ⏱ کاتی کارکردن: ${uptime} خولەک\n` +
                    `• 🎯 گروپ: ${cache.groupId ? '✅' : '❌'}\n` +
                    `• 🔕 کاتی خامۆشی: ${isSilentTime() ? 'چالاک' : 'ناچالاک'}`,
                    { parse_mode: 'Markdown' }
                );
            }
        }
        
        await ctx.answerCbQuery();
    } catch (error) {
        console.error('❌ callback query error:', error);
    }
});

// === فەرمانەکان ===
bot.start(async (ctx) => {
    const username = ctx.from.first_name || 'هاوڕێ';
    const { hour, time } = getErbilTime();
    const silentTime = isSilentTime();
    
    let message = `👋 *بەخێربێیت ${username}!*\n\n`;
    message += `🕒 **کاتی هەولێر:** ${time}\n\n`;
    
    if (silentTime) {
        message += `🔕 **دۆخی خامۆشی چالاکە!**\n`;
        message += `⏰ **کاتی خامۆشی:** ١٢ شەو - ٧ بەیانی\n\n`;
        message += `⚠️ **ئاگاداری:** لەم کاتەدا تەنها ئەدمینەکان دەتوانن بنووسن\n\n`;
    } else {
        message += `🔔 **کاتی ئاسایی چاتکردن**\n\n`;
    }
    
    message += `📋 **ڕێساکان:**\n`;
    message += `1️⃣ جۆینی چەناڵ پێویستە بۆ چاتکردن\n`;
    message += `2️⃣ ناردنی لینک قەدەغەیە (تەنها ئەدمین)\n`;
    message += `3️⃣ ڕێز لە ئەندامان بگرە\n\n`;
    
    message += `🔗 **چەناڵ:** ${config.channel.link}\n`;
    message += `👥 **گروپ:** ${config.group.link}`;
    
    await ctx.reply(message, { 
        parse_mode: 'Markdown',
        ...getJoinButton()
    });
});

bot.command('help', async (ctx) => {
    await ctx.reply(
        '📚 *فەرمانەکان:*\n\n' +
        '/start - دەستپێک\n' +
        '/help - یارمەتی\n' +
        '/status - دۆخی ئێستا\n' +
        '/rules - ڕێساکان\n' +
        '/stats - ئامارەکان\n' +
        '/time - کاتی هەولێر\n' +
        '/group - زانیاری گروپ\n' +
        '/admins - پێڕستی ئەدمینان\n' +
        '/test_silent - تاقیکردنەوەی خامۆشی\n' +
        '/clear_cache - پاککردنی کش (تەنها ئەدمین)',
        { parse_mode: 'Markdown' }
    );
});

bot.command('status', async (ctx) => {
    const silentTime = isSilentTime();
    const { hour, time } = getErbilTime();
    const memberCount = ctx.chat.type !== 'private' ? await getMemberCount(ctx.chat.id) : 'ناپێویست';
    
    await ctx.reply(
        `📊 *دۆخی ئێستا:*\n\n` +
        `🕒 **کات:** ${time}\n` +
        `🔕 **خامۆشی:** ${silentTime ? '✅ چالاک' : '❌ ناچالاک'}\n` +
        `👥 **ئەندامان:** ${memberCount}\n` +
        `🎯 **گروپ:** ${cache.groupId ? '✅' : '❌'}`,
        { parse_mode: 'Markdown' }
    );
});

bot.command('stats', async (ctx) => {
    if (await isAdmin(ctx.chat.id, ctx.from.id)) {
        const stats = cache.stats;
        const uptime = Math.floor((Date.now() - stats.startTime) / 1000 / 60);
        
        await ctx.reply(
            `📊 *ئامارەکان:*\n\n` +
            `• 🗑 سڕدراوی نامە: ${stats.messagesDeleted}\n` +
            `• ⚠️ ئاگاداری: ${stats.warningsSent}\n` +
            `• 👥 بەکارهێنەری نوێ: ${stats.usersJoined}\n` +
            `• ⏱ کاتی کارکردن: ${uptime} خولەک\n` +
            `• 📦 قەبارەی کش: ${cache.userMembership.size}`,
            { parse_mode: 'Markdown' }
        );
    } else {
        await ctx.reply('❌ تەنها ئەدمینەکان دەتوانن ئامار ببینن');
    }
});

bot.command('time', async (ctx) => {
    const { hour, minute, second, time } = getErbilTime();
    
    await ctx.reply(
        `🕒 *کاتی هەولێر:*\n\n` +
        `• **کات:** ${time}\n` +
        `• **کاتژمێر:** ${hour}:${minute < 10 ? '0' + minute : minute}:${second < 10 ? '0' + second : second}\n` +
        `• **خامۆشی:** ${config.silent.start}:00 - ${config.silent.end}:00\n` +
        `• **دۆخ:** ${isSilentTime() ? '🔕 چالاک' : '🔔 ناچالاک'}`,
        { parse_mode: 'Markdown' }
    );
});

bot.command('group', async (ctx) => {
    if (ctx.chat.type !== 'private') {
        const isTarget = ctx.chat.id === cache.groupId || 
                        ctx.chat.username?.toLowerCase() === config.group.username.toLowerCase();
        
        await ctx.reply(
            `👥 *زانیاری گروپ:*\n\n` +
            `• **ناو:** ${ctx.chat.title}\n` +
            `• **ID:** ${ctx.chat.id}\n` +
            `• **Username:** @${ctx.chat.username || 'نییە'}\n` +
            `• **جۆر:** ${ctx.chat.type}\n` +
            `• **دیاریکراو:** ${isTarget ? '✅' : '❌'}`,
            { parse_mode: 'Markdown' }
        );
    }
});

bot.command('admins', async (ctx) => {
    if (ctx.chat.type !== 'private') {
        try {
            const admins = await ctx.getChatAdministrators();
            let adminList = '';
            
            admins.forEach((admin, index) => {
                adminList += `${index + 1}. ${admin.user.first_name}`;
                if (admin.user.username) adminList += ` (@${admin.user.username})`;
                if (admin.status === 'creator') adminList += ' 👑';
                adminList += '\n';
            });
            
            await ctx.reply(
                `👑 *ئەدمینەکان (${admins.length}):*\n\n${adminList}`,
                { parse_mode: 'Markdown' }
            );
        } catch (error) {
            await ctx.reply('❌ ناتوانرێت ئەدمینەکان ببینرێت');
        }
    }
});

bot.command('rules', async (ctx) => {
    await ctx.reply(
        '📋 *ڕێساکانی گروپ:*\n\n' +
        '1️⃣ **جۆینی چەناڵ:**\n' +
        '   • پێویستە جۆینی چەناڵ بکەیت بۆ چاتکردن\n' +
        '   • ئەگەر جۆین نەکەیت، نامەکان دەسڕێنرێنەوە\n\n' +
        '2️⃣ **لینک:**\n' +
        '   • تەنها ئەدمینەکان دەتوانن لینک بنێرن\n' +
        '   • لینکی ئەندامان دەسڕێنرێتەوە\n\n' +
        '3️⃣ **کاتی خامۆشی:**\n' +
        '   • ١٢ شەو تا ٧ بەیانی\n' +
        '   • تەنها ئەدمینەکان دەتوانن بنووسن\n' +
        '   • نامەکانی ئەندامان بەبێ ئاگاداری دەسڕێنرێنەوە\n\n' +
        `🔗 **چەناڵ:** ${config.channel.link}`,
        { parse_mode: 'Markdown' }
    );
});

bot.command('test_silent', async (ctx) => {
    if (await isAdmin(ctx.chat.id, ctx.from.id)) {
        const silent = isSilentTime();
        await ctx.reply(
            `🧪 *تاقیکردنەوە:*\n\n` +
            `• **کاتی ئێستا:** ${getErbilTime().time}\n` +
            `• **دۆخی خامۆشی:** ${silent ? '🔕 چالاک' : '🔔 ناچالاک'}\n` +
            `• **کاتی خامۆشی:** ${config.silent.start}:00 - ${config.silent.end}:00\n` +
            `• **ئێستا:** ${silent ? 'دەبێت نامەکان بسڕێنرێنەوە' : 'دەبێت چات کردن ئاسایی بێت'}`,
            { parse_mode: 'Markdown' }
        );
    }
});

bot.command('clear_cache', async (ctx) => {
    if (await isAdmin(ctx.chat.id, ctx.from.id)) {
        const oldSize = cache.userMembership.size;
        cache.userMembership.clear();
        cache.admins.clear();
        
        await ctx.reply(
            `🧹 *کش پاککرایەوە*\n\n` +
            `• **پاککراو:** ${oldSize} بەکارهێنەر`,
            { parse_mode: 'Markdown' }
        );
    }
});

// === یارمەتیدەرەکان ===
async function getMemberCount(chatId) {
    try {
        const chat = await bot.telegram.getChat(chatId);
        return chat.member_count || 'نەزانراو';
    } catch {
        return 'نەزانراو';
    }
}

async function sendSilentStartNotification() {
    try {
        checkNewDay();
        
        if (!cache.groupId) {
            console.log('⏳ چاوەڕوانی IDی گروپ...');
            return false;
        }
        
        if (!cache.silentNotifications.startSent) {
            const { time } = getErbilTime();
            
            await bot.telegram.sendMessage(
                cache.groupId,
                `🔕 *دۆخی خامۆشی دەستی پێکرد!*\n\n` +
                `⏰ **کات:** ١٢:٠٠ شەو\n` +
                `🕒 **کاتی هەولێر:** ${time}\n\n` +
                `⚠️ **تێبینی:**\n` +
                `• تا کاتژمێر ٧:٠٠ بەیانی، تەنها ئەدمینەکان دەتوانن بنووسن\n` +
                `• نامەکانی ئەندامان خۆکارانە دەسڕێنرێنەوە\n` +
                `• بەخێر بن، شەوێکی باش! 🌙`,
                { parse_mode: 'Markdown' }
            );
            
            cache.silentNotifications.startSent = true;
            console.log(`🔕 ئاگاداری دەستپێکی خامۆشی نێردرا`);
            return true;
        }
    } catch (error) {
        console.error('❌ هەڵە:', error);
        return false;
    }
}

async function sendSilentEndNotification() {
    try {
        checkNewDay();
        
        if (!cache.groupId) {
            console.log('⏳ چاوەڕوانی IDی گروپ...');
            return false;
        }
        
        if (!cache.silentNotifications.endSent) {
            const { time } = getErbilTime();
            
            await bot.telegram.sendMessage(
                cache.groupId,
                `🔔 *دۆخی خامۆشی کۆتایی هات!*\n\n` +
                `⏰ **کات:** ٧:٠٠ بەیانی\n` +
                `🕒 **کاتی هەولێر:** ${time}\n\n` +
                `✅ **ئێستا هەمووان دەتوانن چات بکەن!**\n\n` +
                `🌅 بەیانی باش و ڕۆژێکی خۆش!`,
                { parse_mode: 'Markdown' }
            );
            
            cache.silentNotifications.endSent = true;
            console.log(`🔔 ئاگاداری کۆتایی خامۆشی نێردرا`);
            return true;
        }
    } catch (error) {
        console.error('❌ هەڵە:', error);
        return false;
    }
}

// === کارە خۆکارەکان بە cron ===
// پشکنینی دەستپێکی خامۆشی (کاتژمێر 12:00 شەو)
cron.schedule('0 0 * * *', async () => {
    console.log('⏰ پشکنینی دەستپێکی خامۆشی...');
    await sendSilentStartNotification();
}, {
    timezone: "Asia/Baghdad"
});

// پشکنینی کۆتایی خامۆشی (کاتژمێر 7:00 بەیانی)
cron.schedule('0 7 * * *', async () => {
    console.log('⏰ پشکنینی کۆتایی خامۆشی...');
    await sendSilentEndNotification();
}, {
    timezone: "Asia/Baghdad"
});

// پاکردنەوەی کش (هەر 6 کاتژمێر جارێک)
cron.schedule('0 */6 * * *', () => {
    const oldSize = cache.userMembership.size;
    cache.userMembership.clear();
    cache.admins.clear();
    console.log(`🧹 کش پاککرایەوە (${oldSize} بەکارهێنەر)`);
}, {
    timezone: "Asia/Baghdad"
});

// تۆمارکردنی ئامار (هەر کاتژمێر جارێک)
cron.schedule('0 * * * *', () => {
    const stats = cache.stats;
    console.log(`📊 ئامار: ${stats.messagesDeleted} سڕدراوە, ${stats.warningsSent} ئاگاداری, ${stats.usersJoined} نوێ`);
}, {
    timezone: "Asia/Baghdad"
});

// === دەستپێکردن ===
console.log('='.repeat(40));
console.log('🚀 بۆتی پێشکەوتوو دەستی پێدەکات...');
console.log('='.repeat(40));
console.log(`🔗 چەناڵ: ${config.channel.link}`);
console.log(`👥 گروپ: ${config.group.link}`);
console.log(`🔕 خامۆشی: ${config.silent.start}:00 - ${config.silent.end}:00`);
console.log(`🕒 کاتی هەولێر: ${getErbilTime().time}`);
console.log(`🔕 دۆخی ئێستا: ${isSilentTime() ? 'چالاک' : 'ناچالاک'}`);
console.log('='.repeat(40));

bot.launch()
    .then(() => {
        console.log('✅ بۆت سەرکەوتووانە دەستی پێکرد!');
        console.log('📋 فەرمانی /help بەکاربهێنە بۆ بینینی یارمەتی');
    })
    .catch((err) => {
        console.error('❌ هەڵە:', err.message);
        process.exit(1);
    });

process.once('SIGINT', () => {
    console.log('👋 بۆت وەستا (SIGINT)');
    bot.stop('SIGINT');
});

process.once('SIGTERM', () => {
    console.log('👋 بۆت وەستا (SIGTERM)');
    bot.stop('SIGTERM');
});
