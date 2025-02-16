var childlib = require("../libs/children.js");

test("Display adults only", () =>{
    var children = {
        "c1": {
          "mother": "m1",
          "father": "f1",
          "age": 34, "name":"c1", "food": 2, 'gender':'male'
        },
        "c2": {
          "mother": "m2",
          "father": "f2",
          "age": 32, "name":"c3", "food": 2, 'gender':'male'
        },
        "c3": {
          "mother": "m1",
          "father": "f2",
          "age": 30,"name":"c3", "food": 2, 'gender':'male'
        }
    }
    actualMessage = (childlib.showChildren(children,{})).join()
    expect(actualMessage.indexOf('Unborn')).toBe(-1)
    expect(actualMessage.indexOf('Children')).toBe(-1)
    expect(actualMessage.indexOf('Adults')).toBeGreaterThan(-1)
    expect(actualMessage.indexOf('c1')).toBeGreaterThan(-1)
    expect(actualMessage.indexOf('c2')).toBeGreaterThan(-1)
    expect(actualMessage.indexOf('c3')).toBeGreaterThan(-1)
});
test("filter mixed ages", () =>{
    var children = {
        "c1": {
          "mother": "m1",
          "father": "f1",
          "age": 24, "name":"c1", "food": 2, 'gender':'male'
        },
        "c2": {
          "mother": "m2",
          "father": "f2",
          "age": 4, "name":"c3", "food": 2, 'gender':'male'
        },
        "c3": {
          "mother": "m1",
          "father": "f2",
          "age": -1,"name":"c3", "food": 2, 'gender':'male'
        }
    }
    actualMessage = childlib.showChildren(children, {}, 'm1').join()
    expect(actualMessage.indexOf('Unborn')).toBeGreaterThan(-1)
    expect(actualMessage.indexOf('Adults')).toBeGreaterThan(-1)
    expect(actualMessage.indexOf('Children')).toBe(-1)
    expect(actualMessage.indexOf('c1')).toBeGreaterThan(-1)
    expect(actualMessage.indexOf('c2')).toBe(-1)
    expect(actualMessage.indexOf('c3')).toBeGreaterThan(-1)
});
test("Check sorting", () =>{
  var children = {
      "Achild": {
        "mother": "m1",
        "father": "f1",
        "age": 14, "name":"A", "food": 2, 'gender':'male'
      },
      "Bchild": {
        "mother": "m2",
        "father": "f2",
        "age": 14, "name":"B", "food": 2, 'gender':'male'
      },
      "Cchild": {
        "mother": "m1",
        "father": "f2",
        "age": -1,"name":"C", "food": 2, 'gender':'male'
      }
  }
  actualMessage = childlib.showChildren(children, {}).join()
  alocation = actualMessage.indexOf('Achild')
  blocation = actualMessage.indexOf('Bchild')
  clocation = actualMessage.indexOf('Cchild')
  expect(alocation).toBeGreaterThan(-1)
  expect(blocation).toBeGreaterThan(-1)
  expect(clocation).toBeGreaterThan(-1)
  expect(alocation).toBeGreaterThan(blocation)
  expect(blocation).toBeGreaterThan(clocation)
  expect(alocation).toBeGreaterThan(clocation)
});