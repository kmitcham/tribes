const { gather, gatherDataFor, listReadyToWork, canWork, craft, train, setSecrets } = require('../libs/work');
const pop = require('../libs/population.js');
const text = require('../libs/textprocess.js');
const dice = require('../libs/dice.js');
const gatherlib = require('../libs/gather.js');
const locations = require('../libs/locations.json');
console.log = jest.fn();

// Mock dependencies
jest.mock('../libs/population.js');
jest.mock('../libs/textprocess.js');
jest.mock('../libs/dice.js');
jest.mock('../libs/gather.js');

describe('Work Module Tests', () => {
  let mockGameState;
  let mockPlayer;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup mock player
    mockPlayer = {
      name: 'testPlayer',
      worked: false,
      isInjured: 0,
      isSick: 0,
      guarding: [],
      canCraft: false,
      basket: 0,
      spearhead: 0,
      activity: '',
      profession: ''
    };
    
    // Setup mock gameState
    mockGameState = {
        workRound: true,
        population: {'testPlayer':mockPlayer},
        saveRequired: false,
        ended: false
      };

    // Setup mocks
    pop.memberByName.mockReturnValue(mockPlayer);
    text.addMessage = jest.fn();
    pop.history = jest.fn();
    dice.roll.mockReturnValue(10);
    gatherlib.gather.mockReturnValue('Successfully gathered resources');
  });
  
  describe('gather function', () => {
    test('should not allow gathering when game is ended', () => {
      mockGameState.ended = true;
      
      gather(mockGameState, 'testPlayer');
      
      expect(text.addMessage).toHaveBeenCalledWith(
        mockGameState, 
        'testPlayer', 
        'The game is over.  Maybe you want to /join to start a new game?'
      );
    });
    
    test('should not allow gathering when player cannot work', () => {
      mockPlayer.worked = true;
      
      gather(mockGameState, 'testPlayer');
      
      expect(text.addMessage).toHaveBeenCalledWith(
        mockGameState, 
        'testPlayer', 
        'You cannot work (again) this round'
      );
    });
    
    test('should not allow gathering when guarding too many children', () => {
      mockPlayer.guarding = ['child1', 'child2', 'child3', 'child4', 'child5'];
      
      gather(mockGameState, 'testPlayer');
      
      expect(text.addMessage).toHaveBeenCalledWith(
        mockGameState, 
        'testPlayer', 
        'You can not gather while guarding more than 4 children.  You are guarding child1,child2,child3,child4,child5'
      );
    });
    
    test('should successfully gather resources', () => {
      gather(mockGameState, 'testPlayer');
      
      expect(dice.roll).toHaveBeenCalledWith(3);
      expect(gatherlib.gather).toHaveBeenCalledWith('testPlayer', mockPlayer, 10, mockGameState);
      expect(pop.history).toHaveBeenCalledWith('testPlayer', 'Successfully gathered resources', mockGameState);
      expect(mockGameState.saveRequired).toBe(true);
    });
  });
  
  describe('gatherDataFor function', () => {
    test('should return correct resource data for given location and roll', () => {
      // Test with roll within range
      const result = gatherDataFor('veldt', 10);
      expect(result).toEqual([10, 4, 0,"wild cucumber"]);
      
      // Test with roll above max
      const highResult = gatherDataFor('veldt', 20);
      expect(highResult).toEqual([15, 0, 6, 'grain']);
      
      // Test with roll below min
      const lowResult = gatherDataFor('veldt', 1);
      expect(lowResult).toEqual([7, 2,  0, 'grubs']);
    });
  });
  
  describe('listReadyToWork function', () => {
    test('should return list of players ready to work', () => {
      const mockPopulation = {
        player1: { worked: false, isInjured: 0, isSick: 0 },
        player2: { worked: true, isInjured: 0, isSick: 0 },
        player3: { worked: false, isInjured: 2, isSick: 0 },
        player4: { worked: false, isInjured: 0, isSick: 1 },
        player5: { worked: false, isInjured: 0, isSick: 0 }
      };
      
      const result = listReadyToWork(mockPopulation);
      
      expect(result).toContain('player1');
      expect(result).toContain('player5');
      expect(result).not.toContain('player2');
      expect(result).not.toContain('player3');
      expect(result).not.toContain('player4');
      expect(result.length).toBe(2);
    });
  });
  
  describe('canWork function', () => {
    test('should return message when not in work round', () => {
      mockGameState.workRound = false;
      
      const result = canWork(mockGameState, mockPlayer);
      
      expect(result).toBe('Can only work during the work round');
    });
    
    test('should return message when player is null', () => {
      const result = canWork(mockGameState, null);
      
      expect(result).toBe('Only tribe members can work.  Maybe !join');
    });
    
    test('should return message when player is injured', () => {
      mockPlayer.isInjured = 1;
      
      const result = canWork(mockGameState, mockPlayer);
      
      expect(result).toBe('You cannot work while you are injured');
    });
    
    test('should return message when player is sick', () => {
      mockPlayer.isSick = 1;
      
      const result = canWork(mockGameState, mockPlayer);
      
      expect(result).toBe('You cannot work while you are sick');
    });
    
    test('should return message when player has already worked', () => {
      mockPlayer.worked = true;
      
      const result = canWork(mockGameState, mockPlayer);
      
      expect(result).toBe('You cannot work (again) this round');
    });
    
    test('should return null when player can work', () => {
      const result = canWork(mockGameState, mockPlayer);
      
      expect(result).toBeNull();
    });
  });
  
  describe('craft function', () => {
    test('should not allow crafting when player cannot work', () => {
      mockPlayer.worked = true;
      
      craft(mockGameState, 'testPlayer', 'basket');
      
      expect(text.addMessage).toHaveBeenCalledWith(
        mockGameState, 
        'testPlayer', 
        'You cannot work (again) this round'
      );
    });
    
    test('should not allow crafting when player does not know how', () => {
      mockPlayer.canCraft = false;
      
      craft(mockGameState, 'testPlayer', 'basket');
      
      expect(text.addMessage).toHaveBeenCalledWith(
        mockGameState, 
        'testPlayer', 
        'You do not know how to craft'
      );
    });
    test('should not allow crafting when player knows nothing', () => {
      delete mockPlayer.canCraft;
      
      craft(mockGameState, 'testPlayer', 'basket');
      
      expect(text.addMessage).toHaveBeenCalledWith(
        mockGameState, 
        'testPlayer', 
        'You do not know how to craft'
      );
    });
    
    test('should not allow crafting when guarding too many children', () => {
      mockPlayer.canCraft = true;
      mockPlayer.guarding = ['child1', 'child2', 'child3'];
      
      craft(mockGameState, 'testPlayer', 'basket');
      
      expect(text.addMessage).toHaveBeenCalledWith(
        mockGameState, 
        'testPlayer', 
        'You can not craft while guarding more than 2 children.  You are guarding child1,child2,child3'
      );
    });
    
    test('should successfully craft a basket', () => {
      mockPlayer.canCraft = true;
      dice.roll.mockReturnValue(3);
      
      craft(mockGameState, 'testPlayer', 'basket');
      
      expect(dice.roll).toHaveBeenCalledWith(1);
      expect(mockPlayer.basket).toBe(1);
      expect(mockPlayer.worked).toBe(true);
      expect(mockPlayer.activity).toBe('craft');
      expect(mockGameState.saveRequired).toBe(true);
    });
    
    test('should successfully craft a spearhead', () => {
      mockPlayer.canCraft = true;
      dice.roll.mockReturnValue(4);
      
      craft(mockGameState, 'testPlayer', 'spearhead');
      
      expect(dice.roll).toHaveBeenCalledWith(1);
      expect(mockPlayer.spearhead).toBe(1);
      expect(mockPlayer.worked).toBe(true);
      expect(mockPlayer.activity).toBe('craft');
      expect(mockGameState.saveRequired).toBe(true);
    });
    
    test('should fail to craft with low roll', () => {
      mockPlayer.canCraft = true;
      dice.roll.mockReturnValue(1);
      
      craft(mockGameState, 'testPlayer', 'basket');
      
      expect(mockPlayer.basket).toBe(0);
      expect(mockPlayer.worked).toBe(true);
      expect(text.addMessage).toHaveBeenCalledWith(
        mockGameState,
        "tribe",
        expect.stringContaining('creates something[1], but it is not a basket')
      );
    });
  });
  
  describe('train function', () => {
    beforeEach(() => {
      pop.countByType = jest.fn();
      pop.countByType.mockImplementation((population, key, value) => {
        if (key === 'canCraft' && value === true) return 3;
        if (key === 'noTeach' && value === true) return 1;
        return 0;
      });
    });
    
    test('should not allow training when player cannot work', () => {
      mockPlayer.worked = true;
      
      train(mockGameState, 'testPlayer');
      
      expect(text.addMessage).toHaveBeenCalledWith(
        mockGameState, 
        'testPlayer', 
        'You cannot work (again) this round'
      );
    });
    
    test('should not allow training when player already knows crafting', () => {
      mockPlayer.canCraft = true;
      
      train(mockGameState, 'testPlayer');
      
      expect(text.addMessage).toHaveBeenCalledWith(
        mockGameState, 
        'testPlayer', 
        'You already know how to craft.'
      );
    });
    
    test('should not allow training when guarding too many children', () => {
      mockPlayer.guarding = ['child1', 'child2', 'child3'];
      
      train(mockGameState, 'testPlayer');
      
      expect(text.addMessage).toHaveBeenCalledWith(
        mockGameState, 
        'testPlayer', 
        'You can not learn crafting while guarding more than 2 children.  You are guarding child1,child2,child3'
      );
    });
    
    test('should not allow training when no teachers available', () => {
      pop.countByType.mockImplementation((population, key, value) => {
        if (key === 'canCraft' && value === true) return 2;
        if (key === 'noTeach' && value === true) return 2;
        return 0;
      });
      
      train(mockGameState, 'testPlayer');
      
      expect(text.addMessage).toHaveBeenCalledWith(
        mockGameState, 
        'testPlayer', 
        'No one in the tribe is able and willing to teach you crafting.'
      );
    });
    
    test('should successfully learn crafting with high roll', () => {
      dice.roll.mockReturnValue(10);
      
      train(mockGameState, 'testPlayer');
      
      expect(dice.roll).toHaveBeenCalledWith(2);
      expect(mockPlayer.canCraft).toBe(true);
      expect(mockPlayer.worked).toBe(true);
      expect(mockPlayer.activity).toBe('training');
      expect(text.addMessage).toHaveBeenCalledWith(
        mockGameState,
        "tribe",
        expect.stringContaining('learns to craft')
      );
    });
    
    test('should fail to learn crafting with low roll', () => {
      dice.roll.mockReturnValue(8);
      
      train(mockGameState, 'testPlayer');
      
      expect(dice.roll).toHaveBeenCalledWith(2);
      expect(mockPlayer.canCraft).toBeFalsy();
      expect(mockPlayer.worked).toBe(true);
      expect(mockPlayer.activity).toBe('training');
      expect(text.addMessage).toHaveBeenCalledWith(
        mockGameState,
        "tribe",
        expect.stringContaining('does not understand it yet')
      );
    });
  });
  
  describe('setSecrets function', () => {
    test('should set player to teach when they know crafting', () => {
      mockPlayer.canCraft = true;
      mockPlayer.noTeach = true;
      
      setSecrets(mockGameState, 'testPlayer', true);
      
      expect(mockPlayer.noTeach).toBeUndefined();
      expect(text.addMessage).toHaveBeenCalledWith(
        mockGameState,
        'testPlayer',
        'You will try to teach those willing to learn'
      );
      expect(mockGameState.saveRequired).toBe(true);
    });
    
    test('should set player to not teach when they know crafting', () => {
      mockPlayer.canCraft = true;
      
      setSecrets(mockGameState, 'testPlayer', false);
      
      expect(mockPlayer.noTeach).toBe(true);
      expect(text.addMessage).toHaveBeenCalledWith(
        mockGameState,
        'testPlayer',
        'You will no longer teach others to craft'
      );
      expect(mockGameState.saveRequired).toBe(true);
    });
    
    test('should not allow setting secrets when player does not know crafting', () => {
      mockPlayer.canCraft = false;
      
      setSecrets(mockGameState, 'testPlayer', true);
      
      expect(text.addMessage).toHaveBeenCalledWith(
        mockGameState,
        'testPlayer',
        'You do not know any crafting secrets'
      );
      expect(mockGameState.saveRequired).toBe(true);
    });
  });
});