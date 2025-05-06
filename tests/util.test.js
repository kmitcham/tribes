var dice = require("../libs/dice");
var text = require("../libs/textprocess");
console.log = jest.fn();

test("Numbers stay in range", () =>{
    for (var i=0; i < 100; i++){
        value = dice.roll(1);
        expect(value).toBeLessThan(6.1);
        expect(value).toBeGreaterThan(0.9);
    }
});

test("Remove special chars",()=>{
  expect(text.removeSpecialChars("Has Spaces")).toEqual("HasSpaces")
  expect(text.removeSpecialChars("Has(Paren)")).toEqual("HasParen")
  expect(text.removeSpecialChars("Has/Slashes/")).toEqual("HasSlashes")
})