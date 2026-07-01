const { SlashCommandBuilder } = require('../../libs/command-builders.js');
const reproLib = require('../../libs/reproduction.js');
const text = require('../../libs/textprocess.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('romance')
    .setDescription(
      'Open your romance panel — set who to invite and how to respond to invitations.'
    ),
  async execute(interaction, gameState, _bot) {
    var sourceName = interaction.member.displayName;
    return onCommand(sourceName, gameState);
  },
};

function onCommand(sourceName, gameState) {
  var message = 'error in romance, message not set';
  message = reproLib.showMatingLists(sourceName, gameState);
  text.addMessage(gameState, sourceName, message);
  return message;
}
