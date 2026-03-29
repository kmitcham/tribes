const fs = require('fs');

let code = fs.readFileSync('libs/reproduction.js', 'utf8');

const newHandler = `function handleRomanceResponse(actorName, arrayOfNames, responseType, gameState) {
  var actingMember = pop.memberByName(actorName, gameState);
  migrateToResponseDict(actingMember);

  if (!arrayOfNames || arrayOfNames.length == 0 || arrayOfNames.includes('!none')) {
    let clearedCount = 0;
    if (actingMember.responseDict) {
      for (const key in actingMember.responseDict) {
        if (actingMember.responseDict[key] === responseType) {
          delete actingMember.responseDict[key];
          clearedCount++;
        }
      }
    }
    return clearedCount > 0 ? 'Emptying your ' + responseType + ' responses.' : 'Your ' + responseType + ' responses are already empty.';
  }

  var errors = [];
  var localErrors = '';
  var successfullyAdded = [];

  for (let rawTargetName of arrayOfNames) {
    if (!rawTargetName) continue;
    var targetName = text.removeSpecialC    var targetName = text.removeif    var targetName = tex()     var targetName = text.removeSpecialC    var targetNamatio    var targetName = text.removeSpecialC    var targetName = text.removeif    var targetName = tex() r.gender) {
          actingMember.responseDict[personName] = r          actingMember.responseDict[dded          actingMember.responseDict[personName] = r          actingMember.() !== '!pass') {
      var targetMem      var targetMem      var tare, ga      var targetMem      var targetMem      var tarrors += matingObjections(actingMember, targetMember);
      } els      } els      } els      } els      } els    not in the tribe.\\n';
                    calError                    calError                    calError                    calError                    calError                    calEe. rim(                 ;
                    cdde                    cdde trim());
      }
    }
  }

  var returnMessage =   var returnMessage =   var retu    var returnMessage =   var returnMessage =   var retu    var returnMessage =   var returnMessage =   var retu    var returnMessage =   var returnMessage =   var retu    var returnMessage =   var returnMessage =   var retu    var returnMessage =   var returnMessage =   varll  var returnMessage =   var returnMessage =   var retu    var returnMessage =   var returnMessage =   var retu    var returnMessage =   var returnMessage =   var retu    var returnewHandler + "\nfunction handleReproductionList(");

fs.writeFileSync('libs/reproduction.js', code);
