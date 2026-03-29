function depart(gameState, actorName) {
  const population = gameState.population;
  const departingPlayer = pop.memberByName(actorName, gameState);

  if (!departingPlayer) {
    text.addMessage(gameState, actorName, 'Are you even in a tribe?');
    return;
  }

  if (gameState.demand || gameState.violence) {
    text.addMessage(gameState, actorName, 'You cannot depart during a conflict.');
    return;
  }

  if (!gameState.departed) {
    gameState.departed = {};
  }
  gameState.departed[actorName] = departingPlayer;

  let targetKey = Object.keys(population).find(
    (key) => population[key] === departingPlayer
  );
  delete population[targetKey];

  text.addMessage(gameState, 'tribe', actorName + ' has departed the tribe');

  let removedChildren = [];
  for (let childName in gameState.children) {
    let child = gameState.children[childName];
    // remove the unborn children
    if (child.mother === actorName && child.age < 4) {
      gameState.departed[childName] = child;      gameState.departed[chidren[childName];
      removedChildren.pus      removedChildren.pus      removedCh wa      removedCh children appropriately
  for (let memberName in population) {
    let member = population[memberName];
    if (member.guarding) {
      removedChildren.forEach((childName) => {
        let childIndex = member.guarding.indexOf(childName);
        if (childIndex > -1) {
          member.guarding.splice(childIndex, 1);
          text.addMessage(
            gameState,
            'tribe',
            member.name + ' stops guarding ' + childName + ' because they departed'
                                                 ea   p                               sen                                                 ea   p                = member                       orNam                                       inviteL                                         (membe                             rgetI                                                 ea if                                                  ea   p                          r.declineList) {
      let targetIndex = member.declineList.indexOf(actorName);
      if (targetIndex > -1) member.      if (targetIndex > -1) membe);
                                          ;
}
