const adminReferee = require('../src/server/admin-referee-service.js');
const messageRouter = require('../src/server/websocket-message-router-service.js');
const endgameCommand = require('../commands/chief/endgame.js');

function mockWs() {
  const sent = [];
  return {
    sent,
    playerName: null,
    send: (payload) => sent.push(JSON.parse(payload)),
  };
}

describe('security gates (review items 3-5)', () => {
  describe('manageTribe / manageUsers require credentials', () => {
    test('manageUsers rejects spoofed referee name without validateUser success', async () => {
      const ws = mockWs();
      const writeUsers = jest.fn();
      const usersDict = {
        Alice: { name: 'Alice', email: 'a@example.com', password: '' },
      };

      await adminReferee.handleManageUsers(
        ws,
        { action: 'list', playerName: 'Kevin' },
        {
          validateUser: async () => false,
          referees: ['Kevin'],
          usersDict,
          writeUsers,
          hashPasswordFn: async (p) => p,
        }
      );

      expect(ws.sent[0]).toMatchObject({
        type: 'error',
        message: 'Authentication failed',
      });
      expect(writeUsers).not.toHaveBeenCalled();
    });

    test('manageTribe rejects unauthenticated create even if name is a referee', async () => {
      const ws = mockWs();
      const createTribe = jest.fn();

      await adminReferee.handleManageTribe(
        ws,
        { action: 'create', playerName: 'Kevin', tribeName: 'evil' },
        {
          validateUser: async () => false,
          referees: ['Kevin'],
          tribesRegistry: { createTribe, getTribes: () => [] },
          connectedClients: new Map(),
          openState: 1,
        }
      );

      expect(ws.sent[0]).toMatchObject({
        type: 'error',
        message: 'Authentication failed',
      });
      expect(createTribe).not.toHaveBeenCalled();
    });

    test('manageUsers allows list after validateUser and referee check', async () => {
      const ws = mockWs();
      const usersDict = {
        Alice: { name: 'Alice', email: 'a@example.com', password: '' },
      };
      const trackPlayerConnection = jest.fn();

      await adminReferee.handleManageUsers(
        ws,
        { action: 'list', playerName: 'Kevin', sessionToken: 'tok' },
        {
          validateUser: async (data) => {
            data.playerName = 'Kevin';
            return true;
          },
          referees: ['Kevin'],
          usersDict,
          writeUsers: jest.fn(),
          hashPasswordFn: async (p) => p,
          connectionStore: { trackPlayerConnection },
        }
      );

      expect(ws.sent[0].type).toBe('manageUsersList');
      expect(ws.sent[0].users).toEqual([
        { name: 'Alice', email: 'a@example.com' },
      ]);
      expect(trackPlayerConnection).toHaveBeenCalledWith(ws, 'Kevin');
      expect(ws.playerName).toBe('Kevin');
    });

    test('manageTribe rejects authenticated non-referee', async () => {
      const ws = mockWs();

      await adminReferee.handleManageTribe(
        ws,
        { action: 'create', playerName: 'Alice', tribeName: 'x' },
        {
          validateUser: async (data) => {
            data.playerName = 'Alice';
            return true;
          },
          referees: ['Kevin'],
          tribesRegistry: { createTribe: jest.fn(), getTribes: () => [] },
          connectedClients: new Map(),
          openState: 1,
        }
      );

      expect(ws.sent[0]).toMatchObject({
        type: 'error',
        message: 'You are not a referee.',
      });
    });
  });

  describe('router does not bind player before auth', () => {
    test('does not call trackPlayerConnection for unauthenticated message types', async () => {
      const trackPlayerConnection = jest.fn();
      const trackTribeConnection = jest.fn();
      const ws = mockWs();
      const handlers = {
        infoRequest: jest.fn(async () => {}),
      };

      await messageRouter.handleWebSocketMessage(
        ws,
        {
          type: 'infoRequest',
          playerName: 'Victim',
          tribe: 'bug',
          request: 'population',
        },
        {
          getGameState: async () => ({ name: 'bug' }),
          findStoredUserName: (n) => n,
          connectionStore: {
            trackTribeConnection,
            trackPlayerConnection,
          },
          logWithTimestamp: jest.fn(),
          handlers,
        }
      );

      expect(trackTribeConnection).toHaveBeenCalledWith(ws, 'bug');
      expect(trackPlayerConnection).not.toHaveBeenCalled();
      expect(handlers.infoRequest).toHaveBeenCalled();
    });
  });

  describe('endgame requires chief', () => {
    test('non-chief cannot end the game', async () => {
      const gameState = {
        population: {
          Alice: { name: 'Alice', chief: false },
        },
        messages: {},
        ended: false,
      };

      await endgameCommand.execute(
        { member: { displayName: 'Alice' } },
        gameState,
        null
      );

      expect(gameState.ended).not.toBe(true);
      expect(gameState.archiveRequired).toBeUndefined();
      expect(gameState.messages.Alice).toMatch(/chief privileges/i);
    });

    test('chief can end the game', async () => {
      const gameState = {
        name: 'bug',
        population: {
          Chief: { name: 'Chief', chief: true, gender: 'male', food: 0 },
        },
        children: {},
        graveyard: {},
        messages: {},
        ended: false,
        gameTrack: { veldt: 1, forest: 1, marsh: 1, hills: 1 },
        currentLocationName: 'veldt',
        seasonCounter: 1,
      };

      // endGame may pull in scoring; assert chief path reaches endLib
      const endLib = require('../libs/endgame.js');
      const spy = jest.spyOn(endLib, 'endGame').mockImplementation((gs) => {
        gs.ended = true;
        return 'ended';
      });

      await endgameCommand.execute(
        { member: { displayName: 'Chief' } },
        gameState,
        null
      );

      expect(spy).toHaveBeenCalled();
      expect(gameState.ended).toBe(true);
      expect(gameState.saveRequired).toBe(true);
      expect(gameState.archiveRequired).toBe(true);
      spy.mockRestore();
    });
  });
});
