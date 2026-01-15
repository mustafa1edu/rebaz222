const { Telegraf, Markup } = require('telegraf');

const bot = new Telegraf('8488987568:AAEyqbl5maD3bmiCucLelCOC7StOLWc9PEs');

// === ڕێکخستنەکان ===
const CHANNEL_USERNAME = '@RebazAsaadku';
const CHANNEL_LINK = 'https://t.me/RebazAsaadku';
const CHANNEL_ID = -1001861873095;
const SILENT_START_HOUR = 0;   // 12 شەو
const SILENT_END_HOUR = 7;     // 7 بەیانی

// === گروپی دیاریکراو ===
const TARGET_GROUP_USERNAME = 'ArabicRebazAsaad';
const TARGET_GROUP_LINK = 'https://t.me/ArabicRebazAsaad';
// IDی گروپەکە پێویستە بدۆزرێتەوە، بە زوویی ئۆتۆماتیکی دەدۆزرێتەوە
let TARGET_GROUP_ID = null;

// === حاڵەتی جۆینی بەکارهێنەران ===
const userJoinCache = new Map();

// === تۆمارکردنی کاتی ئاگاداریەکان ===
let silentStartNotifiedToday = false;
let silentEndNotifiedToday = false;
let lastNotificationDate = null;

// === پشکنینی کاتی خامۆشی ===
function isSilentTime() {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const localHour = (utcHour + 3) % 24; // +3 بۆ کاتی هەولێر (UTC+3)
    return localHour >= SILENT_START_HOUR && localHour < SILENT_END_HOUR;
}

// === پشکنینی کاتی ئێستا ===
function getCurrentTime() {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const localHour = (utcHour + 3) % 24;
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    return { localHour, minutes, seconds };
}

// === پشکنینی ڕۆژی نوێ ===
function checkNewDay() {
    const today = new Date().toDateString();
    if (lastNotificationDate !== today) {
        lastNotificationDate = today;
        silentStartNotifiedToday = false;
        silentEndNotifiedToday = false;
        console.log(`📅 ڕۆژی نوێ: ${today} - تۆمارەکان پاککرانەوە`);
        return true;
    }
    return false;
}

// === دۆزینەوەی IDی گروپ ===
async function findGroupId() {
    try {
        // ئەگەر پێشتر دۆزرایەوە، بەکاربهێنە
        if (TARGET_GROUP_ID) {
            return TARGET_GROUP_ID;
        }
        
        console.log(`🔍 دەستبەجێکردنی گروپ: ${TARGET_GROUP_USERNAME}`);
        
        // تاقی بکەرەوە بۆ دۆزینەوەی گروپەکە
        // لەڕێی ئەوەی کە بۆتەکە لە گروپەکەدایە، پێویستە ناوی گروپەکە لە سەرەتا دابماری بکەیت
        // ID ی گروپەکە ئۆتۆماتیکی دەدۆزرێتەوە کاتێک نامەیەک لە گروپەکەدا ببینرێت
        
        return null;
    } catch (error) {
        console.log('❌ هەڵە لە دۆزینەوەی IDی گروپ:', error.message);
        return null;
    }
}

// === ئاگاداری دەستپێکی خامۆشی ===
async function sendSilentStartNotification() {
    try {
        // پشکنین بکە ئەمڕۆ ئاگاداری نێردراوە یان نا
        checkNewDay();
        
        if (!TARGET_GROUP_ID) {
            console.log('⏳ چاوەڕوانی IDی گروپ...');
            return false;
        }
        
        if (!silentStartNotifiedToday) {
            const message = await bot.telegram.sendMessage(
                TARGET_GROUP_ID,
                `🔕 *دۆخی خامۆشی دەستی پێکرد!*\n\n` +
                `⏰ **کاتی خامۆشی:** ١٢ شەو تا ٧ بەیانی\n\n` +
                `⚠️ **تێبینی:** تەنها ئەدمینەکان دەتوانن لەم کاتەدا بنووسن. نامەکانی ئەندامان خۆکارانە دەسڕێنرێنەوە.`,
                { parse_mode: 'Markdown' }
            );
            
            silentStartNotifiedToday = true;
            console.log(`🔕 ئاگاداری دەستپێکی خامۆشی نێردرا بۆ گروپ: ${TARGET_GROUP_ID} (یەکجار لە ڕۆژێکدا)`);
            console.log(`📝 IDی پەیام: ${message.message_id}`);
            console.log(`🔗 لینکی گروپ: ${TARGET_GROUP_LINK}`);
            return true;
        } else {
            console.log(`ℹ️ ئەمڕۆ پێشتر ئاگاداری دەستپێکی خامۆشی نێردراوە بۆ گروپ: ${TARGET_GROUP_ID}`);
            return false;
        }
    } catch (error) {
        console.log('❌ هەڵە لە ناردنی ئاگاداری دەستپێکی خامۆشی:', error.message);
        return false;
    }
}

// === ئاگاداری کۆتایی خامۆشی ===
async function sendSilentEndNotification() {
    try {
        // پشکنین بکە ئەمڕۆ ئاگاداری نێردراوە یان نا
        checkNewDay();
        
        if (!TARGET_GROUP_ID) {
            console.log('⏳ چاوەڕوانی IDی گروپ...');
            return false;
        }
        
        if (!silentEndNotifiedToday) {
            const message = await bot.telegram.sendMessage(
                TARGET_GROUP_ID,
                `🔔 *دۆخی خامۆشی کۆتایی هات!*\n\n` +
                `⏰ **کاتی خامۆشی تەواو بوو**\n\n` +
                `✅ **ئێستا هەمووان دەتوانن چات بکەن!**`,
                { parse_mode: 'Markdown' }
            );
            
            silentEndNotifiedToday = true;
            console.log(`🔔 ئاگاداری کۆتایی خامۆشی نێردرا بۆ گروپ: ${TARGET_GROUP_ID} (یەکجار لە ڕۆژێکدا)`);
            console.log(`📝 IDی پەیام: ${message.message_id}`);
            console.log(`🔗 لینکی گروپ: ${TARGET_GROUP_LINK}`);
            return true;
        } else {
            console.log(`ℹ️ ئەمڕۆ پێشتر ئاگاداری کۆتایی خامۆشی نێردراوە بۆ گروپ: ${TARGET_GROUP_ID}`);
            return false;
        }
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

// === چاودێری هەموو نامەکان ===
bot.on('message', async (ctx) => {
    if (ctx.chat.type !== 'group' && ctx.chat.type !== 'supergroup') {
        return;
    }
    
    const userId = ctx.from.id;
    const chatId = ctx.chat.id;
    const chatUsername = ctx.chat.username || '';
    const text = ctx.message.text || ctx.message.caption || '';
    const username = ctx.from.first_name || 'ناونەزانراو';
    const messageId = ctx.message.message_id;
    
    // === تۆمارکردنی IDی گروپەکە ئەگەر ناوی گروپەکە هەبێت ===
    if ((chatUsername && chatUsername.toLowerCase() === TARGET_GROUP_USERNAME.toLowerCase()) || 
        (ctx.chat.title && ctx.chat.title.includes('ArabicRebazAsaad'))) {
        
        if (!TARGET_GROUP_ID || TARGET_GROUP_ID !== chatId) {
            TARGET_GROUP_ID = chatId;
            console.log(`🎯 گروپی دیاریکراو دۆزرایەوە!`);
            console.log(`   نام: ${ctx.chat.title}`);
            console.log(`   ID: ${chatId}`);
            console.log(`   Username: @${chatUsername}`);
            console.log(`   لینک: ${TARGET_GROUP_LINK}`);
        }
    }
    
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
        
        // تەنها کاتێک پشکنین بکە کە خولەک بگۆڕێت
        if (minutes === lastCheckMinute) {
            return;
        }
        
        lastCheckMinute = minutes;
        
        // پشکنینی ڕۆژی نوێ
        checkNewDay();
        
        // پشکنین بۆ کاتی ئاگاداریەکان (تەنها لە سەرەتای کاتژمێردا)
        if (minutes === 0) {
            console.log(`🔄 پشکنینی کات: ${localHour}:${minutes < 10 ? '0' + minutes : minutes}`);
            console.log(`🎯 گروپ: ${TARGET_GROUP_ID ? 'دۆزرایەوە (' + TARGET_GROUP_ID + ')' : 'نەدۆزرایەوە'}`);
            
            if (!TARGET_GROUP_ID) {
                console.log(`⚠️ ئاگاداری: IDی گروپ نەدۆزرایەوە. تکایە نامەیەک بنێرە لە گروپەکەدا.`);
                return;
            }
            
            // ئاگاداریە خۆکارەکان
            if (localHour === SILENT_START_HOUR) {
                console.log(`🔕 کاتی دەستپێکی خامۆشیە!`);
                await sendSilentStartNotification();
            } else if (localHour === SILENT_END_HOUR) {
                console.log(`🔔 کاتی کۆتایی خامۆشیە!`);
                await sendSilentEndNotification();
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
    message += `• ٧ بەیانی: پەیامی کۆتایی خامۆشی\n\n`;
    message += `🎯 **گروپی دیاریکراو:** ${TARGET_GROUP_LINK}`;
    
    await ctx.reply(message, { 
        parse_mode: 'Markdown',
        ...getJoinButton()
    });
});

// === فەرمانی تاقیکردنەوە ===
bot.command('test_silent_start', async (ctx) => {
    if (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup') {
        console.log(`🧪 فەرمانی تاقیکردنەوە: دەستپێکی خامۆشی بۆ گروپ ${ctx.chat.id}`);
        
        // پشکنین بکە ئەم گروپە گروپی دیاریکراوە یان نا
        if (ctx.chat.id === TARGET_GROUP_ID || 
            (ctx.chat.username && ctx.chat.username.toLowerCase() === TARGET_GROUP_USERNAME.toLowerCase())) {
            
            const sent = await sendSilentStartNotification();
            if (sent) {
                await ctx.reply('✅ ئاگاداری دەستپێکی خامۆشی نێردرا!');
            } else {
                await ctx.reply('ℹ️ ئەمڕۆ پێشتر ئاگاداری نێردراوە.');
            }
        } else {
            await ctx.reply('⚠️ ئەم فەرمانە تەنها بۆ گروپی دیاریکراو کار دەکات.');
        }
    }
});

bot.command('test_silent_end', async (ctx) => {
    if (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup') {
        console.log(`🧪 فەرمانی تاقیکردنەوە: کۆتایی خامۆشی بۆ گروپ ${ctx.chat.id}`);
        
        // پشکنین بکە ئەم گروپە گروپی دیاریکراوە یان نا
        if (ctx.chat.id === TARGET_GROUP_ID || 
            (ctx.chat.username && ctx.chat.username.toLowerCase() === TARGET_GROUP_USERNAME.toLowerCase())) {
            
            const sent = await sendSilentEndNotification();
            if (sent) {
                await ctx.reply('✅ ئاگاداری کۆتایی خامۆشی نێردرا!');
            } else {
                await ctx.reply('ℹ️ ئەمڕۆ پێشتر ئاگاداری نێردراوە.');
            }
        } else {
            await ctx.reply('⚠️ ئەم فەرمانە تەنها بۆ گروپی دیاریکراو کار دەکات.');
        }
    }
});

bot.command('group_info', async (ctx) => {
    if (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup') {
        const isTargetGroup = (ctx.chat.id === TARGET_GROUP_ID) || 
                             (ctx.chat.username && ctx.chat.username.toLowerCase() === TARGET_GROUP_USERNAME.toLowerCase());
        
        await ctx.reply(
            `📊 **زانیاری گروپ:**\n\n` +
            `• ناو: ${ctx.chat.title}\n` +
            `• ID: ${ctx.chat.id}\n` +
            `• Username: @${ctx.chat.username || 'نییە'}\n` +
            `• جۆر: ${ctx.chat.type}\n` +
            `• گروپی دیاریکراو: ${isTargetGroup ? '✅ بەڵێ' : '❌ نەخێر'}\n` +
            `• کاتی ئێستا: ${new Date().toLocaleTimeString()}\n` +
            `• دۆخی خامۆشی: ${isSilentTime() ? '🔕 چالاک' : '🔔 ناچالاک'}`,
            { parse_mode: 'Markdown' }
        );
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
        `• گروپی دیاریکراو: ${TARGET_GROUP_LINK}\n` +
        `• IDی گروپ: ${TARGET_GROUP_ID || 'هێشتا نەدۆزرایەوە'}`,
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
console.log(`🎯 **گروپی دیاریکراو:**`);
console.log(`   • ناو: @${TARGET_GROUP_USERNAME}`);
console.log(`   • لینک: ${TARGET_GROUP_LINK}`);
console.log(`   • ID: ${TARGET_GROUP_ID ? TARGET_GROUP_ID : 'هێشتا نەدۆزرایەوە'}`);
console.log(`📌 تایبەتمەندیەکان:`);
console.log(`   • ئاگاداریەکان تەنها بۆ گروپی دیاریکراو`);
console.log(`   • ئاگاداری یەکجارە بۆ دەستپێکی خامۆشی (کاتژمێر ١٢ شەو)`);
console.log(`   • ئاگاداری یەکجارە بۆ کۆتایی خامۆشی (کاتژمێر ٧ بەیانی)`);
console.log(`   • لە کاتی خامۆشیدا: تەنها نامەکان دەسڕێنرێنەوە (بێ ئاگاداری)`);
console.log('================================');

bot.launch()
    .then(() => {
        console.log('✅ بۆت سەرکەوتووانە دەستی پێکرد!');
        console.log('\n📋 **ڕێنمایی:**');
        console.log(`1. بۆتەکە زیاد بکە بۆ گروپ: ${TARGET_GROUP_LINK}`);
        console.log(`2. لە گروپەکەدا نامەیەک بنێرە بۆ دۆزینەوەی IDی گروپ`);
        console.log(`3. بۆتەکە خۆکارانە IDی گروپ دەدۆزێتەوە`);
        console.log(`4. ئاگاداریەکان خۆکارانە نێردرێن:`);
        console.log(`   • کاتژمێر ${SILENT_START_HOUR}:00: ئاگاداری دەستپێکی خامۆشی`);
        console.log(`   • کاتژمێر ${SILENT_END_HOUR}:00: ئاگاداری کۆتایی خامۆشی`);
        console.log('\n🔧 **فەرمانەکانی تاقیکردنەوە:**');
        console.log(`• /test_silent_start - تاقیکردنەوەی ئاگاداری دەستپێکی خامۆشی`);
        console.log(`• /test_silent_end - تاقیکردنەوەی ئاگاداری کۆتایی خامۆشی`);
        console.log(`• /group_info - پیشاندانی زانیاری گروپ`);
        console.log(`• /time - پیشاندانی کاتی ئێستا`);
        console.log(`• /status - پیشاندانی دۆخی ئێستا`);
    })
    .catch((err) => {
        console.error('❌ هەڵە:', err.message);
    });

// وەستاندنی ڕێک
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
