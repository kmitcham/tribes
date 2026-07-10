const fs = require('fs');
const path = require('path');

// Mock fs module
jest.mock('fs');
// Mock ws module to prevent WebSocket server from starting
jest.mock('ws', () => ({
  Server: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    close: jest.fn(),
  })),
}));

const savelib = require('../libs/save.js');
const pathSafety = require('../libs/pathSafety.js');

// Suppress console.log during tests
console.log = jest.fn();
console.error = jest.fn();

/** Atomic writeJson + post-write verify: echo written payload on read. */
function mockAtomicFsSuccess() {
  fs.existsSync.mockReturnValue(true);
  fs.writeFileSync.mockImplementation((_path, content) => {
    fs.readFileSync.mockReturnValue(content);
  });
  fs.renameSync.mockImplementation(() => {});
  fs.copyFileSync.mockImplementation(() => {});
  fs.openSync.mockReturnValue(1);
  fs.fsyncSync.mockImplementation(() => {});
  fs.closeSync.mockImplementation(() => {});
  fs.unlinkSync.mockImplementation(() => {});
}

describe('Save Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAtomicFsSuccess();
  });

  describe('initGame', () => {
    beforeEach(() => {
      mockAtomicFsSuccess();
    });

    test('should initialize game with default values', () => {
      const gameState = savelib.initGame('test-tribe');

      expect(gameState.name).toBe('test-tribe');
      expect(gameState.seasonCounter).toBe(1);
      expect(gameState.secretMating).toBe(true);
      expect(gameState.open).toBe(true);
      expect(gameState.conceptionCounter).toBe(0);
      expect(gameState.consumed).toBe(0);
      expect(gameState.spoiled).toBe(0);
      expect(gameState.foodAcquired).toBe(0);
      expect(gameState.population).toEqual({});
      expect(gameState.graveyard).toEqual({});
      expect(gameState.children).toEqual({});
      expect(gameState.currentLocationName).toBe('veldt');
      expect(gameState.round).toBe('work');
      expect(gameState.workRound).toBe(true);
      expect(gameState.foodRound).toBe(false);
      expect(gameState.reproductionRound).toBe(false);
      expect(gameState.needChanceRoll).toBe(true);
      expect(gameState.canJerky).toBe(false);
    });

    test('should handle empty game name', () => {
      const gameState = savelib.initGame('');
      expect(gameState.name).toBe('');
    });

    test('should handle null game name', () => {
      const gameState = savelib.initGame(null);
      expect(gameState.name).toBe('');
    });

    test('should set startStamp as ISO string', () => {
      const gameState = savelib.initGame('test-tribe');
      expect(gameState.startStamp).toBeDefined();
      // Should be a valid ISO date string
      expect(() => new Date(gameState.startStamp)).not.toThrow();
    });
  });

  describe('loadJson', () => {
    test('should load and parse valid JSON', () => {
      const testData = { name: 'test', value: 123 };
      fs.readFileSync.mockReturnValue(JSON.stringify(testData));

      const result = savelib.loadJson('test.json');

      expect(result).toEqual(testData);
    });

    test('should return empty object for empty file', () => {
      fs.readFileSync.mockReturnValue(Buffer.alloc(0));

      const result = savelib.loadJson('empty.json');

      expect(result).toEqual({});
    });

    test('should throw error for invalid JSON', () => {
      fs.readFileSync.mockReturnValue('invalid json {{{');

      expect(() => savelib.loadJson('invalid.json')).toThrow();
    });
  });

  describe('loadTribe', () => {
    test('should load existing tribe file', () => {
      const tribeData = {
        name: 'test-tribe',
        population: {
          player1: {
            name: 'player1',
            food: null,
            grain: null,
            basket: null,
            spearhead: null,
          },
        },
      };
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify(tribeData));

      const result = savelib.loadTribe('test-tribe');

      expect(result.population.player1.food).toBe(0);
      expect(result.population.player1.grain).toBe(0);
      expect(result.population.player1.basket).toBe(0);
      expect(result.population.player1.spearhead).toBe(0);
      expect(fs.existsSync).toHaveBeenCalledWith(
        pathSafety.tribeMainFile('test-tribe')
      );
    });

    test('should create new tribe if file does not exist', () => {
      const mainFile = pathSafety.tribeMainFile('new-tribe');
      const dir = pathSafety.tribeDir('new-tribe');
      fs.mkdirSync.mockImplementation(() => {});
      mockAtomicFsSuccess();
      fs.existsSync.mockImplementation((p) => {
        const s = String(p);
        if (s === mainFile || s === dir) {
          return false;
        }
        // temp/bak paths during atomic save
        return false;
      });

      const result = savelib.loadTribe('new-tribe');

      expect(result.name).toBe('new-tribe');
      expect(fs.mkdirSync).toHaveBeenCalledWith(dir, {
        recursive: true,
      });
    });

    test('should normalize malformed season and round state from loaded save', () => {
      const tribeData = {
        name: 'legacy-tribe',
        seasonCounter: 'not-a-number',
        round: 'unexpected-round-name',
        workRound: false,
        foodRound: false,
        reproductionRound: true,
        population: {},
        children: {},
      };
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify(tribeData));

      const result = savelib.loadTribe('legacy-tribe');

      expect(result.seasonCounter).toBe(1);
      expect(result.round).toBe('reproduction');
      expect(result.workRound).toBe(false);
      expect(result.foodRound).toBe(false);
      expect(result.reproductionRound).toBe(true);
    });

    test('should not snap food round back to work when round field is stale (issue #141)', () => {
      // Pre-fix saves kept boolean flags as source of truth but left round at 'work'.
      // Restart must not trust the stale round over exclusive flags.
      const tribeData = {
        name: 'bear',
        seasonCounter: 32,
        round: 'work',
        workRound: false,
        foodRound: true,
        reproductionRound: false,
        population: {},
        children: {},
      };
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify(tribeData));

      const result = savelib.loadTribe('bear');

      expect(result.seasonCounter).toBe(32);
      expect(result.round).toBe('food');
      expect(result.workRound).toBe(false);
      expect(result.foodRound).toBe(true);
      expect(result.reproductionRound).toBe(false);
    });

    test('should not snap reproduction round back to work when round field is stale (issue #141)', () => {
      const tribeData = {
        name: 'bear',
        seasonCounter: 32,
        round: 'work',
        workRound: false,
        foodRound: false,
        reproductionRound: true,
        needChanceRoll: true,
        population: {},
        children: {},
      };
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify(tribeData));

      const result = savelib.loadTribe('bear');

      expect(result.seasonCounter).toBe(32);
      expect(result.round).toBe('reproduction');
      expect(result.workRound).toBe(false);
      expect(result.foodRound).toBe(false);
      expect(result.reproductionRound).toBe(true);
      expect(result.needChanceRoll).toBe(true);
    });

    test('should sync round from flags when saving so restarts keep food/repro', () => {
      const mockGameState = {
        name: 'bear',
        seasonCounter: 32,
        round: 'work',
        workRound: false,
        foodRound: true,
        reproductionRound: false,
        population: {},
        children: {},
      };

      mockAtomicFsSuccess();

      savelib.saveTribe(mockGameState);

      expect(mockGameState.round).toBe('food');
      expect(mockGameState.foodRound).toBe(true);
      expect(mockGameState.workRound).toBe(false);
      const written = JSON.parse(fs.writeFileSync.mock.calls[0][1]);
      expect(written.round).toBe('food');
      expect(written.foodRound).toBe(true);
      expect(written.workRound).toBe(false);
      expect(fs.renameSync).toHaveBeenCalledWith(
        expect.stringMatching(/bear\.json\.\d+\.\d+\.tmp$/),
        pathSafety.tribeMainFile('bear')
      );
    });

    test('should refuse to init a new game over a corrupt existing save', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('{ not valid json');

      expect(() => savelib.loadTribe('bear')).toThrow(/Failed to load tribe/);
      expect(() => savelib.loadTribe('bear')).toThrow(/not overwritten/);
      // Must not write a replacement empty game.
      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });
  });

  describe('saveFinalGameState', () => {
    test('should save final game state with correct filename format', async () => {
      const mockGameState = {
        name: 'test-tribe',
        population: { player1: { name: 'Player1' } },
        ended: true,
      };

      mockAtomicFsSuccess();

      await savelib.saveFinalGameState(mockGameState);

      expect(fs.writeFileSync).toHaveBeenCalled();
      const callArgs = fs.writeFileSync.mock.calls[0];
      expect(callArgs[0]).toMatch(
        /test-tribe-final-\d{4}-\d{2}-\d{2}\.json\.\d+\.\d+\.tmp$/
      );
      expect(fs.renameSync).toHaveBeenCalledWith(
        expect.stringMatching(
          /test-tribe-final-\d{4}-\d{2}-\d{2}\.json\.\d+\.\d+\.tmp$/
        ),
        expect.stringMatching(
          /tribe-data[/\\]test-tribe[/\\]test-tribe-final-\d{4}-\d{2}-\d{2}\.json$/
        )
      );
    });

    test('should add final save markers to game state', async () => {
      mockAtomicFsSuccess();
      const mockGameState = {
        name: 'test-tribe',
        ended: true,
      };

      await savelib.saveFinalGameState(mockGameState);

      expect(mockGameState.finalSave).toBe(true);
      expect(mockGameState.finalSaveDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('clearMainGameFile', () => {
    test('should remove main game file when it exists', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.unlinkSync.mockImplementation(() => {});

      await savelib.clearMainGameFile('test-tribe');

      expect(fs.existsSync).toHaveBeenCalledWith(
        pathSafety.tribeMainFile('test-tribe')
      );
      expect(fs.unlinkSync).toHaveBeenCalledWith(
        pathSafety.tribeMainFile('test-tribe')
      );
    });

    test('should not attempt to remove file when it does not exist', async () => {
      fs.existsSync.mockReturnValue(false);

      await savelib.clearMainGameFile('test-tribe');

      expect(fs.existsSync).toHaveBeenCalledWith(
        pathSafety.tribeMainFile('test-tribe')
      );
      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });
  });

  describe('manageSnapshots', () => {
    test('should keep only 3 most recent snapshots', async () => {
      fs.existsSync.mockReturnValue(true);

      // Mock 5 snapshot files
      const mockFiles = [
        'test-tribe-2026-03-01T10:00:00.000Z.json',
        'test-tribe-2026-03-02T10:00:00.000Z.json',
        'test-tribe-2026-03-03T10:00:00.000Z.json',
        'test-tribe-2026-03-04T10:00:00.000Z.json',
        'test-tribe-2026-03-05T10:00:00.000Z.json',
      ];
      fs.readdirSync.mockReturnValue(mockFiles);

      // Mock file stats with dates corresponding to filenames
      fs.statSync.mockImplementation((filePath) => {
        const filename = path.basename(filePath);
        const dateMatch = filename.match(
          /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/
        );
        const fileDate = dateMatch ? new Date(dateMatch[0]) : new Date();
        return { mtime: fileDate };
      });

      fs.unlinkSync.mockImplementation(() => {});

      await savelib.manageSnapshots('test-tribe');

      // Should delete the 2 oldest files
      expect(fs.unlinkSync).toHaveBeenCalledTimes(2);
    });

    test('should not delete anything if 3 or fewer snapshots exist', async () => {
      fs.existsSync.mockReturnValue(true);

      const mockFiles = [
        'test-tribe-2026-03-04T10:00:00.000Z.json',
        'test-tribe-2026-03-05T10:00:00.000Z.json',
      ];
      fs.readdirSync.mockReturnValue(mockFiles);
      fs.statSync.mockReturnValue({ mtime: new Date() });

      await savelib.manageSnapshots('test-tribe');

      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });

    test('should exclude main game file and final saves from deletion', async () => {
      fs.existsSync.mockReturnValue(true);

      const mockFiles = [
        'test-tribe.json', // main game file - should be excluded
        'test-tribe-final-2026-03-01.json', // final save - should be excluded
        'test-tribe-2026-03-02T10:00:00.000Z.json',
        'test-tribe-2026-03-03T10:00:00.000Z.json',
        'test-tribe-2026-03-04T10:00:00.000Z.json',
        'test-tribe-2026-03-05T10:00:00.000Z.json',
      ];
      fs.readdirSync.mockReturnValue(mockFiles);
      fs.statSync.mockReturnValue({ mtime: new Date() });
      fs.unlinkSync.mockImplementation(() => {});

      await savelib.manageSnapshots('test-tribe');

      // Should only delete 1 snapshot (4 snapshots minus 3 to keep = 1 to delete)
      // main game file and final save should not be counted
      expect(fs.unlinkSync).toHaveBeenCalledTimes(1);
    });

    test('should handle non-existent tribe directory', async () => {
      fs.existsSync.mockReturnValue(false);

      await savelib.manageSnapshots('test-tribe');

      expect(fs.readdirSync).not.toHaveBeenCalled();
      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });
  });

  describe('archiveTribe', () => {
    test('should call saveFinalGameState and clearMainGameFile for ended games', async () => {
      const mockGameState = {
        name: 'test-tribe',
        ended: true,
        population: { player1: { name: 'Player1' } },
      };

      mockAtomicFsSuccess();

      savelib.archiveTribe(mockGameState);

      // Verify final state was saved (check for -final- in filename)
      const writeCall = fs.writeFileSync.mock.calls[0];
      expect(writeCall[0]).toContain('-final-');

      // Verify main game file was cleared
      expect(fs.unlinkSync).toHaveBeenCalled();
    });

    test('should create regular snapshot for active games', async () => {
      const mockGameState = {
        name: 'test-tribe',
        ended: false,
        population: { player1: { name: 'Player1' } },
      };

      mockAtomicFsSuccess();
      fs.readdirSync.mockReturnValue([]);

      savelib.archiveTribe(mockGameState);

      // Verify snapshot was saved (should contain tribe name and timestamp)
      const writeCall = fs.writeFileSync.mock.calls[0];
      expect(writeCall[0]).toContain('test-tribe-');
      expect(writeCall[0]).not.toContain('-final-');
      expect(fs.renameSync).toHaveBeenCalled();
    });
  });

  describe('saveTribe', () => {
    test('should save game state to correct file', async () => {
      const mockGameState = {
        name: 'test-tribe',
        population: { player1: { name: 'Player1' } },
      };

      mockAtomicFsSuccess();

      savelib.saveTribe(mockGameState);

      expect(fs.writeFileSync).toHaveBeenCalled();
      const writeCall = fs.writeFileSync.mock.calls[0];
      expect(writeCall[0]).toMatch(
        /tribe-data[/\\]test-tribe[/\\]test-tribe\.json\.\d+\.\d+\.tmp$/
      );
      expect(fs.renameSync).toHaveBeenCalledWith(
        expect.stringMatching(/test-tribe\.json\.\d+\.\d+\.tmp$/),
        pathSafety.tribeMainFile('test-tribe')
      );
    });

    test('should update lastSaved timestamp', async () => {
      const mockGameState = {
        name: 'test-tribe',
        population: {},
      };

      mockAtomicFsSuccess();

      savelib.saveTribe(mockGameState);

      expect(mockGameState.lastSaved).toBeDefined();
    });

    test('should normalize null player stored resources before saving', async () => {
      const mockGameState = {
        name: 'test-tribe',
        population: {
          player1: {
            name: 'player1',
            food: null,
            grain: null,
            basket: null,
            spearhead: null,
          },
        },
      };

      mockAtomicFsSuccess();

      savelib.saveTribe(mockGameState);

      expect(mockGameState.population.player1.food).toBe(0);
      expect(mockGameState.population.player1.grain).toBe(0);
      expect(mockGameState.population.player1.basket).toBe(0);
      expect(mockGameState.population.player1.spearhead).toBe(0);
      expect(fs.writeFileSync.mock.calls[0][1]).toContain('"food": 0');
      expect(fs.writeFileSync.mock.calls[0][1]).toContain('"grain": 0');
      expect(fs.writeFileSync.mock.calls[0][1]).toContain('"basket": 0');
      expect(fs.writeFileSync.mock.calls[0][1]).toContain('"spearhead": 0');
    });
  });
});
