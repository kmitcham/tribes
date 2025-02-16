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