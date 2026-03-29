const fs = require('fs');
let code = fs.readFileSync('libs/reproduction.js', 'utf8');

const oldCode = `        if (
          'declineList' in targetMember &&
          (targetMember.declineList.includes(invitingMemberKey) ||
            targetMember.declineList.includes('!all') ||
            targetMember.declineList.includes(invitingMember.name))
        ) {`;

const newCode = `        migrateToResponseDict(invitingMember);
        migrateToResponseDict(targetMember);
        
        let targetResponse;
        if (targetMember.responseDict) {
            if (targetMember.responseDict[invitingMemberKey]) {
                targetResponse = targetMember.responseDict[invitingMemberKey];
            } else if (targetMember.responseDict[invitingMember.name]) {
                targetResponse = targetMember.responseDict[invitingMember.name];
            } else if (targetMember.responseDict['!all']) {
                targetResponse = targetMember.responseDict['!all'];
            }
        }
        if (!targetResponse && targetMember.inviteList && (targetMember.inviteList.includes(invitingMemberKey) || targetMember.inviteList.includes(invitingMember.name))) {
            targetResponse = 'consent';
        }

        if (targetResponse === 'decline') {`;

code = code.replace(oldCode, newCode);

const oldCode2 = `        } else if (
          targetMember.consentList &&
          (targetMember.consentList.includes(invitingMemberKey) ||
            targetMember.consentList.includes('!all') ||
            targetMember.consentList.includes(invitingMember.name))
        ) {`;

const newCode2 = `        } else if (targetResponse === 'consent') {`;

code = code.replace(oldCode2, newCode2);

fs.writeFileSync('libs/reproduction.js', code);
console.log('Successfully updated reproduction.js logic.');
