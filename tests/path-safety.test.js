const path = require('path');
const fs = require('fs');
const pathSafety = require('../libs/pathSafety.js');
const savelib = require('../libs/save.js');

describe('path safety (review #9)', () => {
  describe('tribe names', () => {
    test('accepts normal tribe names', () => {
      expect(pathSafety.isSafeTribeName('bug')).toBe(true);
      expect(pathSafety.isSafeTribeName('join-reset-test')).toBe(true);
      expect(pathSafety.isSafeTribeName('wolf_2')).toBe(true);
    });

    test('rejects traversal and unsafe names', () => {
      expect(pathSafety.isSafeTribeName('../etc')).toBe(false);
      expect(pathSafety.isSafeTribeName('..')).toBe(false);
      expect(pathSafety.isSafeTribeName('foo/bar')).toBe(false);
      expect(pathSafety.isSafeTribeName('foo\\bar')).toBe(false);
      expect(pathSafety.isSafeTribeName('')).toBe(false);
      expect(pathSafety.isSafeTribeName('.')).toBe(false);
      expect(pathSafety.isSafeTribeName('a'.repeat(100))).toBe(false);
    });

    test('tribeMainFile stays under tribe-data', () => {
      const file = pathSafety.tribeMainFile('bug');
      const root = pathSafety.tribeDataRoot();
      expect(file.startsWith(root + path.sep)).toBe(true);
      expect(file.endsWith(`${path.sep}bug${path.sep}bug.json`)).toBe(true);
    });

    test('loadTribe rejects traversal names without touching disk init', () => {
      expect(() => savelib.loadTribe('../../etc')).toThrow(/Invalid tribe name/);
      expect(() => savelib.loadTribe('..')).toThrow(/Invalid tribe name/);
    });
  });

  describe('static images', () => {
    const appRoot = path.join(__dirname, '..');

    test('serves basename images from app root', () => {
      const resolved = pathSafety.resolveSafeImagePath(appRoot, '/caveman.png');
      expect(resolved).toBe(path.resolve(appRoot, 'caveman.png'));
      expect(fs.existsSync(resolved)).toBe(true);
    });

    test('ignores path traversal attempts', () => {
      expect(
        pathSafety.resolveSafeImagePath(appRoot, '/../package.json.png')
      ).toBeNull();
      expect(
        pathSafety.resolveSafeImagePath(appRoot, '/../../etc/passwd.png')
      ).toBeNull();
      expect(
        pathSafety.resolveSafeImagePath(
          appRoot,
          '/../libs/../caveman.png/../../package.json'
        )
      ).toBeNull();
    });

    test('strips query string and still resolves safe image', () => {
      const resolved = pathSafety.resolveSafeImagePath(
        appRoot,
        '/caveman.png?cache=1'
      );
      expect(resolved).toBe(path.resolve(appRoot, 'caveman.png'));
    });

    test('rejects non-image basenames', () => {
      expect(
        pathSafety.resolveSafeImagePath(appRoot, '/package.json')
      ).toBeNull();
    });
  });
});
