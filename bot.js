const config = require('./config.json');
const secret = require('./secret.json');
const Discord = require('discord.js');
const client = new Discord.Client();
const fetch = require("node-fetch");
const fs = require('fs');

const prefix = config.prefix;

let justGuild;
let reportsChannel;
let staffReportsChannel;
let welcomeChannel;

class Commands {
    static help(msg) {
        msg.channel.send(`**Commands:**
    > joindate
    > fact
    > gif`);
    }
    static joinDate(msg) {
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
    static dm(msg) {
        if (!msg.member.roles.cache.find(r => r.id === config.StaffRoleId))
            return; // exit function if not staff
        
        let parts = msg.content.split(' ');
        let member = msg.guild.members.resolve(parts[1]);
        let text = parts[2];
        
    
        if (text == null && msg.attachments.size == 0)
            return; // exit function if message has no text or attachments
    
        forwardMessage(text, msg, member);
    
        msg.channel.send(`DM sent to ${member}.`);
        console.log(`dm sent to ${member.user.username}#${member.user.discriminator}.`);
    }
    //say <channel id> <message>
    static say(msg) { 
        if (msg instanceof Discord.Message) {
            //msg.member.hasPermission(Discord.Permissions.FLAGS.)
            if (!isStaff(msg.member))
                return; // exit function if not staff

            var parts = msg.content.split(" ");
            var messageToSend = "";
            for (var i = 2; i < parts.length; ++i)
                messageToSend += parts[i] + " ";
            justGuild.channels.resolve(parts[1]).send(messageToSend);
        }
    }
    static addRole(msg) {
        if (msg instanceof Discord.Message) {
            if (!msg.member.roles.cache.find(r => r.id === config.StaffRoleId))
                return; // exit function if not staff
            try{
                let parts = msg.content.split(' ');
                
                if (parts[1] === 'all') {
                    msg.guild.members.fetch().then(data=>{
                        for (const [memberID, member] of data) {
                            if (member.user.bot)
                                continue;
                            member.roles.add(parts[2]);
                            console.log('role given to ' + member.displayName);
                        }
                    });
                }
                else {
                    msg.guild.members.fetch(parts[1]).then(member=>{
                        member.roles.add(parts[2]);
                    });
                }
            }
            catch(e) {
                console.log(e);
            }
        }
    }
    static points(msg) {
        var messageToSend = "";
        // for (const[memberID, points] of pointsMap) {
        //     const member = msg.guild.member(memberID);
        //     if (member != undefined)
        //         messageToSend += `**${member.user.username}**#${member.user.discriminator} : ${points}\n`;
        // }
        messageToSend = `**${msg.member.displayName}** : ${pointsMap.get(msg.member.id)}`;
        msg.channel.send(messageToSend);
    }
}

const memberPointsFilePath = config.memberPointsFilePath;
class FileActions {
    static readMembersPoints() {
        let pointsMap = new Map();

        let rawText = fs.readFileSync(memberPointsFilePath, "utf8");

        let lines = rawText.split(";");
        lines.pop();
        lines.forEach(line=>{
            line = line.trim();
            let parts = line.split(" : ");
            pointsMap.set(parts[0], parseInt(parts[1]));
        });

        return pointsMap;
    }
    static writeMembersPoints() {
        let dataToWrite = "";
        for (const[memberID, points] of pointsMap) {
            dataToWrite += `${memberID} : ${points};\n`;
        }
        fs.writeFileSync(memberPointsFilePath, dataToWrite);
    }
}

client.login(secret.botToken);

client.on('ready', ()=>{
    console.log('ValiantBot is running ...');
    justGuild = client.guilds.resolve(config.justId);
    reportsChannel = justGuild.channels.resolve(config.reportsChannel);
    staffReportsChannel = justGuild.channels.resolve(config.staffReportsChannel);
    welcomeChannel = justGuild.channels.resolve(config.welcomeChannel);
    
    setInterval(trackActivity, 60000);
});

// welcome message
client.on('guildMemberAdd', member => {
    welcomeChannel.send(
        `**Hey ${member}, welcome to the server!**
Make sure you take a look at <#694548553300836432>.
Grab some roles from <#695978314614964244>.
Then come chat in <#640645946983841843>.`
        );
    member.roles.add(config.unrankedRole, 'new member');
});
client.on('message', msg=>{
    if (msg.guild == null && !msg.author.bot) {
        handleDM(msg);
        return;
    }

    if (msg.channel === reportsChannel) {
        handleReport(msg);
        return;
    }

    if (!msg.author.bot)
        messagedPrev60Secs.add(msg.author.id);

    if (!msg.content.startsWith(prefix))
        return;

    if (msg.content === prefix + 'help')
        Commands.help(msg);
    else if (msg.content.startsWith(prefix + 'joindate'))
        Commands.joinDate(msg);
    else if (msg.content.startsWith(prefix + "dm"))
        Commands.dm(msg);
    else if (msg.content.startsWith(prefix + "say"))
        Commands.say(msg);
    else if (msg.content === prefix + 'fact')
        sendFact(msg.channel);
    else if (msg.content.startsWith(prefix + 'gif'))
        sendGif(msg.channel, msg.content.split(' ')[1]);
    else if (msg.content.startsWith(prefix + 'addrole'))
        Commands.addRole(msg);
    else if (msg.content === prefix + 'points')
        Commands.points(msg);
});
function handleReport(msg) {
    console.log(`report received from ${msg.author.username}#${msg.author.discriminator}.`);
    let text = `**Report from ${msg.member}:**\n${msg.content}`;
    forwardMessage(text, msg, staffReportsChannel);
    msg.delete();
}
function handleDM(msg) {
    console.log(`dm received from ${msg.author.username}#${msg.author.discriminator}.`);
    let text = `**DM from ${justGuild.members.resolve(msg.author.id)}:**\n${msg.content}`;
    forwardMessage(text, msg, staffReportsChannel);
}
async function sendFact(channel) {
    let response = await fetch(config.randomFactsAPI);
    let data = await response.json();
    channel.send('> ' + data.data);
}
async function sendGif(channel, searchQuery) {
    let response = await fetch(`${config.giphyRandomAPI}?api_key=${secret.giphyKey}&tag=${searchQuery}`);
    let data = await response.json();
    channel.send(data.data.url);
}
function forwardMessage(text, sourceMsg, targetChannel) {
    let attachmentsUrls = [];
    
    sourceMsg.attachments.forEach(a=>{
        attachmentsUrls.push(a.url);
    });

    targetChannel.send(text, {
        files: attachmentsUrls
    }).catch(console.error);
}
function isStaff(member) {
    return member.hasPermission(Discord.Permissions.FLAGS.MANAGE_MESSAGES);
}

let pointsMap = FileActions.readMembersPoints();
let messagedPrev60Secs = new Set();
function trackActivity() {
    let justGuild = client.guilds.resolve(config.justId);
    function incrementPoints(member) {
        let points = pointsMap.get(member.id);
        points = points == undefined ? 1 : points + 1;
        pointsMap.set(member.id, points);

        if (points > config.diamondRoleThreshold) {
            member.roles.add(config.diamondRole, 'Rank up');
            member.roles.remove(config.platinumRole, 'Rank up');
        }
        else if (points > config.platinumRoleThreshold) {
            member.roles.add(config.platinumRole, 'Rank up');
            member.roles.remove(config.goldRole, 'Rank up');
        }
        else if (points > config.goldRoleThreshold) {
            member.roles.add(config.goldRole, 'Rank up');
            member.roles.remove(config.silverRole, 'Rank up');
        }
        else if (points > config.silverRoleThreshold) {
            member.roles.add(config.silverRole, 'Rank up');
            member.roles.remove(config.bronzeRole, 'Rank up');
        }
        else if (points > config.bronzeRoleThreshold) {
            member.roles.add(config.bronzeRole, 'Rank up');
            member.roles.remove(config.unrankedRole, 'Rank up');
        }
    }

    //voice activity
    const channels = justGuild.channels.cache.filter(c => c.type === 'voice');
    for (const [channelID, channel] of channels) {
        for (const [memberID, member] of channel.members) {
            if (!member.voice.mute && !member.user.bot) {
                incrementPoints(member);
            }
        }
    }

    //text activity
    messagedPrev60Secs.forEach(memberID => incrementPoints(justGuild.member(memberID)));
    messagedPrev60Secs = new Set();

    //write data
    FileActions.writeMembersPoints();
}

