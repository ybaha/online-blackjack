function endGame(arr) {

  var winner = -1;
  var score = 0;

  for (let i = 0; i < arr.length; i++) {
    if (arr[i] > score && arr[i] < 22) {
      winner = i;
      score = arr[i];
    }
  }

  return winner;
}

let ar = [32,12]

console.log(endGame(ar))