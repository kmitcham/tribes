async function hashPassword(password, bcryptLib) {
  const saltRounds = 12; // Increased from 3 to 12 for better security
  return await bcryptLib.hash(password, saltRounds);
}

async function verifyPassword(input, hash, bcryptLib) {
  return await bcryptLib.compare(input, hash);
}

async function validateUser(userData, deps) {
  const {
    normalizePlayerName,
    findStoredUserName,
    validateSession,
    samePlayerName,
    usersDict,
    writeUsers,
    clearFailedAttempts,
    recordFailedAttempt,
    verifyPasswordFn,
  } = deps;

  const inputName = normalizePlayerName(userData.playerName);
  const storedName = findStoredUserName(inputName);

  // Check if user has a valid session token
  if (userData.sessionToken) {
    const session = validateSession(userData.sessionToken);
    if (session && samePlayerName(session.playerName, inputName)) {
      // Update last connected time for session authentication
      const sessionStoredName = findStoredUserName(session.playerName);
      const user = sessionStoredName ? usersDict[sessionStoredName] : null;
      if (user) {
        user.lastConnected = new Date().toISOString();
        writeUsers();
      }
      userData.playerName = session.playerName;
      return true;
    }
    // If session is invalid, fall through to password authentication
  }

  if (!inputName || inputName.length === 0) {
    return false;
  }

  // Check rate limiting
  const identifier = inputName.toLowerCase();
  const attemptData = deps.loginAttempts.get(identifier) || {
    count: 0,
    lastAttempt: 0,
    lockoutUntil: 0,
  };

  if (Date.now() < attemptData.lockoutUntil) {
    throw new Error('Account locked. Try again later.');
  }

  if (!storedName) {
    return false; // User doesn't exist
  }

  userData.playerName = storedName;
  const user = usersDict[storedName];
  if (!user) {
    return false; // User doesn't exist
  }

  // AUTH POLICY (intentional): name-only accounts are valid.
  // Do not require a password when the stored account has an empty password.
  // This preserves long-standing gameplay behavior for legacy tribes.
  if (!user.password || user.password === '') {
    user.lastConnected = new Date().toISOString();
    writeUsers();
    clearFailedAttempts(identifier);
    return true;
  }

  // If user has password set, require password authentication
  if (!userData.password) {
    recordFailedAttempt(identifier);
    return false;
  }

  try {
    const isValid = await verifyPasswordFn(userData.password, user.password);
    if (isValid) {
      clearFailedAttempts(identifier);
      // Update last connected time for successful authentication
      user.lastConnected = new Date().toISOString();
      writeUsers();
      return true;
    }

    recordFailedAttempt(identifier);
    return false;
  } catch (_error) {
    recordFailedAttempt(identifier);
    return false;
  }
}

async function registerUser(userData, deps) {
  const {
    normalizePlayerName,
    findStoredUserName,
    usersDict,
    validatePassword,
    hashPasswordFn,
    verifyPasswordFn,
    writeUsers,
    createSession,
    fs,
    logWithTimestamp,
  } = deps;

  const name = normalizePlayerName(userData.playerName || userData.name);
  const email = userData.email;
  let password = userData.password;
  const clientIP = userData.clientIP || 'unknown';

  if (!name || name.length === 0) {
    throw new Error('Player name is required');
  }

  const storedName = findStoredUserName(name);

  if (storedName) {
    // User exists - this is a login attempt
    const user = usersDict[storedName];

    // AUTH POLICY (intentional): existing no-password users may login with name alone.
    // If a password is provided, treat this as an upgrade and set it.
    if (!user.password || user.password === '') {
      if (password && password.trim() !== '') {
        validatePassword(password);
        user.password = await hashPasswordFn(password);
      }
      user.lastConnected = new Date().toISOString();
      writeUsers();

      const token = createSession(storedName, clientIP);
      return {
        type: 'registration',
        label: 'success',
        content: 'success',
        sessionToken: token,
        playerName: storedName,
      };
    }

    // If existing user has password, require authentication
    if (!password) {
      throw new Error('Password required for existing player');
    }

    if (!(await verifyPasswordFn(password, user.password))) {
      throw new Error('Invalid password for existing player');
    }

    // Update last connected time for successful authentication
    user.lastConnected = new Date().toISOString();
    writeUsers();

    const token = createSession(storedName, clientIP);
    return {
      type: 'registration',
      label: 'success',
      content: 'success',
      sessionToken: token,
      playerName: storedName,
    };
  }

  // New user registration
  if (!password || password.trim() === '') {
    // AUTH POLICY (intentional): new user registration can be name-only.
    // Keep empty password as a first-class supported state.
    password = '';
  } else {
    // Validate password strength and hash when provided
    validatePassword(password);
    password = await hashPasswordFn(password);
  }

  usersDict[name] = {
    name: name,
    email: email || '',
    password: password,
    registeredAt: new Date().toISOString(),
    lastConnected: new Date().toISOString(),
  };

  // Ensure tribe-data directory exists before saving
  if (!fs.existsSync('./tribe-data')) {
    fs.mkdirSync('./tribe-data', { recursive: true });
  }

  writeUsers();
  logWithTimestamp(`[SECURITY] New user registered: ${name}`);

  const token = createSession(name, clientIP);
  return {
    type: 'registration',
    label: 'success',
    content: 'success',
    sessionToken: token,
    playerName: name,
  };
}

module.exports = {
  validateUser,
  registerUser,
  hashPassword,
  verifyPassword,
};
