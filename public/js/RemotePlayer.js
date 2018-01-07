"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* global game */
var Phaser = require("phaser");
var RemotePlayer = /** @class */ (function () {
    function RemotePlayer(index, game, player, startX, startY, startAngle) {
        var x = startX;
        var y = startY;
        var rotation = startAngle;
        this.game = game;
        this.health = 3;
        this.player = player;
        this.alive = true;
        this.player = this.game.add.sprite(x, y, 'enemy');
        this.player.animations.add('move', [0, 1, 2, 3, 4, 5, 6, 7], 20, true);
        this.player.animations.add('stop', [3], 20, true);
        this.player.anchor.setTo(0.5, 0.5);
        this.player.name = index.toString();
        this.game.physics.enable(this.player, Phaser.Physics.ARCADE);
        this.player.body.immovable = true;
        this.player.body.collideWorldBounds = true;
        this.player.rotation = rotation;
        this.lastPosition = { x: x, y: y, rotation: rotation };
    }
    RemotePlayer.prototype.update = function () {
        if (this.player.x !== this.lastPosition.x || this.player.y !== this.lastPosition.y || this.player.rotation != this.lastPosition.rotation) {
            this.player.play('move');
            // this.player.rotation = Math.PI + this.game.physics.arcade.angleToXY(this.player, this.lastPosition.x, this.lastPosition.y)
        }
        else {
            this.player.play('stop');
        }
        this.lastPosition.x = this.player.x;
        this.lastPosition.y = this.player.y;
        this.lastPosition.rotation = this.player.rotation;
    };
    return RemotePlayer;
}());
exports.RemotePlayer = RemotePlayer;
//window.RemotePlayer = RemotePlayer
