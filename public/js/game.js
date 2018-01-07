"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
/* global Phaser RemotePlayer io */
require("pixi");
require("p2");
var Phaser = require("phaser");
var VirtualJoystickDeclarator = /** @class */ (function (_super) {
    __extends(VirtualJoystickDeclarator, _super);
    function VirtualJoystickDeclarator() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return VirtualJoystickDeclarator;
}(Phaser));
var RemotePlayer_1 = require("./RemotePlayer");
var FunnyGame = /** @class */ (function () {
    function FunnyGame() {
        this.currentSpeed = 0;
        this.game = new Phaser.Game(800, 600, Phaser.AUTO, '', {
            preload: this.preload.bind(this),
            create: this.create.bind(this),
            update: this.update.bind(this),
            render: this.render.bind(this)
        });
    }
    FunnyGame.prototype.preload = function () {
        this.game.load.script('joystick', 'js/vendor/phaser-virtual-joystick.min.js');
        this.game.load.image('earth', 'assets/light_sand.png');
        this.game.load.spritesheet('dude', 'assets/dude.png', 64, 64);
        this.game.load.spritesheet('enemy', 'assets/dude.png', 64, 64);
        this.game.load.atlas('generic', 'assets/virtualjoystick/skins/generic-joystick.png', 'assets/virtualjoystick/skins/generic-joystick.json');
    };
    FunnyGame.prototype.create = function () {
        this.socket = io.connect();
        // Resize our game world to be a 2000 x 2000 square
        this.game.world.setBounds(-500, -500, 1000, 1000);
        // Our tiled scrolling background
        this.land = this.game.add.tileSprite(0, 0, 800, 600, 'earth');
        this.land.fixedToCamera = true;
        // joystic
        this.pad = this.game.plugins.add(VirtualJoystickDeclarator.VirtualJoystick);
        this.stick = this.pad.addStick(0, 0, 200, 'generic');
        this.stick.alignBottomLeft(20);
        this.buttonA = this.pad.addButton(500, 520, 'generic', 'button1-up', 'button1-down');
        this.buttonA.onDown.add(this.pressaaa.bind(this), this);
        this.buttonB = this.pad.addButton(615, 450, 'generic', 'button2-up', 'button2-down');
        //this.buttonB.onDown.add(this.pressButtonB, this);
        this.buttonC = this.pad.addButton(730, 520, 'generic', 'button3-up', 'button3-down');
        //this.buttonC.onDown.add(this.pressButtonC, this);
        // The base of our player
        var startX = Math.round(Math.random() * (1000) - 500);
        var startY = Math.round(Math.random() * (1000) - 500);
        this.player = this.game.add.sprite(startX, startY, 'dude');
        this.player.anchor.setTo(0.5, 0.5);
        this.player.animations.add('move', [0, 1, 2, 3, 4, 5, 6, 7], 20, true);
        this.player.animations.add('stop', [3], 20, true);
        // This will force it to decelerate and limit its speed
        // player.body.drag.setTo(200, 200)
        this.game.physics.enable(this.player, Phaser.Physics.ARCADE);
        this.player.body.maxVelocity.setTo(400, 400);
        this.player.body.collideWorldBounds = true;
        // Create some baddies to waste :)
        this.enemies = [];
        this.player.bringToTop();
        this.game.camera.follow(this.player);
        this.game.camera.deadzone = new Phaser.Rectangle(150, 150, 500, 300);
        this.game.camera.focusOnXY(0, 0);
        this.cursors = this.game.input.keyboard.createCursorKeys();
        // Start listening for events
        this.setEventHandlers();
    };
    FunnyGame.prototype.pressaaa = function () {
        this.player.tint = Math.random() * 0xFFFFFF;
    };
    FunnyGame.prototype.setEventHandlers = function () {
        // Socket connection successful
        this.socket.on('connect', this.onSocketConnected.bind(this));
        // Socket disconnection
        this.socket.on('disconnect', this.onSocketDisconnect.bind(this));
        // New player message received
        this.socket.on('new player', this.onNewPlayer.bind(this));
        // Player move message received
        this.socket.on('move player', this.onMovePlayer.bind(this));
        // Player removed message received
        this.socket.on('remove player', this.onRemovePlayer.bind(this));
    };
    // Socket connected
    FunnyGame.prototype.onSocketConnected = function () {
        console.log('Connected to socket server');
        // Reset enemies on reconnect
        this.enemies.forEach(function (enemy) {
            enemy.player.kill();
        });
        this.enemies = [];
        // Send local player data to the game server
        this.socket.emit('new player', { x: this.player.x, y: this.player.y, angle: this.player.angle });
    };
    // Socket disconnected
    FunnyGame.prototype.onSocketDisconnect = function () {
        this.socket.emit('disconnect');
        console.log('Disconnected from socket server');
    };
    // New player
    FunnyGame.prototype.onNewPlayer = function (data) {
        console.log('New player connected:', data.id);
        // Avoid possible duplicate players
        var duplicate = this.playerById(data.id);
        if (duplicate) {
            console.log('Duplicate player!');
            return;
        }
        // Add new player to the remote players array
        this.enemies.push(new RemotePlayer_1.RemotePlayer(data.id, this.game, this.player, data.x, data.y, data.angle));
    };
    // Move player
    FunnyGame.prototype.onMovePlayer = function (data) {
        var movePlayer = this.playerById(data.id);
        // Player not found
        if (!movePlayer) {
            console.log('Player not found: ', data.id);
            return;
        }
        // Update player position
        movePlayer.player.x = data.x;
        movePlayer.player.y = data.y;
        movePlayer.player.rotation = data.angle;
    };
    // Remove player
    FunnyGame.prototype.onRemovePlayer = function (data) {
        var removePlayer = this.playerById(data.id);
        // Player not found
        if (!removePlayer) {
            console.log('Player not found: ', data.id);
            return;
        }
        removePlayer.player.kill();
        // Remove player from array
        this.enemies.splice(this.enemies.indexOf(removePlayer), 1);
    };
    FunnyGame.prototype.update = function () {
        for (var i = 0; i < this.enemies.length; i++) {
            if (this.enemies[i].alive) {
                this.enemies[i].update();
                this.game.physics.arcade.collide(this.player, this.enemies[i].player);
            }
        }
        var maxSpeed = 400;
        if (this.stick.isDown) {
            this.game.physics.arcade.velocityFromRotation(this.stick.rotation, this.stick.force * maxSpeed, this.player.body.velocity);
            this.player.rotation = this.stick.rotation;
        }
        else {
            this.player.body.velocity.set(0);
            this.currentSpeed = 0;
        }
        if (this.currentSpeed > 0) {
            this.player.animations.play('move');
        }
        else {
            this.player.animations.play('stop');
        }
        this.land.tilePosition.x = -this.game.camera.x;
        this.land.tilePosition.y = -this.game.camera.y;
        if (this.game.input.activePointer.isDown) {
            if (this.game.physics.arcade.distanceToPointer(this.player) >= 10) {
                this.currentSpeed = 300;
            }
        }
        this.socket.emit('move player', { x: this.player.x, y: this.player.y, angle: this.player.rotation });
    };
    FunnyGame.prototype.render = function () {
    };
    FunnyGame.prototype.playerById = function (id) {
        for (var i = 0; i < this.enemies.length; i++) {
            if (this.enemies[i].player.name === id) {
                return this.enemies[i];
            }
        }
        return false;
    };
    return FunnyGame;
}());
new FunnyGame();
