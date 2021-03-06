function playerHelpBasic(){
    	text = ''
		text+='-=General Commands=-\n'
		text+=' !babysit <adult child> <target child> (a mother can ask her adult child to watch a child)\n'
		text+=' !children [parent name] (shows the children ages and food status, optionally filtered to descendants)\n'
		text+=' !give <amt> <food|grain|spearhead|basket> <player>\n'
		text+=' !graveyard (list of all deceased members and children)\n'
		text+=' !inventory <target|all>  (show inventory and character info. No arg means self)\n'
		text+=' !laws (see the current list of laws)\n'
		text+=' !sacrifice <amount> <type>  (place an item beyond use for religious or other reasons)\n'
		text+=' !scout <location> (examine the envionment, default is current location)\n'
		text+=' !secrets (toggle the state of willingness to teach others to craft)\n'
		text+=' !specialize <hunter|gatherer|crafter>(at the start of the game)\n'
		text+=' !status (see the current location, year, season and local game)\n'
		text+=' !vote <target>  (your choice for chief)\n'
		return text;
}
function playerHelpRounds(){
	text = ''
		text+='-=Work Round Commands=-\n'
		text+=' !guard | !ignore <child> [<more childNames>] (take on child care responsibilities for the child)\n'
		text+=' !leastguarded (shows the least supervised child (ties resolved randomly))\n'
		text+=' !ready (list who is still available to work)\n'
		text+=' !craft <spearhead|basket>\n'
		text+=' !gather\n'
		text+=' !assist <hunter>\n'
		text+=' !hunt\n'
		text+=' !train (learn crafting, if there is a willing teacher)\n'
		text+=' !idle (do nothing) \n'
		text+='-=Food Round Commands=-\n'
		text+=' !foodcheck (examine the food situation for every adult and living child)\n'
		text+=' !feed <amt> <childName>  [<more childNames>]\n'
		text+='-=Reproduction Round Commands=-\n'
		text+=' !romance  (show the order of reproduction invitations)'
		text+=' !invite <target>\n'
		text+=' !consent (agree to a mating invitation)\n'
		text+=' !pass (decline a mating, or end the members invitation turn)\n'
		return text;
}
function playerHelpConflict(){
	text = '';
		text+=' -=Conflict Commands=-\n'
		text+=' !demand <text of your demand>  (You want this to happen, and you are willing to kill or die about it)\n'
		text+=' !faction <for|against|neutral> (Where you stand on the current DEMAND before the tribe; you must choose for the game to continue)\n'
		text+=' !attack <target> (attempt to harm another member of the tribe during violence)\n'
		text+=' !defend (stand your ground against attacks during violence)\n'
		text+=' !run (flee the violence, conceding to the opposition during violence)\n'
        return text;
}

function chiefHelp(){
	text = ''
	text = '\n### Chief Commands ###\n'
	text+=' !induct|banish <player> (add|remove a tribe member)\n'
	text+=' !open|close  (toggle if people can join with "!join" or only with "!induct" by the chief\n'
	text+=' !save (Saves the game. Automatically done at the start of every work round)\n'
	text+=' !startwork (begins the work round, enabling work attempts and rolls)\n'
	text+=' !startfood (ends the work round; subtract food/grain; birth; child age increase)\n'
	text+=' !startreproduction (Start the reproduction round. Also when migration happens)\n'
	text+=' !skip <person>   (end a players reproduction turn, giving the next player a chance)\n'
	text+=' !chance (after mating, chance is required to end the season)\n'
	text+=' !migrate <newlocation> <force>  (without force, just checks who would perish on the journey)\n'
	text+=' !legislate <law number> <law text> (record a rule for the tribe, or replace the rule of the specified number)\n'
    return text;
}

function refHelp(){
	text = '';
    text+='\n### Referee Commands ###\n'
    text+=' edit <target> <canCraft|nursing|isPregnant|profession|gender|partner|worked|food|grain> <value>\n' 
    text+=' editchild <target> <food|age|mother|father> <value>\n' 
    text+=' award <amt> <food|grain|spearhead|basket> <player>\n'
    text+=' kill <name> <message> (kill a person or child)\n'
    text+=' list <player>  (no arg lists all players)\n '
    text+=' promote|demote <player> (add player to the ref list)\n'
    text+=' spawn <mother> <father> add a child with parents\n'
    text+=' load the saved file, replacing the current state\n'
    text+=' listnames | listchildren just the names\n'
    text+=' initgame erase the current game state and start fresh\n'
    text+=' endgame   convert all the child to corpses, or new adults\n'
    text+=' scorechildren   count number of children by parent'
    return text;
}

module.exports.playerHelpBasic = playerHelpBasic;
module.exports.playerHelpRounds = playerHelpRounds;
module.exports.playerHelpConflict = playerHelpConflict;

module.exports.chiefHelp = chiefHelp;

module.exports.refHelp = refHelp;
