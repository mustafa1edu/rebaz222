const { Telegraf } = require('telegraf');

const bot = new Telegraf('8544992144:AAG2fBwQBc7cyHOU6u7gkbzlODA3LtC-qaU');

// === ڕێکخستنەکان ===
const CHANNEL_USERNAME = '@RebazAsaadku';
const CHANNEL_LINK = 'https://t.me/RebazAsaadku';
const SILENT_START_HOUR = 0;   // 12 شەو
const SILENT_END_HOUR = 7;     // 7 بەیانی
const BAN_DURATION = 24 * 60 * 60; // ٢٤ کاتژمێر
const GROUP_CHAT_ID = -1001234567890; // ID گروپەکەت لێرە بنووسە

// === پشکنینی کاتی خامۆشی ===
function isSilentTime() {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const localHour = (utcHour + 3) % 24;  // کوردستان UTC+3
    return localHour >= SILENT_START_HOUR && localHour < SILENT_END_HOUR;
}

// === پشکنینی ئەندامی کەناڵ (فەراگۆش) ===
async function isChannelPost(message) {
    // پشکنین ئەگەر نامە لە کەناڵەوە هاتووە
    if (message.forward_from_chat) {
        console.log(`📢 پۆستی کەناڵ لە: ${message.forward_from_chat.username}`);
        return true;
    }
    
    // پشکنین ئەگەر لە کەناڵی دیاریکراوەوە هاتووە
    if (message.forward_from_chat && message.forward_from_chat.username === CHANNEL_USERNAME.replace('@', '')) {
        console.log(`✅ پۆست لە کەناڵی دیاریکراوەوە: ${CHANNEL_USERNAME}`);
        return true;
    }
    
    // پشکنین ئەگەر لە کەناڵەکەی خۆمانەوە هاتووە
    if (message.sender_chat && message.sender_chat.type === 'channel') {
        console.log(`📢 نامە لە کەناڵێکەوە: ${message.sender_chat.username}`);
        return true;
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

// === دووبارە چاککردنی چات ===
async function restoreChatPermissions(ctx) {
    try {
        const permissions = {
            can_send_messages: true,
            can_send_media_messages: true,
            can_send_polls: true,
            can_send_other_messages: true,
            can_add_web_page_previews: true,
            can_change_info: false,
            can_invite_users: true,
            can_pin_messages: false
        };
        
        await ctx.telegram.setChatPermissions(ctx.chat.id, permissions);
        console.log(`✅ چاتی گروپ کرایەوە (دوای دۆخی خامۆشی)`);
        
        await ctx.reply(
            `✅ *چاتی گروپ کرایەوە!*\n\n` +
            `🕒 کاتژمێر ٧:٠٠ بەیانی\n` +
            `🎉 ئێستا هەمووان دەتوانن چات بکەن`,
            { parse_mode: 'Markdown' }
        );
    } catch (permError) {
        console.log(`❌ نەتوانرا چات بکرێتەوە: ${permError.message}`);
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
    } catch (permError) {
        console.log(`❌ نەتوانرا چات ببەسترێت: ${permError.message}`);
    }
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
        `🔗 *کەناڵی گروپ:* ${CHANNEL_LINK}`,
        { parse_mode: 'Markdown' }
    );
});

bot.help((ctx) => {
    return ctx.reply(
        '🆘 *یارمەتی*\n\n' +
        '📜 *یاساکان:*\n' +
        '1. لە ١٢ شەو تا ٧ بەیانی چات نەکە\n' +
        '2. میمبەرە ئاساییەکان ناتوانن لینک بنێرن\n' +
        '3. ئەدمینەکان دەتوانن لینک بنێرن\n' +
        '4. پۆستی کەناڵ ڕێگەپێدراوە\n\n' +
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
    const text = ctx.message.text || '';
    const username = ctx.from.first_name;
    
    console.log(`📨 نامە لە: ${username} (${userId}): ${text.substring(0, 50)}`);
    
    try {
        // === پشکنین ئەگەر پۆستی کەناڵە ===
        const isChannelPostResult = await isChannelPost(ctx.message);
        if (isChannelPostResult) {
            console.log(`✅ پۆستی کەناڵ: ڕێگەپێدراوە`);
            return;  // پۆستی کەناڵ ڕێگەپێبدە
        }
        
        // === پشکنینی ئەدمین ===
        const userIsAdmin = await isAdmin(chatId, userId);
        
        // === پشکنینی لینک ===
        if (text && (text.includes('http://') || text.includes('https://') || text.includes('t.me/'))) {
            console.log(`🔗 ${username} لینکی نارد (ئەدمین: ${userIsAdmin})`);
            
            // ئەگەر ئەدمینە، ڕێگەپێبدە
            if (userIsAdmin) {
                console.log(`✅ ئەدمینە: ڕێگەپێدراوە`);
                return;
            }
            
            // ئەگەر میمبەری ئاساییە
            console.log(`🚫 میمبەری ئاسایی: لینک دەسڕێتەوە و باند دەکرێت`);
            
            // سڕینەوەی نامە
            await ctx.deleteMessage().catch(e => console.log('Delete error:', e.message));
            
            // باندکردن بۆ ٢٤ کاتژمێر
            const untilDate = Math.floor(Date.now() / 1000) + BAN_DURATION;
            await ctx.banChatMember(userId, untilDate);
            
            await ctx.reply(
                `🚫 *${username} باند کرا بۆ ٢٤ کاتژمێر!*\n` +
                `📌 هۆکار: میمبەرە ئاساییەکان ناتوانن لینک بنێرن\n` +
                `👑 تەنها ئەدمینەکان دەتوانن لینک بنێرن`,
                { parse_mode: 'Markdown' }
            );
            return;
        }
        
        // === پشکنینی دۆخی خامۆشی ===
        if (isSilentTime()) {
            console.log(`🕒 دۆخی خامۆشی: چالاکە (نامەی ${username})`);
            
            // ئەگەر ئەدمینە، ڕێگەپێبدە
            if (userIsAdmin) {
                console.log(`✅ ئەدمینە: ڕێگەپێدراوە لە دۆخی خامۆشیدا`);
                return;
            }
            
            // پشکنین بۆ ئەگەر نامە فەرمانێکی بۆت بێت (/command)
            if (text.startsWith('/')) {
                console.log(`✅ فەرمانی بۆت: ڕێگەپێدراوە`);
                return;
            }
            
            // بۆ میمبەرە ئاساییەکان
            console.log(`🚫 میمبەری ئاسایی: نامە دەسڕێتەوە`);
            
            // سڕینەوەی نامە
            await ctx.deleteMessage().catch(e => console.log('Delete error:', e.message));
            
            // ئاگادارکردنەوە تەنها یەکجار لە سەرەتای دۆخی خامۆشیدا
            const now = new Date();
            const utcHour = now.getUTCHours();
            const localHour = (utcHour + 3) % 24;
            const minute = now.getMinutes();
            
            // تەنها کاتێک کە تازە دۆخی خامۆشی دەستپێکردووە
            if (localHour === SILENT_START_HOUR && minute < 5) {
                // ئاگادارکردنەوە
                await ctx.reply(
                    `🔕 *دۆخی خامۆشی دەستی پێکرد!*\n\n` +
                    `⏰ لە کاتژمێر ١٢:٠٠ شەو تاوەکوو ٧:٠٠ بەیانی\n` +
                    `🚫 میمبەرە ئاساییەکان ناتوانن چات بکەن\n` +
                    `👑 تەنها ئەدمینەکان دەتوانن بنووسن\n\n` +
                    `📢 چاتی گروپ داخراوە تا ٧ بەیانی`,
                    { parse_mode: 'Markdown' }
                );
                
                // داخستنی چات
                await closeChatForSilentMode(ctx);
            }
            
            return;
        }
        
        // === چاککردنی چات لە کاتێکی خامۆشی نەبوو ===
        if (!isSilentTime()) {
            const now = new Date();
            const utcHour = now.getUTCHours();
            const localHour = (utcHour + 3) % 24;
            const minute = now.getMinutes();
            
            // تەنها کاتێک کە تازە دۆخی خامۆشی کۆتایی هاتووە
            if (localHour === SILENT_END_HOUR && minute < 5) {
                await restoreChatPermissions(ctx);
            }
        }
        
        console.log(`✅ ${username}: نامەکە پەسند کرا`);
        
    } catch (error) {
        console.log('❌ هەڵە:', error.message);
        
        // ئەگەر بۆت ئەدمین نییە
        if (error.message.includes('not enough rights') || error.code === 400) {
            await ctx.reply(
                '⚠️ *کێشەی ڕێگەپێدان!*\n\n' +
                'تکایە بۆت بکە بە ئەدمین و ئەم ڕێگەپێدانانەم بدە:\n' +
                '• سڕینەوەی نامە\n' +
                '• باندکردنی ئەندامان\n' +
                '• گۆڕینی رێگەپێدانەکانی چات\n\n' +
                'بەم شێوەیە: ڕێکخستنەکان → ئەدمینەکان',
                { parse_mode: 'Markdown' }
            );
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
                    '• پۆستی کەناڵ ڕێگەپێدراوە',
                    { parse_mode: 'Markdown' }
                );
            } else {
                setTimeout(async () => {
                    try {
                        await ctx.reply(
                            `👋 *بەخێربێیت ${member.first_name}!*\n\n` +
                            `📢 *کەناڵی گروپ:* ${CHANNEL_LINK}\n\n` +
                            `📜 *یاساکان:*\n` +
                            `1. لە ١٢ شەو تا ٧ بەیانی نەنووسە\n` +
                            `2. لینک مەنێرە (باند دەبیت)\n` +
                            `3. ئەدمینەکان دەتوانن لینک بنێرن\n` +
                            `4. پۆستی کەناڵ ڕێگەپێدراوە`,
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
bot.command('status', (ctx) => {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const localHour = (utcHour + 3) % 24;
    const minute = now.getMinutes();
    
    let status = `🕒 *کات: ${localHour}:${minute < 10 ? '0' + minute : minute}*\n\n`;
    
    if (isSilentTime()) {
        status += '🔴 *دۆخی خامۆشی:* چالاکە\n';
        status += '🚫 چاتی گروپ داخراوە\n';
        status += '👑 تەنها ئەدمینەکان دەتوانن بنووسن\n';
        status += '⏰ تا: ٧:٠٠ بەیانی';
    } else {
        status += '🟢 *دۆخی خامۆشی:* ناچالاکە\n';
        status += '✅ چاتی گروپ کراوەە';
    }
    
    ctx.reply(status, { parse_mode: 'Markdown' });
});

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
        '   هەموو پۆستێک لە کەناڵەوە ڕێگەپێدراوە\n' +
        '   پێویست نییە بچیتە ناو کەناڵەکەوە',
        { parse_mode: 'Markdown' }
    );
});

// === کاتژمێرێک بۆ پشکنینی دۆخی خامۆشی ===
setInterval(async () => {
    try {
        const now = new Date();
        const utcHour = now.getUTCHours();
        const localHour = (utcHour + 3) % 24;
        const minute = now.getMinutes();
        
        // ئەگەر کاتی دۆخی خامۆشیە و نزیکەی کاتژمێر 12ی شەوە
        if (localHour === SILENT_START_HOUR && minute === 0) {
            console.log('⏰ کاتی دۆخی خامۆشی!');
            // ئەمە بۆ ئەوەیە کە بۆتێکی تر بەکاربهێنیت بۆ ئاگادارکردنەوە
        }
        
        // ئەگەر کاتی کۆتایی دۆخی خامۆشیە و نزیکەی کاتژمێر 7ی بەیانیە
        if (localHour === SILENT_END_HOUR && minute === 0) {
            console.log('⏰ کاتی کۆتایی دۆخی خامۆشی!');
            // ئەمە بۆ ئەوەیە کە بۆتێکی تر بەکاربهێنیت بۆ ئاگادارکردنەوە
        }
    } catch (error) {
        console.log('Timer error:', error.message);
    }
}, 60000); // هەر خولەکێک جارێک

// === دەستپێکردن ===
console.log('🚀 بۆت دەستی پێدەکات...');
console.log(`🔗 کەناڵ: ${CHANNEL_LINK}`);
console.log(`🕒 دۆخی خامۆشی: ${SILENT_START_HOUR}:00 - ${SILENT_END_HOUR}:00`);
console.log(`👑 ئەدمینەکان: دەتوانن لینک بنێرن`);
console.log(`📢 پۆستی کەناڵ: ڕێگەپێدراوە`);

bot.launch()
    .then(() => {
        console.log('✅ بۆت سەرکەوتووانە دەستی پێکرد!');
        console.log('👉 گرنگ: بۆت دەبێت ئەدمین بێت لە گروپەکەدا!');
    })
    .catch((err) => {
        console.error('❌ هەڵە:', err.message);
    });

// وەستاندنی ڕێک
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
