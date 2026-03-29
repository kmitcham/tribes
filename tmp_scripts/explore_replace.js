const fs = require('fs');

let code = fs.readFileSync('libs/reproduction.js', 'utf8');

// The block starts right after `var resolved = false;` or near it.
// Let's replace the whole old consent check block.

const oldConsentCheck = `      if (
        (targetMember.declineList &&
          targetMember.declineList.includes(actingMember.name)) ||
        (targetMember.declineList &&
          targetMember.declineList.includes('!all'))
      ) {
        text.addMessage(
          gameState,
          actingMember.name,
          'You invite ' + targetName + ' but finds they are not interested'
        );
        actingMember.inviteList.splice(index, 1);
        resolved = true;
        actionableInvites = true;
        break;
      }

      if (
        (targetMember.consentList &&
          targetMember.consentList.includes('!all')) ||
        (targetMember.consentList &&
          targetMember.consentList.includes(actingMember.name)) ||
        (targetMember.inviteList &&
          targetMember.inviteList.includes(actingMember.name))
      ) {`;

// Let me find what actually is in the file.
// Read that specific section first.
