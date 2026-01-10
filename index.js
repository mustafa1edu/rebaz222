const { Telegraf } = require('telegraf');

const bot = new Telegraf('8544992144:AAG2fBwQBc7cyHOU6u7gkbzlODA3LtC-qaU');

// === ڕێکخستنەکان ===
const CHANNEL_USERNAME = '@RebazAsaadku';
const CHANNEL_LINK = 'https://t.me/RebazAsaadku';
const SILENT_START_HOUR = 0;   // 12 شەو
const SILENT_END_HOUR = 7;     // 7 بەیانی
const BAN_DURATION = 24 * 60 * 60; // ٢٤ کاتژمێر

// === پشکنینی کاتی خامۆشی ===
function isSilentTime() {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const localHour = (utcHour + 3) % 24;  // کوردستان UTC+3
    return localHour >= SILENT_START_HOUR && localHour < SILENT_END_HOUR;
}

// === پشکنینی ئەندامی کەناڵ ===
async function isChannelPost(message) {
    // پشکنین ئەگەر نامە لە کەناڵەوە هاتووە
    if (message.forward_from_chat) {
        console.log(`📢 پۆستی کەناڵ: ${message.forward_from_chat.username}`);
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

// === ئاگادارکردنەوەی دۆخی خامۆشی ===
async function sendSilentModeNotification(chatId) {
    try {
        await bot.telegram.sendMessage(
            chatId,
            `🔕 *دۆخی خامۆشی چالاک کرا!*\n\n` +
            `⏰ لە کاتژمێر ١٢:٠٠ شەو تاوەکوو ٧:٠٠ بەیانی\n` +
            `🚫 چاتی گروپ داخراوە\n` +
            `👑 تەنها ئەدمینەکان دەتوانن بنووسن\n\n` +
            `📢 گروپ لە کاتژمێر ٧:٠٠ بەیانی دەکرێتەوە`,
            { parse_mode: 'Markdown' }
        );
        console.log(`✅ ئاگاداری دۆخی خامۆشی نێردرا بۆ ${chatId}`);
    } catch (error) {
        console.log('❌ هەڵە لە ناردنی ئاگاداری:', error.message);
    }
}

// === ئاگادارکردنەوەی کۆتایی دۆخی خامۆشی ===
async function sendSilentEndNotification(chatId) {
    try {
        await bot.telegram.sendMessage(
            chatId,
            `✅ *دۆخی خامۆشی کۆتایی هات!*\n\n` +
            `⏰ کاتژمێر ٧:٠٠ بەیانی\n` +
            `🎉 چاتی گروپ کرایەوە\n` +
            `💬 ئێستا دەتوانیت چات بکەیت\n\n` +
            `📢 دۆخی خامۆشی داهاتوو: کاتژمێر ١٢ شەو`,
            { parse_mode: 'Markdown' }
        );
        console.log(`✅ ئاگاداری کۆتایی دۆخی خامۆشی نێردرا بۆ ${chatId}`);
    } catch (error) {
        console.log('❌ هەڵە لە ناردنی ئاگاداری:', error.message);
    }
}

// === کرۆن جۆب بۆ پشکنینی کات ===
let lastSilentNotification = {};
let lastOpenNotification = {};

setInterval(async () => {
    try {
        const now = new Date();
        const utcHour = now.getUTCHours();
        const localHour = (utcHour + 3) % 24;
        const minute = now.getMinutes();
        
        // ئەگەر کاتژمێر ١٢ شەوە و هێشتا ئاگاداری نەنێردراوە
        if (localHour === SILENT_START_HOUR && minute < 5) {
            const chatIds = Object.keys(lastSilentNotification);
            for (const chatId of chatIds) {
                if (!lastSilentNotification[chatId] || Date.now() - lastSilentNotification[chatId] > 23 * 60 * 60 * 1000) {
                    await sendSilentModeNotification(chatId);
                    lastSilentNotification[chatId] = Date.now();
                    
                    // چاتی گروپ دابەزێنە
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
                        await bot.telegram.setChatPermissions(chatId, permissions);
                        console.log(`✅ چاتی گروپ داخراوە: ${chatId}`);
                    } catch (error) {
                        console.log(`❌ نەتوانرا چات ببەسترێت: ${error.message}`);
                    }
                }
            }
        }
        
        // ئەگەر کاتژمێر ٧ بەیانیە و هێشتا ئاگاداری نەنێردراوە
        if (localHour === SILENT_END_HOUR && minute < 5) {
            const chatIds = Object.keys(lastOpenNotification);
            for (const chatId of chatIds) {
                if (!lastOpenNotification[chatId] || Date.now() - lastOpenNotification[chatId] > 23 * 60 * 60 * 1000) {
                    await sendSilentEndNotification(chatId);
                    lastOpenNotification[chatId] = Date.now();
                    
                    // چاتی گروپ بکەرەوە
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
                        await bot.telegram.setChatPermissions(chatId, permissions);
                        console.log(`✅ چاتی گروپ کرایەوە: ${chatId}`);
                    } catch (error) {
                        console.log(`❌ نەتوانرا چات بکرێتەوە: ${error.message}`);
                    }
                }
            }
        }
    } catch (error) {
        console.log('❌ هەڵە لە کرۆن جۆب:', error.message);
    }
}, 60 * 1000);  // هەموو ١ خولەک

// === وەڵامی فەرمانەکان ===
bot.start((ctx) => {
    const chatId = ctx.chat.id;
    // تۆمارکردنی گروپ بۆ کرۆن جۆب
    if (!lastSilentNotification[chatId]) {
        lastSilentNotification[chatId] = 0;
        lastOpenNotification[chatId] = 0;
    }
    
    return ctx.reply(
        '🤖 *بەخێربێیت بۆ بۆتی گروپ!*\n\n' +
        '📋 *هەموو تایبەتمەندیەکان چالاکن:*\n' +
        '✅ دۆخی خامۆشی: ١٢ شەو - ٧ بەیانی\n' +
        '✅ لینک = باند (تەنها میمبەرەکان)\n' +
        '✅ جیاکردنەوەی ئەدمین/میمبەر\n' +
        '✅ پۆستی کەناڵ ڕێگەپێدراوە\n\n' +
        `🔗 *کەناڵی گروپ:* ${CHANNEL_LINK}\n\n` +
        `📝 *فەرمانەکان:*\n` +
        `/status - دۆخی ئێستا\n` +
        `/rules - یاساکان\n` +
        `/help - یارمەتی`,
        { parse_mode: 'Markdown' }
    );
});

bot.help((ctx) => {
    return ctx.reply(
        '🆘 *یارمەتی بۆت*\n\n' +
        '⚙️ *هەموو تایبەتمەندیەکان چالاکن:*\n' +
        '1. دۆخی خامۆشی (١٢شەو - ٧بەیانی)\n' +
        '2. لینک = باند (تەنها میمبەرەکان)\n' +
        '3. ئەدمینەکان دەتوانن لینک بنێرن\n' +
        '4. پۆستی کەناڵ ڕێگەپێدراوە\n\n' +
        '👑 *ئەدمینەکان:*\n' +
        '• دەتوانن لە هەموو کاتێکدا بنووسن\n' +
        '• دەتوانن لینک بنێرن\n\n' +
        '👥 *میمبەرەکان:*\n' +
        '• ناتوانن لینک بنێرن\n' +
        '• لە دۆخی خامۆشیدا ناتوانن بنووسن',
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
    
    // تۆمارکردنی گروپ بۆ کرۆن جۆب
    if (!lastSilentNotification[chatId]) {
        lastSilentNotification[chatId] = 0;
        lastOpenNotification[chatId] = 0;
    }
    
    console.log(`📨 ${username}: ${text.substring(0, 50)}`);
    
    try {
        // === پشکنینی پۆستی کەناڵ ===
        const isChannelPostResult = await isChannelPost(ctx.message);
        if (isChannelPostResult) {
            console.log(`✅ پۆستی کەناڵ: ڕێگەپێدراوە`);
            return;
        }
        
        // === پشکنینی ئەدمین ===
        const userIsAdmin = await isAdmin(chatId, userId);
        
        // === پشکنینی لینک (تەنها میمبەرە ئاساییەکان) ===
        if (text && (text.includes('http://') || text.includes('https://') || text.includes('t.me/'))) {
            console.log(`🔗 ${username} لینکی نارد (ئەدمین: ${userIsAdmin})`);
            
            // ئەگەر ئەدمینە، ڕێگەپێبدە
            if (userIsAdmin) {
                console.log(`✅ ئەدمینە: ڕێگەپێدراوە`);
                return;
            }
            
            // ئەگەر میمبەری ئاساییە
            console.log(`🚫 میمبەر: لینک دەسڕێتەوە + باند`);
            
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
        if (isSilentTime() && !text.startsWith('/')) {
            // ئەگەر ئەدمینە، ڕێگەپێبدە
            if (userIsAdmin) {
                console.log(`✅ ئەدمینە: ڕێگەپێدراوە لە دۆخی خامۆشیدا`);
                return;
            }
            
            // ئەگەر میمبەری ئاساییە
            console.log(`🔕 میمبەر: نامە دەسڕێتەوە (دۆخی خامۆشی)`);
            
            // سڕینەوەی نامە
            await ctx.deleteMessage().catch(e => console.log('Delete error:', e.message));
            
            return;
        }
        
        console.log(`✅ ${username}: نامەکە پەسند کرا`);
        
    } catch (error) {
        console.log('❌ هەڵە:', error.message);
        
        if (error.message.includes('not enough rights') || error.code === 400) {
            await ctx.reply(
                '⚠️ *کێشەی ڕێگەپێدان!*\n\n' +
                'تکایە بۆت بکە بە ئەدمین و ئەم ڕێگەپێدانانەم بدە:\n' +
                '• سڕینەوەی نامە\n' +
                '• باندکردنی ئەندامان\n' +
                '• گۆڕینی رێگەپێدانەکانی چات',
                { parse_mode: 'Markdown' }
            );
        }
    }
});

// === پێشوازی لە نوێیەکان ===
bot.on('new_chat_members', async (ctx) => {
    try {
        const chatId = ctx.chat.id;
        const members = ctx.message.new_chat_members;
        
        // تۆمارکردنی گروپ
        if (!lastSilentNotification[chatId]) {
            lastSilentNotification[chatId] = 0;
            lastOpenNotification[chatId] = 0;
        }
        
        for (const member of members) {
            const botInfo = await ctx.telegram.getMe();
            
            if (member.id === botInfo.id) {
                await ctx.reply(
                    '🤖 *بۆت چالاک کرا!*\n\n' +
                    '📋 *هەموو تایبەتمەندیەکان چالاکن:*\n' +
                    '✅ دۆخی خامۆشی (١٢شەو - ٧بەیانی)\n' +
                    '✅ لینک = باند (تەنها میمبەرەکان)\n' +
                    '✅ جیاکردنەوەی ئەدمین/میمبەر\n' +
                    '✅ پۆستی کەناڵ ڕێگەپێدراوە\n\n' +
                    '🔧 *ڕێگەپێدانە پێویستەکان:*\n' +
                    '• سڕینەوەی نامە\n' +
                    '• باندکردنی ئەندامان\n' +
                    '• گۆڕینی رێگەپێدانەکانی چات',
                    { parse_mode: 'Markdown' }
                );
            } else {
                setTimeout(async () => {
                    try {
                        await ctx.reply(
                            `👋 *بەخێربێیت ${member.first_name}!*\n\n` +
                            `📜 *یاساکانی گروپ:*\n` +
                            `1. لە ١٢ شەو تا ٧ بەیانی نەنووسە\n` +
                            `2. میمبەرەکان ناتوانن لینک بنێرن\n` +
                            `3. ئەدمینەکان دەتوانن لینک بنێرن\n` +
                            `4. پۆستی کەناڵ ڕێگەپێدراوە\n\n` +
                            `🔗 *کەناڵ:* ${CHANNEL_LINK}`,
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
        status += '⏰ کرایەوە لە: ٧:٠٠ بەیانی';
    } else {
        status += '🟢 *دۆخی خامۆشی:* ناچالاکە\n';
        status += '✅ چاتی گروپ کراوەە\n';
        status += '⏰ داخراوە لە: ١٢:٠٠ شەو';
    }
    
    status += `\n\n📋 *تایبەتمەندیەکان:*\n`;
    status += `• لینک = باند (میمبەرەکان)\n`;
    status += `• ئەدمینەکان دەتوانن لینک بنێرن\n`;
    status += `• پۆستی کەناڵ ڕێگەپێدراوە`;
    
    ctx.reply(status, { parse_mode: 'Markdown' });
});

bot.command('rules', (ctx) => {
    ctx.reply(
        '📜 *یاساکانی گروپ*\n\n' +
        '1. 🕒 *کاتی خامۆشی:*\n' +
        '   لە ١٢ شەو تا ٧ بەیانی چات کردن قەدەغەکراوە\n' +
        '   تەنها ئەدمینەکان دەتوانن بنووسن\n' +
        '   ئاگاداری دەنێردرێت لە ١٢ شەو و ٧ بەیانی\n\n' +
        '2. 🔗 *لینک:*\n' +
        '   میمبەرە ئاساییەکان ناتوانن لینک بنێرن\n' +
        '   ئەدمینەکان دەتوانن لینک بنێرن\n' +
        '   لینک = باندی ٢٤ کاتژمێر\n\n' +
        '3. 📢 *پۆستی کەناڵ:*\n' +
        '   هەموو پۆستێک لە کەناڵەوە ڕێگەپێدراوە\n' +
        '   ناسڕێتەوە و ناباندرێت\n\n' +
        '4. 👑 *ئەدمینەکان:*\n' +
        '   دەتوانن لە هەموو کاتێکدا بنووسن\n' +
        '   دەتوانن لینک بنێرن',
        { parse_mode: 'Markdown' }
    );
});

// === دەستپێکردن ===
console.log('🚀 بۆت دەستی پێدەکات...');
console.log('📋 هەموو تایبەتمەندیەکان چالاکن:');
console.log('✅ دۆخی خامۆشی (١٢شەو - ٧بەیانی)');
console.log('✅ لینک = باند (تەنها میمبەرەکان)');
console.log('✅ جیاکردنەوەی ئەدمین/میمبەر');
console.log('✅ پۆستی کەناڵ ڕێگەپێدراوە');
console.log('✅ ئاگاداری خۆکار لە ١٢ شەو و ٧ بەیانی');

bot.launch()
    .then(() => {
        console.log('✅ بۆت سەرکەوتووانە دەستی پێکرد!');
        console.log('⏰ کرۆن جۆب چالاکە بۆ ئاگادارییەکان');
    })
    .catch((err) => {
        console.error('❌ هەڵە:', err.message);
    });

// وەستاندنی ڕێک
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
