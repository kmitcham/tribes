var util = require("./util.js");

test("Numbers stay in range", () =>{
    for (var i=0; i < 100; i++){
        value = util.roll(1);
        expect(value).toBeLessThan(6.1);
        expect(value).toBeGreaterThan(0.9);
    }
});