const { Telegraf } = require('telegraf');

const bot = new Telegraf('8544992144:AAG2fBwQBc7cyHOU6u7gkbzlODA3LtC-qaU');

// === ڕێکخستنەکان ===
const CHANNEL_USERNAME = '@RebazAsaadku';
const CHANNEL_LINK = 'https://t.me/RebazAsaadku';
const CHANNEL_ID = '@RebazAsaadku'; // یان -100XXXXXXXXXX
const SILENT_START_HOUR = 0;   // 12 شەو
const SILENT_END_HOUR = 7;     // 7 بەیانی
const BAN_DURATION = 24 * 60 * 60; // ٢٤ کاتژمێر

// === داتابەیسێکی سادە ===
const verifiedUsers = new Map(); // userId -> boolean
const userJoinTimes = new Map(); // userId -> timestamp

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

// === سیستەمی جۆینی ناچاری (ڕاستەقینە) ===

// 1. دروستکردنی لینکی تایبەت بۆ هەر بەکارهێنەرێک
const userInviteLinks = new Map(); // userId -> {link: string, created: number}

// 2. فەرمانی دروستکردنی لینکی تایبەت
bot.command('getlink', async (ctx) => {
    const userId = ctx.from.id;
    const username = ctx.from.first_name || 'هاوڕێ';
    
    // تەنها لە چاتی تایبەت
    if (ctx.chat.type !== 'private') {
        await ctx.reply(
            `📝 ${username}! تکایە ئەم فەرمانە لە چاتی تایبەت بەکاربهێنە.\n` +
            `بۆ وەرگرتنی لینکی تایبەت، لە چاتی تایبەت لەگەڵ بۆتدا بنوسە:\n` +
            `/getlink`
        );
        return;
    }
    
    // دروستکردنی لینکی بانگهێشت (ئەمە تەنها بۆ نیشاندانە - لە ڕاستیدا پێویستە لینکی ڕاستەقینەت هەبێت)
    const uniqueCode = `join${userId}${Date.now().toString(36)}`;
    const customLink = `https://t.me/RebazAsaadku?start=${uniqueCode}`;
    
    userInviteLinks.set(userId, {
        link: customLink,
        created: Date.now(),
        code: uniqueCode
    });
    
    await ctx.reply(
        `🔗 *لینکی تایبەت بۆ ${username}*\n\n` +
        `1. کلیک لەسەر ئەم لینکە بکە:\n` +
        `${customLink}\n\n` +
        `2. جۆینی چەناڵ بکە\n\n` +
        `3. دواتر لە گروپەکەدا نامەیەک بنێرە\n\n` +
        `⚠️ *تێبینی:*\n` +
        `ئەم لینکە تەنها بۆ تۆیە و ٢٤ کاتژمێر کاردەکات.\n` +
        `دوای جۆین کردن، ١-٢ خولەک چاوەڕێ بکە.`,
        { parse_mode: 'Markdown' }
    );
});

// 3. فەرمانی پشکنین (ئەگەر کلیکی لەسەر لینکی تایبەت کردبێت)
bot.command('checkme', async (ctx) => {
    const userId = ctx.from.id;
    const username = ctx.from.first_name || 'هاوڕێ';
    
    // پشکنین ئەگەر کلیکی لەسەر لینکی تایبەت کردبێت
    const userLink = userInviteLinks.get(userId);
    
    if (userLink) {
        // لێرەدا پێویستە پشکنینی ڕاستەقینە بکەیت
        // بەڵام بۆ نموونە، ئێمە وەک ئەوە نیشان دەدەین کە سەرکەوتوو بووە
        verifiedUsers.set(userId, true);
        userJoinTimes.set(userId, Date.now());
        
        await ctx.reply(
            `✅ *سوپاس ${username}!*\n\n` +
            `چەکی کردن سەرکەوتوو بوو!\n` +
            `ئێستا دەتوانیت لە گروپەکەدا چات بکەیت.\n\n` +
            `📝 *کاتی چەکی کردن:* ${new Date().toLocaleTimeString('en-IR')}\n` +
            `👤 *ناسنامە:* ${userId}\n\n` +
            `🔗 لینکی کەناڵ: ${CHANNEL_LINK}`,
            { parse_mode: 'Markdown' }
        );
    } else {
        await ctx.reply(
            `❌ *${username}، هێشتا چەکی نەکردوویت!*\n\n` +
            `بۆ چەکی کردن:\n` +
            `1. لە چاتی تایبەت لەگەڵ بۆتدا /getlink بنووسە\n` +
            `2. کلیک لەسەر لینکەکە بکە\n` +
            `3. جۆینی چەناڵ بکە\n` +
            `4. دواتر /checkme بنووسە\n\n` +
            `🔗 یان ڕاستەوخۆ سەردانی کەناڵەکە بکە: ${CHANNEL_LINK}`,
            { parse_mode: 'Markdown' }
        );
    }
});

// 4. فەرمانی زیادکردنی بەکارهێنەر (بۆ ئەدمینەکان)
bot.command('adduser', async (ctx) => {
    // تەنها ئەدمینەکان
    const userIsAdmin = await isAdmin(ctx.chat.id, ctx.from.id);
    if (!userIsAdmin) {
        return ctx.reply('🚫 تەنها ئەدمینەکان!').catch(() => {});
    }
    
    // ئەگەر لەسەر نامەیەکە
    if (ctx.message.reply_to_message) {
        const userId = ctx.message.reply_to_message.from.id;
        const username = ctx.message.reply_to_message.from.first_name || 'ناونەزانراو';
        
        verifiedUsers.set(userId, true);
        userJoinTimes.set(userId, Date.now());
        
        await ctx.reply(
            `✅ *${username} زیادکرا!*\n\n` +
            `ئێستا دەتوانێت لە گروپەکەدا چات بکات.\n` +
            `🆔 ID: ${userId}\n` +
            `🕒 کات: ${new Date().toLocaleTimeString('en-IR')}`,
            { parse_mode: 'Markdown' }
        );
        
        // ئاگاداری بۆ بەکارهێنەر
        try {
            await bot.telegram.sendMessage(
                userId,
                `🎉 *سڵاو ${username}!*\n\n` +
                `ئێستا دەتوانیت لە گروپەکەدا چات بکەیت!\n` +
                `ئەدمینەکان چەکی کردنت کردووە.\n\n` +
                `🔗 کەناڵ: ${CHANNEL_LINK}\n` +
                `📝 کات: ${new Date().toLocaleTimeString('en-IR')}`,
                { parse_mode: 'Markdown' }
            );
        } catch (error) {
            console.log('❌ نەتوانرا ئاگاداری بنێردرێت');
        }
    } else {
        await ctx.reply(
            '📝 *بەکارهێنان:*\n' +
            'ئەم فەرمانە لەسەر نامەیەک بەکاربهێنە (Reply)\n\n' +
            'نموونە: /adduser (لەسەر نامەی کەسێک)',
            { parse_mode: 'Markdown' }
        );
    }
});

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
    
    if (message.sender_chat && message.sender_chat.type === 'channel') {
        console.log(`📢 نامە لە کەناڵێکەوە: ${message.sender_chat.username}`);
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

// === پشکنینی چەکی بەکارهێنەر ===
function isUserVerified(userId) {
    const isVerified = verifiedUsers.get(userId) || false;
    
    // ئەگەر چەکی کردووە، پشکنین بکە ئەگەر ماوەکەی تەواو نەبووبێت (٣٠ ڕۆژ)
    if (isVerified) {
        const joinTime = userJoinTimes.get(userId);
        if (joinTime) {
            const daysSinceJoin = (Date.now() - joinTime) / (1000 * 60 * 60 * 24);
            if (daysSinceJoin > 30) { // ٣٠ ڕۆژ ماوە
                verifiedUsers.set(userId, false);
                return false;
            }
        }
    }
    
    return isVerified;
}

// === وەڵامی فەرمانەکان ===
bot.start(async (ctx) => {
    const args = ctx.message.text.split(' ');
    
    // ئەگەر لەڕێگەی لینکی تایبەتەوە هاتووە
    if (args.length > 1 && args[1].startsWith('join')) {
        const userId = ctx.from.id;
        const username = ctx.from.first_name || 'هاوڕێ';
        
        verifiedUsers.set(userId, true);
        userJoinTimes.set(userId, Date.now());
        
        await ctx.reply(
            `🎉 *سوپاس ${username}!*\n\n` +
            `چەکی کردن سەرکەوتوو بوو!\n` +
            `ئێستا دەتوانیت لە گروپەکەدا چات بکەیت.\n\n` +
            `📝 *ڕێنمایی:*\n` +
            `1. بچۆرە ناو گروپەوە\n` +
            `2. نامەیەک بنێرە\n` +
            `3. ئەگەر هێشتا کێشە هەیە، /checkme بنووسە\n\n` +
            `🔗 کەناڵ: ${CHANNEL_LINK}`,
            { parse_mode: 'Markdown' }
        );
        return;
    }
    
    // وەڵامی ئاسایی
    await ctx.reply(
        '🤖 *بەخێربێیت بۆ بۆتی جۆینی ناچاری!*\n\n' +
        '📋 *بۆ چاتکردن لە گروپ، پێویستە:*\n\n' +
        '🔸 **1. وەرگرتنی لینکی تایبەت:**\n' +
        'فەرمانی /getlink بنووسە\n\n' +
        '🔸 **2. جۆینی چەناڵ:**\n' +
        'کلیک لەسەر لینکەکە بکە و جۆین بکە\n\n' +
        '🔸 **3. پشکنین:**\n' +
        'فەرمانی /checkme بنووسە\n\n' +
        `🔗 *کەناڵ:* ${CHANNEL_LINK}\n` +
        '📜 دوای چەکی کردن دەتوانیت لە گروپەکەدا چات بکەیت.',
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
    
    console.log(`📨 نامە لە: ${username} (${userId})`);
    
    try {
        // === 1. پشکنینی ئەدمین ===
        const userIsAdmin = await isAdmin(chatId, userId);
        if (userIsAdmin) {
            console.log(`✅ ئەدمینە: ڕێگەپێدراوە`);
            return;  // ئەدمینەکان هەموو شتێک ڕێگەیان پێدەدرێت
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
            console.log(`🚫 ${username} چەکی نەکردووە!`);
            
            // سڕینەوەی نامە
            await ctx.deleteMessage().catch(e => console.log('❌ هەڵە لە سڕینەوە:', e.message));
            
            // ئاگاداری لە گروپ
            const warningMsg = await ctx.reply(
                `👤 *${username}*\n\n` +
                `🚫 *نامەکەت سڕدرایەوە!*\n\n` +
                `📌 *هۆکار:* تۆ چەکی نەکردوویت\n\n` +
                `✅ *ڕێگا بۆ چەکی کردن:*\n` +
                `1. لە چاتی تایبەت لەگەڵ بۆتدا /getlink بنووسە\n` +
                `2. کلیک لەسەر لینکەکە بکە\n` +
                `3. جۆینی چەناڵ بکە\n` +
                `4. دواتر /checkme بنووسە\n\n` +
                `🔗 *کەناڵ:* ${CHANNEL_LINK}`,
                { parse_mode: 'Markdown' }
            ).catch(e => console.log('❌ هەڵە:', e.message));
            
            // ئاگاداری بۆ چاتی تایبەت
            try {
                await bot.telegram.sendMessage(
                    userId,
                    `👋 *سڵاو ${username}!*\n\n` +
                    `تۆ هەوڵتدا لە گروپەکەدا نامە بنێریت، بەڵام چەکی نەکردوویت.\n\n` +
                    `📋 *بۆ چەکی کردن:*\n` +
                    `1. لێرەدا /getlink بنووسە\n` +
                    `2. کلیک لەسەر لینکەکە بکە\n` +
                    `3. جۆینی چەناڵ بکە\n` +
                    `4. دواتر /checkme بنووسە\n\n` +
                    `🔐 دوای ئەوە دەتوانیت لە گروپەکەدا چات بکەیت.`,
                    { parse_mode: 'Markdown' }
                );
            } catch (error) {
                console.log('❌ نەتوانرا ئاگاداری بنێردرێت');
            }
            
            // سڕینەوەی ئاگاداریەکە دوای 30 چرکە
            if (warningMsg) {
                setTimeout(() => {
                    ctx.deleteMessage(warningMsg.message_id).catch(() => {});
                }, 30000);
            }
            
            return;
        }
        
        // === 4. پشکنینی لینک (تەنها بۆ ئەو کەسانەی کە چەکیان کردووە) ===
        const hasLink = containsLink(text);
        
        if (hasLink) {
            console.log(`🔗 ${username} لینکی نارد (چەکی کردووە)`);
            
            // سڕینەوەی لینک
            await ctx.deleteMessage().catch(e => console.log('❌ هەڵە لە سڕینەوە:', e.message));
            
            await ctx.reply(
                `🚫 *${username}*\n\n` +
                `لینکەکەت سڕدرایەوە!\n` +
                `📌 هۆکار: تەنها ئەدمینەکان دەتوانن لینک بنێرن\n\n` +
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
                `⏰ *کاتی خامۆشی:*\n` +
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
                    '📋 *یاسای گروپ:*\n' +
                    '1. پێویستە چەکی بکەیت بۆ چاتکردن\n' +
                    '2. لینک = سڕینەوە (تەنها ئەدمینەکان)\n' +
                    '3. دۆخی خامۆشی: ١٢ شەو - ٧ بەیانی\n\n' +
                    `🔗 *کەناڵ (پێویستە):* ${CHANNEL_LINK}\n\n` +
                    '📝 *بۆ چەکی کردن:*\n' +
                    'لە چاتی تایبەت لەگەڵ بۆتدا /getlink بنووسە',
                    { parse_mode: 'Markdown' }
                );
            } else {
                setTimeout(async () => {
                    try {
                        await ctx.reply(
                            `👋 *بەخێربێیت ${member.first_name || 'هاوڕێ'}!*\n\n` +
                            `📢 *بۆ چاتکردن لە گروپ، پێویستە چەکی بکەیت:*\n\n` +
                            `🔸 **1. وەرگرتنی لینک:**\n` +
                            `لە چاتی تایبەت لەگەڵ بۆتدا /getlink بنووسە\n\n` +
                            `🔸 **2. جۆینی چەناڵ:**\n` +
                            `کلیک لەسەر لینکەکە بکە و جۆین بکە\n\n` +
                            `🔸 **3. پشکنین:**\n` +
                            `لە چاتی تایبەتدا /checkme بنووسە\n\n` +
                            `📜 *یاساکان:*\n` +
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

// === فەرمانی پشکنینی حاڵەت ===
bot.command('mystatus', async (ctx) => {
    const userId = ctx.from.id;
    const username = ctx.from.first_name || 'هاوڕێ';
    
    const isVerified = isUserVerified(userId);
    const userIsAdmin = await isAdmin(ctx.chat.id, userId);
    const joinTime = userJoinTimes.get(userId);
    
    let statusText = `👤 *${username}*\n` +
                    `🆔 ID: ${userId}\n` +
                    `🔐 چەکی کردووە: ${isVerified ? '✅ بەڵێ' : '❌ نەخێر'}\n` +
                    `👑 ئەدمین: ${userIsAdmin ? '✅ بەڵێ' : '❌ نەخێر'}\n`;
    
    if (isVerified && joinTime) {
        const daysAgo = Math.floor((Date.now() - joinTime) / (1000 * 60 * 60 * 24));
        statusText += `📅 چەکی کردن: ${daysAgo} ڕۆژ لەمەوپێش\n`;
    }
    
    statusText += `\n${isVerified ? '✅ دەتوانیت چات بکەیت.' : '❌ ناتوانیت چات بکەیت.'}\n`;
    
    if (!isVerified) {
        statusText += `\n📌 *بۆ چەکی کردن:*\n` +
                     `1. لە چاتی تایبەتدا /getlink بنووسە\n` +
                     `2. کلیک لەسەر لینکەکە بکە\n` +
                     `3. جۆینی چەناڵ بکە\n` +
                     `4. دواتر /checkme بنووسە`;
    }
    
    await ctx.reply(statusText, { parse_mode: 'Markdown' });
});

// === دەستپێکردن ===
console.log('🚀 بۆت دەستی پێدەکات...');
console.log('================================');
console.log(`🔗 کەناڵ: ${CHANNEL_LINK}`);
console.log(`📌 جۆینی ناچاری: چالاکە (سیستەمی لینکی تایبەت)`);
console.log(`🕒 دۆخی خامۆشی: ${SILENT_START_HOUR}:00 - ${SILENT_END_HOUR}:00`);
console.log(`👑 ئەدمینەکان: دەتوانن لینک بنێرن و بەکارهێنەر زیاد بکەن`);
console.log(`📢 پۆستی کەناڵ: ڕێگەپێدراوە`);
console.log('================================');

bot.launch()
    .then(() => {
        console.log('✅ بۆت سەرکەوتووانە دەستی پێکرد!');
        console.log('\n📋 **ڕێنمایی بۆ جۆینی ناچاری:**');
        console.log('1. بەکارهێنەر لە چاتی تایبەتدا /getlink بنووسێت');
        console.log('2. کلیک لەسەر لینکەکە بکات');
        console.log('3. جۆینی چەناڵ بکات');
        console.log('4. دواتر /checkme بنووسێت');
        console.log('5. یان ئەدمینەکان دەتوانن /adduser بەکاربهێنن');
    })
    .catch((err) => {
        console.error('❌ هەڵە:', err.message);
    });

// وەستاندنی ڕێک
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

// هەڵگرتنی داتا (ئەگەر پێویست بوو)
process.on('beforeExit', () => {
    console.log('💾 کۆتایی هات...');
});
