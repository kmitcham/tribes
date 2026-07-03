function createMockInteraction(data, ws, gameState, logWithTimestamp) {
  const mockMember = {
    displayName: data.playerName || 'Unknown',
  };

  const mockUser = {
    send: (message) => {
      ws.send(
        JSON.stringify({
          type: 'privateMessage',
          message: message,
          clientId: data.clientId,
        })
      );
    },
    displayName: data.playerName || 'Unknown',
  };

  const mockOptions = {
    getString: (name) => {
      const value = data.parameters && data.parameters[name];
      if (Array.isArray(value)) {
        if (value.length === 0) {
          return null;
        }
        return value.join(',');
      }
      return value;
    },
    getInteger: (name) => data.parameters && parseInt(data.parameters[name]),
    getBoolean: (name) => {
      const value = data.parameters && data.parameters[name];
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        return value.toLowerCase() === 'true' || value === '1';
      }
      return false;
    },
    getUser: (name) => {
      const paramValue = data.parameters && data.parameters[name];
      if (!paramValue) return null;

      return {
        displayName: paramValue,
        id: `user_${paramValue}`,
        send: (message) => {
          if (typeof logWithTimestamp === 'function') {
            logWithTimestamp(`[MOCK] Message to ${paramValue}: ${message}`);
          }
        },
      };
    },
    getMember: (name) => {
      const paramValue = data.parameters && data.parameters[name];
      if (!paramValue) return null;

      return {
        displayName: paramValue,
        id: `member_${paramValue}`,
        user: {
          displayName: paramValue,
          id: `user_${paramValue}`,
        },
      };
    },
  };

  return {
    member: mockMember,
    user: mockUser,
    options: mockOptions,
    reply: (response) => {
      let content = response.content || response;
      if (response.embeds && response.embeds.length > 0) {
        content = response.embeds[0].description || content;
      }

      ws.send(
        JSON.stringify({
          type: 'commandResponse',
          command: data.command,
          success: true,
          message: content,
          clientId: data.clientId,
        })
      );
    },
    isRepliable: () => true,
    replied: false,
    channelId: `${gameState.name}_channel`,
    commandName: data.command,
    nickName: data.playerName || 'Unknown',
  };
}

module.exports = {
  createMockInteraction,
};
