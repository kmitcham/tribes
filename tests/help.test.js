/**
 * Unit Tests for Help Module
 *
 * Tests the help text generation functions that provide game documentation
 */

const help = require('../libs/help.js');

describe('Help Module', () => {
  describe('playerHelpBasic', () => {
    test('should return a string with basic command help', () => {
      const result = help.playerHelpBasic();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    test('should include general commands section', () => {
      const result = help.playerHelpBasic();
      expect(result).toContain('###General Commands###');
    });

    test('should include babysit command', () => {
      const result = help.playerHelpBasic();
      expect(result).toContain('babysit');
    });

    test('should include children command', () => {
      const result = help.playerHelpBasic();
      expect(result).toContain('children');
    });

    test('should include give command', () => {
      const result = help.playerHelpBasic();
      expect(result).toContain('give');
    });

    test('should include inventory command', () => {
      const result = help.playerHelpBasic();
      expect(result).toContain('inventory');
    });

    test('should include scout command', () => {
      const result = help.playerHelpBasic();
      expect(result).toContain('scout');
    });

    test('should include vote command', () => {
      const result = help.playerHelpBasic();
      expect(result).toContain('vote');
    });

    test('should include status command', () => {
      const result = help.playerHelpBasic();
      expect(result).toContain('status');
    });

    test('should include ping command', () => {
      const result = help.playerHelpBasic();
      expect(result).toContain('ping');
    });
  });

  describe('playerHelpRounds', () => {
    test('should return a string with round-based command help', () => {
      const result = help.playerHelpRounds();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    test('should include work round commands', () => {
      const result = help.playerHelpRounds();
      expect(result).toContain('###Work Round Commands###');
    });

    test('should include food round commands', () => {
      const result = help.playerHelpRounds();
      expect(result).toContain('Food Round Commands');
    });

    test('should include reproduction commands', () => {
      const result = help.playerHelpRounds();
      expect(result).toContain('Reproduction Commands');
    });

    test('should include guard command', () => {
      const result = help.playerHelpRounds();
      expect(result).toContain('guard');
    });

    test('should include craft command', () => {
      const result = help.playerHelpRounds();
      expect(result).toContain('craft');
    });

    test('should include gather command', () => {
      const result = help.playerHelpRounds();
      expect(result).toContain('gather');
    });

    test('should include hunt command', () => {
      const result = help.playerHelpRounds();
      expect(result).toContain('hunt');
    });

    test('should include feed command', () => {
      const result = help.playerHelpRounds();
      expect(result).toContain('feed');
    });

    test('should include romance command', () => {
      const result = help.playerHelpRounds();
      expect(result).toContain('romance');
    });

    test('should include invite command', () => {
      const result = help.playerHelpRounds();
      expect(result).toContain('invite');
    });

    test('should include consent command', () => {
      const result = help.playerHelpRounds();
      expect(result).toContain('consent');
    });

    test('should include decline command', () => {
      const result = help.playerHelpRounds();
      expect(result).toContain('decline');
    });
  });

  describe('playerHelpConflict', () => {
    test('should return a string with conflict command help', () => {
      const result = help.playerHelpConflict();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    test('should include conflict commands section', () => {
      const result = help.playerHelpConflict();
      expect(result).toContain('###Conflict Commands###');
    });

    test('should include demand command', () => {
      const result = help.playerHelpConflict();
      expect(result).toContain('demand');
    });

    test('should include faction command', () => {
      const result = help.playerHelpConflict();
      expect(result).toContain('faction');
    });

    test('should include attack command', () => {
      const result = help.playerHelpConflict();
      expect(result).toContain('attack');
    });

    test('should include defend command', () => {
      const result = help.playerHelpConflict();
      expect(result).toContain('defend');
    });

    test('should include run command', () => {
      const result = help.playerHelpConflict();
      expect(result).toContain('run');
    });
  });

  describe('chiefHelp', () => {
    test('should return a string with chief command help', () => {
      const result = help.chiefHelp();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    test('should include chief commands section', () => {
      const result = help.chiefHelp();
      expect(result).toContain('### Chief Commands ###');
    });

    test('should include induct command', () => {
      const result = help.chiefHelp();
      expect(result).toContain('induct');
    });

    test('should include banish command', () => {
      const result = help.chiefHelp();
      expect(result).toContain('banish');
    });

    test('should include startwork command', () => {
      const result = help.chiefHelp();
      expect(result).toContain('startwork');
    });

    test('should include startfood command', () => {
      const result = help.chiefHelp();
      expect(result).toContain('startfood');
    });

    test('should include startreproduction command', () => {
      const result = help.chiefHelp();
      expect(result).toContain('startreproduction');
    });

    test('should include migrate command', () => {
      const result = help.chiefHelp();
      expect(result).toContain('migrate');
    });

    test('should include decree command', () => {
      const result = help.chiefHelp();
      expect(result).toContain('decree');
    });

    test('should include endgame command', () => {
      const result = help.chiefHelp();
      expect(result).toContain('endgame');
    });

    test('should include chance command', () => {
      const result = help.chiefHelp();
      expect(result).toContain('chance');
    });

    test('should include skip command', () => {
      const result = help.chiefHelp();
      expect(result).toContain('skip');
    });
  });
});
