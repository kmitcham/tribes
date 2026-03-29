/**
 * Unit Tests for Obey Module
 *
 * Tests the command function that allows chiefs to order tribe members
 */

// Mock the dependencies
jest.mock('../libs/textprocess.js', () => ({
  addMessage: jest.fn(),
}));

jest.mock('../libs/population', () => ({
  memberByName: jest.fn(),
  history: jest.fn(),
}));

jest.mock('../libs/hunt.js', () => ({
  hunt: jest.fn(),
}));

jest.mock('../libs/dice', () => ({
  roll: jest.fn(() => 10),
}));

jest.mock('../libs/work.js', () => ({
  gather: jest.fn(),
  craft: jest.fn(),
}));

const obey = require('../libs/obey.js');
const text = require('../libs/textprocess.js');
const pop = require('../libs/population');
const huntlib = require('../libs/hunt.js');
const dice = require('../libs/dice');
const worklib = require('../libs/work.js');

describe('Obey Module', () => {
  let gameState;
  let chiefMember;
  let targetMember;

  beforeEach(() => {
    jest.clearAllMocks();

    gameState = {
      population: {},
      messages: {},
    };

    chiefMember = {
      name: 'ChiefPlayer',
      chief: true,
    };

    targetMember = {
      name: 'TargetPlayer',
      canCraft: true,
    };

    // Setup mock returns
    pop.memberByName.mockImplementation((name) => {
      if (name === 'ChiefPlayer') return chiefMember;
      if (name === 'TargetPlayer') return targetMember;
      return null;
    });
  });

  describe('command', () => {
    test('should record history when a command is given', () => {
      obey.command(gameState, 'ChiefPlayer', 'TargetPlayer', 'hunt');

      expect(pop.history).toHaveBeenCalledWith(
        'TargetPlayer',
        'ChiefPlayer ordered you to hunt',
        gameState
      );
    });

    test('should execute hunt command', () => {
      dice.roll.mockReturnValue(12);

      obey.command(gameState, 'ChiefPlayer', 'TargetPlayer', 'hunt');

      expect(dice.roll).toHaveBeenCalledWith(3);
      expect(huntlib.hunt).toHaveBeenCalledWith(
        'TargetPlayer',
        targetMember,
        12,
        gameState
      );
    });

    test('should execute gather command', () => {
      dice.roll.mockReturnValue(8);

      obey.command(gameState, 'ChiefPlayer', 'TargetPlayer', 'gather');

      expect(dice.roll).toHaveBeenCalledWith(3);
      expect(worklib.gather).toHaveBeenCalledWith(
        'TargetPlayer',
        targetMember,
        8,
        gameState
      );
    });

    test('should execute craft spearhead command when target can craft', () => {
      targetMember.canCraft = true;

      obey.command(
        gameState,
        'ChiefPlayer',
        'TargetPlayer',
        'craft',
        'spearhead'
      );

      expect(worklib.craft).toHaveBeenCalledWith(
        gameState,
        'TargetPlayer',
        'spearhead',
        0
      );
    });

    test('should execute craft basket command when target can craft', () => {
      targetMember.canCraft = true;

      obey.command(gameState, 'ChiefPlayer', 'TargetPlayer', 'craft', 'basket');

      expect(worklib.craft).toHaveBeenCalledWith(
        gameState,
        'TargetPlayer',
        'basket',
        0
      );
    });

    test('should send error message when target cannot craft', () => {
      targetMember.canCraft = false;

      obey.command(
        gameState,
        'ChiefPlayer',
        'TargetPlayer',
        'craft',
        'spearhead'
      );

      expect(worklib.craft).not.toHaveBeenCalled();
      expect(text.addMessage).toHaveBeenCalledWith(
        gameState,
        'ChiefPlayer',
        'TargetPlayer does not know how to do that.'
      );
    });

    test('should send error message when craft type is invalid', () => {
      targetMember.canCraft = true;

      obey.command(
        gameState,
        'ChiefPlayer',
        'TargetPlayer',
        'craft',
        'invalid'
      );

      expect(worklib.craft).not.toHaveBeenCalled();
      expect(text.addMessage).toHaveBeenCalledWith(
        gameState,
        'ChiefPlayer',
        'TargetPlayer does not know how to do that.'
      );
    });

    test('should get correct members by name', () => {
      obey.command(gameState, 'ChiefPlayer', 'TargetPlayer', 'hunt');

      expect(pop.memberByName).toHaveBeenCalledWith('ChiefPlayer', gameState);
      expect(pop.memberByName).toHaveBeenCalledWith('TargetPlayer', gameState);
    });
  });
});
