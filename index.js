const { Telegraf, Markup } = require('telegraf');

const bot = new Telegraf('8544992144:AAG2fBwQBc7cyHOU6u7gkbzlODA3LtC-qaU');

// === ڕێکخستنەکان ===
const CHANNEL_USERNAME = '@RebazAsaadku';
const CHANNEL_LINK = 'https://t.me/RebazAsaadku';
const CHANNEL_ID = -1001861873095; // ID ی چەناڵەکەت لێرە بنووسە (ئەمە زۆر گرنگە!)
const SILENT_START_HOUR = 0;   // 12 شەو
const SILENT_END_HOUR = 7;     // 7 بەیانی
const BAN_DURATION = 24 * 60 * 60; // ٢٤ کاتژمێر

// === حاڵەتی جۆینی بەکارهێنەران ===
const userJoinCache = new Map(); // userId -> boolean (تەنها بۆ کێشەی خێرایی)

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

// === پشکنینی جۆینی چەناڵ (ڕاستەقینە) ===
async function checkChannelMembership(userId) {
    try {
        console.log(`🔍 پشکنین بۆ ${userId} لە چەناڵ...`);
        
        // پشکنین بۆ ئەوەی بەکارهێنەر ئەندامی چەناڵە
        const chatMember = await bot.telegram.getChatMember(CHANNEL_ID, userId);
        
        // status دەتوانێت بێت: 'creator', 'administrator', 'member', 'restricted', 'left', 'kicked'
        const isMember = ['creator', 'administrator', 'member'].includes(chatMember.status);
        
        console.log(`📊 ${userId} حاڵەت: ${chatMember.status} -> ئەندام: ${isMember}`);
        
        // کێشەکردن بۆ خێرایی
        userJoinCache.set(userId, isMember);
        
        return isMember;
        
    } catch (error) {
        console.log('❌ هەڵە لە پشکنینی ئەندامی چەناڵ:', error.message);
        
        // ئەگەر هەڵەیە، وەک ئەوە بینێ کە بەکارهێنەر ئەندام نییە
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
        
        // === 3. پشکنینی جۆینی چەناڵ (ڕاستەقینە) ===
        const isChannelMember = await checkChannelMembership(userId);
        
        if (!isChannelMember) {
            console.log(`🚫 ${username} جۆینی چەناڵت نەکردووە! نامە دەسڕێتەوە.`);
            
            // سڕینەوەی نامە
            await ctx.deleteMessage().catch(e => console.log('❌ هەڵە لە سڕینەوە:', e.message));
            
            // ئاگاداری لە گروپ لەگەڵ دوگمە
            const warningMsg = await ctx.reply(
                `👤 *${username}*\n\n` +
                `🚫 **نامەکەت سڕدرایەوە!**\n\n` +
                `📌 **هۆکار:** تۆ جۆینی چەناڵت نەکردووە\n\n` +
                `✅ **بۆ چاتکردن، تکایە:**\n` +
                `1. کلیک لەسەر دوگمەی خوارەوە بکە\n` +
                `2. جۆینی چەناڵ بکە\n` +
                `3. دواتر نامەیەکی نوێ بنێرە\n\n` +
                `⚠️ **تێبینی:**\n` +
                `بۆتەکە خۆکارانە پشکنین دەکات کە جۆینت کردووە یان نا.\n` +
                `هیچ فەرمانێک پێویست نییە!`,
                { 
                    parse_mode: 'Markdown',
                    ...getJoinButton()
                }
            ).catch(e => console.log('❌ هەڵە:', e.message));
            
            // سڕینەوەی ئاگاداریەکە دوای 1 خولەک
            if (warningMsg) {
                setTimeout(() => {
                    ctx.deleteMessage(warningMsg.message_id).catch(() => {});
                }, 60000);
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
        console.log(`✅ ${username} (جۆینی چەناڵی کردووە): نامەکە پەسند کرا`);
        
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
                    '1. **پێویستە جۆینی چەناڵ بکەیت** بۆ چاتکردن\n' +
                    '2. **لینک = سڕینەوە** (تەنها ئەدمینەکان)\n' +
                    '3. **دۆخی خامۆشی:** ١٢ شەو - ٧ بەیانی\n\n' +
                    `🔗 **کەناڵ (پێویستە):** ${CHANNEL_LINK}\n\n` +
                    '⚠️ **تێبینی:**\n' +
                    'بۆتەکە خۆکارانە پشکنین دەکات کە جۆینی کردوویت یان نا.\n' +
                    'هیچ فەرمانێک پێویست نییە!',
                    { parse_mode: 'Markdown' }
                );
            } else {
                setTimeout(async () => {
                    try {
                        // پشکنینی جۆینی چەناڵ بۆ نوێیەکە
                        const isMember = await checkChannelMembership(member.id);
                        
                        if (isMember) {
                            await ctx.reply(
                                `👋 *بەخێربێیت ${member.first_name || 'هاوڕێ'}!*\n\n` +
                                `✅ **تۆ جۆینی چەناڵی کردوویت!**\n` +
                                `دەتوانیت لە گروپەکەدا چات بکەیت.\n\n` +
                                `🔗 کەناڵ: ${CHANNEL_LINK}`,
                                { parse_mode: 'Markdown' }
                            );
                        } else {
                            await ctx.reply(
                                `👋 *بەخێربێیت ${member.first_name || 'هاوڕێ'}!*\n\n` +
                                `❌ **تۆ هێشتا جۆینی چەناڵی نەکردوویت!**\n\n` +
                                `📢 **بۆ چاتکردن لە گروپ، تکایە:**\n` +
                                `1. کلیک لەسەر دوگمەی خوارەوە بکە\n` +
                                `2. جۆینی چەناڵ بکە\n` +
                                `3. دواتر نامەیەک بنێرە\n\n` +
                                `⚠️ **تێبینی:**\n` +
                                `بۆتەکە خۆکارانە پشکنین دەکات.`,
                                { 
                                    parse_mode: 'Markdown',
                                    ...getJoinButton()
                                }
                            );
                        }
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

// === وەڵامی فەرمانەکان ===
bot.start(async (ctx) => {
    const userId = ctx.from.id;
    const username = ctx.from.first_name || 'هاوڕێ';
    
    // پشکنین ئەگەر لە گروپە
    if (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup') {
        const isChannelMember = await checkChannelMembership(userId);
        
        if (isChannelMember) {
            await ctx.reply(
                `👋 *سڵاو ${username}!*\n\n` +
                `✅ **تۆ جۆینی چەناڵی کردوویت!**\n` +
                `دەتوانیت لە گروپەکەدا چات بکەیت.\n\n` +
                `🔗 **کەناڵ:** ${CHANNEL_LINK}`
            );
        } else {
            await ctx.reply(
                `👋 *سڵاو ${username}!*\n\n` +
                `❌ **تۆ هێشتا جۆینی چەناڵی نەکردوویت!**\n\n` +
                `📢 **بۆ چاتکردن، تکایە:**\n` +
                `1. کلیک لەسەر دوگمەی خوارەوە بکە\n` +
                `2. جۆینی چەناڵ بکە\n` +
                `3. دواتر نامەیەک بنێرە\n\n` +
                `⚠️ **تێبینی:**\n` +
                `بۆتەکە خۆکارانە پشکنین دەکات کە جۆینی کردوویت یان نا.`,
                { 
                    parse_mode: 'Markdown',
                    ...getJoinButton()
                }
            );
        }
        return;
    }
    
    // ئەگەر لە چاتی تایبەتە
    await ctx.reply(
        `🤖 *بەخێربێیت ${username}!*\n\n` +
        `📋 **بۆ چاتکردن لە گروپ، پێویستە جۆینی چەناڵ بکەیت:**\n\n` +
        `🔸 **ڕێگا:**\n` +
        `1. کلیک لەسەر دوگمەی خوارەوە بکە\n` +
        `2. جۆینی چەناڵ بکە\n` +
        `3. دواتر لە گروپەکەدا نامەیەک بنێرە\n\n` +
        `⚠️ **تێبینیەکان:**\n` +
        `• بۆتەکە خۆکارانە پشکنین دەکات\n` +
        `• هیچ فەرمانێک پێویست نییە\n` +
        `• جۆین کردنت ڕیکۆرد ناکرێت - بۆتەکە ڕاستەوخۆ دەبینێت\n\n` +
        `📞 **کێشەت هەیە؟** ئەدمینێک بانگی بکە.`,
        { 
            parse_mode: 'Markdown',
            ...getJoinButton()
        }
    );
});

bot.command('check', async (ctx) => {
    const userId = ctx.from.id;
    const username = ctx.from.first_name || 'هاوڕێ';
    
    const isChannelMember = await checkChannelMembership(userId);
    
    if (isChannelMember) {
        await ctx.reply(
            `📊 **حاڵەتی ${username}**\n\n` +
            `✅ **جۆینی چەناڵی کردووە!**\n\n` +
            `🎉 **دەتوانیت لە گروپەکەدا چات بکەیت!**\n\n` +
            `🔗 کەناڵ: ${CHANNEL_LINK}`,
            { parse_mode: 'Markdown' }
        );
    } else {
        await ctx.reply(
            `📊 **حاڵەتی ${username}**\n\n` +
            `❌ **جۆینی چەناڵی نەکردووە!**\n\n` +
            `📢 **بۆ چاتکردن، تکایە:**\n` +
            `1. کلیک لەسەر دوگمەی خوارەوە بکە\n` +
            `2. جۆینی چەناڵ بکە\n` +
            `3. دواتر نامەیەک بنێرە\n\n` +
            `🔗 کەناڵ: ${CHANNEL_LINK}`,
            { 
                parse_mode: 'Markdown',
                ...getJoinButton()
            }
        );
    }
});

// === فەرمانی پشکنینی کەسێک (ئەدمین) ===
bot.command('checkuser', async (ctx) => {
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
        
        const isMember = await checkChannelMembership(userId);
        
        await ctx.reply(
            `👤 *${username}*\n` +
            `🆔 ID: ${userId}\n` +
            `📊 جۆینی چەناڵ: ${isMember ? '✅ بەڵێ' : '❌ نەخێر'}\n\n` +
            `${isMember ? '✅ دەتوانێت چات بکات.' : '❌ ناتوانێت چات بکات.'}`,
            { parse_mode: 'Markdown' }
        );
    } else {
        await ctx.reply(
            '📝 **بەکارهێنان:**\n' +
            'ئەم فەرمانە لەسەر نامەیەک بەکاربهێنە (Reply)\n\n' +
            '**نموونە:**\n' +
            '/checkuser (لەسەر نامەی کەسێک)',
            { parse_mode: 'Markdown' }
        );
    }
});

bot.help((ctx) => {
    return ctx.reply(
        '🆘 **یارمەتی**\n\n' +
        '📋 **ڕێنمایی:**\n\n' +
        '🔹 **بۆ چاتکردن:**\n' +
        '1. کلیک لەسەر دوگمەی "📢 جۆینی چەناڵ" بکە\n' +
        '2. جۆینی چەناڵ بکە\n' +
        '3. دواتر لە گروپەکەدا نامەیەک بنێرە\n\n' +
        '🔹 **فەرمانەکان:**\n' +
        '• `/start` - دەستپێکردن\n' +
        '• `/check` - پشکنینی حاڵەت\n' +
        '• `/help` - یارمەتی\n\n' +
        '🔹 **بۆ ئەدمینەکان:**\n' +
        '• `/checkuser` - پشکنینی کەسێک (لەسەر نامەیەک)\n\n' +
        `🔗 **کەناڵ:** ${CHANNEL_LINK}\n\n` +
        '⚠️ **تێبینی:**\n' +
        'بۆتەکە خۆکارانە پشکنین دەکات کە جۆینی کردوویت یان نا.\n' +
        'هیچ فەرمانێک پێویست نییە!',
        { parse_mode: 'Markdown' }
    );
});

// === فەرمانی چاککردنی کێشە ===
bot.command('fix', async (ctx) => {
    const userId = ctx.from.id;
    const username = ctx.from.first_name || 'هاوڕێ';
    
    // پاککردنی کێشە
    userJoinCache.delete(userId);
    
    // پشکنینی نوێ
    const isMember = await checkChannelMembership(userId);
    
    if (isMember) {
        await ctx.reply(
            `🔧 **چاککردنی کێشە بۆ ${username}**\n\n` +
            `✅ **پشکنینی نوێ:** جۆینی چەناڵی کردوویت!\n\n` +
            `🎉 **ئێستا دەتوانیت چات بکەیت!**\n\n` +
            `⚠️ ئەگەر هێشتا کێشەت هەیە، ئەدمینێک بانگی بکە.`,
            { parse_mode: 'Markdown' }
        );
    } else {
        await ctx.reply(
            `🔧 **چاککردنی کێشە بۆ ${username}**\n\n` +
            `❌ **پشکنینی نوێ:** هێشتا جۆینی چەناڵی نەکردوویت!\n\n` +
            `📢 **تکایە:**\n` +
            `1. کلیک لەسەر دوگمەی خوارەوە بکە\n` +
            `2. جۆینی چەناڵ بکە\n` +
            `3. دواتر نامەیەک بنێرە\n\n` +
            `🔗 کەناڵ: ${CHANNEL_LINK}`,
            { 
                parse_mode: 'Markdown',
                ...getJoinButton()
            }
        );
    }
});

// === دەستپێکردن ===
console.log('🚀 بۆت دەستی پێدەکات...');
console.log('================================');
console.log(`🔗 کەناڵ: ${CHANNEL_LINK}`);
console.log(`🆔 ID ی چەناڵ: ${CHANNEL_ID} (گرنگە!)`);
console.log(`📌 جۆینی ناچاری: چالاکە (پشکنینی ڕاستەقینە)`);
console.log(`🕒 دۆخی خامۆشی: ${SILENT_START_HOUR}:00 - ${SILENT_END_HOUR}:00`);
console.log(`👑 ئەدمینەکان: دەتوانن لینک بنێرن`);
console.log(`💾 سیستەم: خۆکارانە پشکنین دەکات`);
console.log('================================');

// پشکنین بۆ ID ی چەناڵ
if (CHANNEL_ID === -1001234567890) {
    console.log('\n⚠️ **ڕێنماییەکی گرنگ:**');
    console.log('تکایە ID ی ڕاستەقینەی چەناڵەکەت لە هێڵی 8 دا بنووسە:');
    console.log('const CHANNEL_ID = -1001234567890; // ← ئەمە بگۆڕە بۆ ID ی چەناڵەکەت');
    console.log('\n🔍 **بۆ دۆزینەوەی ID ی چەناڵ:**');
    console.log('1. @RawDataBot لە تێلێگرام دامەزرێنە');
    console.log('2. بچۆرە ناو چەناڵەکەتەوە');
    console.log('3. @RawDataBot بانگ بکە');
    console.log('4. ID ی چەناڵەکە ببینە (ئەوە ژمارەیەکی نەرێنیە وەک -1001234567890)');
}

bot.launch()
    .then(() => {
        console.log('✅ بۆت سەرکەوتووانە دەستی پێکرد!');
        console.log('\n📋 **ڕێنمایی بەکارهێنەران:**');
        console.log('1. نامەیەک بنێرە لە گروپ');
        console.log('2. ئەگەر جۆینی چەناڵی نەکردبیت، ئاگاداری دەردەکەوێت');
        console.log('3. کلیک لەسەر دوگمەی "📢 جۆینی چەناڵ"');
        console.log('4. جۆینی چەناڵ بکە');
        console.log('5. دواتر نامەیەکی نوێ بنێرە');
        console.log('6. بۆتەکە خۆکارانە پشکنین دەکات و ڕێگەت دەدات');
    })
    .catch((err) => {
        console.error('❌ هەڵە:', err.message);
    });

// وەستاندنی ڕێک
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));


