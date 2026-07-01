const fs = require('fs');
const wsServer = require('../websocket-server.js');

describe('auth policy: optional passwords', () => {
  let writeSpy;
  let originalUsers;

  beforeEach(() => {
    writeSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});

    // Snapshot and reset users dictionary for isolated tests.
    originalUsers = JSON.parse(JSON.stringify(wsServer.usersDict || {}));
    Object.keys(wsServer.usersDict).forEach(
      (k) => delete wsServer.usersDict[k]
    );
  });

  afterEach(() => {
    // Restore users dictionary and file writes.
    Object.keys(wsServer.usersDict).forEach(
      (k) => delete wsServer.usersDict[k]
    );
    Object.assign(wsServer.usersDict, originalUsers);

    writeSpy.mockRestore();
    jest.clearAllMocks();
  });

  test('registerUser allows new user with name only', async () => {
    const result = await wsServer.registerUser({
      playerName: 'NoPasswordNewUser',
      password: '',
      email: '',
      clientIP: '127.0.0.1',
    });

    expect(result.label).toBe('success');
    expect(result.playerName).toBe('NoPasswordNewUser');
    expect(typeof result.sessionToken).toBe('string');
    expect(result.sessionToken.length).toBeGreaterThan(10);

    expect(wsServer.usersDict.NoPasswordNewUser).toBeDefined();
    expect(wsServer.usersDict.NoPasswordNewUser.password).toBe('');
  });

  test('validateUser allows existing empty-password account with no password input', async () => {
    wsServer.usersDict.LegacyNoPassword = {
      name: 'LegacyNoPassword',
      email: '',
      password: '',
      registeredAt: new Date().toISOString(),
      lastConnected: new Date().toISOString(),
    };

    const userData = {
      playerName: 'legacynopassword',
      password: '',
    };

    const ok = await wsServer.validateUser(userData);

    expect(ok).toBe(true);
    // Canonical casing should be returned.
    expect(userData.playerName).toBe('LegacyNoPassword');
  });
});
