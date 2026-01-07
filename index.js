const { Telegraf } = require('telegraf');

const bot = new Telegraf('8544992144:AAG2fBwQBc7cyHOU6u7gkbzlODA3LtC-qaU');

// === تەنها بۆ گروپ کار بکە ===
bot.use(async (ctx, next) => {
    if (ctx.chat && (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup')) {
        return next();
    }
    if (ctx.message && ctx.message.text && ctx.message.text.startsWith('/')) {
        return next();
    }
});

// === فەرمانەکان ===
bot.start((ctx) => {
    const isGroup = ctx.chat.type === 'group' || ctx.chat.type === 'supergroup';
    
    if (isGroup) {
        return ctx.reply(
            '✅ *بۆت چالاکە لە گروپ!*\n\n' +
            '⚙️ تایبەتمەندیەکان:\n' +
            '• دۆخی خامۆشی: ١٢ شەو - ٧ بەیانی\n' +
            '• لینک = باند\n' +
            '• پێشوازی لە نوێیەکان\n\n' +
            '📝 /help بۆ یارمەتی',
            { parse_mode: 'Markdown' }
        );
    } else {
        return ctx.reply(
            '⚠️ *ئەم بۆتە تەنها لە گروپ کاردەکات!*\n\n' +
            'بۆ بەکارهێنان:\n' +
            '1. بۆت زیاد بکە بۆ گروپ\n' +
            '2. بیکە بە ئەدمین\n' +
            '3. ڕێگەپێدانەکان بدە',
            { parse_mode: 'Markdown' }
        );
    }
});

bot.help((ctx) => {
    return ctx.reply(
        '📚 *یارمەتی بۆت*\n\n' +
        '🔧 *ڕێگەپێدانە پێویستەکان:*\n' +
        '1. بۆت بکە بە ئەدمین\n' +
        '2. ئەم ڕێگەپێدانانە بدە:\n' +
        '   • سڕینەوەی نامە\n' +
        '   • باندکردنی ئەندامان\n' +
        '   • گۆڕینی زانیاری\n\n' +
        '⚙️ *تایبەتمەندیەکان:*\n' +
        '• لە ١٢ شەو تا ٧ بەیانی چات قەدەغەکراوە\n' +
        '• لینک = باندی ڕاستەوخۆ\n' +
        '• پێشوازی لە نوێیەکان',
        { parse_mode: 'Markdown' }
    );
});

// === چاودێری نامەکان ===
bot.on('text', async (ctx) => {
    // تەنها لە گروپ
    if (ctx.chat.type !== 'group' && ctx.chat.type !== 'supergroup') return;
    
    const text = ctx.message.text;
    const userId = ctx.from.id;
    const chatId = ctx.chat.id;
    const messageId = ctx.message.message_id;
    
    // پشکنینی لینک
    if (text && (text.includes('http://') || text.includes('https://') || text.includes('t.me/'))) {
        try {
            // سڕینەوەی نامە
            await ctx.deleteMessage();
            
            // باندکردنی بەکارهێنەر
            await ctx.banChatMember(userId);
            
            // نامەی ئاگادارکردنەوە
            await ctx.reply(
                `🚫 *${ctx.from.first_name} باند کرا!*\n` +
                `هۆکار: ناردنی لینک`,
                { parse_mode: 'Markdown' }
            );
            
            console.log(`Banned ${userId} for sending link`);
        } catch (error) {
            console.error('Ban error:', error.message);
            await ctx.reply(
                '⚠️ *کێشەی ڕێگەپێدان!*\n' +
                'تکایە بۆت بکە بە ئەدمین.',
                { parse_mode: 'Markdown' }
            );
        }
    }
    
    // پشکنینی کاتی خامۆشی (١٢ شەو - ٧ بەیانی)
    const now = new Date();
    const hour = now.getHours();
    if (hour >= 0 && hour < 7 && !text.startsWith('/')) {
        try {
            await ctx.deleteMessage();
            await ctx.reply(
                `🔕 *دۆخی خامۆشی!*\n` +
                `لەم کاتەدا چات کردن قەدەغەکراوە (١٢ شەو - ٧ بەیانی)`,
                { parse_mode: 'Markdown' }
            );
        } catch (error) {
            console.error('Silent mode error:', error.message);
        }
    }
});

// === پێشوازی لە نوێیەکان ===
bot.on('new_chat_members', async (ctx) => {
    const members = ctx.message.new_chat_members;
    
    for (const member of members) {
        // پشکنین ئەگەر بۆت خۆی بوو
        const botInfo = await ctx.telegram.getMe();
        if (member.id === botInfo.id) {
            await ctx.reply(
                '🤖 *بۆت چالاک کرا!*\n\n' +
                'تکایە بۆت بکە بە ئەدمین و ئەم ڕێگەپێدانانەم بدە:\n' +
                '• سڕینەوەی نامە\n' +
                '• باندکردنی ئەندامان',
                { parse_mode: 'Markdown' }
            );
        } else {
            // پێشوازی لە بەکارهێنەری نوێ
            await ctx.reply(
                `✨ *بەخێربێیت ${member.first_name}!*\n` +
                `خۆشی پێ دێنین کە هاتوویت بۆ گروپەکە.`,
                { parse_mode: 'Markdown' }
            );
        }
    }
});

// === دەستپێکردن ===
console.log('🚀 بۆت دەستی پێدەکات...');
console.log('🤖 بۆ تەنها گروپ کار دەکات');

bot.launch()
    .then(() => {
        console.log('✅ بۆت سەرکەوتووانە دەستی پێکرد!');
        console.log('👉 بۆت زیاد بکە بۆ گروپ و بیکە بە ئەدمین');
    })
    .catch((err) => {
        console.error('❌ هەڵە:', err.message);
    });

// وەستاندنی ڕێک
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));