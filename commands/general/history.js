const {
  SlashCommandBuilder,
  EmbedBuilder,
} = require('../../libs/command-builders.js');
const tribeHistory = require('../../libs/tribeHistory.js');

function getYearsBackChoices(gameState) {
  const currentYear = Number(gameState && gameState.seasonCounter) / 2;
  const maxYears = Number.isFinite(currentYear)
    ? Math.max(1, Math.ceil(currentYear))
    : 1;
  const choices = [];
  for (let year = 1; year <= maxYears; year++) {
    choices.push({
      name: year === 1 ? '1 year' : `${year} years`,
      value: year,
    });
  }
  return choices;
}

function getHistoryCommandOptions(gameState) {
  return [
    {
      type: 'string',
      name: 'subject',
      description: 'Choose a person/subject filter',
      required: true,
      choices: tribeHistory.getHistorySubjectChoices(),
    },
    {
      type: 'integer',
      name: 'years_back',
      description: 'How many years back to search',
      required: true,
      choices: getYearsBackChoices(gameState),
    },
  ];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('history')
    .setDescription('Search your history + tribe history by required subject and years back')
    .addStringOption((option) =>
      option
        .setName('subject')
        .setDescription('Choose a person/subject filter')
        .addChoices(...tribeHistory.getHistorySubjectChoices())
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName('years_back')
        .setDescription('How many years back to search')
        .addChoices(...getYearsBackChoices())
        .setRequired(true)
    ),
  getOptions(gameState) {
    return getHistoryCommandOptions(gameState);
  },
  async execute(interaction, gameState) {
    var playerName = interaction.member.displayName;
    var subject = interaction.options.getString('subject');
    var yearsBack = interaction.options.getInteger('years_back');
    tribeHistory.showCombinedHistory(playerName, gameState, subject, yearsBack);
  },
};
