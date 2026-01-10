const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');

const bot = new Telegraf('8544992144:AAG2fBwQBc7cyHOU6u7gkbzlODA3LtC-qaU');

// === ڕێکخستنەکان ===
const CHANNEL_USERNAME = '@RebazAsaadku';
const CHANNEL_LINK = 'https://t.me/RebazAsaadku';
const SILENT_START_HOUR = 0;   // 12 شەو
const SILENT_END_HOUR = 7;     // 7 بەیانی
const BAN_DURATION = 24 * 60 * 60; // ٢٤ کاتژمێر

// === فایل بۆ پاشەکەوت کردنی داتا ===
const DATA_DIR = 'data';
const USERS_FILE = path.join(DATA_DIR, 'verified_users.json');

// === دامەزراندنی داتا ===
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
    console.log(`📁 دایرێکتۆری ${DATA_DIR} دروستکرا`);
}

// === بارکردنی داتا ===
let verifiedUsers = {};
try {
    if (fs.existsSync(USERS_FILE)) {
        const data = fs.readFileSync(USERS_FILE, 'utf8');
        verifiedUsers = JSON.parse(data);
        console.log(`✅ داتا بارکرا: ${Object.keys(verifiedUsers).length} بەکارهێنەر`);
    } else {
        fs.writeFileSync(USERS_FILE, JSON.stringify({}, null, 2));
        console.log('📄 فایلی داتا دروستکرا');
    }
} catch (error) {
    console.log('❌ هەڵە لە بارکردنی داتا:', error.message);
    verifiedUsers = {};
}

// === پاشەکەوتکردنی داتا ===
function saveUsersData() {
    try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(verifiedUsers, null, 2));
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

// === سیستەمی پشکنینی جۆینی چەناڵ (ئۆتۆماتیک) ===
async function checkIfUserJoinedChannel(userId) {
    try {
        // لە ڕاستیدا، Telegram API ڕێگە نادات بە پشکنینی ئەندامی چەناڵ
        // بۆیە ئێمە سیستمێکی خۆمان دروست دەکەین
        
        console.log(`🔍 پشکنینی ئۆتۆماتیک بۆ ${userId}...`);
        
        // 1. یەکەم جار کە بەکارهێنەر نامە دەنێرێت، وەک ناچەکی دادەنێین
        // 2. دوای ئەوەی کلیکی لەسەر دوگمەی JOIN کرد، وەک چەکی دادەنێین
        
        if (verifiedUsers[userId]) {
            console.log(`✅ ${userId} پێشتر چەکی کردووە`);
            return true;
        }
        
        // 3. ئەگەر بەکارهێنەر کلیکی لەسەر دوگمەی JOIN کردبێت (بە چاودێری callback_query)
        // ئەوا چەکی دەکرێت
        
        return false;
        
    } catch (error) {
        console.log('❌ هەڵە لە پشکنینی ئۆتۆماتیک:', error.message);
        return false;
    }
}

// === دوگمەی چەکی کردن ===
function getJoinButtons() {
    return Markup.inlineKeyboard([
        [
            Markup.button.url('📢 جۆینی چەناڵ', CHANNEL_LINK),
            Markup.button.callback('✅ چەکیم کرد', 'verified')
        ]
    ]);
}

// === چاودێری کلیک لەسەر دوگمەکان ===
bot.action('verified', async (ctx) => {
    const userId = ctx.from.id;
    const username = ctx.from.first_name || 'هاوڕێ';
    const chatId = ctx.chat?.id;
    
    try {
        // چەکی کردن
        verifiedUsers[userId] = {
            username: username,
            joinDate: new Date().toLocaleString('en-IR'),
            timestamp: Date.now(),
            verifiedMethod: 'button'
        };
        
        saveUsersData();
        
        // وەڵامدانەوە
        await ctx.answerCbQuery('✅ سوپاس! چەکی کردن سەرکەوتوو بوو!');
        
        // سڕینەوەی نامەی پێشوو (ئەگەر بتوانرێت)
        try {
            await ctx.deleteMessage();
        } catch (e) {
            // هیچ
        }
        
        // ئاگاداری لە گروپ (ئەگەر لە گروپ بوو)
        if (chatId) {
            await ctx.telegram.sendMessage(
                chatId,
                `🎉 *${username} چەکی کرد!*\n\n` +
                `✅ **ئێستا دەتوانێت لە گروپەکەدا چات بکات.**\n\n` +
                `👋 تکایە نامەیەکی نوێ بنێرە.`,
                { parse_mode: 'Markdown' }
            ).catch(() => {});
        }
        
        // ئاگاداری بۆ چاتی تایبەت
        await ctx.telegram.sendMessage(
            userId,
            `🎉 *سوپاس ${username}!*\n\n` +
            `✅ **چەکی کردن سەرکەوتوو بوو!**\n\n` +
            `🎊 **ئێستا دەتوانیت لە گروپەکەدا چات بکەیت!**\n\n` +
            `📊 **زانیاری:**\n` +
            `• ناسنامە: ${userId}\n` +
            `• کات: ${new Date().toLocaleTimeString('en-IR')}\n` +
            `• ڕێگا: دوگمەی چەکی کردن\n\n` +
            `💬 **ئێستا بچۆرە ناو گروپەوە و نامەیەک بنێرە.**`,
            { parse_mode: 'Markdown' }
        ).catch(() => {});
        
        console.log(`✅ ${username} (${userId}) چەکی کرد بە دوگمە`);
        
    } catch (error) {
        console.log('❌ هەڵە لە چەکی کردن:', error.message);
        await ctx.answerCbQuery('❌ هەڵە! تکایە دووبارە هەوڵ بدە.');
    }
});

// === پشکنینی چەکی بەکارهێنەر ===
function isUserVerified(userId) {
    return !!verifiedUsers[userId];
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

// === وەڵامی فەرمانەکان ===
bot.start(async (ctx) => {
    const userId = ctx.from.id;
    const username = ctx.from.first_name || 'هاوڕێ';
    
    // پشکنین ئەگەر لە گروپە
    if (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup') {
        const isVerified = isUserVerified(userId);
        
        if (isVerified) {
            await ctx.reply(
                `👋 *سڵاو ${username}!*\n\n` +
                `✅ **تۆ چەکی کردوویت!**\n` +
                `دەتوانیت لە گروپەکەدا چات بکەیت.\n\n` +
                `🔗 **کەناڵ:** ${CHANNEL_LINK}`
            );
        } else {
            await ctx.reply(
                `👋 *سڵاو ${username}!*\n\n` +
                `❌ **تۆ هێشتا چەکی نەکردوویت!**\n\n` +
                `📋 **بۆ چەکی کردن:**\n` +
                `1. کلیک لەسەر دوگمەی خوارەوە بکە\n` +
                `2. جۆینی چەناڵ بکە\n` +
                `3. دواتر کلیک لەسەر "✅ چەکیم کرد" بکە\n\n` +
                `🔐 **دوای ئەوە دەتوانیت چات بکەیت.**`,
                getJoinButtons()
            );
        }
        return;
    }
    
    // ئەگەر لە چاتی تایبەتە
    await ctx.reply(
        `🤖 *بەخێربێیت ${username}!*\n\n` +
        `📋 **بۆ چاتکردن لە گروپ، پێویستە چەکی بکەیت:**\n\n` +
        `🔸 **ڕێگای ١ - دوگمە:**\n` +
        `1. کلیک لەسەر دوگمەی خوارەوە بکە\n` +
        `2. جۆینی چەناڵ بکە\n` +
        `3. کلیک لەسەر "✅ چەکیم کرد" بکە\n\n` +
        `🔸 **ڕێگای ٢ - فەرمان:**\n` +
        `1. لە گروپەکەدا نامەیەک بنێرە\n` +
        `2. دوگمەکان دەردەکەون\n` +
        `3. دوای جۆین کردن کلیک لەسەر "✅ چەکیم کرد" بکە\n\n` +
        `📊 **پشکنینی حاڵەت:**\n` +
        `فەرمانی \`/status\` بنووسە\n\n` +
        `📞 **کێشەت هەیە؟** ئەدمینێک بانگی بکە.`,
        { 
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.url('📢 جۆینی چەناڵ', CHANNEL_LINK)]
            ])
        }
    );
});

bot.command('status', async (ctx) => {
    const userId = ctx.from.id;
    const username = ctx.from.first_name || 'هاوڕێ';
    
    const isVerified = isUserVerified(userId);
    
    if (isVerified) {
        const userData = verifiedUsers[userId];
        await ctx.reply(
            `📊 **حاڵەتی ${username}**\n\n` +
            `✅ **چەکی کردووە!**\n\n` +
            `📋 **زانیاری:**\n` +
            `• ناسنامە: ${userId}\n` +
            `• کاتی چەکی کردن: ${userData.joinDate}\n` +
            `• ڕێگا: ${userData.verifiedMethod || 'دوگمە'}\n\n` +
            `🎉 **دەتوانیت لە گروپەکەدا چات بکەیت!**\n\n` +
            `🔗 کەناڵ: ${CHANNEL_LINK}`,
            { parse_mode: 'Markdown' }
        );
    } else {
        await ctx.reply(
            `📊 **حاڵەتی ${username}**\n\n` +
            `❌ **چەکی نەکردووە!**\n\n` +
            `📋 **بۆ چەکی کردن:**\n` +
            `1. کلیک لەسەر دوگمەی خوارەوە بکە\n` +
            `2. جۆینی چەناڵ بکە\n` +
            `3. دواتر کلیک لەسەر "✅ چەکیم کرد" بکە\n\n` +
            `🔗 کەناڵ: ${CHANNEL_LINK}`,
            { 
                parse_mode: 'Markdown',
                ...getJoinButtons()
            }
        );
    }
});

// === چاودێری هەموو نامەکان لە گروپ ===
bot.on('message', async (ctx) => {
    // تەنها لە گروپ
    if (ctx.chat.type !== 'group' && ctx.chat.type !== 'supergroup') {
        return;
    }
    
    const userId = ctx.from.id;
    const chatId = ctx.chat.id;
    const messageId = ctx.message.message_id;
    const text = ctx.message.text || ctx.message.caption || '';
    const username = ctx.from.first_name || 'هاوڕێ';
    
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
            
            // ئاگاداری لە گروپ لەگەڵ دوگمە
            const warningMsg = await ctx.reply(
                `👤 *${username}*\n\n` +
                `🚫 **نامەکەت سڕدرایەوە!**\n\n` +
                `📌 **هۆکار:** تۆ چەکی نەکردوویت\n\n` +
                `✅ **بۆ چەکی کردن:**\n` +
                `1. کلیک لەسەر "📢 جۆینی چەناڵ" بکە\n` +
                `2. جۆینی چەناڵ بکە\n` +
                `3. دواتر کلیک لەسەر "✅ چەکیم کرد" بکە\n\n` +
                `🔐 **دوای ئەوە دەتوانیت چات بکەیت.**\n\n` +
                `👑 **یان:**\n` +
                `ئەدمینێک نزیک بکەرەوە بۆ یارمەتی.`,
                { 
                    parse_mode: 'Markdown',
                    ...getJoinButtons()
                }
            ).catch(e => console.log('❌ هەڵە:', e.message));
            
            // سڕینەوەی ئاگاداریەکە دوای 2 خولەک
            if (warningMsg) {
                setTimeout(() => {
                    ctx.deleteMessage(warningMsg.message_id).catch(() => {});
                }, 120000); // 2 خولەک
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
                `👑 ئەگەر پێویستت بە ناردنی لینکە، ئەدمینێک نزیک بکەرەوە.`,
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
        
        // === 6. ئەگەر هەموو پشکنینەکان تێپەڕ بوون ===
        console.log(`✅ ${username} (چەکی کردووە): نامەکە پەسند کرا`);
        
    } catch (error) {
        console.log('❌ هەڵە لە چاودێری نامە:', error.message);
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
                    '🤖 **بۆت چالاک کرا!**\n\n' +
                    '📋 **یاسای گروپ:**\n\n' +
                    '1. **پێویستە چەکی بکەیت** بۆ چاتکردن\n' +
                    '2. **لینک = سڕینەوە** (تەنها ئەدمینەکان)\n' +
                    '3. **دۆخی خامۆشی:** ١٢ شەو - ٧ بەیانی\n\n' +
                    `🔗 **کەناڵ (پێویستە):** ${CHANNEL_LINK}\n\n` +
                    '📝 **بۆ چەکی کردن:**\n' +
                    'نامەیەک بنێرە و دوگمەکان دەردەکەون',
                    { parse_mode: 'Markdown' }
                );
            } else {
                setTimeout(async () => {
                    try {
                        await ctx.reply(
                            `👋 *بەخێربێیت ${member.first_name || 'هاوڕێ'}!*\n\n` +
                            `📢 **بۆ چاتکردن لە گروپ، پێویستە چەکی بکەیت:**\n\n` +
                            `🔸 **ڕێگا:**\n` +
                            `1. کلیک لەسەر دوگمەی "📢 جۆینی چەناڵ" بکە\n` +
                            `2. جۆینی چەناڵ بکە\n` +
                            `3. دواتر کلیک لەسەر "✅ چەکیم کرد" بکە\n\n` +
                            `📜 **یاساکان:**\n` +
                            `• تەنها ئەدمینەکان دەتوانن لینک بنێرن\n` +
                            `• دۆخی خامۆشی: ١٢ شەو - ٧ بەیانی`,
                            { 
                                parse_mode: 'Markdown',
                                ...getJoinButtons()
                            }
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
bot.command('list', async (ctx) => {
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
        if (count <= 10) {
            message += `${count}. ${userData.username || 'ناونەزانراو'}\n`;
            message += `   🆔 ${userId}\n`;
            message += `   ⏰ ${userData.joinDate}\n\n`;
        }
    }
    
    if (userCount > 10) {
        message += `\n... و ${userCount - 10} بەکارهێنەری تر`;
    }
    
    await ctx.reply(message, { parse_mode: 'Markdown' });
});

// === فەرمانی یارمەتی ===
bot.help((ctx) => {
    return ctx.reply(
        '🆘 **یارمەتی**\n\n' +
        '📋 **ڕێنمایی:**\n\n' +
        '🔹 **بۆ چەکی کردن:**\n' +
        '1. نامەیەک بنێرە لە گروپ\n' +
        '2. دوگمەکان دەردەکەون\n' +
        '3. کلیک لەسەر "📢 جۆینی چەناڵ" بکە\n' +
        '4. جۆینی چەناڵ بکە\n' +
        '5. کلیک لەسەر "✅ چەکیم کرد" بکە\n\n' +
        '🔹 **فەرمانەکان:**\n' +
        '• `/start` - دەستپێکردن\n' +
        '• `/status` - پشکنینی حاڵەت\n' +
        '• `/help` - یارمەتی\n\n' +
        '🔹 **بۆ ئەدمینەکان:**\n' +
        '• `/list` - پیشاندانی هەموو بەکارهێنەران\n\n' +
        `🔗 **کەناڵ:** ${CHANNEL_LINK}`,
        { parse_mode: 'Markdown' }
    );
});

// === دەستپێکردن ===
console.log('🚀 بۆت دەستی پێدەکات...');
console.log('================================');
console.log(`🔗 کەناڵ: ${CHANNEL_LINK}`);
console.log(`📌 جۆینی ناچاری: چالاکە (سیستەمی دوگمە)`);
console.log(`🕒 دۆخی خامۆشی: ${SILENT_START_HOUR}:00 - ${SILENT_END_HOUR}:00`);
console.log(`👑 ئەدمینەکان: دەتوانن لینک بنێرن`);
console.log(`💾 داتا: ${Object.keys(verifiedUsers).length} بەکارهێنەری چەکی کردوو`);
console.log('================================');

bot.launch()
    .then(() => {
        console.log('✅ بۆت سەرکەوتووانە دەستی پێکرد!');
        console.log('\n📋 **ڕێنمایی بەکارهێنەران:**');
        console.log('1. نامەیەک بنێرە لە گروپ');
        console.log('2. دوگمەکان دەردەکەون');
        console.log('3. کلیک لەسەر "📢 جۆینی چەناڵ"');
        console.log('4. جۆینی چەناڵ بکە');
        console.log('5. کلیک لەسەر "✅ چەکیم کرد"');
        console.log('6. دواتر دەتوانیت چات بکەیت');
    })
    .catch((err) => {
        console.error('❌ هەڵە:', err.message);
    });

// وەستاندنی ڕێک و پاشەکەوتکردنی داتا
process.once('SIGINT', async () => {
    console.log('💾 پاشەکەوتکردنی داتا...');
    saveUsersData();
    await bot.stop('SIGINT');
    process.exit(0);
});

process.once('SIGTERM', async () => {
    console.log('💾 پاشەکەوتکردنی داتا...');
    saveUsersData();
    await bot.stop('SIGTERM');
    process.exit(0);
});
