console.log('Welcone to sortToy.js');

function spearmanCorrelation(arr) {
  const n = arr.length;
  const ranks = arr
    .map((val, idx) => ({ val, idx }))
    .sort((a, b) => a.val - b.val)
    .map((item, rank) => ({ ...item, rank: rank + 1 }))
    .sort((a, b) => a.idx - b.idx)
    .map((item) => item.rank);

  const expectedRanks = Array.from({ length: n }, (_, i) => i + 1);

  let sumSquaredDiffs = 0;
  for (let i = 0; i < n; i++) {
    sumSquaredDiffs += Math.pow(ranks[i] - expectedRanks[i], 2);
  }

  return 1 - (6 * sumSquaredDiffs) / (n * (n * n - 1));
}

function bubbleSortSinglePass(arr) {
  let swapped = false;

  // Single pass through the array
  for (let i = 0; i < arr.length - 1; i++) {
    k = arr.length - 1 - i; // Adjusted index for the current pass
    if (arr[k] > arr[k + 1]) {
      // Swap adjacent elements
      [arr[k], arr[k + 1]] = [arr[k + 1], arr[k]];
      swapped = true;
    }
  }

  return swapped; // Returns true if any swaps were made
}

base_array = [];
SIZE = 100;
CLOSE = 15;
for (i = 0; i < 100; i++) {
  base_array.push(i);
}
console.log(
  'base_array spearman correlation: ' + spearmanCorrelation(base_array)
);
total_offset = 0;
for (let i = 0; i < base_array.length; i++) {
  offset = Math.floor(Math.random() * CLOSE * 2) - CLOSE;
  target = i + offset;
  if (target < 0) {
    target = 0;
  }
  if (target >= base_array.length) {
    target = base_array.length - 1;
  }
  total_offset += Math.abs(i - target);
  temp = base_array[target];
  //console.log("i:"+i+" value "+base_array[i]+" target:"+target+" value "+base_array[target]);
  base_array[target] = base_array[i];
  base_array[i] = temp;
}
console.log('After randomization: ' + base_array + ' offset: ' + total_offset);
console.log(
  'randomnized spearman correlation: ' + spearmanCorrelation(base_array)
);

for (let j = 1; j <= 3; j++) {
  bubbleSortSinglePass(base_array);
  console.log('Pass ' + j + ': ' + spearmanCorrelation(base_array));
}
front_half = base_array.slice(0, base_array.length / 2);
back_half = base_array.slice(base_array.length / 2);
front_half.sort((a, b) => a - b);
back_half.sort((a, b) => a - b);
console.log(
  'Front half max/min: ' +
    Math.max(...front_half) +
    '/' +
    Math.min(...front_half)
);
console.log(
  'Back half max/min: ' + Math.max(...back_half) + '/' + Math.min(...back_half)
);
console.log('After process: ' + base_array);
