const fs = require('fs');
const wsServer = require('../websocket-server.js');

describe('auth policy: optional passwords', () => {
  let writeSpy;
  let renameSpy;
  let copySpy;
  let originalUsers;

  beforeEach(() => {
    // writeJson is atomic (temp write + rename). Stub the full path so tests
    // do not touch the real users.json on disk.
    writeSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    renameSpy = jest.spyOn(fs, 'renameSync').mockImplementation(() => {});
    copySpy = jest.spyOn(fs, 'copyFileSync').mockImplementation(() => {});

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
    renameSpy.mockRestore();
    copySpy.mockRestore();
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
