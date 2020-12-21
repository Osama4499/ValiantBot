const config = require('./config.json');
const Discord = require('discord.js');
const client = new Discord.Client();
const fetch = require("node-fetch");

const prefix = config.prefix;
var reportsChannelId = config.reportsChannel;
var staffReportsChannelId = config.staffReportsChannel;
var welcomeChannelId = config.welcomeChannel;

client.login(config.botToken);

client.on('ready', ()=>{
    console.log('ValiantBot is running ...');
});

client.on('guildMemberAdd', member => {
    member.guild.channels.resolve(welcomeChannelId).send(
        `**Hey ${member}, welcome to the server!**
Make sure you take a look at <#694548553300836432>.
Grab some roles from <#695978314614964244>.
Then come chat in <#640645946983841843>.`
        );
});

client.on('message', msg=>{
    if (msg.guild == null) return; // exit function if DM

    if (msg.channel.id === reportsChannelId) {
        msg.guild.channels.resolve(staffReportsChannelId).send('**Report from <@' + msg.member.id + '>:**\n' + msg.content);
        msg.delete();
        return;
    }

    if (!msg.content.startsWith(prefix)) return;
    
    help_command(msg);
    joindate_command(msg);
    dm_command(msg);
    
    if (msg.content === prefix + 'fact') {
        sendFact(msg.channel);
    }
});

function help_command(msg) {
    if (msg.content === prefix + 'help') {
        msg.channel.send('**Commands:**\n> joindate\n> fact')
    }
}

function joindate_command(msg) {
    if (msg.content.startsWith(prefix + 'joindate')) {
        if (msg.content.includes(' ')) {
            let member = msg.mentions.members.first();
            let jd = member.joinedAt;
            msg.channel.send('**' + member.displayName + '** joined in: ' + jd.getDate() + '/' + (jd.getMonth() + 1) + '/' + jd.getFullYear());
        }
        else {
            let jd = msg.member.joinedAt;
            msg.channel.send('You joined in: ' + jd.getDate() + '/' + (jd.getMonth() + 1) + '/' + jd.getFullYear());
        }
    }
}

function dm_command(msg) {
    if (msg.content.startsWith(prefix + "dm")) {
        if (!msg.member.roles.cache.find(r => r.id === config.StaffRoleId)) {
            return; // exit function if not staff
        }
        let parts = msg.content.split(' ');
        let member = msg.guild.members.resolve(parts[1]);
        let text = parts[2];
        let attachmentsUrls = [];

        if (text == null && msg.attachments.size == 0) {
            return; // exit function if message has no text or attachments
        }

        msg.attachments.forEach(a=>{
            attachmentsUrls.push(a.url);
        });

        member.send(text, {
            files: attachmentsUrls
        }).catch(console.error);
    }
}

async function sendFact(channel) {
    let response = await fetch(config.randomFactsAPI);
    let data = await response.json();
    channel.send('> ' + data.data);
}
