function roll(count){
        if (!count){
            count = 3
        }
        var total = 0
        for (var i = 0; i < count; i++){
            const roll = 6 - Math.trunc( Math.random( ) * 6 )
            total += roll
        }
        return total
}
module.exports.roll = roll;

function randomMemberName(population){
	nameList = Object.keys(population)
	var random =  Math.trunc( Math.random ( ) * nameList.length )
	return nameList[random]
}
module.exports.randomMemberName = randomMemberName;