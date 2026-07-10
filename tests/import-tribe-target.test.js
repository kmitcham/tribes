const adminReferee = require('../src/server/admin-referee-service.js');

function mockWs() {
  const sent = [];
  return {
    sent,
    send: (payload) => sent.push(JSON.parse(payload)),
  };
}

describe('import game tribe target consistency (review #12)', () => {
  test('rejects when tribe and tribeName disagree', async () => {
    const ws = mockWs();
    const setGameState = jest.fn();
    const saveTribe = jest.fn();
    const writeJson = jest.fn();
    const getGameState = jest.fn();

    await adminReferee.handleImportGame(
      ws,
      {
        tribe: 'bug',
        tribeName: 'wolf',
        playerName: 'Kevin',
        importData: {
          gameData: {
            name: 'bug',
            population: { Alice: { name: 'Alice' } },
          },
          metadata: { tribeName: 'bug' },
        },
      },
      { name: 'bug', population: {} },
      {
        validateUser: async (data) => {
          data.playerName = 'Kevin';
          return true;
        },
        referees: ['Kevin'],
        logWithTimestamp: jest.fn(),
        path: require('path'),
        fs: {
          existsSync: () => true,
          mkdirSync: jest.fn(),
        },
        baseDir: '/tmp',
        writeJson,
        gameStateStore: {
          setGameState,
          runExclusive: (_t, fn) => fn(),
        },
        savelib: { saveTribe },
        refreshTribeGameData: jest.fn(),
        refreshTribeCommandLists: jest.fn(),
        getGameState,
      }
    );

    expect(ws.sent[0]).toMatchObject({
      type: 'importGameResponse',
      success: false,
    });
    expect(ws.sent[0].message).toMatch(/Tribe mismatch/i);
    expect(setGameState).not.toHaveBeenCalled();
    expect(saveTribe).not.toHaveBeenCalled();
    expect(writeJson).not.toHaveBeenCalled();
    expect(getGameState).not.toHaveBeenCalled();
  });

  test('backs up and writes the same canonical target tribe', async () => {
    const ws = mockWs();
    const setGameState = jest.fn();
    const saveTribe = jest.fn();
    const writeJson = jest.fn();
    const liveWolf = {
      name: 'wolf',
      population: { WolfChief: { name: 'WolfChief' } },
      seasonCounter: 9,
    };
    const getGameState = jest.fn(async (name) => {
      expect(name).toBe('wolf');
      return liveWolf;
    });
    const importPayload = {
      name: 'bug',
      population: { Alice: { name: 'Alice', food: 3 } },
      seasonCounter: 2,
    };

    await adminReferee.handleImportGame(
      ws,
      {
        tribe: 'wolf',
        tribeName: 'wolf',
        playerName: 'Kevin',
        importData: {
          gameData: importPayload,
          metadata: { tribeName: 'bug', exportedBy: 'Kevin' },
        },
      },
      { name: 'bug', population: { ShouldNotBackup: {} } },
      {
        validateUser: async (data) => {
          data.playerName = 'Kevin';
          return true;
        },
        referees: ['Kevin'],
        logWithTimestamp: jest.fn(),
        path: require('path'),
        fs: {
          existsSync: () => true,
          mkdirSync: jest.fn(),
        },
        baseDir: '/tmp',
        writeJson,
        gameStateStore: {
          setGameState,
          runExclusive: (_t, fn) => fn(),
        },
        savelib: { saveTribe },
        refreshTribeGameData: jest.fn(),
        refreshTribeCommandLists: jest.fn(),
        getGameState,
      }
    );

    expect(ws.sent[0]).toMatchObject({
      type: 'importGameResponse',
      success: true,
      tribeName: 'wolf',
    });
    expect(getGameState).toHaveBeenCalledWith('wolf');
    expect(writeJson).toHaveBeenCalled();
    const backupArg = writeJson.mock.calls[0][1];
    expect(backupArg.metadata.tribeName).toBe('wolf');
    expect(backupArg.gameData).toBe(liveWolf);
    expect(backupArg.gameData.population.ShouldNotBackup).toBeUndefined();
    expect(setGameState).toHaveBeenCalledWith(
      'wolf',
      expect.objectContaining({ name: 'wolf' })
    );
    expect(saveTribe).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'wolf', population: importPayload.population })
    );
  });
});
