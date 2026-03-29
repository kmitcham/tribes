const { consumeFood } = require('./libs/feed.js');

let gameState = {
  graveyard: {},
  population: {
    Mother: {
      name: 'Mother',
      gender: 'female',
      food: 0,
      grain: 0
    }
  },
  children: {
    Child: {
      name: 'Child',
      mother: 'Mother',
      age: 3,
      food: 2
    }
  }
};

consumeFood(gameState);

console.log(gameState.graveyard);
console.log(gameState.children);
