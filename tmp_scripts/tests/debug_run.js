const reproLib = require('./libs/reproduction');
var gameState = {
  population: {
    p1: { name: 'p1', gender: 'male', activity: 'reproduction', inviteList: ['p2'], inviteIndex: 0, responseDict: {} },
    p2: { name: 'p2', gender: 'female', activity: 'reproduction', inviteList: [], inviteIndex: 0, responseDict: { p1: 'consent' }, cannotInvite: false }
  },
  messages: { p1: '', p2: '' },
  reproductionRound: true
};
reproLib.globalMatingCheck(gameState, {});
console.log(gameState.messages['p1']);
