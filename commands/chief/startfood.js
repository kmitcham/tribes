const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const pop = require('../../libs/population');
const util = require('../../libs/util');
const feed = require('../../libs/feed');
const text = require('../../libs/textprocess');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('startfood')
    .setDescription('Start the food round. (Chief only)'),
  async execute(interaction, gameState, bot) {
    var actorName = interaction.member.displayName;

    response = startFoodFilter(actorName, gameState, bot);
    gameState.saveRequired = true;
  },
};

function startFoodFilter(actorName, gameState, bot) {
  var player = pop.memberByName(actorName, gameState);
  if (!player.chief) {
    text.addMessage(
      gameState,
      actorName,
      'startfood requires chief privileges'
    );
    return;
  }
  if (gameState.ended) {
    text.addMessage(
      gameState,
      actorName,
      'The game is over.  Maybe you want to /join to start a new game?'
    );
    return;
  }
  if (gameState.foodRound == true) {
    text.addMessage(gameState, actorName, 'already in the foodRound');
    return;
  }
  if (gameState.workRound == false) {
    text.addMessage(
      gameState,
      actorName,
      'Can only go to food round from work round'
    );
    return;
  }
  return startFood(gameState, bot);
}

function startFood(gameState, bot) {
  gameState.workRound = false;
  gameState.foodRound = true;
  gameState.reproductionRound = false;
  population = gameState.population;
  clearWorkFlags(population, gameState);
  pop.decrementSickness(population, gameState, bot);
  text.addMessage(
    gameState,
    'tribe',
    '\n==>Starting the food and trading round.  Use /foodcheck to be sure everyone has enough to eat, or they will starve<=='
  );
  message = util.gameStateMessage(gameState);
  var d = new Date();
  var saveTime = d.toISOString();
  saveTime = saveTime.replace(/\//g, '-');
  console.log(
    saveTime + ' start food round  season:' + gameState.seasonCounter
  );
  text.addMessage(gameState, 'tribe', message);

  foodMessage = feed.checkFood(gameState, bot);
  return foodMessage;
}

function clearWorkFlags(population, gameState) {
  // for every person
  // if injured and !worked, injured = false
  // worked = false
  for (var targetName in population) {
    person = pop.memberByName(targetName, gameState);
    if (!person) {
      console.log('null person for name ' + targetName);
      continue;
    }
    if (person.isInjured && person.isInjured > 0 && person.worked == false) {
      // did not work means rested
      person.activity = 'recovery';
      pop.history(person.name, 'recovered from injury', gameState);
    }
    if (person.isSick && person.isSick > 0 && person.worked == false) {
      // did not work means rested
      person.activity = 'recovery';
      pop.history(person.name, 'recovered from illness', gameState);
    }
    person.worked = false;
  }
}
