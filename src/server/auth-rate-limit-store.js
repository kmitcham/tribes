const loginAttempts = new Map(); // Map of identifier -> { count, lastAttempt, lockoutUntil }

function getLoginAttempts() {
  return loginAttempts;
}

function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    throw new Error('Password is required');
  }

  return true;
}

function recordFailedAttempt(identifier, logFn) {
  const attemptData = loginAttempts.get(identifier) || {
    count: 0,
    lastAttempt: 0,
    lockoutUntil: 0,
  };

  attemptData.count++;
  attemptData.lastAttempt = Date.now();

  // Lockout after 5 failed attempts for 15 minutes.
  if (attemptData.count >= 5) {
    attemptData.lockoutUntil = Date.now() + 15 * 60 * 1000;
  }

  loginAttempts.set(identifier, attemptData);

  if (typeof logFn === 'function') {
    logFn(
      `Failed login attempt for ${identifier}. Count: ${attemptData.count}`
    );
  }
}

function clearFailedAttempts(identifier) {
  loginAttempts.delete(identifier);
}

module.exports = {
  getLoginAttempts,
  validatePassword,
  recordFailedAttempt,
  clearFailedAttempts,
};
