const commandFlow = require('../src/server/command-flow-service.js');
const requestFlow = require('../src/server/request-flow-service.js');
const gameStateStore = require('../src/server/game-state-store.js');

describe('persistence integrity', () => {
  test('runExclusive serializes work for the same tribe', async () => {
    const order = [];
    const first = gameStateStore.runExclusive('bug', async () => {
      order.push('a-start');
      await new Promise((resolve) => setTimeout(resolve, 30));
      order.push('a-end');
      return 'a';
    });
    const second = gameStateStore.runExclusive('bug', async () => {
      order.push('b-start');
      order.push('b-end');
      return 'b';
    });

    await expect(Promise.all([first, second])).resolves.toEqual(['a', 'b']);
    expect(order).toEqual(['a-start', 'a-end', 'b-start', 'b-end']);
  });

  test('romance request persists via saveTribe under tribe lock', async () => {
    const gameState = {
      name: 'bug',
      population: {
        Alice: { name: 'Alice', inviteList: [] },
      },
      saveRequired: false,
    };
    const sent = [];
    const ws = {
      send: (payload) => sent.push(JSON.parse(payload)),
    };
    const saveTribe = jest.fn();
    const processRomance = jest.fn(() => ({
      type: 'romanceUpdate',
      ok: true,
    }));
    const store = {
      runExclusive: (tribe, fn) => gameStateStore.runExclusive(tribe, fn),
      getGameState: jest.fn(() => gameState),
    };

    await requestFlow.handleRomanceRequest(
      ws,
      {
        tribe: 'bug',
        playerName: 'Alice',
        clientId: 'c1',
      },
      gameState,
      {
        validateUser: async () => true,
        processRomance,
        savelib: { saveTribe },
        gameStateStore: store,
      }
    );

    expect(processRomance).toHaveBeenCalled();
    expect(saveTribe).toHaveBeenCalledWith(gameState);
    expect(gameState.saveRequired).toBe(false);
    expect(sent[0]).toEqual({ type: 'romanceUpdate', ok: true });
  });

  test('command flow re-fetches game state and saves under lock', async () => {
    const gameState = {
      name: 'bug',
      messages: { stale: 'x' },
      saveRequired: false,
      archiveRequired: false,
    };
    const commands = new Map([
      [
        'idle',
        {
          execute: async (_interaction, state) => {
            state.saveRequired = true;
            state.didIdle = true;
          },
        },
      ],
    ]);
    const saveTribe = jest.fn();
    const refreshTribeGameData = jest.fn();
    const sent = [];
    const ws = {
      send: (payload) => sent.push(JSON.parse(payload)),
      playerName: 'Alice',
    };
    const store = {
      runExclusive: (tribe, fn) => gameStateStore.runExclusive(tribe, fn),
      getGameState: jest.fn(() => gameState),
      resetEndedGameAfterArchive: jest.fn(),
    };

    await commandFlow.handleCommandRequest(
      ws,
      {
        command: 'idle',
        tribe: 'bug',
        playerName: 'Alice',
        clientId: 'c1',
        parameters: {},
      },
      { name: 'stale-ref' },
      {
        commands,
        commandLog: null,
        validateUser: async () => true,
        prepareGameStateForJoin: (_cmd, _data, state) => state,
        replayPendingMessages: jest.fn(),
        createMockInteraction: () => ({ member: { displayName: 'Alice' } }),
        sendGameMessages: jest.fn(),
        savelib: { saveTribe, archiveTribe: jest.fn() },
        refreshTribeGameData,
        refreshTribeCommandLists: jest.fn(),
        gameStateStore: store,
      }
    );

    expect(store.getGameState).toHaveBeenCalledWith('bug', expect.any(Object));
    expect(gameState.didIdle).toBe(true);
    expect(saveTribe).toHaveBeenCalledWith(gameState);
    expect(gameState.saveRequired).toBe(false);
    expect(refreshTribeGameData).toHaveBeenCalled();
  });
});
