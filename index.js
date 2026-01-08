const { Telegraf } = require('telegraf');

const bot = new Telegraf('8544992144:AAG2fBwQBc7cyHOU6u7gkbzlODA3LtC-qaU');

// === ڕێکخستنەکان ===
const CHANNEL_USERNAME = '@RebazAsaadku';  // ناوی کەناڵ
const SILENT_START_HOUR = 0;   // 12 شەو
const SILENT_END_HOUR = 7;     // 7 بەیانی

// === پشکنینی کاتی خامۆشی ===
function isSilentTime() {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const localHour = (utcHour + 3) % 24;  // کوردستان UTC+3
    
    return localHour >= SILENT_START_HOUR && localHour < SILENT_END_HOUR;
}

// === پشکنینی ئەندامی کەناڵ ===
async function isChannelMember(userId) {
    try {
        const chatMember = await bot.telegram.getChatMember(CHANNEL_USERNAME, userId);
        return ['member', 'administrator', 'creator'].includes(chatMember.status);
    } catch (error) {
        console.log('❌ هەڵە لە پشکنینی کەناڵ:', error.message);
        return true;  // ئەگەر کێشە هەبوو، ڕێگە بدە
    }
}

// === وەڵامی فەرمانەکان ===
bot.start((ctx) => {
    return ctx.reply(
        '🤖 *بەخێربێیت بۆ بۆتی گروپ!*\n\n' +
        '📋 *تایبەتمەندیەکان:*\n' +
        '• دۆخی خامۆشی لە ١٢ شەو تا ٧ بەیانی\n' +
        '• پێویستی جۆینکردنی کەناڵ\n' +
        '• باندکردنی لینک\n\n' +
        '🔗 *کەناڵی گروپ:*\n' +
        '👉 ' + CHANNEL_USERNAME,
        { parse_mode: 'Markdown' }
    );
});

bot.help((ctx) => {
    return ctx.reply(
        '🆘 *یارمەتی*\n\n' +
        '📜 *یاساکان:*\n' +
        '1. دەبێت ئەندامی کەناڵ بیت: ' + CHANNEL_USERNAME + '\n' +
        '2. لە ١٢ شەو تا ٧ بەیانی نەنووسە\n' +
        '3. لینک مەنێرە (باند دەبیت)\n\n' +
        '🔗 بۆ جۆینکردن:\n' +
        'https://t.me/RebazAsaadku',
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
    
    try {
        // === پشکنینی جۆینی کەناڵ ===
        const isMember = await isChannelMember(userId);
        
        if (!isMember) {
            await ctx.deleteMessage();
            
            await ctx.reply(
                `👤 *سڵاو ${ctx.from.first_name}*\n\n` +
                `🗑 نامەکانت دەسڕێتەوە بەهۆی ئەوەی جۆینی کەناڵی گروپت نەکردووە\n\n` +
                `✅ جۆین بکە پاشان نامەکانت کە دەینێریت ناسڕێتەوە\n\n` +
                `📢 کەناڵ: ${CHANNEL_USERNAME}\n` +
                `🔗 https://t.me/RebazAsaadku`,
                { parse_mode: 'Markdown' }
            );
            return;
        }
        
        // === پشکنینی دۆخی خامۆشی ===
        if (isSilentTime() && !text.startsWith('/')) {
            await ctx.deleteMessage();
            
            // تەنها یەکجار لە کاتی خۆی ئەم نامەیە دەنێردرێت
            const now = new Date();
            const utcHour = now.getUTCHours();
            const localHour = (utcHour + 3) % 24;
            
            if (localHour === SILENT_START_HOUR) {  // تەنها کاتێک کە ١٢ شەو دەبێت
                await ctx.reply(
                    `🔕 *دۆخی خامۆشی کارایە*\n\n` +
                    `⏰ لە کاتژمێر ١٢:٠٠ شەو تاوەکوو ٧:٠٠ بەیانی\n` +
                    `🚫 ناتوانیت چات بنێریت\n\n` +
                    `📅 کات: ${now.toLocaleTimeString('fa-IR')}`,
                    { parse_mode: 'Markdown' }
                );
            }
            return;
        }
        
        // === پشکنینی لینک ===
        if (text && (text.includes('http://') || text.includes('https://') || text.includes('t.me/'))) {
            await ctx.deleteMessage();
            await ctx.banChatMember(userId);
            
            await ctx.reply(
                `🚫 *${ctx.from.first_name} باند کرا!*\n` +
                `هۆکار: ناردنی لینک`,
                { parse_mode: 'Markdown' }
            );
            return;
        }
        
    } catch (error) {
        console.log('❌ هەڵە:', error.message);
        
        // ئەگەر بۆت ئەدمین نییە
        if (error.message.includes('not enough rights') || error.code === 400) {
            await ctx.reply(
                '⚠️ *کێشەی ڕێگەپێدان!*\n' +
                'تکایە بۆت بکە بە ئەدمین و ئەم ڕێگەپێدانانەم بدە:\n' +
                '• سڕینەوەی نامە\n' +
                '• باندکردنی ئەندامان',
                { parse_mode: 'Markdown' }
            );
        }
    }
});

// === پێشوازی لە نوێیەکان ===
bot.on('new_chat_members', async (ctx) => {
    const members = ctx.message.new_chat_members;
    
    for (const member of members) {
        const botInfo = await ctx.telegram.getMe();
        
        if (member.id === botInfo.id) {
            await ctx.reply(
                '🤖 *بۆت چالاک کرا!*\n\n' +
                '📋 *تکایە:*\n' +
                '1. بۆت بکە بە ئەدمین\n' +
                '2. ڕێگەپێدانەکان بدە\n' +
                '3. ئەندامان دەبێت جۆینی کەناڵ بن: ' + CHANNEL_USERNAME,
                { parse_mode: 'Markdown' }
            );
        } else {
            // پێشوازی لە بەکارهێنەری نوێ
            setTimeout(async () => {
                try {
                    await ctx.reply(
                        `👋 *بەخێربێیت ${member.first_name}!*\n\n` +
                        `📢 *تکایە:* جۆینی کەناڵ بکە پێش چاتکردن:\n` +
                        `👉 ${CHANNEL_USERNAME}\n` +
                        `🔗 https://t.me/RebazAsaadku`,
                        { parse_mode: 'Markdown' }
                    );
                } catch (error) {
                    console.log('Welcome error:', error.message);
                }
            }, 1500);
        }
    }
});

// === دەستپێکردن ===
console.log('🚀 بۆت دەستی پێدەکات...');
console.log('📢 کەناڵی پێویست:', CHANNEL_USERNAME);
console.log('🕒 دۆخی خامۆشی:', SILENT_START_HOUR + ':00 - ' + SILENT_END_HOUR + ':00');

bot.launch()
    .then(() => {
        console.log('✅ بۆت سەرکەوتووانە دەستی پێکرد!');
    })
    .catch((err) => {
        console.error('❌ هەڵە:', err.message);
    });

// وەستاندنی ڕێک
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
