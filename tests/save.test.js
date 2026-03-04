const fs = require('fs');
const path = require('path');

// Mock fs module
jest.mock('fs');
// Mock ws module to prevent WebSocket server from starting
jest.mock('ws', () => ({
  Server: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    close: jest.fn()
  }))
}));

const savelib = require('../libs/save.js');

// Suppress console.log during tests
console.log = jest.fn();

describe('Save Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initGame', () => {
    beforeEach(() => {
      fs.existsSync.mockReturnValue(true);
      fs.writeFileSync.mockImplementation(() => {});
      fs.readFileSync.mockReturnValue(JSON.stringify({}));
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
      const tribeData = { name: 'test-tribe', population: {} };
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify(tribeData));
      
      const result = savelib.loadTribe('test-tribe');
      
      expect(result).toEqual(tribeData);
      expect(fs.existsSync).toHaveBeenCalledWith('./tribe-data/test-tribe/test-tribe.json');
    });

    test('should create new tribe if file does not exist', () => {
      fs.existsSync
        .mockReturnValueOnce(false) // file doesn't exist
        .mockReturnValueOnce(false) // directory doesn't exist
        .mockReturnValueOnce(true); // after creation
      fs.mkdirSync.mockImplementation(() => {});
      fs.writeFileSync.mockImplementation(() => {});
      fs.readFileSync.mockReturnValue(JSON.stringify({}));
      
      const result = savelib.loadTribe('new-tribe');
      
      expect(result.name).toBe('new-tribe');
      expect(fs.mkdirSync).toHaveBeenCalledWith('./tribe-data/new-tribe', { recursive: true });
    });
  });

  describe('saveFinalGameState', () => {
    test('should save final game state with correct filename format', async () => {
      const mockGameState = {
        name: 'test-tribe',
        population: { player1: { name: 'Player1' } },
        ended: true
      };

      fs.writeFileSync.mockImplementation(() => {});
      fs.readFileSync.mockReturnValue(JSON.stringify(mockGameState));

      await savelib.saveFinalGameState(mockGameState);

      expect(fs.writeFileSync).toHaveBeenCalled();
      const callArgs = fs.writeFileSync.mock.calls[0];
      expect(callArgs[0]).toMatch(/\.\/tribe-data\/test-tribe\/test-tribe-final-\d{4}-\d{2}-\d{2}\.json/);
    });

    test('should add final save markers to game state', async () => {
      const mockGameState = {
        name: 'test-tribe',
        ended: true
      };

      fs.writeFileSync.mockImplementation(() => {});
      fs.readFileSync.mockReturnValue(JSON.stringify(mockGameState));

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

      expect(fs.existsSync).toHaveBeenCalledWith('./tribe-data/test-tribe/test-tribe.json');
      expect(fs.unlinkSync).toHaveBeenCalledWith('./tribe-data/test-tribe/test-tribe.json');
    });

    test('should not attempt to remove file when it does not exist', async () => {
      fs.existsSync.mockReturnValue(false);

      await savelib.clearMainGameFile('test-tribe');

      expect(fs.existsSync).toHaveBeenCalledWith('./tribe-data/test-tribe/test-tribe.json');
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
        'test-tribe-2026-03-05T10:00:00.000Z.json'
      ];
      fs.readdirSync.mockReturnValue(mockFiles);

      // Mock file stats with dates corresponding to filenames
      fs.statSync.mockImplementation((filePath) => {
        const filename = path.basename(filePath);
        const dateMatch = filename.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
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
        'test-tribe-2026-03-05T10:00:00.000Z.json'
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
        'test-tribe-2026-03-05T10:00:00.000Z.json'
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
        population: { player1: { name: 'Player1' } }
      };

      fs.writeFileSync.mockImplementation(() => {});
      fs.existsSync.mockReturnValue(true);
      fs.unlinkSync.mockImplementation(() => {});
      fs.readFileSync.mockReturnValue(JSON.stringify(mockGameState));

      await savelib.archiveTribe(mockGameState);

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
        population: { player1: { name: 'Player1' } }
      };

      fs.writeFileSync.mockImplementation(() => {});
      fs.existsSync.mockReturnValue(true);
      fs.readdirSync.mockReturnValue([]);
      fs.readFileSync.mockReturnValue(JSON.stringify(mockGameState));

      await savelib.archiveTribe(mockGameState);

      // Verify snapshot was saved (should contain tribe name and timestamp)
      const writeCall = fs.writeFileSync.mock.calls[0];
      expect(writeCall[0]).toContain('test-tribe-');
      expect(writeCall[0]).not.toContain('-final-');
    });
  });

  describe('saveTribe', () => {
    test('should save game state to correct file', async () => {
      const mockGameState = {
        name: 'test-tribe',
        population: { player1: { name: 'Player1' } }
      };

      fs.writeFileSync.mockImplementation(() => {});
      fs.readFileSync.mockReturnValue(JSON.stringify(mockGameState));

      await savelib.saveTribe(mockGameState);

      expect(fs.writeFileSync).toHaveBeenCalled();
      const writeCall = fs.writeFileSync.mock.calls[0];
      expect(writeCall[0]).toBe('./tribe-data/test-tribe/test-tribe.json');
    });

    test('should update lastSaved timestamp', async () => {
      const mockGameState = {
        name: 'test-tribe',
        population: {}
      };

      fs.writeFileSync.mockImplementation(() => {});
      fs.readFileSync.mockReturnValue(JSON.stringify(mockGameState));

      await savelib.saveTribe(mockGameState);

      expect(mockGameState.lastSaved).toBeDefined();
    });
  });
});
