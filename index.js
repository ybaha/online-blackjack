var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var PORT = process.env.PORT || 3000;

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

http.listen(PORT, () => {
  console.log('listening on *:3000');
});


let messages = []

var deck = [];
var players = [];
var playersInQueue = [];
var currentPlayer = 0;
var suits = ["Spades", "Hearts", "Diamonds", "Clubs"];
var values = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

var isGameRunning = false;

function playerNums() {
  if (players.length > 0) {
    for (let i = 0; i < players.length; i++) {
      players[i].num = i;
    }
  }
}

///////----------------------


//checks if game stuck
setInterval(() => {
  if(isGameRunning == true && players.length < 1){
    endGame();
  }
},2000)


function createDeck() {
  deck = new Array();
  for (var i = 0; i < values.length; i++) {
    for (var x = 0; x < suits.length; x++) {
      var weight = parseInt(values[i]);
      if (values[i] == "J" || values[i] == "Q" || values[i] == "K")
        weight = 10;
      if (values[i] == "A")
        weight = 11;
      var card = { Value: values[i], Suit: suits[x], Weight: weight };
      deck.push(card);
    }
  }
}

function shuffle() {
  // for 1000 turns
  // switch the values of two random cards
  for (var i = 0; i < 1000; i++) {
    var l1 = Math.floor((Math.random() * deck.length));
    var l2 = Math.floor((Math.random() * deck.length));
    var tmp = deck[l1];
    deck[l1] = deck[l2];
    deck[l2] = tmp;
  }
}

function startblackjack() {
  // deal 2 cards to every player object
  isGameRunning = true;
  currentPlayer = 0;
  players = players.concat(playersInQueue);

  for (let i = 0; i < players.length; i++) {
    players[i].Points = 0;
    players[i].Hand = [];
  }

  createDeck();
  shuffle();
  dealHands();

  io.emit("start-game", { deck, players, currentPlayer, players })
}

function waitingForPlayers() {
  var waitingForPlayersInterval = setInterval(() => {
    if (players.length > 1) {
      console.log("oyun basladi");
      startblackjack();
      clearInterval(waitingForPlayersInterval);
    }
    else{
      io.emit("waiting");
    }
  }, 2000)
}

waitingForPlayers();

function dealHands() {
  for (var i = 0; i < 2; i++) {
    for (var x = 0; x < players.length; x++) {
      var card = deck.pop();
      players[x].Hand.push(card);
      updatePoints();
    }
  }
}

// returns the number of points that a player has in hand
function getPoints(player) {
  var points = 0;
  for (var i = 0; i < players[player].Hand.length; i++) {
    points += players[player].Hand[i].Weight;
  }
  players[player].Points = points;
  return points;
}

function updatePoints() {
  for (var i = 0; i < players.length; i++) {
    getPoints(i);
  }
}
io.on("connection", (socket) => {
  socket.on("hit", (me) => {
    console.log(me.name + " hitted");
    var card = deck.pop();
    players[currentPlayer].Hand.push(card);
    updatePoints();
    io.emit("update-cards", {card, me, messages})
    if (me[0].Points > 21) {
      stay();
    }
  })
  socket.on("stay", (cP) => {
    stay();
  })
  socket.on("game-over", () => {
    io.emit("end", endGame())
  })
  socket.on("connection", (username) => {
    let hand = [];
    if (isGameRunning == true) {
      let player = { name: username, id: socket.id, Points: 0, Hand: hand, num: 0 };
      playersInQueue.push(player);
    }
    else {
      let player = { name: username, id: socket.id, Points: 0, Hand: hand, num: 0 };
      players.push(player);
      playerNums();
    }
  })
  socket.on('chat-message', (data) => {
    if(messages.length>12){
      messages.shift();
    }
    messages.push(data);
    io.emit("chat-message", messages);
  });
  socket.on("disconnect", () => {
    players = players.filter(players => players.id != socket.id)
    playerNums();

    io.emit("disconnect-update", players);

    if(players.length<2){
      io.emit("end", endGame())
    }
  })
})

function stay() {
  if (currentPlayer < players.length - 1) {
    currentPlayer++;
    io.emit("cur-update", currentPlayer);
  }
  else {
  }

}

function endGame() {

  for (let i = 0; i < players.length; i++) {
    console.log(players[i].name + ": " + players[i].Points)
  }

  var winner = -1;
  var score = 0;

  for (let i = 0; i < players.length; i++) {
    if (players[i].Points > score && players[i].Points < 22) {
      winner = i;
      score = players[i].Points;
    }
  }
  isGameRunning = false;
  if((players.length+playersInQueue.length) > 1){
    startNewGame();
  }
  else{
    waitingForPlayers();
  }
  return winner;
}

function startNewGame() {
  let i = 6;
  let interval = setInterval(() => {
    if (i < 0) {
      isGameRunning = true;
      startblackjack();
      clearInterval(interval)
    }
    else
      i--;
  }, 1000)
}


function check() {
  if (players[currentPlayer].Points > 21) {
    end();
  }
}


