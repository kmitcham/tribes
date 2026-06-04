const {
  SlashCommandBuilder,
  EmbedBuilder,
} = require('../../libs/command-builders.js');
const tribeHistory = require('../../libs/tribeHistory.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('history')
    .setDescription('Search your history + tribe history by subject and years back')
    .addStringOption((option) =>
      option
        .setName('subject')
        .setDescription('Choose a person/subject filter')
        .addChoices(...tribeHistory.getHistorySubjectChoices())
        .setRequired(false)
    )
    .addIntegerOption((option) =>
      option
        .setName('years_back')
        .setDescription('How many years back to search (0 = current year only)')
        .setRequired(false)
    ),
  async execute(interaction, gameState) {
    var playerName = interaction.member.displayName;
    var subject = interaction.options.getString('subject') || 'all';
    var yearsBack = interaction.options.getInteger('years_back');
    tribeHistory.showCombinedHistory(playerName, gameState, subject, yearsBack);
  },
};
