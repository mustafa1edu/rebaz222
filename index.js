const { Telegraf, Markup } = require('telegraf');

const bot = new Telegraf('8544992144:AAG2fBwQBc7cyHOU6u7gkbzlODA3LtC-qaU');

// === ڕێکخستنەکان ===
const CHANNEL_USERNAME = '@RebazAsaadku';
const CHANNEL_LINK = 'https://t.me/RebazAsaadku';
const CHANNEL_ID = -1001861873095; // ID ی چەناڵەکەت
const SILENT_START_HOUR = 0;   // 12 شەو
const SILENT_END_HOUR = 7;     // 7 بەیانی
const BAN_DURATION = 24 * 60 * 60; // ٢٤ کاتژمێر

// === حاڵەتی دۆخی خامۆشی ===
let silentModeActive = false;
let lastSilentMessageId = null;
let silentMessagesDeleted = 0;
let silentStartNotificationSent = false;
let silentEndNotificationSent = false;

// === داتا ===
const joinedUsers = new Set();

// === پشکنینی کاتی خامۆشی ===
function isSilentTime() {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const localHour = (utcHour + 3) % 24;
    const localMinute = now.getMinutes();
    
    const wasSilent = silentModeActive;
    silentModeActive = localHour >= SILENT_START_HOUR && localHour < SILENT_END_HOUR;
    
    // چێک بکە ئەگەر دۆخی خامۆشی گۆڕاوە
    if (wasSilent && !silentModeActive) {
        // دۆخی خامۆشی کۆتایی هاتووە
        silentStartNotificationSent = false;
        console.log('🔄 دۆخی خامۆشی کۆتایی هات');
    } else if (!wasSilent && silentModeActive) {
        // دۆخی خامۆشی دەستپێکردووە
        silentEndNotificationSent = false;
        console.log('🔄 دۆخی خامۆشی دەستپێکرد');
    }
    
    // چێک بکە بۆ ئاگاداریەکانی سەرەتا/کۆتایی
    if (silentModeActive && localHour === SILENT_START_HOUR && localMinute < 5 && !silentStartNotificationSent) {
        silentStartNotificationSent = true;
        return {
            isSilent: true,
            shouldNotify: true,
            notificationType: 'start'
        };
    }
    
    if (!silentModeActive && localHour === SILENT_END_HOUR && localMinute < 5 && !silentEndNotificationSent) {
        silentEndNotificationSent = true;
        return {
            isSilent: false,
            shouldNotify: true,
            notificationType: 'end'
        };
    }
    
    return {
        isSilent: silentModeActive,
        shouldNotify: false,
        notificationType: 'none'
    };
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
        console.log(`🔍 پشکنین بۆ ${userId} لە چەناڵ ${CHANNEL_ID}...`);
        
        const chatMember = await bot.telegram.getChatMember(CHANNEL_ID, userId);
        
        const isMember = ['creator', 'administrator', 'member'].includes(chatMember.status);
        
        console.log(`📊 ${userId} حاڵەت: ${chatMember.status} -> ئەندام: ${isMember}`);
        
        if (isMember) {
            joinedUsers.add(userId);
        }
        
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

// === سیستەمی دۆخی خامۆشی ===
async function handleSilentMode(ctx, username, userId, userIsAdmin) {
    const silentCheck = isSilentTime();
    
    // ئەگەر کاتی ئاگاداریەکەی سەرەتایە
    if (silentCheck.shouldNotify && silentCheck.notificationType === 'start') {
        await ctx.reply(
            `🌙 *شەو باش!*\n\n` +
            `🔕 **دۆخی خامۆشی دەستی پێکرد!**\n\n` +
            `⏰ **کاتی خامۆشی:**\n` +
            `١٢ شەو - ٧ بەیانی\n\n` +
            `🚫 **میمبەرە ئاساییەکان ناتوانن بنووسن**\n` +
            `👑 **تەنها ئەدمینەکان دەتوانن بنووسن**\n\n` +
            `📢 **تێبینی:**\n` +
            `نامەکان خۆکارانە دەسڕێنرێنەوە\n` +
            `دۆخی خامۆشی کاتژمێر ٧ بەیانی کۆتایی دێت`,
            { parse_mode: 'Markdown' }
        );
        return false;
    }
    
    // ئەگەر کاتی ئاگاداریەکەی کۆتاییە
    if (silentCheck.shouldNotify && silentCheck.notificationType === 'end') {
        await ctx.reply(
            `🌅 *بەیانی باش!*\n\n` +
            `✅ **دۆخی خامۆشی کۆتایی هات!**\n\n` +
            `⏰ کاتژمێر: ٧:٠٠ بەیانی\n` +
            `🎉 ئێستا هەمووان دەتوانن چات بکەن\n\n` +
            `📊 **ئامار:**\n` +
            `• ${silentMessagesDeleted} نامە سڕدرانەوە لە کاتی خامۆشیدا\n` +
            `• دۆخی خامۆشی کۆتایی هات`,
            { parse_mode: 'Markdown' }
        );
        silentMessagesDeleted = 0;
        return false;
    }
    
    // ئەگەر دۆخی خامۆشی چالاکە
    if (silentCheck.isSilent) {
        // ئەگەر ئەدمینە، ڕێگەپێبدە
        if (userIsAdmin) {
            return false;
        }
        
        // ئەگەر فەرمانێکی بۆتە، ڕێگەپێبدە
        const text = ctx.message.text || '';
        if (text.startsWith('/')) {
            return false;
        }
        
        // بۆ میمبەرە ئاساییەکان
        silentMessagesDeleted++;
        
        // سڕینەوەی نامە
        await ctx.deleteMessage().catch(e => console.log('❌ هەڵە لە سڕینەوە:', e.message));
        
        // ئاگاداری بەکارهێنەر
        await ctx.reply(
            `👤 *${username}*\n\n` +
            `🚫 **نامەکەت سڕدرایەوە لەبەر دۆخی خامۆشی!**\n\n` +
            `⏰ **کاتی خامۆشی چالاکە:**\n` +
            `١٢ شەو - ٧ بەیانی\n\n` +
            `👑 **تەنها ئەدمینەکان دەتوانن بنووسن**\n\n` +
            `📊 **ئامار:**\n` +
            `ئێستا ${silentMessagesDeleted} نامە سڕدرایەوە\n` +
            `کاتی خامۆشی: تا ٧ بەیانی`,
            { parse_mode: 'Markdown' }
        ).catch(e => console.log('❌ هەڵە:', e.message));
        
        return true;
    }
    
    return false;
}

// === فەرمانی چەکی کردنی خۆکار ===
bot.command('checkme', async (ctx) => {
    const userId = ctx.from.id;
    const username = ctx.from.first_name || 'هاوڕێ';
    
    // تەنها لە گروپ
    if (ctx.chat.type !== 'group' && ctx.chat.type !== 'supergroup') {
        return;
    }
    
    try {
        const isMember = await checkChannelMembership(userId);
        
        if (isMember) {
            await ctx.reply(
                `✅ *سوپاس ${username}!*\n\n` +
                `بۆتەکە بینی کە تۆ جۆینی چەناڵی کردوویت!\n\n` +
                `🎉 **ئێستا دەتوانیت لە گروپەکەدا چات بکەیت!**\n\n` +
                `📢 **تێبینی:**\n` +
                `لە کاتی خامۆشیدا تەنها ئەدمینەکان دەتوانن بنووسن.`,
                { parse_mode: 'Markdown' }
            );
        } else {
            await ctx.reply(
                `❌ *${username}، هێشتا جۆینی چەناڵی نەکردوویت!*\n\n` +
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
    } catch (error) {
        console.log('❌ هەڵە لە پشکنین:', error.message);
        await ctx.reply(
            `⚠️ **کێشەیەک هەیە ${username}!*\n\n` +
            `نەتوانرا پشکنین بکەم.\n` +
            `تکایە دووبارە هەوڵ بدە یان ئەدمینێک بانگی بکە.`,
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
        
        // === 2. پشکنینی پۆستی کەناڵ ===
        const isChannelPostResult = isChannelPost(ctx.message);
        if (isChannelPostResult) {
            console.log(`✅ پۆستی کەناڵ: ڕێگەپێدراوە`);
            return;
        }
        
        // === 3. پشکنینی جۆینی چەناڵ (ڕاستەقینە) ===
        let isVerified = joinedUsers.has(userId);
        
        // ئەگەر پێشتر چێک نەکراوە، چێکی بکە
        if (!isVerified && !userIsAdmin) {
            isVerified = await checkChannelMembership(userId);
        }
        
        if (!isVerified && !userIsAdmin) {
            console.log(`🚫 ${username} جۆینی چەناڵی نەکردووە! نامە دەسڕێتەوە.`);
            
            // سڕینەوەی نامە
            await ctx.deleteMessage().catch(e => console.log('❌ هەڵە لە سڕینەوە:', e.message));
            
            // ئاگاداری لە گروپ
            const warningMsg = await ctx.reply(
                `👤 *${username}*\n\n` +
                `🚫 **نامەکەت سڕدرایەوە!**\n\n` +
                `📌 **هۆکار:** تۆ جۆینی چەناڵی نەکردوویت\n\n` +
                `✅ **بۆ چاتکردن، تکایە:**\n` +
                `1. کلیک لەسەر دوگمەی خوارەوە بکە\n` +
                `2. جۆینی چەناڵ بکە\n` +
                `3. دواتر نامەیەک بنێرە\n\n` +
                `⚠️ **تێبینی:**\n` +
                `بۆتەکە خۆکارانە پشکنین دەکات کە جۆینی کردوویت یان نا.\n` +
                `هیچ فەرمانێک پێویست نییە!`,
                { 
                    parse_mode: 'Markdown',
                    ...getJoinButton()
                }
            ).catch(e => console.log('❌ هەڵە:', e.message));
            
            // سڕینەوەی ئاگاداریەکە دوای ١ خولەک
            if (warningMsg) {
                setTimeout(() => {
                    ctx.deleteMessage(warningMsg.message_id).catch(() => {});
                }, 60000);
            }
            
            return;
        }
        
        // === 4. پشکنینی دۆخی خامۆشی ===
        const isSilentMode = await handleSilentMode(ctx, username, userId, userIsAdmin);
        if (isSilentMode) {
            return;
        }
        
        // === 5. پشکنینی لینک ===
        const hasLink = containsLink(text);
        
        if (hasLink && !userIsAdmin) {
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
        
        // === 6. ئەگەر هەموو پشکنینەکان تێپەڕ بوون ===
        console.log(`✅ ${username}: نامەکە پەسند کرا`);
        
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
                    '📝 **ڕێگا بۆ چاتکردن:**\n' +
                    '1. کلیک لەسەر دوگمەی "📢 جۆینی چەناڵ" بکە\n' +
                    '2. جۆینی چەناڵ بکە\n' +
                    '3. دواتر نامەیەک بنێرە\n\n' +
                    '⚠️ **تێبینی:**\n' +
                    'بۆتەکە خۆکارانە پشکنین دەکات کە جۆینی کردوویت یان نا.',
                    { parse_mode: 'Markdown' }
                );
            } else {
                setTimeout(async () => {
                    try {
                        // پشکنین بۆ ئەوەی جۆینی کردووە یان نا
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
    
    if (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup') {
        const silentCheck = isSilentTime();
        const isMember = joinedUsers.has(userId);
        const userIsAdmin = await isAdmin(ctx.chat.id, userId);
        
        let message = `👋 *سڵاو ${username}!*\n\n`;
        
        if (isMember || userIsAdmin) {
            message += `✅ **تۆ جۆینی چەناڵی کردوویت!**\n`;
        } else {
            message += `❌ **تۆ هێشتا جۆینی چەناڵی نەکردوویت!**\n`;
        }
        
        if (silentCheck.isSilent) {
            message += `\n🌙 **دۆخی خامۆشی چالاکە!**\n`;
            message += `⏰ ١٢ شەو - ٧ بەیانی\n`;
            
            if (userIsAdmin) {
                message += `👑 **تۆ ئەدمینی، دەتوانی بنووسیت**\n`;
            } else {
                message += `🚫 **ناتوانی بنووسیت لەم کاتەدا**\n`;
            }
        } else {
            message += `\n🌅 **دۆخی خامۆشی ناچالاکە**\n`;
            message += `⏰ ٧ بەیانی - ١٢ شەو\n`;
            message += `✅ هەمووان دەتوانن بنووسن\n`;
        }
        
        if (!isMember && !userIsAdmin) {
            message += `\n📢 **بۆ چاتکردن:**\n`;
            message += `1. کلیک لەسەر دوگمە بکە\n`;
            message += `2. جۆینی چەناڵ بکە\n`;
            message += `3. دواتر نامەیەک بنێرە`;
        }
        
        await ctx.reply(message, { 
            parse_mode: 'Markdown',
            ...((isMember || userIsAdmin) ? {} : getJoinButton())
        });
    } else {
        // لە چاتی تایبەت
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
            `• دۆخی خامۆشی: ١٢ شەو - ٧ بەیانی\n\n` +
            `📞 **کێشەت هەیە؟** ئەدمینێک بانگی بکە.`,
            { 
                parse_mode: 'Markdown',
                ...getJoinButton()
            }
        );
    }
});

bot.command('status', async (ctx) => {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const localHour = (utcHour + 3) % 24;
    const minute = now.getMinutes();
    
    const silentCheck = isSilentTime();
    
    let status = `🕒 *کات: ${localHour}:${minute < 10 ? '0' + minute : minute}*\n\n`;
    
    if (silentCheck.isSilent) {
        status += '🌙 **دۆخی خامۆشی:** چالاکە\n';
        status += '🚫 میمبەرەکان ناتوانن بنووسن\n';
        status += '👑 تەنها ئەدمینەکان\n';
        status += `⏰ تا: ٧:٠٠ بەیانی\n\n`;
        status += `📊 ${silentMessagesDeleted} نامە سڕدرایەوە\n`;
    } else {
        status += '🌅 **دۆخی خامۆشی:** ناچالاکە\n';
        status += '✅ هەمووان دەتوانن بنووسن\n';
        status += `⏰ دۆخی خامۆشی: ١٢ شەو\n\n`;
    }
    
    status += `👥 کەسە جۆینی کردووەکان: ${joinedUsers.size}\n`;
    status += `🔗 کەناڵ: ${CHANNEL_LINK}`;
    
    ctx.reply(status, { parse_mode: 'Markdown' });
});

bot.command('silentinfo', async (ctx) => {
    const silentCheck = isSilentTime();
    const now = new Date();
    const utcHour = now.getUTCHours();
    const localHour = (utcHour + 3) % 24;
    const minute = now.getMinutes();
    
    if (silentCheck.isSilent) {
        // پێوانی کاتی ماوە
        const hoursLeft = 7 - localHour;
        const minutesLeft = 60 - minute;
        
        await ctx.reply(
            `🌙 **دۆخی خامۆشی چالاکە**\n\n` +
            `⏰ **کاتی ئێستا:** ${localHour}:${minute < 10 ? '0' + minute : minute}\n` +
            `⏳ **ماوەی دۆخی خامۆشی:**\n` +
            `• ${hoursLeft} کاتژمێر و ${minutesLeft} خولەک\n` +
            `• کۆتایی: ٧:٠٠ بەیانی\n\n` +
            `🚫 **میمبەرەکان:** ناتوانن بنووسن\n` +
            `👑 **ئەدمینەکان:** دەتوانن بنووسن\n\n` +
            `📊 **ئامار:**\n` +
            `• ${silentMessagesDeleted} نامە سڕدرایەوە\n` +
            `• ${joinedUsers.size} کەس جۆینی کردووە\n\n` +
            `⚠️ **تێبینی:**\n` +
            `دۆخی خامۆشی خۆکارانە کۆتایی دێت کاتژمێر ٧ بەیانی.`,
            { parse_mode: 'Markdown' }
        );
    } else {
        // پێوانی کاتی بۆ دەستپێکردنی دۆخی خامۆشی
        let hoursUntil = 0;
        let minutesUntil = 0;
        
        if (localHour < 12) {
            hoursUntil = 12 - localHour - 1;
            minutesUntil = 60 - minute;
        } else {
            hoursUntil = (24 - localHour) + 12 - 1;
            minutesUntil = 60 - minute;
        }
        
        await ctx.reply(
            `🌅 **دۆخی خامۆشی ناچالاکە**\n\n` +
            `⏰ **کاتی ئێستا:** ${localHour}:${minute < 10 ? '0' + minute : minute}\n` +
            `⏳ **کاتی دۆخی خامۆشی:**\n` +
            `• لە ${hoursUntil} کاتژمێر و ${minutesUntil} خولەک\n` +
            `• دەستپێ: ١٢:٠٠ شەو\n\n` +
            `✅ **میمبەرەکان:** دەتوانن بنووسن\n` +
            `👑 **ئەدمینەکان:** هەردووک کات دەتوانن بنووسن\n\n` +
            `📊 **ئامار:**\n` +
            `• ${joinedUsers.size} کەس جۆینی کردووە\n\n` +
            `⚠️ **تێبینی:**\n` +
            `دۆخی خامۆشی خۆکارانە دەستپێدەکات کاتژمێر ١٢ شەو.`,
            { parse_mode: 'Markdown' }
        );
    }
});

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
        
        try {
            const isMember = await checkChannelMembership(userId);
            
            await ctx.reply(
                `👤 *${username}*\n` +
                `🆔 ID: ${userId}\n` +
                `📊 جۆینی چەناڵ: ${isMember ? '✅ بەڵێ' : '❌ نەخێر'}\n\n` +
                `${isMember ? '✅ دەتوانێت چات بکات.' : '❌ ناتوانێت چات بکات.'}`,
                { parse_mode: 'Markdown' }
            );
        } catch (error) {
            await ctx.reply(
                `❌ **هەڵە لە پشکنینی ${username}!**\n\n` +
                `نەتوانرا پشکنین بکرێت.`,
                { parse_mode: 'Markdown' }
            );
        }
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
        '📋 **یاساکانی گروپ:**\n\n' +
        '🔸 **1. جۆینی چەناڵ:**\n' +
        'پێویستە جۆینی چەناڵ بکەیت بۆ چاتکردن\n' +
        'بۆتەکە خۆکارانە پشکنین دەکات\n\n' +
        '🔸 **2. دۆخی خامۆشی:**\n' +
        '⏰ ١٢ شەو - ٧ بەیانی\n' +
        '🚫 میمبەرەکان ناتوانن بنووسن\n' +
        '👑 تەنها ئەدمینەکان\n\n' +
        '🔸 **3. لینک:**\n' +
        '🔗 تەنها ئەدمینەکان دەتوانن لینک بنێرن\n\n' +
        '🔸 **4. فەرمانەکان:**\n' +
        '• `/checkme` - پشکنینی حاڵەت\n' +
        '• `/status` - بارودۆخی گشتی\n' +
        '• `/silentinfo` - زانیاری دۆخی خامۆشی\n' +
        '• `/help` - یارمەتی\n\n' +
        '🔸 **5. بۆ ئەدمینەکان:**\n' +
        '• `/checkuser` - پشکنینی کەسێک\n\n' +
        `🔗 **کەناڵ:** ${CHANNEL_LINK}`,
        { parse_mode: 'Markdown' }
    );
});

// === کاتژمێرێک بۆ پشکنینی دۆخی خامۆشی ===
setInterval(() => {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const localHour = (utcHour + 3) % 24;
    const minute = now.getMinutes();
    
    // پشکنین بۆ دۆخی خامۆشی
    isSilentTime();
    
    // لۆگ بۆ پشکنین
    if (minute === 0) {
        console.log(`⏰ کات: ${localHour}:00 - دۆخی خامۆشی: ${silentModeActive ? 'چالاک' : 'ناچالاک'}`);
        console.log(`📊 ئامار: ${silentMessagesDeleted} نامە سڕدراوە - ${joinedUsers.size} بەکارهێنەر`);
    }
}, 60000); // هەر خولەکێک

// === دەستپێکردن ===
console.log('🚀 بۆت دەستی پێدەکات...');
console.log('================================');
console.log(`🔗 کەناڵ: ${CHANNEL_LINK}`);
console.log(`🆔 ID ی چەناڵ: ${CHANNEL_ID}`);
console.log(`🌙 دۆخی خامۆشی: ${SILENT_START_HOUR}:00 - ${SILENT_END_HOUR}:00 (UTC+3)`);
console.log(`👑 ئەدمینەکان: دەتوانن لینک بنێرن`);
console.log(`💾 سیستەم: پشکنینی ڕاستەقینەی جۆینی چەناڵ`);
console.log('================================');

bot.launch()
    .then(() => {
        console.log('✅ بۆت سەرکەوتووانە دەستی پێکرد!');
        console.log('\n📋 **تایبەتمەندیەکان:**');
        console.log('1. پشکنینی ڕاستەقینەی جۆینی چەناڵ');
        console.log('2. دۆخی خامۆشی (١٢ شەو - ٧ بەیانی)');
        console.log('3. لینک باند بۆ میمبەرە ئاساییەکان');
        console.log('4. دوگمەی جۆینی چەناڵ');
        console.log('5. ئاگاداریە خۆکارەکان');
    })
    .catch((err) => {
        console.error('❌ هەڵە:', err.message);
    });

// وەستاندنی ڕێک
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
