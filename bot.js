const fs = require('fs').promises;
const { Client, Location } = require('./index');

let operator;
let moderators = [], groups = [];
let utm_tag = ''
let bot_phone;
let settings;

const mysql = require("mysql2");
const { isString } = require('util');
const pool = mysql.createPool({
    connectionLimit: 5,
    host: "localhost",
    user: "root",
    database: "wabot",
    password: "lolkek"
}).promise();


async function main() {
    await readSettings();
    await readModerators();
    await readGroups();
}

function wait(ms){
    var start = new Date().getTime();
    var end = start;
    while(end < start + ms) {
      end = new Date().getTime();
   }
 }

async function spam(text){
    let regex = new RegExp('((http|https|ftp|ftps)\\:\\/\\/[a-zA-Z0-9\\-\\.]+\\.[a-zA-Z]{2,3}(\\/\\S*)?)');
    let url = text.match(regex);
    let ans = text;
    if (url != null) {
        ans = text.replace(url[0], url[0] + settings.utm_tag);
    }
    groups.forEach(function(row) {
        (async() => {
            let chat = await client.getChatById(row);
            chat.sendStateTyping()
            await wait(3000);
            chat.clearState()
            client.sendMessage(row, ans);
        })();
    });
}

async function create_group(group) {
    let new_group = await client.getChatById(group);
    let invite_code = await new_group.getInviteCode();
    await wait(500);
    await new_group.setInfoAdminsOnly();
    await wait(500);
    await new_group.setMessagesAdminsOnly();
    await wait(500);
    await new_group.setDescription(settings.default_group_desc + invite_code)
    await wait(500);
    await new_group.promoteParticipants([operator]);
    pool.execute(`
        insert into \`groups\`(\`bot_id\`, \`group\`, \`invite_code\`) 
        select bot_id, '${notification.id.remote}', '${invite_code}' from bots
        where \`phone\` =  '${bot_phone}'
    `)
    .then( result => { })
    .catch(function(err) {
        console.log(err.message);
    });
    await main();
}

async function renew_group_description(){
    groups.forEach(function(row) {
        (async() => {
            let group = await client.getChatById(row);
            await wait(500);
            let invite_code = await group.getInviteCode();
            await wait(1000);
            await group.setDescription(settings.default_group_desc + invite_code)
        })();
    });
}

async function readModerators() {
    pool.query(`
        select b.moderator_id, b.number, b.access, d.moderator_id as operator from bots a 
        inner join moderators b on a.bot_id = b.bot_id
        inner join operators d on a.bot_id = d.bot_id
        where a.phone = '${bot_phone}'
    `)
    .then( result => {
        let array = [];
        result[0].forEach(function(row) {   
            array.push(row);      
            if (row.operator == row.moderator_id)
                operator = row.number;
        });
        moderators = array;
    })
    .catch(function(err) {
        console.log('Ошибка при чтении модераторов');
        console.log(err.message);
      });
}

async function renewInvites() {
    groups.forEach(function(row) {
        (async() => {
            let group = await client.getChatById(row);
            await wait(500);
            let invite_code = await group.getInviteCode();
            await wait(1000);
            pool.execute(`
                update \`groups\` set \`invite_code\` = '${invite_code}' where \`group\` = '${row}'
            `)
            .then( result => {})
            .catch(function(err) {
                console.log(err.message);
            });
        })();
    });
}

async function checkGroupLimit(group) {
    let chat = await client.getChatById(group);
    if (chat.participants.length > 240) {
        await wait(1000);
        chat.sendStateTyping()
        client.sendMessage(operator, 'В последней группе уже ' + chat.participants.length.toString() + ' человек, создайте новую');
    }
}

async function readSettings() {
    pool.query(`
        select * from bots a 
        left join \`settings\` b on a.bot_id = b.bot_id
        where a.phone = '${bot_phone}'
    `)
    .then( result => {
        if (result[0][0]['log_joins'] == null) {
            pool.execute('insert into `settings`(`bot_id`) values (' + result[0][0]['bot_id'] + ')')
        }
        else {
            settings = result[0][0];
            console.log(settings);
            if (result[0][0]['utm_tag'].indexOf('utm_source') != -1)
                utm_tag = result[0][0]['utm_tag']
        }
    })
    .catch(function(err) {
        console.log(err.message);
      });
}

async function readGroups() {
    pool.query(`
        select b.\`group\` from \`bots\` a 
        inner join \`groups\` b on a.\`bot_id\` = b.\`bot_id\`
        where a.\`phone\` = '${bot_phone}'
    `)
    .then( result => {
        let array = [];
        result[0].forEach(function(row) {   
            array.push(row.group);      
        });
        groups = array;
    })
    .catch(function(err) {
        console.log('Ошибка при чтении групп');
        console.log(err.message);
      });
}

const SESSION_FILE_PATH = './session.json';
let sessionCfg;

try {
    fs.stat(SESSION_FILE_PATH);
    sessionCfg = require(SESSION_FILE_PATH);
}
catch(e) { 
    console.log(e);
}
const client = new Client({ puppeteer: { headless: false }, session: sessionCfg });

client.initialize();

client.on('qr', (qr) => {
    console.log('QR RECEIVED', qr);
});

client.on('authenticated', (session) => {
    console.log('AUTHENTICATED', session);
    sessionCfg=session;
    fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function (err) {
        if (err) {
            console.error("Ошибка при аутенфикации: \n" + err);
        }
    });
});

client.on('auth_failure', msg => {
    console.error('AUTHENTICATION FAILURE', msg);
});

client.on('ready', () => {
    let info = client.info;
    bot_phone = info.me.user;
    main(bot_phone);
    console.log('READY');
});

client.on('message', async msg => {
    console.log('MESSAGE RECEIVED', msg);
    // Получаем чат
    const chat = await msg.getChat();
    // Отправляем что сообщение прочитано
    (async() => { await wait(5000); })();
    chat.sendSeen();
    ///////////////////////
    if (msg.from.indexOf('@g.us') == -1)
    {
        // Если сообщение от админа
        let isAdmin = false;
        let access;
        moderators.forEach(function(row) {   
            if (row.number.indexOf(msg.from) != -1) {
                isAdmin = true;
                access = parseInt(row.access);
            }
        });
        if (isAdmin) {
            // Если команда -
            if (msg.body.startsWith('.')) {
                if (msg.body.startsWith('.анонс')) {
                    (async() => { await spam(msg.body.replace('.анонс', '')); })();
                }
                else if (msg.body.startsWith('.удалить сообщение') && msg.hasQuotedMsg) {
                    const quotedMsg = await msg.getQuotedMessage();
                    for (let i = 0; i < groups.length; i++) {
                        let group_chat = await client.getChatById(group[i]);
                        let group_msgs = await group_chat.fetchMessages(Infinity);
                        for (let j = 0; j < group_msgs.length; j++) {
                            if (quotedMsg.body == group_msgs[j].body) {
                                group_msgs[j].delete(true);
                                break;
                            }
                        }
                    }
                }
                else if (msg.body.startsWith('.обновить инвайты групп')) {
                    (async() => { await renewInvites(); })();
                }
                else if (msg.body.startsWith('.обновить описание групп')) {
                    (async() => { await renew_group_description(); })();
                }
                else if (msg.body.startsWith('.обновить параметры')) {
                    msg.reply('Запрос .обновить принят');
                    await main();
                }
                else if (msg.body.startsWith('.добавить модератора') && msg.from == operator) {
                    let mod_phone = msg.body.replace('.добавить модератора ', '')
                    try {
                        pool.execute(`
                                insert into \`moderators\`(\`bot_id\`, \`number\`)
                                select bot_id, concat('7${mod_phone.slice(1)}','@c.us') from bots
                                where phone = '${bot_phone}'
                            `)
                            .then( result => {})
                            .catch(function(err) {
                                console.log(err.message);
                            });
                        await main();
                        msg.reply('Добавлен новый модератор 7' + mod_phone.slice(1));
                    } catch (e) {
                        console.log('Ошибка при добавлении модератора: ' + e);
                        msg.reply('Ошибка при добавлении модератора');
                    }
                }
                else if (msg.body.startsWith('.удалить модератора') && msg.from == operator) {
                    let mod_phone = msg.body.replace('.добавить модератора ', '');
                    try {
                        pool.execute(`
                            delete from \`moderators\`
                            where \`number\` = '7${mod_phone.slice(1)}' and bot_id = 
                            (select bot_id from bots where phone = '${bot_phone}')
                        `)
                        .then( result => {})
                        .catch(function(err) {
                            console.log(err.message);
                        });
                        await main();
                        msg.reply('Удален новый модератор 7' + mod_phone.slice(1));
                    } catch (e) {
                        msg.reply('Ошибка при удалении модератора:' + e);
                        console.log('Ошибка при удалении модератора');
                    }
                }
                else if (msg.body.startsWith('.создать группу') && msg.from == operator) {
                    let group_result = await client.createGroup(settings.group_name, [operator]);
                    pool.execute(`
                            insert into \`groups\`(\`bot_id\`, \`group\`)
                            select bot_id, '${group_result.gid._serialized}' from bots
                            where phone = '${bot_phone}'
                        `)
                        .then( result => {})
                        .catch(function(err) {
                            console.log(err.message);
                        });
                }
            }
            // Если оператор отвечает на сообщение пользователя
            else if (msg.hasQuotedMsg) {
                // Отвечаем по номеру
                let quotedMsg = await msg.getQuotedMessage();
                let phone = quotedMsg.body.split('\n\n')[0];
                if (!Number.isInteger(parseInt(phone))) {
                    msg.reply('Не найден номер телефона в выбранном сообщении');
                }
                else {
                    chat.sendStateTyping();
                    (async() => { await wait(3000); })();
                    if (msg.hasMedia) {
                        let attachmentData = await msg.downloadMedia();
                        client.sendMessage(phone + '@c.us', attachmentData, { caption: msg.body });
                    }
                    else
                        client.sendMessage(phone + '@c.us', msg.body);
                }
            }
        }
        // Если от обычного юзера
        else {
            //chat.sendStateTyping();
            (async() => { await wait(3000); })();
            // Если есть медиа - 
            if (msg.hasMedia) {
                const attachmentData = await msg.downloadMedia();
                // Если пришло аудиосообщение
                if (msg.type == 'ptt') {
                    client.sendMessage(operator, msg.from.replace('@c.us', '') + '\n\n Аудиосообщение:');
                    client.sendMessage(operator, attachmentData);
                }
                else
                    client.sendMessage(operator, attachmentData, { caption: msg.from.replace('@c.us', '') + '\n\n' + msg.body });
            }
            else {
                client.sendMessage(operator, msg.from.replace('@c.us', '') + '\n\n' + msg.body);
            }
        }
    }
    
    ///////////////////////
    if (msg.body.startsWith('!sendto ')) {
        // Direct send a new message to specific id
        let number = msg.body.split(' ')[1];
        let messageIndex = msg.body.indexOf(number) + number.length;
        let message = msg.body.slice(messageIndex, msg.body.length);
        number = number.includes('@c.us') ? number : `${number}@c.us`;
        let chat = await msg.getChat();
        chat.sendSeen();
        client.sendMessage(number, message);

    } else if (msg.body.startsWith('!subject ')) {
        // Change the group subject
        let chat = await msg.getChat();
        if (chat.isGroup) {
            let newSubject = msg.body.slice(9);
            chat.setSubject(newSubject);
        } else {
            msg.reply('This command can only be used in a group!');
        }
    } else if (msg.body.startsWith('!echo ')) {
        // Replies with the same message
        msg.reply(msg.body.slice(6));
    } else if (msg.body.startsWith('!desc ')) {
        // Change the group description
        let chat = await msg.getChat();
        if (chat.isGroup) {
            let newDescription = msg.body.slice(6);
            chat.setDescription(newDescription);
        } else {
            msg.reply('This command can only be used in a group!');
        }
    } else if (msg.body == '!leave') {
        // Leave the group
        let chat = await msg.getChat();
        if (chat.isGroup) {
            chat.leave();
        } else {
            msg.reply('This command can only be used in a group!');
        }
    } else if (msg.body.startsWith('!join ')) {
        const inviteCode = msg.body.split(' ')[1];
        try {
            await client.acceptInvite(inviteCode);
            msg.reply('Joined the group!');
        } catch (e) {
            msg.reply('That invite code seems to be invalid.');
        }
    } else if (msg.body == '!groupinfo') {
        let chat = await msg.getChat();
        if (chat.isGroup) {
            msg.reply(`
                *Group Details*
                Name: ${chat.name}
                Description: ${chat.description}
                Created At: ${chat.createdAt.toString()}
                Created By: ${chat.owner.user}
                Participant count: ${chat.participants.length}
            `);
            console.log(chat.description)
            pool.execute(`
                UPDATE \`settings\` SET \`default_group_desc\` = '${chat.description}' WHERE \`bot_id\` = 1
            `)
            .then( result => {})
            .catch(function(err) {
                console.log(err.message);
            });
        } else {
            msg.reply('This command can only be used in a group!');
        }
    } else if (msg.body == '!chats') {
        const chats = await client.getChats();
        client.sendMessage(msg.from, `The bot has ${chats.length} chats open.`);
    } else if (msg.body == '!info') {
        let info = client.info;
        client.sendMessage(msg.from, `
            *Connection info*
            User name: ${info.pushname}
            My number: ${info.me.user}
            Platform: ${info.platform}
            WhatsApp version: ${info.phone.wa_version}
        `);
    } else if (msg.body == '!mediainfo' && msg.hasMedia) {
        const attachmentData = await msg.downloadMedia();
        msg.reply(`
            *Media info*
            MimeType: ${attachmentData.mimetype}
            Filename: ${attachmentData.filename}
            Data (length): ${attachmentData.data.length}
        `);
    } else if (msg.body == '!quoteinfo' && msg.hasQuotedMsg) {
        const quotedMsg = await msg.getQuotedMessage();

        quotedMsg.reply(`
            ID: ${quotedMsg.id._serialized}
            Type: ${quotedMsg.type}
            Author: ${quotedMsg.author || quotedMsg.from}
            Timestamp: ${quotedMsg.timestamp}
            Has Media? ${quotedMsg.hasMedia}
        `);
    } else if (msg.body == '!resendmedia' && msg.hasQuotedMsg) {
        const quotedMsg = await msg.getQuotedMessage();
        if (quotedMsg.hasMedia) {
            const attachmentData = await quotedMsg.downloadMedia();
            client.sendMessage(msg.from, attachmentData, { caption: 'Here\'s your requested media.' });
        }
    } else if (msg.body == '!location') {
        msg.reply(new Location(37.422, -122.084, 'Googleplex\nGoogle Headquarters'));
    } else if (msg.location) {
        msg.reply(msg.location);
    } else if (msg.body.startsWith('!status ')) {
        const newStatus = msg.body.split(' ')[1];
        await client.setStatus(newStatus);
        msg.reply(`Status was updated to *${newStatus}*`);
    } else if (msg.body == '!mention') {
        const contact = await msg.getContact();
        const chat = await msg.getChat();
        chat.sendMessage(`Hi @${contact.number}!`, {
            mentions: [contact]
        });
    } else if (msg.body == '!delete' && msg.hasQuotedMsg) {
        const quotedMsg = await msg.getQuotedMessage();
        if (quotedMsg.fromMe) {
            quotedMsg.delete(true);
        } else {
            msg.reply('I can only delete my own messages');
        }
    } else if (msg.body === '!pin') {
        const chat = await msg.getChat();
        await chat.pin();
    } else if (msg.body === '!archive') {
        const chat = await msg.getChat();
        await chat.archive();
    } else if (msg.body === '!mute') {
        const chat = await msg.getChat();
        // mute the chat for 20 seconds
        const unmuteDate = new Date();
        unmuteDate.setSeconds(unmuteDate.getSeconds() + 20);
        await chat.mute(unmuteDate);
    } else if (msg.body === '!typing') {
        const chat = await msg.getChat();
        // simulates typing in the chat
        chat.sendStateTyping();        
    } else if (msg.body === '!recording') {
        const chat = await msg.getChat();
        // simulates recording audio in the chat
        chat.sendStateRecording();        
    } else if (msg.body === '!clearstate') {
        const chat = await msg.getChat();
        // stops typing or recording in the chat
        chat.clearState();        
    }
});

client.on('message_create', (msg) => {
    // Fired on all message creations, including your own
    if (msg.fromMe) {
        // do stuff here
    }
});

client.on('message_revoke_everyone', async (after, before) => {
    // Fired whenever a message is deleted by anyone (including you)
    console.log(after); // message after it was deleted.
    if (before) {
        console.log(before); // message before it was deleted.
    }
});

client.on('message_revoke_me', async (msg) => {
    // Fired whenever a message is only deleted in your own view.
    console.log(msg.body); // message before it was deleted.
});

client.on('message_ack', (msg, ack) => {
    /*
        == ACK VALUES ==
        ACK_ERROR: -1
        ACK_PENDING: 0
        ACK_SERVER: 1
        ACK_DEVICE: 2
        ACK_READ: 3
        ACK_PLAYED: 4
    */

    if(ack == 3) {
        // The message was read
    }
});

client.on('group_join', (notification) => {
    console.log('join', notification);
    pool.execute(`
            insert into \`traffic\`(\`bot_id\`, \`group_id\`, \`type\`, \`who\`, \`timestamp\`)
            select a.bot_id, b.group_id, '1', '${notification.recipientIds[0]}', ${notification.timestamp} from bots a
            inner join \`groups\` b on a.bot_id = b.bot_id
            where a.phone = '${bot_phone}' and b.\`group\` = '${notification.id.remote}'
        `)
        .then( result => {})
        .catch(function(err) {
            console.log(err.message);
        });
    pool.query(`
        select b.\`group\` from \`bots\` a 
        inner join \`groups\` b on a.\`bot_id\` = b.\`bot_id\`
        where a.\`phone\` = '${bot_phone}'
        order by b.\`group_id\` desc limit 1
    `)
    .then( result => {
        checkGroupLimit(result[0][0]['group']);
    })
    .catch(function(err) {
        console.log(err.message);
      });
});

client.on('group_leave', (notification) => {
    console.log('leave', notification);
    pool.execute(`
            insert into \`traffic\`(\`bot_id\`, \`group_id\`, \`type\`, \`who\`, \`timestamp\`)
            select a.\`bot_id\`, b.\`group_id\`, '0', '${notification.recipientIds[0]}', ${notification.timestamp} from \`bots\` a
            inner join \`groups\` b on a.\`bot_id\` = b.\`bot_id\`
            where a.\`phone\` = '${bot_phone}' and b.\`group\` = '${notification.id.remote}'
        `)
        .then( result => {})
        .catch(function(err) {
            console.log(err.message);
        });
});

client.on('group_update', (notification) => {
    console.log('update', notification);
    if (notification.author == operator && notification.type == 'promote') {
        pool.execute(`
                insert into \`groups\`(\`bot_id\`, \`group\`) 
                select bot_id, '${notification.id.remote}' from bots
                where \`phone\` =  '${bot_phone}'
            `)
            .then( result => {})
            .catch(function(err) {
                console.log(err.message);
            });
    }
    else if (notification.author == bot_phone + '@c.us' && notification.type == 'create') {
        create_group(notification.id.remote);
    }
});

client.on('change_battery', (batteryInfo) => {
    const { battery, plugged } = batteryInfo;
    console.log(`Battery: ${battery}% - Charging? ${plugged}`);
});

client.on('disconnected', (reason) => {
    console.log('Client was logged out', reason);
});

