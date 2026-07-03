function handleSessionAuthentication(ws, data, deps) {
  const {
    validateSession,
    trackPlayerConnection,
    logWithTimestamp,
    replayPendingMessages,
  } = deps;
  const { token } = data;

  if (!token) {
    ws.send(
      JSON.stringify({
        type: 'sessionAuthResponse',
        success: false,
        message: 'Session token required',
        clientId: data.clientId,
      })
    );
    return;
  }

  const session = validateSession(token);
  if (!session) {
    ws.send(
      JSON.stringify({
        type: 'sessionAuthResponse',
        success: false,
        message: 'Invalid or expired session token',
        clientId: data.clientId,
      })
    );
    return;
  }

  ws.sessionToken = token;
  ws.playerName = session.playerName;
  trackPlayerConnection(ws, session.playerName);

  logWithTimestamp(
    `[SESSION] ${session.playerName} authenticated with existing session`
  );

  ws.send(
    JSON.stringify({
      type: 'sessionAuthResponse',
      success: true,
      playerName: session.playerName,
      message: 'Session authenticated successfully',
      clientId: data.clientId,
    })
  );

  replayPendingMessages(
    ws,
    session.playerName,
    ws.currentTribe || data.tribe || 'bug',
    data.clientId
  );
}

function handleLogout(ws, data, deps) {
  const { destroySession, destroyAllPlayerSessions, connectedClients } = deps;
  const { logoutAll = false } = data;

  if (ws.sessionToken) {
    if (logoutAll && ws.playerName) {
      destroyAllPlayerSessions(ws.playerName);

      const playerConnections = connectedClients.get(ws.playerName);
      if (playerConnections) {
        for (const connection of playerConnections) {
          if (connection !== ws) {
            connection.send(
              JSON.stringify({
                type: 'forceLogout',
                message: 'Logged out from another device',
              })
            );
            connection.close();
          }
        }
      }
    } else {
      destroySession(ws.sessionToken);
    }

    ws.sessionToken = null;
    ws.playerName = null;
    ws.currentPlayer = null;
  }

  ws.send(
    JSON.stringify({
      type: 'logoutResponse',
      success: true,
      message: logoutAll
        ? 'Logged out from all devices'
        : 'Logged out successfully',
      clientId: data.clientId,
    })
  );
}

module.exports = {
  handleSessionAuthentication,
  handleLogout,
};
