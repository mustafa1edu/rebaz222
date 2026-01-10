const { Telegraf } = require('telegraf');

const bot = new Telegraf('8544992144:AAG2fBwQBc7cyHOU6u7gkbzlODA3LtC-qaU');

// === ڕێکخستنەکان ===
const CHANNEL_USERNAME = '@RebazAsaadku';
const CHANNEL_LINK = 'https://t.me/RebazAsaadku';
const SILENT_START_HOUR = 0;   // 12 شەو
const SILENT_END_HOUR = 7;     // 7 بەیانی
const BAN_DURATION = 24 * 60 * 60; // ٢٤ کاتژمێر

// === حاڵەتی دۆخی خامۆشی ===
let silentModeActive = false;
let lastSilentNotificationSent = null;
let lastOpenNotificationSent = null;

// === پشکنینی کاتی خامۆشی ===
function isSilentTime() {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const localHour = (utcHour + 3) % 24;  // کوردستان UTC+3
    return localHour >= SILENT_START_HOUR && localHour < SILENT_END_HOUR;
}

// === پشکنینی پۆستی کەناڵ ===
async function isChannelPost(message) {
    // 1. پشکنین ئەگەر نامە لە کەناڵەوە هاتووە (فەراگۆش)
    if (message.forward_from_chat && message.forward_from_chat.type === 'channel') {
        console.log(`📢 پۆستی کەناڵ لە: ${message.forward_from_chat.username}`);
        return true;
    }
    
    // 2. پشکنین ئەگەر لە کەناڵی دیاریکراوەوە هاتووە
    if (message.forward_from_chat && message.forward_from_chat.username === CHANNEL_USERNAME.replace('@', '')) {
        console.log(`✅ پۆست لە کەناڵی دیاریکراوەوە: ${CHANNEL_USERNAME}`);
        return true;
    }
    
    // 3. پشکنین ئەگەر لە کەناڵێکەوە هاتووە (sender_chat)
    if (message.sender_chat && message.sender_chat.type === 'channel') {
        console.log(`📢 نامە لە کەناڵێکەوە: ${message.sender_chat.username}`);
        return true;
    }
    
    // 4. پشکنین بۆ نامەی کەناڵ لەڕێگەی بۆتەوە
    if (message.via_bot) {
        console.log(`🤖 نامە لەڕێگەی بۆتەوە: ${message.via_bot.username}`);
        // دەتوانیت ئەگەرت هەیە ڕێگەی پێبدەی یان نا
        return true; // یان false بەپێی ئارەزووی خۆت
    }
    
    return false;
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

// === داخستنی چات بۆ دۆخی خامۆشی ===
async function closeChatForSilentMode(ctx) {
    try {
        const permissions = {
            can_send_messages: false,
            can_send_media_messages: false,
            can_send_polls: false,
            can_send_other_messages: false,
            can_add_web_page_previews: false,
            can_change_info: false,
            can_invite_users: false,
            can_pin_messages: false
        };
        
        await ctx.telegram.setChatPermissions(ctx.chat.id, permissions);
        console.log(`✅ چاتی گروپ داخراوە (دۆخی خامۆشی)`);
        return true;
    } catch (permError) {
        console.log(`❌ نەتوانرا چات ببەسترێت: ${permError.message}`);
        return false;
    }
}

// === کردنەوەی چات دوای دۆخی خامۆشی ===
async function openChatAfterSilentMode(ctx) {
    try {
        const permissions = {
            can_send_messages: true,
            can_send_media_messages: true,
            can_send_polls: true,
            can_send_other_messages: true,
            can_add_web_page_previews: false,
            can_change_info: false,
            can_invite_users: true,
            can_pin_messages: false
        };
        
        await ctx.telegram.setChatPermissions(ctx.chat.id, permissions);
        console.log(`✅ چاتی گروپ کرایەوە (دوای دۆخی خامۆشی)`);
        return true;
    } catch (permError) {
        console.log(`❌ نەتوانرا چات بکرێتەوە: ${permError.message}`);
        return false;
    }
}

// === پشکنینی لینک ===
function containsLink(text) {
    if (!text) return false;
    
    // پشکنین بۆ جۆرەکانی لینک
    const linkPatterns = [
        /https?:\/\/[^\s]+/gi,          // http:// یان https://
        /t\.me\/[^\s]+/gi,              // t.me/links
        /@[a-zA-Z0-9_]{5,}/gi,          // @username
        /www\.[^\s]+\.[^\s]+/gi,        // www.example.com
        /\.[a-z]{2,}(\/|$)/gi           // .com, .org, .net etc
    ];
    
    return linkPatterns.some(pattern => pattern.test(text));
}

// === وەڵامی فەرمانەکان ===
bot.start((ctx) => {
    return ctx.reply(
        '🤖 *بەخێربێیت بۆ بۆتی گروپ!*\n\n' +
        '📋 *تایبەتمەندیەکان:*\n' +
        '• دۆخی خامۆشی: ١٢ شەو - ٧ بەیانی\n' +
        '• لینک = باند (تەنها میمبەرە ئاساییەکان)\n' +
        '• ئەدمینەکان دەتوانن لینک بنێرن\n' +
        '• پۆستی کەناڵ ڕێگەپێدراوە\n\n' +
        `🔗 *کەناڵی گروپ:* ${CHANNEL_LINK}\n\n` +
        '📜 *یاساکان:* /rules',
        { parse_mode: 'Markdown' }
    );
});

bot.help((ctx) => {
    return ctx.reply(
        '🆘 *یارمەتی*\n\n' +
        '📜 *یاساکان:* /rules\n\n' +
        '🔧 *فەرمانەکان:*\n' +
        '/start - دەستپێکردن\n' +
        '/help - یارمەتی\n' +
        '/status - بارودۆخی دۆخی خامۆشی\n' +
        '/rules - یاساکان\n' +
        '/silent - دۆخی خامۆشی (تەنها ئەدمین)\n' +
        '/open - کردنەوەی چات (تەنها ئەدمین)\n\n' +
        `🔗 *کەناڵ:* ${CHANNEL_LINK}`,
        { parse_mode: 'Markdown' }
    );
});

// === چاودێری هەموو نامەکان ===
bot.on('message', async (ctx) => {
    // تەنها لە گروپ
    if (ctx.chat.type !== 'group' && ctx.chat.type !== 'supergroup') {
        return;
    }
    
    const userId = ctx.from.id;
    const chatId = ctx.chat.id;
    const messageId = ctx.message.message_id;
    const text = ctx.message.text || ctx.message.caption || '';
    const username = ctx.from.first_name || 'ناونەزانراو';
    
    console.log(`📨 نامە لە: ${username} (${userId})`);
    
    try {
        // === 1. پشکنین ئەگەر پۆستی کەناڵە ===
        const isChannelPostResult = await isChannelPost(ctx.message);
        if (isChannelPostResult) {
            console.log(`✅ پۆستی کەناڵ: ڕێگەپێدراوە`);
            return;  // پۆستی کەناڵ ڕێگەپێبدە
        }
        
        // === 2. پشکنینی ئەدمین ===
        const userIsAdmin = await isAdmin(chatId, userId);
        
        // === 3. پشکنینی لینک ===
        const hasLink = containsLink(text);
        
        if (hasLink) {
            console.log(`🔗 ${username} لینکی نارد (ئەدمین: ${userIsAdmin})`);
            
            // ئەگەر ئەدمینە، ڕێگەپێبدە
            if (userIsAdmin) {
                console.log(`✅ ئەدمینە: ڕێگەپێدراوە`);
                return;
            }
            
            // ئەگەر میمبەری ئاساییە
            console.log(`🚫 میمبەری ئاسایی: لینک دەسڕێتەوە و باند دەکرێت`);
            
            // سڕینەوەی نامە
            await ctx.deleteMessage().catch(e => console.log('❌ هەڵە لە سڕینەوە:', e.message));
            
            // باندکردن بۆ ٢٤ کاتژمێر
            const untilDate = Math.floor(Date.now() / 1000) + BAN_DURATION;
            await ctx.banChatMember(userId, untilDate).catch(e => 
                console.log('❌ هەڵە لە باندکردن:', e.message)
            );
            
            await ctx.reply(
                `🚫 *${username} باند کرا بۆ ٢٤ کاتژمێر!*\n` +
                `📌 هۆکار: میمبەرە ئاساییەکان ناتوانن لینک بنێرن\n` +
                `👑 تەنها ئەدمینەکان دەتوانن لینک بنێرن`,
                { parse_mode: 'Markdown' }
            ).catch(e => console.log('❌ هەڵە لە ناردنی ئاگاداری:', e.message));
            
            return;
        }
        
        // === 4. پشکنینی دۆخی خامۆشی ===
        const silentTime = isSilentTime();
        
        if (silentTime) {
            console.log(`🕒 دۆخی خامۆشی: چالاکە (نامەی ${username})`);
            
            // ئەگەر ئەدمینە، ڕێگەپێبدە
            if (userIsAdmin) {
                console.log(`✅ ئەدمینە: ڕێگەپێدراوە لە دۆخی خامۆشیدا`);
                return;
            }
            
            // ئەگەر فەرمانێکی بۆتە (/command)، ڕێگەپێبدە
            if (text.startsWith('/')) {
                console.log(`✅ فەرمانی بۆت: ڕێگەپێدراوە`);
                return;
            }
            
            // بۆ میمبەرە ئاساییەکان
            console.log(`🚫 میمبەری ئاسایی: نامە دەسڕێتەوە لە دۆخی خامۆشیدا`);
            
            // سڕینەوەی نامە
            await ctx.deleteMessage().catch(e => console.log('❌ هەڵە لە سڕینەوە:', e.message));
            
            // ئاگادارکردنەوە تەنها یەکجار لە سەرەتای دۆخی خامۆشیدا
            const now = new Date();
            const today = now.toDateString();
            const utcHour = now.getUTCHours();
            const localHour = (utcHour + 3) % 24;
            
            // تەنها کاتێک کە تازە دۆخی خامۆشی دەستپێکردووە
            if (localHour === SILENT_START_HOUR) {
                if (!lastSilentNotificationSent || lastSilentNotificationSent !== today) {
                    // ئاگادارکردنەوە
                    await ctx.reply(
                        `🔕 *دۆخی خامۆشی دەستی پێکرد!*\n\n` +
                        `⏰ لە کاتژمێر ١٢:٠٠ شەو تاوەکوو ٧:٠٠ بەیانی\n` +
                        `🚫 میمبەرە ئاساییەکان ناتوانن چات بکەن\n` +
                        `👑 تەنها ئەدمینەکان دەتوانن بنووسن\n\n` +
                        `📢 چاتی گروپ داخراوە تا ٧ بەیانی`,
                        { parse_mode: 'Markdown' }
                    ).catch(e => console.log('❌ هەڵە لە ناردنی ئاگاداری:', e.message));
                    
                    lastSilentNotificationSent = today;
                    
                    // داخستنی چات
                    await closeChatForSilentMode(ctx);
                    silentModeActive = true;
                }
            }
            
            return;
        }
        
        // === 5. چاککردنی چات لە کاتێکی خامۆشی نەبوو ===
        if (!silentTime && silentModeActive) {
            const now = new Date();
            const today = now.toDateString();
            const utcHour = now.getUTCHours();
            const localHour = (utcHour + 3) % 24;
            
            // تەنها کاتێک کە تازە دۆخی خامۆشی کۆتایی هاتووە
            if (localHour === SILENT_END_HOUR) {
                if (!lastOpenNotificationSent || lastOpenNotificationSent !== today) {
                    // کردنەوەی چات
                    await openChatAfterSilentMode(ctx);
                    
                    await ctx.reply(
                        `✅ *چاتی گروپ کرایەوە!*\n\n` +
                        `🕒 کاتژمێر ٧:٠٠ بەیانی\n` +
                        `🎉 ئێستا هەمووان دەتوانن چات بکەن\n\n` +
                        `📢 دۆخی خامۆشی کۆتایی هات`,
                        { parse_mode: 'Markdown' }
                    ).catch(e => console.log('❌ هەڵە لە ناردنی ئاگاداری:', e.message));
                    
                    lastOpenNotificationSent = today;
                    silentModeActive = false;
                }
            }
        }
        
        console.log(`✅ ${username}: نامەکە پەسند کرا`);
        
    } catch (error) {
        console.log('❌ هەڵە لە چاودێری نامە:', error.message);
        
        // ئەگەر بۆت ئەدمین نییە
        if (error.message.includes('not enough rights') || error.code === 400 || error.message.includes('Chat admin rights')) {
            await ctx.reply(
                '⚠️ *کێشەی ڕێگەپێدان!*\n\n' +
                'تکایە بۆت بکە بە ئەدمین و ئەم ڕێگەپێدانانەم بدە:\n' +
                '• سڕینەوەی نامە\n' +
                '• باندکردنی ئەندامان\n' +
                '• گۆڕینی رێگەپێدانەکانی چات\n\n' +
                'بەم شێوەیە: ڕێکخستنەکان → ئەدمینەکان → بۆتەکە → ڕێگەپێدانەکان',
                { parse_mode: 'Markdown' }
            ).catch(e => console.log('❌ هەڵە لە ناردنی ئاگاداری:', e.message));
        }
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
                    '📋 *تکایە:*\n' +
                    '1. بۆت بکە بە ئەدمین\n' +
                    '2. ئەم ڕێگەپێدانانەم بدە:\n' +
                    '• سڕینەوەی نامە\n' +
                    '• باندکردنی ئەندامان\n' +
                    '• گۆڕینی رێگەپێدانەکانی چات\n\n' +
                    '🔧 *تایبەتمەندیەکان:*\n' +
                    '• دۆخی خامۆشی (١٢ شەو - ٧ بەیانی)\n' +
                    '• لینک = باند (تەنها میمبەرەکان)\n' +
                    '• ئەدمینەکان دەتوانن لینک بنێرن\n' +
                    '• پۆستی کەناڵ ڕێگەپێدراوە\n\n' +
                    `🔗 کەناڵ: ${CHANNEL_LINK}\n\n` +
                    '📜 یاساکان: /rules',
                    { parse_mode: 'Markdown' }
                ).catch(e => console.log('❌ هەڵە لە ناردنی ئاگاداری:', e.message));
            } else {
                setTimeout(async () => {
                    try {
                        await ctx.reply(
                            `👋 *بەخێربێیت ${member.first_name || 'هاوڕێ'}!*\n\n` +
                            `📢 *کەناڵی گروپ:* ${CHANNEL_LINK}\n\n` +
                            `📜 *یاساکان:*\n` +
                            `1. لە ١٢ شەو تا ٧ بەیانی نەنووسە\n` +
                            `2. لینک مەنێرە (باند دەبیت)\n` +
                            `3. ئەدمینەکان دەتوانن لینک بنێرن\n` +
                            `4. پۆستی کەناڵ ڕێگەپێدراوە\n\n` +
                            `ℹ️ یاساکانی تەواو: /rules`,
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

// === فەرمانەکان ===

// بارودۆخی دۆخی خامۆشی
bot.command('status', async (ctx) => {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const localHour = (utcHour + 3) % 24;
    const minute = now.getMinutes();
    
    const silentTime = isSilentTime();
    
    let status = `🕒 *کات: ${localHour}:${minute < 10 ? '0' + minute : minute}*\n\n`;
    
    if (silentTime) {
        status += '🔴 *دۆخی خامۆشی:* چالاکە\n';
        status += '🚫 چاتی گروپ داخراوە\n';
        status += '👑 تەنها ئەدمینەکان دەتوانن بنووسن\n';
        status += `⏰ تا: ${SILENT_END_HOUR}:٠٠ بەیانی\n\n`;
    } else {
        status += '🟢 *دۆخی خامۆشی:* ناچالاکە\n';
        status += '✅ چاتی گروپ کراوەە\n';
        status += `⏰ دۆخی خامۆشی: ${SILENT_START_HOUR}:٠٠ شەو\n\n`;
    }
    
    status += `🔗 *کەناڵ:* ${CHANNEL_LINK}\n`;
    status += `📊 *حاڵەت:* ${silentModeActive ? 'داخراوە' : 'کراوەە'}`;
    
    ctx.reply(status, { parse_mode: 'Markdown' }).catch(e => console.log('❌ هەڵە لە ناردنی status:', e.message));
});

// یاساکان
bot.command('rules', (ctx) => {
    ctx.reply(
        '📜 *یاساکانی گروپ*\n\n' +
        '1. 🕒 *کاتی خامۆشی:*\n' +
        '   لە ١٢ شەو تا ٧ بەیانی چات کردن قەدەغەکراوە\n' +
        '   تەنها ئەدمینەکان دەتوانن بنووسن\n\n' +
        '2. 🔗 *لینک:*\n' +
        '   میمبەرە ئاساییەکان ناتوانن لینک بنێرن\n' +
        '   ئەدمینەکان دەتوانن لینک بنێرن\n' +
        '   پۆستی کەناڵ ڕێگەپێدراوە\n\n' +
        '3. 👑 *ئەدمینەکان:*\n' +
        '   دەتوانن لە هەموو کاتێکدا بنووسن\n' +
        '   دەتوانن لینک بنێرن\n\n' +
        '4. 📢 *پۆستی کەناڵ:*\n' +
        '   هەموو پۆستێک لە کەناڵەوە ڕێگەپێدراوە\n\n' +
        '5. ℹ️ *کەناڵ:*\n' +
        `   ${CHANNEL_LINK}`,
        { parse_mode: 'Markdown' }
    ).catch(e => console.log('❌ هەڵە لە ناردنی rules:', e.message));
});

// دۆخی خامۆشی (تەنها ئەدمینەکان)
bot.command('silent', async (ctx) => {
    // تەنها لە گروپ
    if (ctx.chat.type !== 'group' && ctx.chat.type !== 'supergroup') {
        return;
    }
    
    // تەنها ئەدمینەکان
    const userIsAdmin = await isAdmin(ctx.chat.id, ctx.from.id);
    if (!userIsAdmin) {
        return ctx.reply('🚫 تەنها ئەدمینەکان دەتوانن ئەم فەرمانە بەکاربهێنن!').catch(() => {});
    }
    
    try {
        const success = await closeChatForSilentMode(ctx);
        if (success) {
            silentModeActive = true;
            lastSilentNotificationSent = new Date().toDateString();
            await ctx.reply(
                '🔕 *دۆخی خامۆشی چالاک کرا!*\n\n' +
                '🚫 چاتی گروپ داخراوە\n' +
                '👑 تەنها ئەدمینەکان دەتوانن بنووسن\n' +
                '⏰ بۆ کردنەوەی چات: /open',
                { parse_mode: 'Markdown' }
            ).catch(e => console.log('❌ هەڵە لە ناردنی silent:', e.message));
        } else {
            await ctx.reply('❌ نەتوانرا دۆخی خامۆشی چالاک بکرێت!').catch(() => {});
        }
    } catch (error) {
        await ctx.reply(`❌ هەڵە: ${error.message}`).catch(() => {});
    }
});

// کردنەوەی چات (تەنها ئەدمینەکان)
bot.command('open', async (ctx) => {
    // تەنها لە گروپ
    if (ctx.chat.type !== 'group' && ctx.chat.type !== 'supergroup') {
        return;
    }
    
    // تەنها ئەدمینەکان
    const userIsAdmin = await isAdmin(ctx.chat.id, ctx.from.id);
    if (!userIsAdmin) {
        return ctx.reply('🚫 تەنها ئەدمینەکان دەتوانن ئەم فەرمانە بەکاربهێنن!').catch(() => {});
    }
    
    try {
        const success = await openChatAfterSilentMode(ctx);
        if (success) {
            silentModeActive = false;
            lastOpenNotificationSent = new Date().toDateString();
            await ctx.reply(
                '✅ *چاتی گروپ کرایەوە!*\n\n' +
                '🎉 هەمووان دەتوانن چات بکەن\n' +
                '⏰ بۆ داخستنی چات: /silent',
                { parse_mode: 'Markdown' }
            ).catch(e => console.log('❌ هەڵە لە ناردنی open:', e.message));
        } else {
            await ctx.reply('❌ نەتوانرا چات بکرێتەوە!').catch(() => {});
        }
    } catch (error) {
        await ctx.reply(`❌ هەڵە: ${error.message}`).catch(() => {});
    }
});

// === کاتی خۆکار بۆ پشکنینی دۆخی خامۆشی ===
setInterval(() => {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const localHour = (utcHour + 3) % 24;
    const minute = now.getMinutes();
    
    // پشکنین بۆ دۆخی خامۆشی (تەنها لۆگ)
    if (localHour === SILENT_START_HOUR && minute === 0) {
        console.log(`⏰ ${SILENT_START_HOUR}:00 - دۆخی خامۆشی دەستپێدەکات`);
    }
    
    if (localHour === SILENT_END_HOUR && minute === 0) {
        console.log(`⏰ ${SILENT_END_HOUR}:00 - دۆخی خامۆشی کۆتایی دێت`);
    }
}, 60000); // هەر خولەکێک

// === دەستپێکردن ===
console.log('🚀 بۆت دەستی پێدەکات...');
console.log('================================');
console.log(`🔗 کەناڵ: ${CHANNEL_LINK}`);
console.log(`🕒 دۆخی خامۆشی: ${SILENT_START_HOUR}:00 - ${SILENT_END_HOUR}:00 (UTC+3)`);
console.log(`👑 ئەدمینەکان: دەتوانن لینک بنێرن`);
console.log(`📢 پۆستی کەناڵ: ڕێگەپێدراوە`);
console.log(`⚠️ لینک بۆ میمبەرە ئاساییەکان: باند + سڕینەوە`);
console.log('================================');
console.log('✅ بۆت چالاکە!');
console.log('👉 گرنگ: بۆت دەبێت ئەدمین بێت لە گروپەکەدا!');
console.log('👉 ڕێگەپێدانەکان: سڕینەوەی نامە + باندکردن + گۆڕینی چات');

bot.launch()
    .then(() => {
        console.log('🎉 بۆت سەرکەوتووانە دەستی پێکرد!');
    })
    .catch((err) => {
        console.error('❌ هەڵە لە دەستپێکردنی بۆت:', err.message);
        console.error('👉 تکایە چێکی بکە لە:');
        console.error('   1. تووکەنی بۆت (هێڵی 3)');
        console.error('   2. بۆت ئەدمینە لە گروپەکەدا');
        console.error('   3. ئینتەرنێتەکەت');
    });

// وەستاندنی ڕێک
process.once('SIGINT', () => {
    console.log('🛑 وەستاندن بە هێمای SIGINT');
    bot.stop('SIGINT');
});

process.once('SIGTERM', () => {
    console.log('🛑 وەستاندن بە هێمای SIGTERM');
    bot.stop('SIGTERM');
});
