var util = require('util')
var http = require('http')
var path = require('path')
var cors = require('cors')
var express = require('express')
var ecstatic = require('ecstatic')
var io = require('socket.io')

var Player = require('./Player')

var port = process.env.PORT || 8080

/* ************************************************
** GAME VARIABLES
************************************************ */
var socket	// Socket controller
var players	// Array of connected players
var games;
var castle = {
  health: 87000,
    maxHealth: 100000
};

/* ************************************************
** GAME INITIALISATION
************************************************ */

var app = express();
app.use(
    ecstatic(
      { root: path.resolve(__dirname, '../public') }
    )
);

app.use(cors());

// Create and start the http server
var server = http.createServer(app).listen(port, function (err) {
  if (err) {
    throw err
  }

  init()
})

function init () {
  // Create an empty array to store players
  players = [];
  games = [];

  // Attach Socket.IO to server
  socket = io.listen(server);

  // Start listening for events
  setEventHandlers()
}

/* ************************************************
** GAME EVENT HANDLERS
************************************************ */
var setEventHandlers = function () {
  // Socket.IO
  socket.sockets.on('connection', onSocketConnection)
}

// New socket connection
function onSocketConnection (client) {
  util.log('New player has connected: ' + client.id);
  
  
    
    client.emit("initial data", {id: this.id, health: castle.health, maxHealth: castle.maxHealth});
  // Listen for client disconnected
  client.on('disconnect', onClientDisconnect)

  // Listen for new player message
  client.on('new player', onNewPlayer)

  // Listen for move player message
  client.on('move player', onMovePlayer);
    
  client.on('attack castle', onAttackCastle);
}

function onAttackCastle (data) {

    if (data.damage > 100)
      data.damage = 1;
    castle.health -= parseInt(data.damage);
    if (castle.health <= 0)
    {
      setTimeout(function (){
        castle.health = castle.maxHealth;
      }
      , 60000   
      )
    }
    util.log(castle.health + "/" + castle.maxHealth);
    this.emit('update castle', {id: this.id, health: castle.health, maxHealth: castle.maxHealth});
}

// Socket client has disconnected
function onClientDisconnect () {
  util.log('Player has disconnected: ' + this.id)

  var removePlayer = playerById(this.id)

  // Player not found
  if (!removePlayer) {
    util.log('Player not found: ' + this.id)
    return
  }

  // Remove player from players array
  players.splice(players.indexOf(removePlayer), 1)
    
    for(var i = 0 ; i < games.length; i++){
        if (games[i].player1.id === removePlayer.id){
            games[i].player1 = null;
        }
        if (games[i].player2 && games[i].player2.id === removePlayer.id){
            games[i].player2 = null;
        }
        
        if (games[i].player1 === null && games[i].player2 === null){
          games.splice(i, 1);
          break;
        }
      
    }  
  // Broadcast removed player to connected socket clients
  this.broadcast.emit('remove player', {id: this.id})
}

// New player has joined
function onNewPlayer (data) {
  // Create a new player
  var newPlayer = new Player(data.x, data.y, data.angle)
  newPlayer.id = this.id

  // Broadcast new player to connected socket clients
  this.broadcast.emit('new player', {id: newPlayer.id, x: newPlayer.getX(), y: newPlayer.getY(), angle: newPlayer.getAngle()})

  // Send existing players to the new player
  var i, existingPlayer
  for (i = 0; i < players.length; i++) {
    existingPlayer = players[i]
    this.emit('new player', {id: existingPlayer.id, x: existingPlayer.getX(), y: existingPlayer.getY(), angle: existingPlayer.getAngle()})
  }

  // Add new player to the players array
  players.push(newPlayer);

    var game = {
        player1:newPlayer,
        player2:null,
        started:false
    };
    if (games.length === 0 || games[games.length - 1].player2 !== null || games[games.length - 1].started){
        games.push(game);
    }else {
        games[games.length - 1].player2 = newPlayer;
        games[games.length - 1].started = true;
    }
    
    util.log(games.length);
    
}

// Player has moved
function onMovePlayer (data) {
  // Find player in array
  var movePlayer = playerById(this.id)

  // Player not found
  if (!movePlayer) {
    util.log('Player not found: ' + this.id)
    return
  }

  // Update player position
  movePlayer.setX(data.x)
  movePlayer.setY(data.y)
  movePlayer.setAngle(data.angle)

  // Broadcast updated position to connected socket clients
  this.broadcast.emit('move player', {id: movePlayer.id, x: movePlayer.getX(), y: movePlayer.getY(), angle: movePlayer.getAngle()})
}

/* ************************************************
** GAME HELPER FUNCTIONS
************************************************ */
// Find player by ID
function playerById (id) {
  var i
  for (i = 0; i < players.length; i++) {
    if (players[i].id === id) {
      return players[i]
    }
  }

  return false
}
