const { Telegraf } = require('telegraf');

const bot = new Telegraf('8544992144:AAG2fBwQBc7cyHOU6u7gkbzlODA3LtC-qaU');

// === کاتی خامۆشی بۆ کوردستان ===
function isSilentTime() {
    const now = new Date();
    
    // کاتی UTC (پاشەکشەی کوردستان: UTC+3)
    const utcHour = now.getUTCHours();
    
    // کاتی کوردستان = UTC + 3
    const kurdistanHour = (utcHour + 3) % 24;
    
    console.log(`🔍 UTC: ${utcHour}:00 | کوردستان: ${kurdistanHour}:00`);
    
    // دۆخی خامۆشی: ١٢ شەو (کاتژمێر ٠) تا ٧ بەیانی (کاتژمێر ٧)
    return kurdistanHour >= 0 && kurdistanHour < 7;
}

// === تەنها بۆ گروپ کار بکە ===
bot.use(async (ctx, next) => {
    if (ctx.chat && (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup')) {
        return next();
    }
    if (ctx.message && ctx.message.text && ctx.message.text.startsWith('/')) {
        return next();
    }
});

// === /start ===
bot.start((ctx) => {
    const isGroup = ctx.chat.type === 'group' || ctx.chat.type === 'supergroup';
    
    if (isGroup) {
        const status = isSilentTime() ? '🔴 چالاک' : '🟢 ناچالاک';
        
        return ctx.reply(
            '✅ *بۆت چالاکە لە گروپ!*\n\n' +
            '⚙️ *تایبەتمەندیەکان:*\n' +
            `• دۆخی خامۆشی: ${status}\n` +
            '• لینک = باند\n' +
            '• پێشوازی لە نوێیەکان\n\n' +
            '🕒 *کاتی خامۆشی:* ١٢ی شەو تا ٧ی بەیانی\n' +
            '📝 /silent بۆ پشکنینی دۆخ',
            { parse_mode: 'Markdown' }
        );
    } else {
        return ctx.reply(
            '⚠️ *ئەم بۆتە تەنها لە گروپ کاردەکات!*',
            { parse_mode: 'Markdown' }
        );
    }
});

// === /silent ===
bot.command('silent', (ctx) => {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const kurdistanHour = (utcHour + 3) % 24;
    
    let statusText = '';
    
    if (isSilentTime()) {
        statusText = 
            `🔴 *دۆخی خامۆشی: چالاکە!*\n\n` +
            `⏰ کات: ${kurdistanHour}:00\n` +
            `💤 لەم کاتەدا چات کردن قەدەغەکراوە\n` +
            `⏳ تا: ٧:٠٠ بەیانی`;
    } else {
        const hoursLeft = (24 - kurdistanHour) % 24;
        statusText = 
            `🟢 *دۆخی خامۆشی: ناچالاکە*\n\n` +
            `⏰ کات: ${kurdistanHour}:00\n` +
            `✅ چات کردن ڕێگەپێدراوە\n` +
            `⏳ کاتی خامۆشی لە ${hoursLeft} کاتژمێری داهاتوو`;
    }
    
    return ctx.reply(statusText, { parse_mode: 'Markdown' });
});

// === چاودێری نامەکان ===
bot.on('text', async (ctx) => {
    // تەنها لە گروپ
    if (ctx.chat.type !== 'group' && ctx.chat.type !== 'supergroup') return;
    
    const text = ctx.message.text;
    const userId = ctx.from.id;
    const chatId = ctx.chat.id;
    const messageId = ctx.message.message_id;
    
    console.log(`📨 لە گروپ: ${ctx.chat.title} | کات: ${new Date().toLocaleTimeString()}`);
    
    // پشکنینی لینک
    if (text && (text.includes('http://') || text.includes('https://') || text.includes('t.me/'))) {
        try {
            await ctx.deleteMessage();
            await ctx.banChatMember(userId);
            
            await ctx.reply(
                `🚫 *${ctx.from.first_name} باند کرا!*\nهۆکار: ناردنی لینک`,
                { parse_mode: 'Markdown' }
            );
            
            console.log(`🚨 باند: ${userId} - لینک: ${text.substring(0, 30)}`);
        } catch (error) {
            console.error('❌ هەڵەی باند:', error.message);
        }
        return;
    }
    
    // پشکنینی کاتی خامۆشی
    if (isSilentTime() && !text.startsWith('/')) {
        console.log(`🔕 دۆخی خامۆشی: نامەیەک ڕەد دەکەمەوە`);
        
        try {
            // تاقیکردنەوە: یەکەمجار نامەیەک بنێرە
            await ctx.reply(
                `🔕 *دۆخی خامۆشی!*\n` +
                `${ctx.from.first_name}، لەم کاتەدا چات کردن قەدەغەکراوە.\n` +
                `🕒 کات: ١٢ شەو - ٧ بەیانی\n` +
                `📊 /silent بۆ پشکنین`,
                { parse_mode: 'Markdown' }
            );
            
            // پاشان نامەکە بسڕەوە
            await ctx.deleteMessage();
            
            console.log(`✅ دۆخی خامۆشی: نامەی ${userId} سڕدرایەوە`);
            
        } catch (error) {
            console.error('❌ هەڵەی دۆخی خامۆشی:', error.message);
            
            // ئەگەر نەتوانرا بسڕدرێتەوە
            await ctx.reply(
                `⚠️ ${ctx.from.first_name}، لەم کاتەدا نەنووسە!\n` +
                `دۆخی خامۆشی چالاکە (١٢ شەو - ٧ بەیانی)`,
                { parse_mode: 'Markdown' }
            );
        }
    }
});

// === پێشوازی ===
bot.on('new_chat_members', async (ctx) => {
    const members = ctx.message.new_chat_members;
    
    for (const member of members) {
        const botInfo = await ctx.telegram.getMe();
        
        if (member.id === botInfo.id) {
            await ctx.reply(
                '🤖 *بۆت چالاک کرا!*\n\n' +
                'تکایە بۆت بکە بە ئەدمین.\n' +
                '📋 /help بۆ یارمەتی',
                { parse_mode: 'Markdown' }
            );
        } else {
            await ctx.reply(
                `✨ *بەخێربێیت ${member.first_name}!*\n` +
                `دڵخۆشین بەهاتنت.\n` +
                `📜 /silent بۆ زانیاری خامۆشی`,
                { parse_mode: 'Markdown' }
            );
        }
    }
});

// === /help ===
bot.help((ctx) => {
    return ctx.reply(
        '📚 *یارمەتی بۆت*\n\n' +
        '🔧 *ڕێگەپێدانە پێویستەکان:*\n' +
        '• سڕینەوەی نامە\n' +
        '• باندکردنی ئەندامان\n\n' +
        '⚙️ *تایبەتمەندیەکان:*\n' +
        '• دۆخی خامۆشی: ١٢ شەو - ٧ بەیانی\n' +
        '• لینک = باند\n' +
        '• پێشوازی\n\n' +
        '📝 *فەرمانەکان:*\n' +
        '/start - دەستپێکردن\n' +
        '/help - یارمەتی\n' +
        '/silent - دۆخی خامۆشی',
        { parse_mode: 'Markdown' }
    );
});

// === دەستپێکردن ===
console.log('🚀 بۆت دەستی پێدەکات...');
console.log('🕒 دۆخی خامۆشی: ١٢ شەو تا ٧ بەیانی');

// پشکنینی کات
const testTime = isSilentTime();
console.log(`🔍 پشکنینی کات: دۆخی خامۆشی ${testTime ? 'چالاکە' : 'ناچالاکە'}`);

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

