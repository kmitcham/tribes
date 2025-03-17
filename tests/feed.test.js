// feed.test.js
const { feed, checkFood, consumeFoodChildren } = require("../libs/feed.js");


describe('feed function', () => {
    let gameState;
    let player;

    beforeEach(() => {
        // Reset mocks and setup initial state before each test
        jest.clearAllMocks();
        
        player = {
            name: 'TestPlayer',
            food: 10,
            grain: 5
        };

        gameState = {
            children: {
                'Child1': { food: 0, newAdult: false },
                'Child2': { food: 2, newAdult: false },
                'Adult1': { food: 1, newAdult: true }
            },
            population: {
                'TestPlayer': player
            }
        };
    });

    test("feed filtered by parent", () =>{
            var dummyMessage = {
                "author":
                    {
                        "message":function (message){} ,
                        "send":function (message){} 
                    }
                }
            var gameState = {
                "population": {
                    "p1":{
                        "name": "p1",
                        "gender": "male",
                        "activity": "gather",
                        "food":20,
                        "grain":10
                    },
                    "p2":{
                    "name": "p2",
                    "gender": "female",
                    "grain":10
                    }},
                "children":{
                    "C1": {
                        "mother": "p2",
                        "father": "p1",
                        "age": 4,
                        "food": 0,
                        "gender": "female",
                        "name": "C1"
                    },
                    "C2": {
                        "mother": "p2",
                        "father": "p1",
                        "age": 1,
                        "food": 0,
                        "gender": "female",
                        "name": "C2"
                    },
                    "C3": {
                        "mother": "p4",
                        "father": "p5",
                        "age": 1,
                        "food": 0,
                        "gender": "female",
                        "name": "C3"
                    }
                }
            }
            feed(dummyMessage, gameState.population.p1, 2, ["p2"], gameState)
            response = gameState.messages["tribe"]
            expect(response).toContain("p1 feeds 2 to C1\np1 feeds 2 to C2\n")
    });
    
    test("feed !all", () =>{
            var gameState = {
                "population": {
                    "p1":{
                        "name": "p1",
                        "gender": "male",
                        "activity": "gather",
                        "food":20,
                        "grain":10
                    },
                    "p2":{
                    "name": "p2",
                    "gender": "female",
                    "grain":10
                    }},
                "children":{
                    "C1": {
                        "mother": "p2",
                        "father": "p1",
                        "age": 4,
                        "food": 0,
                        "gender": "female",
                        "name": "C1"
                    },
                    "C2": {
                        "mother": "p2",
                        "father": "p1",
                        "age": 1,
                        "food": 0,
                        "gender": "female",
                        "name": "C2"
                    },
                    "C3": {
                        "mother": "p4",
                        "father": "p5",
                        "age": 1,
                        "food": 0,
                        "gender": "female",
                        "name": "C3"
                    }
                }
            }
            feed(null, gameState.population.p1, 2, ["!all"], gameState)
            response = gameState.messages["tribe"]
        
            expect(response).toContain("p1 feeds 2 to C1\np1 feeds 2 to C2\np1 feeds 2 to C3\n")
    });

    test("feed !all when no one is hungry", () =>{
        var gameState = {
            "population": {
                "p1":{
                    "name": "p1",
                    "gender": "male",
                    "activity": "gather",
                    "food":20,
                    "grain":10
                },
                "p2":{
                "name": "p2",
                "gender": "female",
                "grain":10
                }},
            "children":{
                "C1": {
                    "mother": "p2",
                    "father": "p1",
                    "age": 4,
                    "food": 2,
                    "gender": "female",
                    "name": "C1"
                },
                "C2": {
                    "mother": "p2",
                    "father": "p1",
                    "age": 1,
                    "food": 2,
                    "gender": "female",
                    "name": "C2"
                },
                "C3": {
                    "mother": "p4",
                    "father": "p5",
                    "age": 1,
                    "food": 2,
                    "gender": "female",
                    "name": "C3"
                }
            }
        }
        feed(null, gameState.population.p1, 2, ["!all"], gameState)
        response = gameState.messages["p1"]
        // TODO: fix this bug so test passes
        //expect(response).toBe("no children need food")
    });
    
    test('feeds a specific child successfully', () => {
        const childList = ['child1'];
        const amount = 2;

        const result = feed('', player, amount, childList, gameState);

        expect(result).toBe(0);
        expect(gameState.children['Child1'].food).toBe(2);
        expect(player.food).toBe(8);
        actual = gameState.messages['tribe'];
        expect(actual).toContain('TestPlayer feeds 2 to Child1')
    });

    test('does not feed child that already has enough food', () => {
        const childList = ['child2'];
        const amount = 1;
        const initialFood = player.food;

        feed('', player, amount, childList, gameState);

        expect(gameState.children['Child2'].food).toBe(2); // Unchanged
        expect(player.food).toBe(initialFood); // Unchanged
        actual = gameState.messages['TestPlayer'];
        expect(actual).toContain('Child2 has enough food already.')
    });

    test('handles !all command feeding all eligible children', () => {
        const childList = ['!all'];
        const amount = 2;

        feed('', player, amount, childList, gameState);

        expect(gameState.children['Child1'].food).toBe(2);
        expect(gameState.children['Child2'].food).toBe(2); // Unchanged
        expect(gameState.children['Adult1'].food).toBe(1); // Unchanged
        expect(player.food).toBe(8);
    });

    test('fails when player has insufficient food', () => {
        player.food = 1;
        player.grain = 0;
        const childList = ['child1'];
        const amount = 2;

        feed('', player, amount, childList, gameState);

        expect(gameState.children['Child1'].food).toBe(0); // Unchanged
        expect(player.food).toBe(1); // Unchanged
        actual = gameState.messages['TestPlayer'];
        expect(actual).toContain('You do not have enough food or grain to feed Child1')
    });
});