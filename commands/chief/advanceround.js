const { SlashCommandBuilder } = require('../../libs/command-builders.js');
const pop = require('../../libs/population.js');
const text = require('../../libs/textprocess.js');
const chief = require('../../libs/chief.js');
const repro = require('../../libs/reproduction.js');
const food = require('../../libs/feed.js');
const startFood = require('./startfood.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('advanceround')
    .setDescription('Advance to the next round, if legal. (Chief only)'),

  async execute(interaction, gameState, bot) {
    var actorName = interaction.member.displayName;
    var actor = pop.memberByName(actorName, gameState);

    if (!actor || !actor.chief) {
      text.addMessage(gameState, actorName, 'advanceround requires chief privileges');
      return;
    }

    if (gameState.workRound) {
      const startedFood = startFood.startFoodFilter(actorName, gameState, bot);
      if (startedFood !== undefined) {
        gameState.saveRequired = true;
      }
      return;
    }

    if (gameState.foodRound) {
      const risk = food.getFoodRoundRisk(gameState);
      const blocked =
        risk.adultsStarve.length > 0 ||
        risk.childrenStarve.length > 0 ||
        risk.prenatalStarve.length > 0;

      if (blocked) {
        var details = [];
        if (risk.adultsStarve.length > 0) {
          details.push('Adults: ' + risk.adultsStarve.join(', '));
        }
        if (risk.childrenStarve.length > 0) {
          details.push('Children: ' + risk.childrenStarve.join(', '));
        }
        if (risk.prenatalStarve.length > 0) {
          details.push('Pregnancies: ' + risk.prenatalStarve.join(', '));
        }

        text.addMessage(
          gameState,
          actorName,
          'Cannot advance from food round: people would die from starvation. ' +
            details.join(' | ') +
            '. Use food/feed or grain first.'
        );
        return;
      }

      const wasReproduction = !!gameState.reproductionRound;
      repro.startReproductionChecks(gameState, actorName);
      if (!wasReproduction && gameState.reproductionRound) {
        gameState.saveRequired = true;
      }
      return;
    }

    if (gameState.reproductionRound) {
      if (gameState.needChanceRoll) {
        if (gameState.matingComplete) {
          text.addMessage(
            gameState,
            actorName,
            'Cannot advance: mating is complete, but chance has not been done yet. Run chance first.'
          );
        } else {
          text.addMessage(
            gameState,
            actorName,
            'Cannot advance: reproduction is still in progress. Finish mating/pass/checkmating first.'
          );
        }
        return;
      }

      const wasWorkRound = !!gameState.workRound;
      chief.startWork(actorName, gameState);
      if (!wasWorkRound && gameState.workRound) {
        gameState.saveRequired = true;
      }
      return;
    }

    text.addMessage(
      gameState,
      actorName,
      'Cannot advance: no recognized active round state.'
    );
  },
};
