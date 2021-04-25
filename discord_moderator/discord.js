/**
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const Discord = require('discord.js');
const perspective = require('./perspective.js');

require('dotenv').config();

// Set your emoji "awards" here
// const emojiMap = {
//   'FLIRTATION': '💋',
//   'TOXICITY': '🧨',
//   'INSULT': '👊',
//   'INCOHERENT': '🤪',
//   'SPAM': '🐟',
// };

// Store some state about user karma.
// TODO: Migrate to a DB, like Firebase
const users = {};

/**
 * Kick bad members out of the guild
 * @param {user} user - user to kick
 * @param {guild} guild - guild to kick user from
 */
async function kickBaddie(user, guild) {
  const member = guild.member(user);
  if (!member) return;
  try {
    await member.kick('Was a jerk');
  } catch (err) {
    console.log(`Could not kick user ${user.username}: ${err}`);
  }
}

/**
 * Analyzes a user's message for attribues
 * and reacts to it.
 * @param {string} message - message the user sent
 * @return {bool} shouldKick - whether or not we should
 * kick the users
 */
async function evaluateMessage(message) {
  let scores;
  try {
    scores = await perspective.analyzeText(message.content);
  } catch (err) {
    console.log(err);
    return false;
  }

  const userid = message.author.id;

  let kickOut = false;
  let count = 0;
  for (const attribute in scores) {
    if (scores[attribute]) {
         users[userid][attribute] = 
         users[userid][attribute] ? users[userid][attribute] + 1 : 1;
      count += users[userid][attribute];
      
      if (users[userid][attribute] > process.env.KICK_THRESHOLD) {
        kickOut = true;
      }
    }
  }
  if (count > 0) {
    message.channel.send(getEmbed());
    message.reply("Please review above material to understand the adverse "
      + "effects of prolific hate speech on social media platforms in modern society");
    message.react('🧨');
  }
  // Return whether or not we should kick the user
  return kickOut;
}

function getEmbed() {
  return new Discord.MessageEmbed()
  .setColor('#0099ff')
	.setTitle('Some title')
	.setURL('https://discord.js.org/')
	.setAuthor('Some name', 'https://i.imgur.com/wSTFkRM.png', 'https://discord.js.org')
	.setDescription('Some description here')
	.setThumbnail('https://i.imgur.com/wSTFkRM.png')
	.setTimestamp()
	.setFooter('Some footer text here', 'https://i.imgur.com/wSTFkRM.png');
}

/**
 * Writes current user scores to the channel
 * @return {string} karma - printable karma scores
 */
function getKarma() {
  const scores = [];
  for (const user in users) {
    if (!Object.keys(users[user]).length) continue;
    let score = `<@${user}> - `;
    let count = 0;
    for (const attr in users[user]) {
      count += users[user][attr];
      // score += `${emojiMap[attr]} : ${users[user][attr]}\t`;
    }
    score += 'Flagged ' + count + ' times.';
    scores.push(score);
  }
  console.log(scores);
  if (!scores.length) {
    return '';
  }
  return scores.join('\n');
}

// Create an instance of a Discord client
const client = new Discord.Client();

client.on('ready', () => {
  console.log('I am ready!');
});

client.on('message', async (message) => {
  // Ignore messages that aren't from a guild
  // or are from a bot
  if (!message.guild || message.author.bot) return;

  // If we've never seen a user before, add them to memory
  const userid = message.author.id;
  if (!users[userid]) {
    users[userid] = [];
  }

  // Evaluate attributes of user's message
  let shouldKick = false;
  try {
    shouldKick = await evaluateMessage(message);
  } catch (err) {
    console.log(err);
  }
  if (shouldKick) {
    kickBaddie(message.author, message.guild);
    delete users[message.author.id];
    message.channel.send(`Kicked user ${message.author.username} from channel`);
    return;
  }


  if (message.content.startsWith('!karma')) {
    const karma = getKarma(message);
    message.channel.send(karma ? karma : 'No karma yet!');
  }
});

// Log our bot in using the token from https://discordapp.com/developers/applications/me
client.login(process.env.DISCORD_TOKEN);
