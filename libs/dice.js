function roll(count){
        if (!count){
            count = 3
        }
        total = 0
        for (var i = 0; i < count; i++){
            var roll = Math.trunc( Math.random( ) * 6)+1
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