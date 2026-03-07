const { SlashCommandBuilder } = require('../../libs/command-builders.js');
const fs = require('fs');
const path = require('path');
const chief = require('../../libs/chief.js');
const text = require('../../libs/textprocess');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('induct')
    .setDescription('add a person to the tribe. (Chief only)')
    .addStringOption((option) =>
      option
        .setName('target')
        .setDescription('Registered user name to add to the tribe')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('gender')
        .setDescription('one of (male, female)')
        .addChoices(
          { name: 'male', value: 'male' },
          { name: 'female', value: 'female' }
        )
        .setRequired(true)
    ),
  async execute(interaction, gameState) {
    var targetName = interaction.options.getString('target');
    var gender = interaction.options.getString('gender');
    var sourceName = interaction.member.displayName;
    try {
      const usersFilePath = path.join(
        __dirname,
        '..',
        '..',
        'tribe-data',
        'users.json'
      );
      const usersData = JSON.parse(fs.readFileSync(usersFilePath, 'utf8'));
      const normalizedTarget = targetName.trim().toLowerCase();
      const matchedKey = Object.keys(usersData).find(
        (name) => name.toLowerCase() === normalizedTarget
      );
      if (!matchedKey) {
        text.addMessage(
          gameState,
          sourceName,
          `Cannot induct ${targetName}: user not found in users.json. They must register first.`
        );
        return;
      }
      targetName = matchedKey;
    } catch (error) {
      console.error('Error validating users.json for induct:', error);
      text.addMessage(
        gameState,
        sourceName,
        'Error validating user. Please try again.'
      );
      return;
    }

    chief.induct(gameState, sourceName, targetName, gender);
  },
};
