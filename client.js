
const input = document.getElementById("input");
const form = document.getElementById("form");
const messagesBox = document.getElementById("messages-box");
const playersD = document.getElementById("players");
const players_div = document.getElementsByClassName("players");
const statusDiv = document.getElementById("status");
const buttons = document.getElementsByClassName("btn");
const waitingDiv = document.getElementById("waiting");

let messages = [];

var socket = io("localhost:3000");

var name = prompt("enter your name");

socket.emit("connection", name)

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const msg = input.value;
  socket.emit("chat-message", { message: msg, username: name })
  input.value = ""
});

socket.on("connection", (msgs)=>{
  console.log("msjlar geldi");
  console.log(msgs);
  
  
  messages = msgs;
  displayMessages(msgs);
})

socket.on("chat-message", (msgs) => {
  displayMessages(msgs);
});



//--------------------------------------

var players = [];
var deck = [];
var me;
var currentPlayer;

function refreshPlayersCards() {

  if (players_div.childNodes != undefined) {
    for (let i = 0; i < players_div.length; i++) {
      players_div.childNodes[i].remove();
    }
  }
}

socket.on("waiting", ()=>{
  waitingDiv.style.display = "inline-block"
  statusDiv.style.display = "none"
})

socket.on("start-game", (data) => {
  
  refreshPlayersCards();
  // (currentplayer, deck, players) data
  playersD.style.display = "flex";
  players = data.players;
  deck = data.deck;
  currentPlayer = data.currentPlayer;
  waitingDiv.style.display = "none";
  statusDiv.style.display = "none";
  // deal 2 cards to every player object
  createPlayersUI();
  dealHands();
  isMyTurn();
  document.getElementById('player_' + data.currentPlayer).classList.add('active');
})
function createPlayersUI() {
  playersD.innerHTML = '';
  for (var i = 0; i < players.length; i++) {
    var div_player = document.createElement('div');
    var div_playerid = document.createElement('div');
    var div_hand = document.createElement('div');
    var div_points = document.createElement('div');

    div_points.className = 'points';
    div_points.id = 'points_' + i;
    div_player.id = 'player_' + i;
    div_player.className = 'player';
    div_hand.id = 'hand_' + i;

    div_playerid.innerHTML = players[i].name;
    div_player.appendChild(div_playerid);
    div_player.appendChild(div_hand);
    div_player.appendChild(div_points);

    playersD.appendChild(div_player);
  }
}

function isMyTurn() {

  me = players.filter((e) => {
    if (name == e.name) {
      return e;
    }
  })

  if (me[0].num != currentPlayer) {
    for (let i = 0; i < buttons.length; i++)
      buttons[i].style.display = "none"
  }
  else {
    for (let i = 0; i < buttons.length; i++)
      buttons[i].style.display = "inline-block"
  }
}

function dealHands() {
  // alternate handing cards to each player
  // 2 cards each
  
  for (var i = 0; i < 2; i++) {
    for (var x = 0; x < players.length; x++) {
      renderCard(players[x].Hand[i], x);
      updatePoints();
    }
  }

}

function renderCard(card, player) {
  var hand = document.getElementById('hand_' + player);
  hand.appendChild(getCardUI(card));
}

function getCardUI(card) {
  var el = document.createElement('div');
  var icon = '';
  if (card.Suit == 'Hearts')
    icon = '&hearts;';
  else if (card.Suit == 'Spades')
    icon = '&spades;';
  else if (card.Suit == 'Diamonds')
    icon = '&diams;';
  else
    icon = '&clubs;';

  el.className = 'card';
  el.innerHTML = card.Value + '<br/>' + icon;
  return el;
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
  for (let i = 0; i < players.length; i++) {
    getPoints(i);
    document.getElementById('points_' + i).innerHTML = players[i].Points;
  }
}

function hit() {
  socket.emit("hit", me)

}

function stay() {
  // oyuncu sonuncu kisi degilse
  if (currentPlayer < players.length - 1) {
    socket.emit("stay", currentPlayer)
    currentPlayer++;
    isMyTurn();
  }
  //oyuncu sonuncu kisi ise
  else {
    for (let i = 0; i < buttons.length; i++) {
      buttons[i].style.display = "none";
    }
    socket.emit("game-over")
  }
}

socket.on("cur-update", (cP) => {
  currentPlayer = cP;
  for(let i = 0; i < playersD.childNodes.length; i++){
    playersD.childNodes[i].className = "player"
  }
  playersD.childNodes[cP].className = "player active"
  isMyTurn();
})

socket.on("end", (winner) => {
  console.log("game ended" + winner);
  end(winner);
});

socket.on("update-cards", (data) => {
  console.log(data);
  console.log(data.me[0].num);
  renderCard(data.card, data.me[0].num);
  let card = deck.pop();
  players[data.me[0].num].Hand.push(card);
  updatePoints();
  if (me[0].Points > 21) {
    stay();
  }
  console.log("update-cards geldi calisti");
  console.log(players);

})

socket.on("disconnect-update", (playersData) => {
  console.log("remaining");
  console.log(playersData);
  players = playersData;
  if (players.length > 1) {
    createPlayersUI();
    dealHands();
    isMyTurn();
  }
  else {
    console.log(players[0]);
    
    end(players[0].num);
  }
})

function end(winner) {
  if(winner == -1){
    statusDiv.innerHTML = "Draw"
  }
  else{
    statusDiv.innerHTML = "Winner: " + players[winner].name;
  }
  statusDiv.style.display = "inline-block";
  playersD.style.display = "none";
}

function displayMessages(msgs){
  let lis = document.querySelectorAll("#messages-box li");
  if (messagesBox.hasChildNodes) {
    for(var i=0; li=lis[i]; i++) {
      li.parentNode.removeChild(li);
    }
  }

  for (let i = 0; i < msgs.length; i++) {
    let li = document.createElement('li');
    li.textContent = msgs[i].username + ": " + msgs[i].message;
    messagesBox.appendChild(li);
  }
}

