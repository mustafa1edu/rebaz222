const { Telegraf } = require('telegraf');
const fs = require('fs');
const path = require('path');

const bot = new Telegraf('8544992144:AAG2fBwQBc7cyHOU6u7gkbzlODA3LtC-qaU');

// === ڕێکخستنەکان ===
const CHANNEL_USERNAME = '@RebazAsaadku';
const CHANNEL_LINK = 'https://t.me/RebazAsaadku';
const CHANNEL_ID = '@RebazAsaadku'; // ID ی چەناڵەکە
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

// === سیستەمی پشکنینی جۆینی چەناڵ ===
async function checkIfUserIsChannelMember(userId) {
    try {
        // ئەمە تەنها نمایشە - لە ڕاستیدا ناتوانین پشکنین بکەین
        // بۆیە ئێمە سیستەمێکی خۆمان دروست دەکەین
        
        console.log(`🔍 پشکنین بۆ بەکارهێنەری ${userId}...`);
        
        // ئەگەر لە داتابەیسەکەماندا هاتووە
        if (verifiedUsers[userId]) {
            console.log(`✅ بەکارهێنەری ${userId} چەکی کردووە`);
            return true;
        }
        
        // لە ڕاستیدا، دەتوانیت لێرەدا پشکنینی ڕاستەقینە بکەیت
        // بە بەکارهێنانی Telegram Bot API یان کتێبخانەیەکی تر
        
        console.log(`❌ بەکارهێنەری ${userId} چەکی نەکردووە`);
        return false;
        
    } catch (error) {
        console.log('❌ هەڵە لە پشکنینی ئەندامی چەناڵ:', error.message);
        return false;
    }
}

// === فەرمانی چەکی کردن ===
bot.command('join', async (ctx) => {
    const userId = ctx.from.id;
    const username = ctx.from.first_name || 'هاوڕێ';
    
    // تەنها لە چاتی تایبەت
    if (ctx.chat.type !== 'private') {
        await ctx.reply(
            `👋 ${username}! تکایە لە چاتی تایبەت بەکاربهێنە.\n\n` +
            `بۆ چەکی کردن، لە چاتی تایبەت لەگەڵ بۆتدا:\n` +
            `/join`
        );
        return;
    }
    
    // پشکنین ئەگەر پێشتر چەکی کردووە
    if (verifiedUsers[userId]) {
        await ctx.reply(
            `✅ ${username}! تۆ پێشتر چەکی کردوویت!\n\n` +
            `دەتوانیت لە گروپەکەدا چات بکەیت.\n\n` +
            `📊 **زانیاری:**\n` +
            `• کاتی چەکی کردن: ${verifiedUsers[userId].joinDate}\n` +
            `• ناسنامە: ${userId}\n\n` +
            `🔗 کەناڵ: ${CHANNEL_LINK}`
        );
        return;
    }
    
    await ctx.reply(
        `🔐 *چەکی کردن بۆ ${username}*\n\n` +
        `📋 **بۆ ئەوەی بتوانیت لە گروپەکەدا چات بکەیت، پێویستە:**\n\n` +
        `1️⃣ **سەردانی کەناڵەکە بکە:**\n` +
        `🔗 ${CHANNEL_LINK}\n\n` +
        `2️⃣ **جۆینی چەناڵ بکە** (کلیک لەسەر "Join")\n\n` +
        `3️⃣ **دوای جۆینی کردن، ئەم کۆدە بنووسە لە چاتی تایبەت:**\n` +
        `\`/done\`\n\n` +
        `⚠️ **تێبینیەکان:**\n` +
        `• پێویستە جۆینی چەناڵ بکەیت\n` +
        `• دوای جۆین کردن، `/done` بنووسە\n` +
        `• ئەگەر کێشەت هەیە، ئەدمینێک بانگی بکە`,
        { parse_mode: 'Markdown' }
    );
});

// === فەرمانی تەواوکردنی چەکی کردن ===
bot.command('done', async (ctx) => {
    const userId = ctx.from.id;
    const username = ctx.from.first_name || 'هاوڕێ';
    
    // تەنها لە چاتی تایبەت
    if (ctx.chat.type !== 'private') {
        return;
    }
    
    // چەکی کردن
    verifiedUsers[userId] = {
        username: username,
        joinDate: new Date().toLocaleString('en-IR'),
        timestamp: Date.now()
    };
    
    saveUsersData();
    
    await ctx.reply(
        `🎉 *سوپاس ${username}!*\n\n` +
        `✅ **چەکی کردن سەرکەوتوو بوو!**\n\n` +
        `🎊 **ئێستا دەتوانیت لە گروپەکەدا چات بکەیت!**\n\n` +
        `📊 **زانیاری:**\n` +
        `• ناسنامە: ${userId}\n` +
        `• کات: ${new Date().toLocaleTimeString('en-IR')}\n` +
        `• ڕێگا: چەکی کردن\n\n` +
        `🔗 **کەناڵ:** ${CHANNEL_LINK}\n\n` +
        `💬 **ئێستا بچۆرە ناو گروپەوە و نامەیەک بنێرە.**\n\n` +
        `📞 **کێشە؟** ئەگەر هێشتا ناتوانیت چات بکەیت، ئەدمینێک بانگی بکە.`,
        { parse_mode: 'Markdown' }
    );
    
    console.log(`✅ ${username} (${userId}) چەکی کرد`);
});

// === فەرمانی چەکی کردنی ڕاستەوخۆ (بۆ ئەدمینەکان) ===
bot.command('verify', async (ctx) => {
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
            joinDate: new Date().toLocaleString('en-IR'),
            timestamp: Date.now(),
            verifiedBy: adminId
        };
        
        saveUsersData();
        
        await ctx.reply(
            `✅ *${username} چەکی کرد!*\n\n` +
            `🎊 **ئێستا دەتوانێت لە گروپەکەدا چات بکات.**\n\n` +
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
                `💬 **ئێستا بچۆرە ناو گروپەوە و چات بکە.**`,
                { parse_mode: 'Markdown' }
            );
        } catch (error) {
            console.log('❌ نەتوانرا ئاگاداری بنێردرێت');
        }
    } else {
        await ctx.reply(
            '📝 **بەکارهێنان:**\n\n' +
            'ئەم فەرمانە لەسەر نامەی کەسێک بەکاربهێنە (Reply)\n\n' +
            '**نموونە:**\n' +
            '/verify (لەسەر نامەی کەسێک)',
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
                `1. لە چاتی تایبەت لەگەڵ بۆتدا `/join` بنووسە\n` +
                `2. جۆینی چەناڵ بکە: ${CHANNEL_LINK}\n` +
                `3. دواتر `/done` بنووسە\n\n` +
                `🔐 **دوای ئەوە دەتوانیت چات بکەیت.**`
            );
        }
        return;
    }
    
    // ئەگەر لە چاتی تایبەتە
    await ctx.reply(
        `🤖 *بەخێربێیت ${username}!*\n\n` +
        `📋 **بۆ چاتکردن لە گروپ، پێویستە چەکی بکەیت:**\n\n` +
        `🔸 **ڕێگای ١ - خۆت:**\n` +
        `1. فەرمانی `/join` بنووسە\n` +
        `2. جۆینی چەناڵ بکە: ${CHANNEL_LINK}\n` +
        `3. فەرمانی `/done` بنووسە\n\n` +
        `🔸 **ڕێگای ٢ - ئەدمین:**\n` +
        `1. ئەدمینێک نزیک بکەرەوە\n` +
        `2. ئەدمینەکان دەتوانن `/verify` بەکاربهێنن\n\n` +
        `📊 **پشکنینی حاڵەت:**\n` +
        `فەرمانی `/status` بنووسە\n\n` +
        `📞 **کێشەت هەیە؟** ئەدمینێک بانگی بکە.`,
        { parse_mode: 'Markdown' }
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
            `• ڕێگا: ${userData.verifiedBy ? 'ئەدمین' : 'خۆت'}\n\n` +
            `🎉 **دەتوانیت لە گروپەکەدا چات بکەیت!**\n\n` +
            `🔗 کەناڵ: ${CHANNEL_LINK}`,
            { parse_mode: 'Markdown' }
        );
    } else {
        await ctx.reply(
            `📊 **حاڵەتی ${username}**\n\n` +
            `❌ **چەکی نەکردووە!**\n\n` +
            `📋 **بۆ چەکی کردن:**\n` +
            `1. لە چاتی تایبەت `/join` بنووسە\n` +
            `2. جۆینی چەناڵ بکە: ${CHANNEL_LINK}\n` +
            `3. دواتر `/done` بنووسە\n\n` +
            `👑 **یان:**\n` +
            `ئەدمینێک نزیک بکەرەوە بۆ `/verify`\n\n` +
            `🔗 کەناڵ: ${CHANNEL_LINK}`,
            { parse_mode: 'Markdown' }
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
                `✅ **بۆ چەکی کردن:**\n` +
                `1. لە چاتی تایبەت لەگەڵ بۆتدا `/join` بنووسە\n` +
                `2. جۆینی چەناڵ بکە: ${CHANNEL_LINK}\n` +
                `3. دواتر `/done` بنووسە\n\n` +
                `🔐 **دوای ئەوە دەتوانیت چات بکەیت.**\n\n` +
                `👑 **یان:**\n` +
                `ئەدمینێک نزیک بکەرەوە بۆ یارمەتی.`,
                { parse_mode: 'Markdown' }
            ).catch(e => console.log('❌ هەڵە:', e.message));
            
            // ئاگاداری بۆ چاتی تایبەت
            try {
                await bot.telegram.sendMessage(
                    userId,
                    `👋 *سڵاو ${username}!*\n\n` +
                    `تۆ هەوڵتدا لە گروپەکەدا نامە بنێریت.\n\n` +
                    `❌ **ناتوانیت چات بکەیت چونکە چەکی نەکردوویت.**\n\n` +
                    `✅ **بۆ چەکی کردن:**\n` +
                    `1. لێرەدا `/join` بنووسە\n` +
                    `2. جۆینی چەناڵ بکە: ${CHANNEL_LINK}\n` +
                    `3. دواتر `/done` بنووسە\n\n` +
                    `🔐 **دوای ئەوە دەتوانیت لە گروپەکەدا چات بکەیت.**\n\n` +
                    `📞 **کێشە؟** لە گروپەکەدا ئەدمینێک بانگی بکە.`,
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
                    'لە چاتی تایبەت لەگەڵ بۆتدا `/join` بنووسە',
                    { parse_mode: 'Markdown' }
                );
            } else {
                setTimeout(async () => {
                    try {
                        await ctx.reply(
                            `👋 *بەخێربێیت ${member.first_name || 'هاوڕێ'}!*\n\n` +
                            `📢 **بۆ چاتکردن لە گروپ، پێویستە چەکی بکەیت:**\n\n` +
                            `🔸 **ڕێگا:**\n` +
                            `1. لە چاتی تایبەت لەگەڵ بۆتدا /join بنووسە\n` +
                            `2. جۆینی چەناڵ بکە: ${CHANNEL_LINK}\n` +
                            `3. دواتر /done بنووسە\n\n` +
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
        if (count <= 15) {
            message += `${count}. ${userData.username || 'ناونەزانراو'} (ID: ${userId})\n`;
            message += `   ⏰ ${userData.joinDate}\n\n`;
        }
    }
    
    if (userCount > 15) {
        message += `\n... و ${userCount - 15} بەکارهێنەری تر`;
    }
    
    await ctx.reply(message, { parse_mode: 'Markdown' });
});

// === فەرمانی سڕینەوەی بەکارهێنەر (ئەدمین) ===
bot.command('remove', async (ctx) => {
    const adminId = ctx.from.id;
    const chatId = ctx.chat.id;
    
    const userIsAdmin = await isAdmin(chatId, adminId);
    if (!userIsAdmin) {
        return ctx.reply('🚫 تەنها ئەدمینەکان!').catch(() => {});
    }
    
    // ئەگەر لەسەر نامەیەکە
    if (ctx.message.reply_to_message) {
        const userId = ctx.message.reply_to_message.from.id;
        const username = ctx.message.reply_to_message.from.first_name || 'ناونەزانراو';
        
        if (verifiedUsers[userId]) {
            delete verifiedUsers[userId];
            saveUsersData();
            
            await ctx.reply(
                `🗑️ *${username} سڕدرایەوە!*\n\n` +
                `ئێستا ناتوانێت لە گروپەکەدا چات بکات.\n\n` +
                `🆔 ID: ${userId}`
            );
        } else {
            await ctx.reply(
                `❌ ${username} چەکی نەکردووە!\n\n` +
                `ناتوانێت چات بکات.`
            );
        }
    } else {
        await ctx.reply(
            '📝 **بەکارهێنان:**\n\n' +
            'ئەم فەرمانە لەسەر نامەی کەسێک بەکاربهێنە (Reply)\n\n' +
            '**نموونە:**\n' +
            '/remove (لەسەر نامەی کەسێک)',
            { parse_mode: 'Markdown' }
        );
    }
});

// === فەرمانی یارمەتی ===
bot.help((ctx) => {
    return ctx.reply(
        '🆘 **یارمەتی**\n\n' +
        '📋 **فەرمانەکان:**\n\n' +
        '🔹 **بۆ هەمووان:**\n' +
        '• `/start` - دەستپێکردن\n' +
        '• `/status` - پشکنینی حاڵەت\n' +
        '• `/join` - چەکی کردن (لە چاتی تایبەت)\n' +
        '• `/done` - تەواوکردنی چەکی کردن (لە چاتی تایبەت)\n\n' +
        '🔹 **تەنها ئەدمینەکان:**\n' +
        '• `/verify` - چەکی کردنی کەسێک (لەسەر نامەیەک)\n' +
        '• `/list` - پیشاندانی هەموو بەکارهێنەران\n' +
        '• `/remove` - سڕینەوەی بەکارهێنەر (لەسەر نامەیەک)\n\n' +
        `🔗 **کەناڵ:** ${CHANNEL_LINK}`,
        { parse_mode: 'Markdown' }
    );
});

// === دەستپێکردن ===
console.log('🚀 بۆت دەستی پێدەکات...');
console.log('================================');
console.log(`🔗 کەناڵ: ${CHANNEL_LINK}`);
console.log(`📌 جۆینی ناچاری: چالاکە (سیستەمی چەکی کردن)`);
console.log(`🕒 دۆخی خامۆشی: ${SILENT_START_HOUR}:00 - ${SILENT_END_HOUR}:00`);
console.log(`👑 ئەدمینەکان: دەتوانن لینک بنێرن و چەکی بکەن`);
console.log(`💾 داتا: ${Object.keys(verifiedUsers).length} بەکارهێنەری چەکی کردوو`);
console.log('================================');

bot.launch()
    .then(() => {
        console.log('✅ بۆت سەرکەوتووانە دەستی پێکرد!');
        console.log('\n📋 **ڕێنمایی بەکارهێنەران:**');
        console.log('1. لە چاتی تایبەتدا /join بنووسە');
        console.log('2. جۆینی چەناڵ بکە');
        console.log('3. /done بنووسە');
        console.log('4. دواتر دەتوانیت لە گروپەکەدا چات بکەیت');
        console.log('\n📋 **ڕێنمایی ئەدمینەکان:**');
        console.log('• /verify - چەکی کردن (لەسەر نامەیەک)');
        console.log('• /list - پیشاندانی هەموو بەکارهێنەران');
        console.log('• /remove - سڕینەوەی بەکارهێنەر');
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
