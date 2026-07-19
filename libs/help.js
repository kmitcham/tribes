function playerHelpBasic() {
  let text = '';
  text += '###General Commands###\n';
  text +=
    ' babysit <adult child> <target child> a mother can ask her adult child to watch a child\n';
  text +=
    ' children [parent name] shows the ages and food of children, optionally filtered to descendants of specified parent\n';
  text +=
    ' give <item> <amount> <player> transfer food, grain, basket, or spearhead to a tribe member (UI order: item -> amount -> player; default amount is 4 for food/grain, 1 for basket/spearhead)\n';
  text += ' graveyard list of all deceased members and children\n';
  text +=
    ' inventory <target>  show inventory and character info. No arg means show inventory for entire tribe\n';
  text +=
    ' incarnations  private view of your lifetime results across finished games (children, survival, tribe outcomes)\n';
  text +=
    ' lastgame  private re-read of the full end report (births, deaths, scores) from your most recently finished game\n';
  text += ' law see the current list of laws\n';
  text +=
    ' sacrifice <amount> <type>  place an item beyond use for religious or other reasons [non-standard]\n';
  text +=
    ' scout <location> examine the environment, default is current location\n';
  text += ' secrets toggle the state of willingness to teach others to craft\n';
  text += ' specialize <hunter|gatherer|crafter> at the start of the game\n';
  text += ' status see the current location, year, season and local game\n';
  text +=
    ' vote <target>  your choice for chief.  A chief is required for the game to proceed, and controls tribe membership\n';
  text += 'ping confirms the server is up and functional\n';
  //text+=' obey <commands>  (things you will do if the chief commands, in case of extended AFK)\n'
  return text;
}
function playerHelpRounds() {
  let text = '';
  text += '###Work Round Commands###\n';
  text +=
    ' guard | ignore <childName> [<more childNames>] take on child care responsibilities for the child[ren]\n';
  text +=
    ' leastguarded shows the least supervised child; ties resolved randomly\n';
  text += ' ready list who is still available to work\n';
  text += ' craft <spearhead|basket>\n';
  text += ' gather\n';
  text += ' hunt\n';
  text += ' train learn crafting, if there is a willing teacher\n';
  text += ' idle do nothing \n';
  text += '-=Food Round Commands=-\n';
  text +=
    ' foodcheck examine the food situation for every adult and living child; triggers reproduction round if everyone has enough food\n';
  text +=
    ' feed <amt> <childName | mothername | !all | !under2 >  [<more childNames>]\n';
  text += '-=Reproduction Commands=-\n';
  text +=
    ' romance  Open your romance panel. Set who to invite (in priority order) and how to respond to invitations from others. One Save sends both your invite list and your consent/decline choices together.\n';
  text +=
    '\tUse the "Give up if everyone declines" option in the romance panel when you want to skip reproduction after all invitees decline.\n';
  text += ' scorechildren  count number of children by parent';
  return text;
}
function playerHelpConflict() {
  let text = '';
  text += '###Conflict Commands###\n';
  text +=
    ' demand <text of your demand>  You want this to happen, and you are willing to kill or die about it\n';
  text +=
    ' faction <for|against|neutral> Where you stand on the current DEMAND before the tribe; you must choose for the game to continue\n';
  text +=
    ' attack <target> attempt to harm another member of the tribe during violence\n';
  text += ' defend stand your ground against attacks during violence\n';
  text +=
    ' run flee the violence, conceding to the opposition during violence\n';
  return text;
}

function chiefHelp() {
  let text = '\n### Chief Commands ###\n';
  text += ' induct|banish <player> add|remove a tribe member\n';
  text +=
    ' open|close  toggle if people can join with "join" or only with "induct" by the chief\n';
  //text+=' drone <gender> <profession> <name>  adds a worker to the tribe that takes commands but is sterile. [non-standard]\n'
  text +=
    ' startwork begins the work round, enabling work attempts and rolls\n';
  text +=
    ' startfood ends the work round; subtract food/grain; birth; child age increase\n';
  text +=
    ' startreproduction  start the reproduction round. Also when migration happens\n';
  text +=
    ' advanceround advance to the next legal round transition automatically\n';
  text += ' chance after mating, chance is required to end the season\n';
  //text+=' command <target> <command>  (order a tribe member.  They might obey)\n'
  text +=
    ' migrate <newlocation> <go>  without go, just checks who would perish on the journey\n';
  text +=
    ' decree <law number> <law text> record a rule for the tribe, or replace the rule of the specified number\n';
  text += ' skip <person>   end a players reproduction turn\n';
  text += ' checkmating report on status of mating attempts\n';
  text +=
    ' endgame convert all the children to new adults or corpses.  Twenty years is often considered a good duration for a game.\n';
  return text;
}

module.exports.playerHelpBasic = playerHelpBasic;
module.exports.playerHelpRounds = playerHelpRounds;
module.exports.playerHelpConflict = playerHelpConflict;
module.exports.chiefHelp = chiefHelp;

// Keep long-form gameplay documentation in README or dedicated docs so this
// module only reflects the current help text and command surface.
