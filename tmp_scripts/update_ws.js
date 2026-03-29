const fs = require('fs');

let code = fs.readFileSync('websocket-server.js', 'utf8');

const replacement = `    case 'romance':
      const playerName = data.playerName;
      const userData = gameState.population && gameState.population[playerName];
      
      let conList = [];
      let decList = [];
      if (userData?.responseDict) {
        for (const [n, r] of Object.entries(userData.responseDict)) {
          if (r === 'consent') conList.push(n);
          if (r === 'decline') decList.push(n);
        }
      } else {
        conList = userData?.consentList || [];
        decList = userData?.declineList || [];
      }
      
      let romanceLists = {
        inviteList: userData?.inviteList || [],
        consentList: conList,
        declineList: decList,
      };
      messageData = {
        type: 'infoRequest',
        label: 'romance',
        content: romanceLists,
      };
      break;`;

const r1 = /case 'romance':[\s\S]*?break;/;
code = code.replace(r1, replacemcode = code.replace(r1, repcecode = code.replace(r processRomance(data, gameState) {
  const name = data.playerName || data.name;
  const inviteList = data.i  const inviteList = data.i  const inviecl  const inviteList = data.i  const inviteList = data.i  const inviecl  const inpo  lation[name];
  if (userData)  if (userData)  if (u responseDict for this operation mappi  if (userData)  if (userData)  if (u responseDict for this operatioep  if (userData)  if (userData)  if (u response.m  if (userData)  if (userData)  if (u response    if (us!u  if (userDatns  if (userData)  if (userData)  if (u respons i  if (userData)  if (userData)  if (u respserData.inviteList))  if (us userData.inviteList = inviteList;
    }
    
    // Unset all existing consents/declines from re    // Unset all existing c if (consent    // Unset all exi| declineList !== undefined) {
    // Unset all  k in use    // Unset all  k in use         //  u    // Unset nse    // Unset all  k in use    // UnseentList) {
       for (const n of consentList) {
           userData.responseDict[n] = 'consent';
       }
    }
    if (declineList) {
       for (const n of declineList) {
           userData.responseDict[n] = 'decline';
       }
    }

    let outCon = [];
    let outDec = [];
    for (const [n, r] of Object.entries(userData.responseDict)) {
       if (r === 'consent') outCon.push(n);
       if (r === 'decline') outDec.push(n);
    }

    return {
      type: 'infoRequest',
      label: 'romance',
      content: {
        inviteList: userData.inviteList || [],
        consentList: outCon,
        declineList: outDec,
      },
    };
  } else {
    return {
      type: 'error',
      label: 'romance',
      content: 'No such user in tribe',
    };   }
    };   }
nt: 'No such user in tribe',
|| [],
a.responseDict)) {
    // Unset nse    // Unset all  k in use    // UnseentList) {
   content:   content:   content:   content:   content:   content:   content:   content:   content:   content:   content:   content:   cot-se   cojs', code);
