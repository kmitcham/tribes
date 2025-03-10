function playerHelpBasic(){
    	text = ''
		text+='-=General Commands=-\n'
		text+=' babysit <adult child> <target child> a mother can ask her adult child to watch a child\n'
		text+=' children [parent name] shows the children ages and food status, optionally filtered to descendants\n'
		text+=' give <amt> <food|grain|spearhead|basket> <player>\n'
		text+=' graveyard list of all deceased members and children\n'
		text+=' inventory <target|all>  show inventory and character info. No arg means self\n'
		text+=' law see the current list of laws\n'
		text+=' sacrifice <amount> <type>  place an item beyond use for religious or other reasons [non-standard]\n'
		text+=' scout <location> examine the envionment, default is current location\n'
		text+=' secrets toggle the state of willingness to teach others to craft\n'
		text+=' specialize <hunter|gatherer|crafter> at the start of the game\n'
		text+=' status see the current location, year, season and local game\n'
		text+=' vote <target>  your choice for chief.  A chief is required for the game to proceed, but has no other authority.\n'
		text+= 'ping confirms the server is up and functional.  Server is expected to be down from midnight to 7am, Pacific Time.\n'
		//text+=' obey <commands>  (things you will do if the chief commands, in case of extended AFK)\n'
		return text;
}
function playerHelpRounds(){
	text = ''
		text+='-=Work Round Commands=-\n'
		text+=' guard | !ignore <child> [<more childNames>] take on child care responsibilities for the child\n'
		text+=' leastguarded shows the least supervised child; ties resolved randomly\n'
		text+=' ready list who is still available to work\n'
		text+=' craft <spearhead|basket>\n'
		text+=' gather\n'
		text+=' hunt\n'
		text+=' train learn crafting, if there is a willing teacher\n'
		text+=' idle do nothing \n'
		//text+=' command <target> <command>  (order a tribe member.  They might obey)\n'
		text+='-=Food Round Commands=-\n'
		text+=' foodcheck examine the food situation for every adult and living child; triggers reproduction round if everyone has enough food\n'
		text+=' feed <amt> <childName | @mothername | !all >  [<more childNames>]\n'
		text+='-=Reproduction Commands=-\n'
		text+=' romance  show your current reproduction lists\n'
		text+=' invite <target> [target !pass] The order you would like to invite people to mate.  \n\tIf the list ends with !pass, you will give up if they decline. !save will retain the list every season\n\tUpdates made DURING the reproduction round will not be saved.\n'
		text+=' consent <target> [target] The list of people you would accept mating invitations from.\n'
		text+=' decline <target> [target] The list of people whose mating invitations you would decline\n'
		// pass is not needed due to mandatory secret mating
		//text+=' pass (decline to invite anyone in the mating round; can still get invitations)\n'
		text+=' scorechildren  count number of children by parent'
		return text;
}
function playerHelpConflict(){
	text = '';
		text+=' -=Conflict Commands=-\n'
		text+=' demand <text of your demand>  You want this to happen, and you are willing to kill or die about it\n'
		text+=' faction <for|against|neutral> Where you stand on the current DEMAND before the tribe; you must choose for the game to continue\n'
		text+=' attack <target> attempt to harm another member of the tribe during violence\n'
		text+=' defend stand your ground against attacks during violence\n'
		text+=' run flee the violence, conceding to the opposition during violence\n'
        return text;
}

function chiefHelp(){
	text = ''
	text = '\n### Chief Commands ###\n'
	text+=' induct|banish <player> add|remove a tribe member\n'
	text+=' open|close  toggle if people can join with "!join" or only with "!induct" by the chief\n'
	//text+=' drone <gender> <profession> <name>  adds a worker to the tribe that takes commands but is sterile. [non-standard]\n'
	text+=' startwork begins the work round, enabling work attempts and rolls\n'
	text+=' startfood ends the work round; subtract food/grain; birth; child age increase\n'
	text+=' startreproduction Start the reproduction round. Also when migration happens\n'
	text+=' chance after mating, chance is required to end the season\n'
	text+=' migrate <newlocation> <force>  without force, just checks who would perish on the journey\n'
	text+=' decree <law number> <law text> record a rule for the tribe, or replace the rule of the specified number\n'
	text+=' skip <person>   end a players reproduction turn\n'
	text+=' checkmating report on status of mating attempts\n'
	text+=' endgame convert all the child to corpses, or new adults\n'
    return text;
}

module.exports.playerHelpBasic = playerHelpBasic;
module.exports.playerHelpRounds = playerHelpRounds;
module.exports.playerHelpConflict = playerHelpConflict;
module.exports.chiefHelp = chiefHelp;


/*
Each player takes the role of a member of a Stone Age tribe trying to survive and multiply in the world. Tribe members can be hunters, gatherers, or crafters. They can travel among the veldt, marsh, hills and forest environments. They can try to reproduce, to guard children from dangers, and to keep everyone fed.

The four physical resources in the game are food, grain, baskets, and spearheads. Food and grain are consumed to prevent starvation; grain is harder to obtain, but is not vulnerable to destruction from bad luck. Baskets double the effectiveness of gathering. Spearheads give a substantial bonus to hunting.

dult tribe members need to consume 4 food or grain each season to avoid starvation. Children, including those not yet born, need to be given 2 food or grain each season until they reach 12 years old. Mothers with two or more children under 2 years old need 6 food or grain each season.

Children are produced when a tribe member invites a tribe member of the opposite gender to mate, the invitee consents, and there is a successful dice roll. A player can invite multiple people until one of them consents. They can receive consent to only one invitation per season. Consenting to a mating does not change how many invitations a player can make that season.

All tribes commands begin with a !, eg, "!inventory" is the command to see the tribe's possessions.  To see a list of commands, with some explanations of what they do, you can type "!help" in your tribe channel.  The bot will send you messages about actions you can take.

Players use a split screen, with one window for the private messages from the bot, and one window for the shared conversation with the bot and the other players in the tribe channel (<tribename>-tribe).

*/