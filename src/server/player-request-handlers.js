const access = require('../../libs/access.js');

function handleInfoRequest(ws, data, gameState, deps) {
  const {
    util,
    guardlib,
    getPlayerConnectedTribes,
    removeClunkyKeys,
    removeFatherReferences,
    refreshChildGuardians,
  } = deps;

  const selection = data.selection;
  let messageData = null;
  const playerName = data.playerName || ws.currentPlayer || '';
  const playerTribes = getPlayerConnectedTribes(playerName);

  switch (selection) {
    case 'population':
      if (
        guardlib &&
        typeof guardlib.normalizeGuardAssignments === 'function'
      ) {
        guardlib.normalizeGuardAssignments(
          gameState.population,
          gameState.children
        );
      }
      const cleanPop = removeClunkyKeys(gameState.population);
      messageData = {
        type: 'infoRequest',
        label: 'population',
        content: cleanPop,
      };
      break;

    case 'graveyard':
      messageData = {
        type: 'infoRequest',
        label: 'graveyard',
        content: removeClunkyKeys(gameState.graveyard),
      };
      break;

    case 'children':
      refreshChildGuardians(gameState.children, gameState.population);
      messageData = {
        type: 'infoRequest',
        label: 'children',
        content: removeFatherReferences(gameState.children),
      };
      break;

    case 'status':
      const statusMessage = util.gameStateMessage(gameState);
      messageData = {
        type: 'infoRequest',
        label: 'status',
        content: statusMessage,
        gameState: {
          round: gameState.round || 'work',
          workRound: gameState.workRound,
          foodRound: gameState.foodRound,
          reproductionRound: gameState.reproductionRound,
          matingComplete: gameState.matingComplete === true,
          seasonCounter: gameState.seasonCounter,
          currentLocationName: gameState.currentLocationName,
          year: Math.floor(gameState.seasonCounter / 2),
          startStamp: gameState.startStamp,
          demand: gameState.demand,
          violence: gameState.violence,
          combatRounds: Number.isFinite(gameState.violenceRounds)
            ? gameState.violenceRounds
            : 0,
          playerTribeCount: playerTribes.length,
          playerTribes: playerTribes,
        },
      };
      break;

    case 'romance':
      const romancePlayerName = data.playerName;
      const userData =
        gameState.population && gameState.population[romancePlayerName];

      let conList = [];
      let decList = [];
      if (userData?.consentDict) {
        for (const [n, r] of Object.entries(userData.consentDict)) {
          if (r === 'consent') {
            conList.push(n);
          }
          if (r === 'decline') {
            decList.push(n);
          }
        }
      } else {
        conList = userData?.consentList || [];
        decList = userData?.declineList || [];
      }

      const romanceLists = {
        inviteList: userData?.inviteList || [],
        consentList: conList,
        declineList: decList,
        consentDict: userData?.consentDict || {},
      };
      messageData = {
        type: 'infoRequest',
        label: 'romance',
        content: romanceLists,
      };
      break;

    default:
      messageData = {
        type: 'infoRequest',
        label: 'error',
        content: 'Invalid infoRequest: ' + selection,
      };
  }

  ws.send(JSON.stringify(messageData));
}

function handleHelpRequest(ws, data, deps) {
  const { help } = deps;
  const helpType = data.helpType || 'basic';
  let helpContent = '';

  switch (helpType) {
    case 'basic':
      helpContent = help.playerHelpBasic();
      break;
    case 'rounds':
      helpContent = help.playerHelpRounds();
      break;
    case 'conflict':
      helpContent = help.playerHelpConflict();
      break;
    case 'chief':
      helpContent = help.chiefHelp();
      break;
    case 'overview':
      helpContent = `Welcome to the Tribes Game!

Each player takes the role of a member of a Stone Age tribe trying to survive and multiply in the world. Tribe members can be hunters, gatherers, or crafters. They can travel among the veldt, marsh, hills and forest environments. They can try to reproduce, to guard children from dangers, and to keep everyone fed.

The four physical resources in the game are food, grain, baskets, and spearheads. Food and grain are consumed to prevent starvation; grain is harder to obtain, but is not vulnerable to destruction from bad luck. Baskets double the effectiveness of gathering. Spearheads give a substantial bonus to hunting.

Adult tribe members need to consume 4 food or grain each season to avoid starvation. Children, including those not yet born, need to be given 2 food or grain each season until they reach 12 years old. Mothers with two or more children under 2 years old need 6 food or grain each season.

Children are produced when a tribe member invites a tribe member of the opposite gender to mate, the invitee consents, and there is a successful dice roll. A player can invite multiple people until one of them consents. They can receive consent to only one invitation per season. Consenting to a mating does not change how many invitations a player can make that season.

All tribes commands begin with clicking them in the interface or typing them manually. To see a list of commands, with some explanations of what they do, you can check the Commands panel on the left.

Players can use this interface to send commands to the bot and receive messages about actions they can take.`;
      break;
    default:
      helpContent = help.playerHelpBasic();
      break;
  }

  ws.send(
    JSON.stringify({
      type: 'helpContent',
      helpType: helpType,
      content: helpContent,
    })
  );
}

function handleListCommands(ws, data, gameState, deps) {
  const { commands, pop, referees, tribesRegistry } = deps;

  const commandList = {};
  const playerName = data.playerName;

  let isChief = false;
  if (playerName && gameState && gameState.population) {
    const player = pop.memberByName(playerName, gameState);
    isChief = player && player.chief;
  }

  const isRef = playerName && referees.includes(playerName);
  // Refs may run chief controls in any tribe they view (even non-members).
  // Work, guard, romance, and conflict stay member-bound in command handlers.
  const canUseChiefCommands = isChief || isRef;
  const sortedCommands = Array.from(commands.entries()).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  for (const [name, command] of sortedCommands) {
    if (command.category === 'chief' && !canUseChiefCommands) {
      continue;
    }

    let commandOptions =
      typeof command.getOptions === 'function'
        ? command.getOptions(gameState)
        : command.data.options || [];

    if (!isRef) {
      commandOptions = commandOptions.filter(
        (option) => option.name !== 'force'
      );
    }

    commandList[name] = {
      name: name,
      description: command.data.description,
      category: command.category,
      options: commandOptions,
    };
  }

  ws.send(
    JSON.stringify({
      type: 'commandList',
      commands: commandList,
      isReferee: isRef,
      isChief: isChief,
      // Client may use this to treat refs as having chief UI affordances.
      canActAsChief: canUseChiefCommands,
      tribes: tribesRegistry.getTribes(),
      clientId: data.clientId,
    })
  );
}

function processRomance(data, gameState) {
  const name = data.playerName || data.name;
  const inviteList = data.inviteList;
  const consentDict = data.consentDict;

  const declineList = data.declineList;
  const consentList = data.consentList;

  const userData = gameState.population[name];
  if (userData) {
    if (inviteList) {
      userData.inviteList = inviteList;
    }

    if (!userData.consentDict) {
      userData.consentDict = {};
    }

    if (consentDict) {
      userData.consentDict = consentDict;
    } else if (consentList || declineList) {
      if (consentList) {
        for (const n of consentList) {
          userData.consentDict[n] = 'consent';
        }
      }
      if (declineList) {
        for (const n of declineList) {
          userData.consentDict[n] = 'decline';
        }
      }
    }

    delete userData.consentList;
    delete userData.declineList;

    const outCon = [];
    const outDec = [];
    if (userData.consentDict) {
      for (const [n, r] of Object.entries(userData.consentDict)) {
        if (r === 'consent') {
          outCon.push(n);
        }
        if (r === 'decline') {
          outDec.push(n);
        }
      }
    }

    return {
      type: 'infoRequest',
      label: 'romance',
      content: {
        inviteList: userData.inviteList || [],
        consentList: outCon,
        declineList: outDec,
        consentDict: userData.consentDict || {},
      },
    };
  }

  return {
    type: 'error',
    label: 'romance',
    content: access.NOT_IN_TRIBE_MESSAGE,
  };
}

function sendSecrets(ws, data, gameState, deps) {
  const romanceUpdate = deps.processRomance(data, gameState);
  ws.send(JSON.stringify(romanceUpdate));
}

module.exports = {
  handleInfoRequest,
  handleHelpRequest,
  handleListCommands,
  processRomance,
  sendSecrets,
};
