const fs = require('fs');
const path = require('path');
const tribesRegistry = require('../libs/tribesRegistry.js');

jest.mock('fs');

describe('tribesRegistry.js', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should initialize and create default tribes if empty registry and empty discovering directory', () => {
    fs.existsSync.mockReturnValue(false); // simulate dir and file don't exist
    fs.readdirSync.mockReturnValue([]); // no dirs found

    const tribes = tribesRegistry.getTribes();

    expect(fs.mkdirSync).toHaveBeenCalledWith('./tribe-data', {
      recursive: true,
    });
    // Should create defualts: bear, flounder, bug, vashon, mib, sloth, wolf
    expect(Object.keys(tribes)).toEqual([
      'bear',
      'flounder',
      'bug',
      'vashon',
      'mib',
      'sloth',
      'wolf',
    ]);
    expect(fs.writeFileSync).toHaveBeenCalled();
  });

  test('should initialize registry from existing JSON file', () => {
    fs.existsSync.mockImplementation((path) => {
      if (path === './tribe-data') return true;
      if (path === './tribe-data/tribesRegistry.json') return true;
      return false;
    });

    const mockData = {
      'test-tribe': { name: 'test-tribe', hidden: true },
    };
    fs.readFileSync.mockReturnValue(JSON.stringify(mockData));

    const tribes = tribesRegistry.getTribes();
    expect(tribes).toEqual(mockData);
    expect(fs.readdirSync).not.toHaveBeenCalled();
  });

  test('should handle JSON parse error during registry init', () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue('invalid-json');
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    fs.readdirSync.mockReturnValue([]);

    const tribes = tribesRegistry.getTribes();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Error reading tribes registry'),
      expect.any(Object)
    );
    consoleSpy.mockRestore();
  });

  test('should discover from dirs if file does not exist', () => {
    fs.existsSync.mockImplementation((path) => {
      if (path === './tribe-data') return true;
      if (path === './tribe-data/tribesRegistry.json') return false; // trigger dir discovery
      return false;
    });

    fs.readdirSync.mockReturnValue([
      { name: 'found-dir', isDirectory: () => true },
      { name: 'found-file.txt', isDirectory: () => false },
    ]);

    const tribes = tribesRegistry.getTribes();

    expect(tribes).toHaveProperty('found-dir');
    expect(tribes).not.toHaveProperty('found-file.txt');
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      './tribe-data/tribesRegistry.json',
      expect.stringContaining('"found-dir"')
    );
  });

  test('setTribeHidden should modify an existing tribe', () => {
    // setup mock registry to have data
    fs.existsSync.mockReturnValue(true);
    const mockData = {
      hiddenTribe: { name: 'hiddenTribe', hidden: false },
    };
    fs.readFileSync.mockReturnValue(JSON.stringify(mockData));

    const reg = tribesRegistry.setTribeHidden('hiddenTribe', true);

    expect(reg['hiddenTribe'].hidden).toBe(true);
    expect(fs.writeFileSync).toHaveBeenCalled();
  });

  test('setTribeHidden should add a missing tribe to the registry', () => {
    // setup mock registry to be empty
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(JSON.stringify({}));

    const reg = tribesRegistry.setTribeHidden('newTribe', true);

    expect(reg['newTribe'].hidden).toBe(true);
    expect(fs.writeFileSync).toHaveBeenCalled();
  });

  test('createTribe should ignore an existing tribe and return registry', () => {
    fs.existsSync.mockReturnValue(true);
    const mockData = {
      'my-tribe': { name: 'my-tribe', hidden: true },
    };
    fs.readFileSync.mockReturnValue(JSON.stringify(mockData));

    const reg = tribesRegistry.createTribe('my-tribe');

    expect(reg['my-tribe'].hidden).toBe(true); // Should not override hidden status or recreate
  });

  test('createTribe should create a new tribe with hidden false', () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(JSON.stringify({}));

    const reg = tribesRegistry.createTribe('brand-new-tribe');

    expect(reg['brand-new-tribe']).toBeDefined();
    expect(reg['brand-new-tribe'].hidden).toBe(false);
    expect(fs.writeFileSync).toHaveBeenCalled();
  });
});
