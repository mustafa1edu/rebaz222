const { Telegraf } = require('telegraf');
const fs = require('fs');

const bot = new Telegraf('8544992144:AAG2fBwQBc7cyHOU6u7gkbzlODA3LtC-qaU');

// === ڕێکخستنەکان ===
const CHANNEL_USERNAME = '@RebazAsaadku';
const CHANNEL_LINK = 'https://t.me/RebazAsaadku';
const SILENT_START_HOUR = 0;   // 12 شەو
const SILENT_END_HOUR = 7;     // 7 بەیانی
const BAN_DURATION = 24 * 60 * 60; // ٢٤ کاتژمێر

// === فایل بۆ پاشەکەوت کردنی داتا ===
const DATA_FILE = 'verified_users.json';

// === بارکردنی داتا ===
let verifiedUsers = {};
try {
    if (fs.existsSync(DATA_FILE)) {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        verifiedUsers = JSON.parse(data);
        console.log(`✅ داتا بارکرا: ${Object.keys(verifiedUsers).length} بەکارهێنەر`);
    }
} catch (error) {
    console.log('❌ هەڵە لە بارکردنی داتا:', error.message);
    verifiedUsers = {};
}

// === پاشەکەوتکردنی داتا ===
function saveData() {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(verifiedUsers, null, 2));
        console.log(`💾 داتا پاشەکەوتکرا: ${Object.keys(verifiedUsers).length} بەکارهێنەر`);
    } catch (error) {
        console.log('❌ هەڵە لە پاشەکەوتکردنی داتا:', error.message);
    }
}

// === پشکنینی کاتی خامۆشی ===
function isSilentTime() {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const localHour = (utcHour + 3) % 24;
    return localHour >= SILENT_START_HOUR && localHour < SILENT_END_HOUR;
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

// === سیستەمی جۆینی ناچاری ===

// کۆدی سادە بۆ چەکی کردن
const joinCodes = new Map(); // کۆد -> userId

// فەرمانی دروستکردنی کۆد
bot.command('joincode', async (ctx) => {
    const userId = ctx.from.id;
    const username = ctx.from.first_name || 'هاوڕێ';
    
    // تەنها لە چاتی تایبەت
    if (ctx.chat.type !== 'private') {
        await ctx.reply(
            `📝 ${username}! تکایە لە چاتی تایبەت بەکاربهێنە.\n` +
            `بۆ وەرگرتنی کۆد، لە چاتی تایبەت لەگەڵ بۆتدا:\n` +
            `/joincode`
        );
        return;
    }
    
    // دروستکردنی کۆدی ٦ ژمارەیی
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    joinCodes.set(code, {
        userId: userId,
        username: username,
        created: Date.now(),
        used: false
    });
    
    await ctx.reply(
        `🔐 *کۆدی چەکی کردن بۆ ${username}*\n\n` +
        `📋 **ڕێنمایی:**\n\n` +
        `1. **سەردانی کەناڵەکە بکە:**\n` +
        `${CHANNEL_LINK}\n\n` +
        `2. **جۆینی چەناڵ بکە** (کلیک لەسەر Join)\n\n` +
        `3. **دوای جۆینی کردن، لە چاتی تایبەت لەگەڵ بۆتدا ئەم کۆدە بنووسە:**\n` +
        `\`${code}\`\n\n` +
        `⚠️ **تێبینیەکان:**\n` +
        `• کۆدەکە تەنها ١٠ خولەک کاردەکات\n` +
        `• کۆدەکە تەنها بۆ تۆیە\n` +
        `• دوای چەکی کردن دەتوانیت لە گروپەکەدا چات بکەیت`,
        { parse_mode: 'Markdown' }
    );
    
    // سڕینەوەی کۆد دوای ١٠ خولەک
    setTimeout(() => {
        if (joinCodes.has(code) && !joinCodes.get(code).used) {
            joinCodes.delete(code);
            console.log(`🗑️ کۆدی ${code} سڕدرایەوە (کاتی تەواو بوو)`);
        }
    }, 10 * 60 * 1000); // 10 خولەک
});

// چاودێری کۆدەکان
bot.on('text', async (ctx) => {
    // تەنها لە چاتی تایبەت
    if (ctx.chat.type !== 'private') return;
    
    const text = ctx.message.text.trim();
    const userId = ctx.from.id;
    const username = ctx.from.first_name || 'هاوڕێ';
    
    // پشکنین ئەگەر کۆدێکە
    if (/^\d{6}$/.test(text)) {
        const code = text;
        
        if (joinCodes.has(code)) {
            const codeData = joinCodes.get(code);
            
            // پشکنین ئەگەر کۆدەکە بۆ ئەم بەکارهێنەرە نییە
            if (codeData.userId !== userId) {
                await ctx.reply(
                    `❌ *کۆدەکە تەنها بۆ ${codeData.username} کاردەکات!*\n\n` +
                    `تکایە خۆت کۆدێکی نوێ وەربگرە:\n` +
                    `/joincode`
                );
                return;
            }
            
            // پشکنین ئەگەر بەکارهێنرابێت
            if (codeData.used) {
                await ctx.reply(
                    `❌ *کۆدەکە پێشتر بەکارهێنراوە!*\n\n` +
                    `تکایە کۆدێکی نوێ وەربگرە:\n` +
                    `/joincode`
                );
                return;
            }
            
            // چەکی کردن
            codeData.used = true;
            verifiedUsers[userId] = {
                username: username,
                verifiedAt: Date.now(),
                verifiedDate: new Date().toLocaleString('en-IR')
            };
            
            // پاشەکەوتکردنی داتا
            saveData();
            
            await ctx.reply(
                `✅ *سوپاس ${username}!*\n\n` +
                `چەکی کردن سەرکەوتوو بوو!\n\n` +
                `🎉 **ئێستا دەتوانیت لە گروپەکەدا چات بکەیت!**\n\n` +
                `📝 **زانیاری:**\n` +
                `• ناسنامە: ${userId}\n` +
                `• کات: ${new Date().toLocaleTimeString('en-IR')}\n` +
                `• ڕێگا: کۆدی چەکی کردن\n\n` +
                `🔗 کەناڵ: ${CHANNEL_LINK}\n\n` +
                `💬 ئێستا بچۆرە ناو گروپەوە و نامەیەک بنێرە.`,
                { parse_mode: 'Markdown' }
            );
            
            console.log(`✅ ${username} (${userId}) چەکی کرد بە کۆدی ${code}`);
        } else {
            await ctx.reply(
                `❌ *کۆدەکە نادروستە یان کاتی تەواو بووە!*\n\n` +
                `تکایە کۆدێکی نوێ وەربگرە:\n` +
                `/joincode`
            );
        }
    }
});

// فەرمانی چەکی کردنی ڕاستەوخۆ (بۆ ئەدمینەکان)
bot.command('verifyuser', async (ctx) => {
    const adminId = ctx.from.id;
    const chatId = ctx.chat.id;
    
    // تەنها ئەدمینەکان
    const userIsAdmin = await isAdmin(chatId, adminId);
    if (!userIsAdmin) {
        return ctx.reply('🚫 تەنها ئەدمینەکان!').catch(() => {});
    }
    
    // ئەگەر لەسەر نامەیەکە
    if (ctx.message.reply_to_message) {
        const userId = ctx.message.reply_to_message.from.id;
        const username = ctx.message.reply_to_message.from.first_name || 'ناونەزانراو';
        
        verifiedUsers[userId] = {
            username: username,
            verifiedAt: Date.now(),
            verifiedDate: new Date().toLocaleString('en-IR'),
            verifiedBy: adminId
        };
        
        saveData();
        
        await ctx.reply(
            `✅ *${username} چەکی کرد!*\n\n` +
            `ئێستا دەتوانێت لە گروپەکەدا چات بکات.\n\n` +
            `📊 **زانیاری:**\n` +
            `• ناسنامە: ${userId}\n` +
            `• کات: ${new Date().toLocaleTimeString('en-IR')}\n` +
            `• چەکی کردنی لەلایەن: ئەدمین\n\n` +
            `🔗 کەناڵ: ${CHANNEL_LINK}`,
            { parse_mode: 'Markdown' }
        );
        
        // ئاگاداری بۆ بەکارهێنەر
        try {
            await bot.telegram.sendMessage(
                userId,
                `🎉 *سڵاو ${username}!*\n\n` +
                `ئەدمینەکان چەکی کردنت کردووە!\n\n` +
                `✅ **ئێستا دەتوانیت لە گروپەکەدا چات بکەیت!**\n\n` +
                `🔗 کەناڵ: ${CHANNEL_LINK}\n` +
                `📝 کات: ${new Date().toLocaleTimeString('en-IR')}\n\n` +
                `💬 ئێستا بچۆرە ناو گروپەوە و چات بکە.`,
                { parse_mode: 'Markdown' }
            );
        } catch (error) {
            console.log('❌ نەتوانرا ئاگاداری بنێردرێت');
        }
    } else {
        await ctx.reply(
            '📝 *بەکارهێنان:*\n' +
            'ئەم فەرمانە لەسەر نامەی کەسێک بەکاربهێنە (Reply)\n\n' +
            'نموونە: /verifyuser (لەسەر نامەی کەسێک)',
            { parse_mode: 'Markdown' }
        );
    }
});

// فەرمانی پشکنینی حاڵەت
bot.command('checkme', async (ctx) => {
    const userId = ctx.from.id;
    const username = ctx.from.first_name || 'هاوڕێ';
    
    const isVerified = verifiedUsers[userId] || false;
    
    if (isVerified) {
        const userData = verifiedUsers[userId];
        await ctx.reply(
            `✅ *${username} چەکی کردووە!*\n\n` +
            `دەتوانیت لە گروپەکەدا چات بکەیت.\n\n` +
            `📊 **زانیاری:**\n` +
            `• ناسنامە: ${userId}\n` +
            `• کاتی چەکی کردن: ${userData.verifiedDate || 'نازانراو'}\n` +
            `• ڕێگا: ${userData.verifiedBy ? 'ئەدمین' : 'کۆد'}\n\n` +
            `🔗 کەناڵ: ${CHANNEL_LINK}`,
            { parse_mode: 'Markdown' }
        );
    } else {
        await ctx.reply(
            `❌ *${username}، هێشتا چەکی نەکردوویت!*\n\n` +
            `بۆ چەکی کردن یەکێک لەم ڕێگایانە بەکاربهێنە:\n\n` +
            `🔸 **1. ڕێگای کۆد:**\n` +
            `• لە چاتی تایبەت لەگەڵ بۆتدا /joincode بنووسە\n` +
            `• جۆینی چەناڵ بکە: ${CHANNEL_LINK}\n` +
            `• کۆدەکە بنووسە لە چاتی تایبەت\n\n` +
            `🔸 **2. ڕێگای ئەدمین:**\n` +
            `• ئەدمینێک نزیک بکەرەوە\n` +
            `• ئەدمینەکان دەتوانن بە فەرمانی /verifyuser چەکی بکەن\n\n` +
            `📞 **کێشەت هەیە؟** ئەدمینێک بانگی بکە.`,
            { parse_mode: 'Markdown' }
        );
    }
});

// === پشکنینی چەکی بەکارهێنەر ===
function isUserVerified(userId) {
    return !!verifiedUsers[userId];
}

// === پشکنینی پۆستی کەناڵ ===
function isChannelPost(message) {
    if (message.forward_from_chat && message.forward_from_chat.type === 'channel') {
        console.log(`📢 پۆستی کەناڵ لە: ${message.forward_from_chat.username}`);
        return true;
    }
    
    if (message.forward_from_chat && message.forward_from_chat.username === CHANNEL_USERNAME.replace('@', '')) {
        console.log(`✅ پۆست لە کەناڵی دیاریکراوەوە: ${CHANNEL_USERNAME}`);
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

// === وەڵامی فەرمانەکان ===
bot.start(async (ctx) => {
    await ctx.reply(
        '🤖 *بەخێربێیت بۆ بۆتی جۆینی ناچاری!*\n\n' +
        '📋 **بۆ چاتکردن لە گروپ، پێویستە چەکی بکەیت:**\n\n' +
        '🔸 **ڕێگای ١ - کۆد:**\n' +
        '1. `/joincode` بنووسە لە چاتی تایبەت\n' +
        `2. جۆینی چەناڵ بکە: ${CHANNEL_LINK}\n` +
        '3. کۆدەکە بنووسە لە چاتی تایبەت\n\n' +
        '🔸 **ڕێگای ٢ - ئەدمین:**\n' +
        '1. ئەدمینێک نزیک بکەرەوە\n' +
        '2. ئەدمینەکان دەتوانن `/verifyuser` بەکاربهێنن\n\n' +
        '🔸 **پشکنین:**\n' +
        '`/checkme` بنووسە بۆ پشکنینی حاڵەت\n\n' +
        '📞 **کێشە؟** ئەدمینێک بانگی بکە.',
        { parse_mode: 'Markdown' }
    );
});

// === چاودێری هەموو نامەکان لە گروپ ===
bot.on('message', async (ctx) => {
    // تەنها لە گروپ
    if (ctx.chat.type !== 'group' && ctx.chat.type !== 'supergroup') {
        return;
    }
    
    const userId = ctx.from.id;
    const chatId = ctx.chat.id;
    const text = ctx.message.text || ctx.message.caption || '';
    const username = ctx.from.first_name || 'ناونەزانراو';
    
    console.log(`📨 نامە لە گروپ: ${username} (${userId})`);
    
    try {
        // === 1. پشکنینی ئەدمین ===
        const userIsAdmin = await isAdmin(chatId, userId);
        if (userIsAdmin) {
            console.log(`✅ ئەدمینە: ڕێگەپێدراوە`);
            return;
        }
        
        // === 2. پشکنینی پۆستی کەناڵ ===
        const isChannelPostResult = isChannelPost(ctx.message);
        if (isChannelPostResult) {
            console.log(`✅ پۆستی کەناڵ: ڕێگەپێدراوە`);
            return;
        }
        
        // === 3. پشکنینی چەکی بەکارهێنەر ===
        const isVerified = isUserVerified(userId);
        
        if (!isVerified) {
            console.log(`🚫 ${username} چەکی نەکردووە! نامە دەسڕێتەوە.`);
            
            // سڕینەوەی نامە
            await ctx.deleteMessage().catch(e => console.log('❌ هەڵە لە سڕینەوە:', e.message));
            
            // ئاگاداری لە گروپ
            const warningMsg = await ctx.reply(
                `👤 *${username}*\n\n` +
                `🚫 **نامەکەت سڕدرایەوە!**\n\n` +
                `📌 **هۆکار:** تۆ چەکی نەکردوویت\n\n` +
                `✅ **ڕێگا بۆ چەکی کردن:**\n\n` +
                `🔹 **1. ڕێگای کۆد:**\n` +
                `• لە چاتی تایبەت لەگەڵ بۆتدا /joincode بنووسە\n` +
                `• جۆینی چەناڵ بکە\n` +
                `• کۆدەکە بنووسە\n\n` +
                `🔹 **2. ڕێگای ئەدمین:**\n` +
                `• ئەدمینێک نزیک بکەرەوە\n` +
                `• ئەدمینەکان دەتوانن چەکی بکەن\n\n` +
                `📞 **یارمەتی؟** ئەدمینێک بانگی بکە.`,
                { parse_mode: 'Markdown' }
            ).catch(e => console.log('❌ هەڵە:', e.message));
            
            // ئاگاداری بۆ چاتی تایبەت
            try {
                await bot.telegram.sendMessage(
                    userId,
                    `👋 *سڵاو ${username}!*\n\n` +
                    `تۆ هەوڵتدا لە گروپەکەدا نامە بنێریت.\n\n` +
                    `❌ **تۆ ناتوانیت چات بکەیت چونکە چەکی نەکردوویت.**\n\n` +
                    `✅ **بۆ چەکی کردن:**\n` +
                    `1. لێرەدا /joincode بنووسە\n` +
                    `2. جۆینی چەناڵ بکە: ${CHANNEL_LINK}\n` +
                    `3. کۆدەکە بنووسە لێرە\n\n` +
                    `🔐 **دوای ئەوە دەتوانیت لە گروپەکەدا چات بکەیت.**\n\n` +
                    `📞 کێشەت هەیە؟ لە گروپەکەدا ئەدمینێک بانگی بکە.`,
                    { parse_mode: 'Markdown' }
                );
            } catch (error) {
                console.log('❌ نەتوانرا ئاگاداری بنێردرێت');
            }
            
            // سڕینەوەی ئاگاداریەکە دوای ٣٠ چرکە
            if (warningMsg) {
                setTimeout(() => {
                    ctx.deleteMessage(warningMsg.message_id).catch(() => {});
                }, 30000);
            }
            
            return;
        }
        
        // === 4. پشکنینی لینک ===
        const hasLink = containsLink(text);
        
        if (hasLink) {
            console.log(`🔗 ${username} لینکی نارد (سڕینەوە)`);
            
            await ctx.deleteMessage().catch(e => console.log('❌ هەڵە لە سڕینەوە:', e.message));
            
            await ctx.reply(
                `🚫 *${username}*\n\n` +
                `لینکەکەت سڕدرایەوە!\n\n` +
                `📌 **هۆکار:** تەنها ئەدمینەکان دەتوانن لینک بنێرن\n\n` +
                `👑 ئەگەر پێویستت بە ناردنی لینکە، تکایە ئەدمینێک نزیک بکەرەوە.`,
                { parse_mode: 'Markdown' }
            ).catch(e => console.log('❌ هەڵە:', e.message));
            
            return;
        }
        
        // === 5. پشکنینی دۆخی خامۆشی ===
        const silentTime = isSilentTime();
        
        if (silentTime) {
            console.log(`🕒 دۆخی خامۆشی: چالاکە (${username})`);
            
            await ctx.deleteMessage().catch(e => console.log('❌ هەڵە لە سڕینەوە:', e.message));
            
            await ctx.reply(
                `🔕 *${username}*\n\n` +
                `نامەکەت سڕدرایەوە لەبەر دۆخی خامۆشی!\n\n` +
                `⏰ **کاتی خامۆشی:**\n` +
                `١٢ شەو - ٧ بەیانی\n\n` +
                `👑 تەنها ئەدمینەکان دەتوانن لەم کاتەدا بنووسن.`,
                { parse_mode: 'Markdown' }
            ).catch(e => console.log('❌ هەڵە:', e.message));
            
            return;
        }
        
        console.log(`✅ ${username} (چەکی کردووە): نامەکە پەسند کرا`);
        
    } catch (error) {
        console.log('❌ هەڵە:', error.message);
    }
});

// === پێشوازی لە نوێیەکان ===
bot.on('new_chat_members', async (ctx) => {
    try {
        const members = ctx.message.new_chat_members;
        
        for (const member of members) {
            const botInfo = await ctx.telegram.getMe();
            
            if (member.id === botInfo.id) {
                await ctx.reply(
                    '🤖 *بۆت چالاک کرا!*\n\n' +
                    '📋 **یاسای گروپ:**\n\n' +
                    '1. **پێویستە چەکی بکەیت** بۆ چاتکردن\n' +
                    '2. **لینک = سڕینەوە** (تەنها ئەدمینەکان)\n' +
                    '3. **دۆخی خامۆشی:** ١٢ شەو - ٧ بەیانی\n\n' +
                    `🔗 **کەناڵ (پێویستە):** ${CHANNEL_LINK}\n\n` +
                    '📝 **بۆ چەکی کردن:**\n' +
                    'لە چاتی تایبەت لەگەڵ بۆتدا `/joincode` بنووسە',
                    { parse_mode: 'Markdown' }
                );
            } else {
                setTimeout(async () => {
                    try {
                        await ctx.reply(
                            `👋 *بەخێربێیت ${member.first_name || 'هاوڕێ'}!*\n\n` +
                            `📢 **بۆ چاتکردن لە گروپ، پێویستە چەکی بکەیت:**\n\n` +
                            `🔸 **ڕێگای کۆد:**\n` +
                            `1. لە چاتی تایبەت لەگەڵ بۆتدا /joincode بنووسە\n` +
                            `2. جۆینی چەناڵ بکە: ${CHANNEL_LINK}\n` +
                            `3. کۆدەکە بنووسە لە چاتی تایبەت\n\n` +
                            `🔸 **ڕێگای ئەدمین:**\n` +
                            `1. ئەدمینێک نزیک بکەرەوە\n` +
                            `2. ئەدمینەکان دەتوانن چەکی بکەن\n\n` +
                            `📜 **یاساکان:**\n` +
                            `• تەنها ئەدمینەکان دەتوانن لینک بنێرن\n` +
                            `• دۆخی خامۆشی: ١٢ شەو - ٧ بەیانی`,
                            { parse_mode: 'Markdown' }
                        );
                    } catch (error) {
                        console.log('Welcome error:', error.message);
                    }
                }, 1500);
            }
        }
    } catch (error) {
        console.log('New member error:', error.message);
    }
});

// === فەرمانی پشکنینی هەموو بەکارهێنەران (ئەدمین) ===
bot.command('listusers', async (ctx) => {
    const adminId = ctx.from.id;
    const chatId = ctx.chat.id;
    
    const userIsAdmin = await isAdmin(chatId, adminId);
    if (!userIsAdmin) {
        return ctx.reply('🚫 تەنها ئەدمینەکان!').catch(() => {});
    }
    
    const userCount = Object.keys(verifiedUsers).length;
    
    if (userCount === 0) {
        await ctx.reply('📭 هیچ بەکارهێنەرێک چەکی نەکردووە.');
        return;
    }
    
    let message = `📊 **کۆی گشتی: ${userCount} بەکارهێنەر**\n\n`;
    
    let count = 0;
    for (const [userId, userData] of Object.entries(verifiedUsers)) {
        count++;
        if (count <= 20) { // تەنها 20 بەکارهێنەر پیشان بدە
            message += `${count}. ${userData.username || 'ناونەزانراو'} (${userId})\n`;
        }
    }
    
    if (userCount > 20) {
        message += `\n... و ${userCount - 20} بەکارهێنەری تر`;
    }
    
    await ctx.reply(message, { parse_mode: 'Markdown' });
});

// === دەستپێکردن ===
console.log('🚀 بۆت دەستی پێدەکات...');
console.log('================================');
console.log(`🔗 کەناڵ: ${CHANNEL_LINK}`);
console.log(`📌 جۆینی ناچاری: چالاکە (سیستەمی کۆد)`);
console.log(`🕒 دۆخی خامۆشی: ${SILENT_START_HOUR}:00 - ${SILENT_END_HOUR}:00`);
console.log(`👑 ئەدمینەکان: دەتوانن لینک بنێرن و چەکی بکەن`);
console.log(`💾 داتا: ${Object.keys(verifiedUsers).length} بەکارهێنەری چەکی کردوو`);
console.log('================================');

bot.launch()
    .then(() => {
        console.log('✅ بۆت سەرکەوتووانە دەستی پێکرد!');
        console.log('\n📋 **ڕێنمایی بەکارهێنەران:**');
        console.log('1. لە چاتی تایبەتدا /joincode بنووسە');
        console.log('2. جۆینی چەناڵ بکە');
        console.log('3. کۆدەکە بنووسە لە چاتی تایبەت');
        console.log('4. دواتر دەتوانیت لە گروپەکەدا چات بکەیت');
        console.log('\n📋 **ڕێنمایی ئەدمینەکان:**');
        console.log('• /verifyuser - چەکی کردن (لەسەر نامەیەک)');
        console.log('• /listusers - پیشاندانی هەموو بەکارهێنەران');
    })
    .catch((err) => {
        console.error('❌ هەڵە:', err.message);
    });

// وەستاندنی ڕێک و پاشەکەوتکردنی داتا
process.once('SIGINT', async () => {
    console.log('💾 پاشەکەوتکردنی داتا...');
    saveData();
    await bot.stop('SIGINT');
    process.exit(0);
});

process.once('SIGTERM', async () => {
    console.log('💾 پاشەکەوتکردنی داتا...');
    saveData();
    await bot.stop('SIGTERM');
    process.exit(0);
});
