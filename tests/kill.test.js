const { kill } = require('../libs/kill'); // Replace with your actual module name
const logger = require('../libs/logger.js');

describe('kill function', () => {
  let loggerSpy;

  beforeEach(() => {
    loggerSpy = jest.spyOn(logger.accessLog, 'info').mockImplementation();

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    loggerSpy.mockRestore();
  });

  test('should kill an adult person and add them to graveyard', () => {
    // Setup
    const name = 'john';
    const message = 'starvation';
    const targetKey = 'john'; // Assuming the key matches the name

    const person = {
      name: 'john',
      age: 30,
      isPregnant: null,
      nursing: null,
    };

    const gameState = {
      seasonCounter: 5,
      population: { [targetKey]: person },
      children: {},
      population: {
        john: person,
      },
    };

    // Execute
    kill(name, message, gameState);

    // Assert
    expect(loggerSpy).toHaveBeenCalledWith(
      'Killing john due to starvation at seasonCount 5'
    );
    expect(gameState.graveyard).toHaveProperty('john');
    expect(gameState.graveyard.john).toBe(person);
    expect(gameState.graveyard.john.deathMessage).toBe('starvation');
    expect(gameState.population).not.toHaveProperty('john');
    expect(gameState.messages['tribe']).toContain('john killed by starvation');
  });

  test('should kill a child and add them to graveyard', () => {
    // Setup
    const name = 'timmy';
    const message = 'disease';
    const targetKey = 'timmy';

    const child = {
      name: 'timmy',
      age: 5,
      isPregnant: null,
      nursing: null,
    };

    const gameState = {
      seasonCounter: 3,
      population: {},
      children: { [targetKey]: child },
    };

    // Execute
    kill(name, message, gameState);

    // Assert
    expect(loggerSpy).toHaveBeenCalledWith(
      'Killing timmy due to disease at seasonCount 3'
    );
    expect(gameState.graveyard).toHaveProperty('timmy');
    expect(gameState.graveyard.timmy).toBe(child);
    expect(gameState.graveyard.timmy.deathMessage).toBe('disease');
    expect(gameState.children).not.toHaveProperty('timmy');
    expect(gameState.messages['tribe']).toContain('timmy killed by disease');
  });

  test('should handle persons who are pregnant', () => {
    // Setup
    const name = 'mary';
    const message = 'accident';
    const targetKey = 'mary';

    const person = {
      name: 'mary',
      age: 25,
      isPregnant: 'Unborn_baby',
      nursing: null,
    };

    const gameState = {
      seasonCounter: 7,
      population: { [targetKey]: person },
      children: {
        Unborn_baby: {
          name: 'Unborn_baby',
          age: -1,
          mother: 'mary',
          father: 'pop',
        },
      },
    };

    // Execute
    kill(name, message, gameState);

    // Assert
    expect(loggerSpy).toHaveBeenCalledWith(
      'Killing mary due to accident at seasonCount 7'
    );
    // Should have tried to kill the unborn baby too
    expect(gameState.graveyard).toHaveProperty('mary');
    expect(gameState.graveyard).toHaveProperty('Unborn_baby');
    expect(gameState.messages['tribe']).toContain('mary killed by accident');
    expect(gameState.messages['tribe']).toContain(
      'Unborn_baby died in utero after mother died'
    );
  });

  test('should handle persons who are nursing children', () => {
    // Setup
    const name = 'sarah';
    const message = 'disease';
    const person = {
      name: 'sarah',
      age: 28,
      isPregnant: null,
      nursing: ['baby1', 'baby2'],
    };

    const baby1 = { name: 'Baby1', age: 0 };
    const baby2 = { name: 'Baby2', age: 0 };

    const gameState = {
      seasonCounter: 9,
      population: { sarah: person },
      children: { Baby1: baby1, Baby2: baby2 },
    };

    // Execute
    kill(name, message, gameState);

    // Assert
    expect(loggerSpy).toHaveBeenCalledWith(
      'Killing sarah due to disease at seasonCount 9'
    );
    // Should have tried to kill the nursing babies too
    expect(loggerSpy).toHaveBeenCalledWith(
      'Killing baby1 due to no-milk at seasonCount 9'
    );
    expect(loggerSpy).toHaveBeenCalledWith(
      'Killing baby2 due to no-milk at seasonCount 9'
    );
    expect(gameState.graveyard).toHaveProperty('sarah');
    expect(gameState.graveyard).toHaveProperty('Baby1');
    expect(gameState.graveyard).toHaveProperty('Baby2');
    expect(gameState.messages['tribe']).toContain('sarah');
    expect(gameState.messages['tribe']).toContain('disease');
    expect(gameState.messages['tribe']).toContain('no-milk');
  });

  test('should use "unknown causes" when no message is provided', () => {
    // Setup
    const name = 'alex';
    const message = '';
    const targetKey = 'alex';

    const person = {
      name: 'alex',
      age: 40,
      isPregnant: null,
      nursing: null,
    };

    const gameState = {
      seasonCounter: 11,
      population: { [targetKey]: person },
      children: {},
    };

    // Execute
    kill(name, message, gameState);

    // Assert
    // Message is normalized to "unknown causes" before the kill log line.
    expect(loggerSpy).toHaveBeenCalledWith(
      'Killing alex due to unknown causes at seasonCount 11'
    );
    expect(gameState.graveyard.alex.deathMessage).toBe('unknown causes');
    expect(gameState.messages['tribe']).toContain(
      'alex killed by unknown causes'
    );
  });

  test('should handle case when person not found', () => {
    // Setup
    const name = 'unknown';
    const message = 'test';

    const gameState = {
      seasonCounter: 13,
      population: {},
      children: {},
    };

    // Execute
    kill(name, message, gameState);

    // Assert
    expect(loggerSpy).toHaveBeenCalledWith(
      'Killing unknown due to test at seasonCount 13'
    );
    expect(loggerSpy).toHaveBeenCalledWith(
      'Tried to kill unknown but could not find them'
    );
    expect(gameState.graveyard).not.toHaveProperty('unknown');
  });

  test('should initialize graveyard if it does not exist', () => {
    // Setup
    const name = 'bob';
    const message = 'old age';
    const targetKey = 'bob';

    const person = {
      name: 'bob',
      age: 80,
      isPregnant: null,
      nursing: null,
    };

    const gameState = {
      seasonCounter: 15,
      population: { [targetKey]: person },
      children: {},
      // No graveyard property
    };

    // Execute
    kill(name, message, gameState);

    // Assert
    expect(gameState.graveyard).toBeDefined();
    expect(gameState.graveyard).toHaveProperty('bob');
  });
});
