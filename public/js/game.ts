/* global Phaser RemotePlayer io */
import 'pixi';
import 'p2';
import * as Phaser from "phaser";
 
class VirtualJoystickDeclarator extends Phaser{
    static VirtualJoystick:any
}

import {RemotePlayer} from "./RemotePlayer";

const SOCKETIO_URL = "localhost:8080";

const DEFAULT_GAME_HEIGHT = 550;
const DEFAULT_GAME_WIDTH = 360;

class FunnyGame {
    
    game:Phaser.Game;
    socket; // Socket connection 
    land;
    player;
    enemies;
    pad;
    buttonA;
    buttonB;
    buttonC;
    stick;
    currentSpeed = 0;
    cursors;
    weapon;
    
    monsters = [];
    castle;
    
    cardBtns = [];

    enemyBullets;
    enemiesTotal = 0;
    enemiesAlive = 0;
    explosions;
    fireRate = 100;
    nextFire = 0;
    
    constructor() {
        this.game = new Phaser.Game(DEFAULT_GAME_WIDTH, DEFAULT_GAME_HEIGHT, Phaser.AUTO, '', {
            preload: this.preload.bind(this),
            create: this.create.bind(this),
            update: this.update.bind(this),
            render: this.render.bind(this)
        });
    }

    preload() {

        this.game.scale.fullScreenScaleMode = Phaser.ScaleManager.SHOW_ALL;
        this.game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
        this.game.scale.pageAlignHorizontally = true;
        this.game.scale.pageAlignVertically = true;
        window.addEventListener("resize", ()=>{
            this.resizeGame();
        });
        
        this.game.load.script('joystick', 'js/vendor/phaser-virtual-joystick.min.js');
        this.game.load.script('io', './socket.io.js');
        this.game.load.image('earth', 'assets/light_sand.png');
        this.game.load.image('castle', 'assets/castle.png');
        this.game.load.image('monsterbtn', 'assets/monsterbtn.png');
        this.game.load.spritesheet('dude', 'assets/dude.png', 64, 64);
        this.game.load.spritesheet('enemy', 'assets/dude.png', 64, 64);
        this.game.load.spritesheet('monster', 'assets/monster.png', 64, 64);
        this.game.load.atlas('generic', 'assets/virtualjoystick/skins/generic-joystick.png', 'assets/virtualjoystick/skins/generic-joystick.json');


        this.game.load.image('bullet', 'assets/bullet.png');
        this.game.load.spritesheet('kaboom', 'assets/explosion.png', 64, 64, 23);
    }

    resizeGame(){
        let height = window.innerHeight;// - $('#all').height();
        let width = window.innerWidth;

        if (width > Math.round(height * DEFAULT_GAME_WIDTH / DEFAULT_GAME_HEIGHT)) {
            width = Math.round(height * DEFAULT_GAME_WIDTH / DEFAULT_GAME_HEIGHT);
        } else {
            height = Math.round(width * DEFAULT_GAME_HEIGHT / DEFAULT_GAME_WIDTH);
        }

        this.game.scale.scaleMode = Phaser.ScaleManager.USER_SCALE;
        this.game.scale.setUserScale(height / DEFAULT_GAME_HEIGHT, width / DEFAULT_GAME_WIDTH);

        this.game.stage._bounds.width = width;
        this.game.stage._bounds.height = height;

        this.game.scale.pageAlignHorizontally = true;
        this.game.scale.pageAlignVertically = true;
        this.game.scale.refresh();
    }

    create() {
        this.socket = io.connect(SOCKETIO_URL,{transports: ['websocket', 'polling', 'flashsocket']});
 
        // Resize our game world to be a 2000 x 2000 square
        //this.game.world.setBounds(0, 0, DEFAULT_GAME_WIDTH, DEFAULT_GAME_HEIGHT);

        // Our tiled scrolling background
        this.land = this.game.add.tileSprite(0, 0, DEFAULT_GAME_WIDTH, DEFAULT_GAME_HEIGHT, 'earth');
        this.land.fixedToCamera = true;

        


        // The base of our player
        const startX = DEFAULT_GAME_WIDTH/2;//Math.round(Math.random() * (1000) - 500);
        const startY = DEFAULT_GAME_HEIGHT - 150;//Math.round(Math.random() * (1000) - 500);
        this.player = this.game.add.sprite(startX, startY, 'dude');
        this.player.anchor.setTo(0.5, 0.5);
        this.player.animations.add('move', [0, 1, 2, 3, 4, 5, 6, 7], 20, true);
        this.player.animations.add('stop', [3], 20, true);
        this.player.rotation = -90 * (Math.PI/180);

        // This will force it to decelerate and limit its speed
        // player.body.drag.setTo(200, 200)
        this.game.physics.enable(this.player, Phaser.Physics.ARCADE);
        this.player.body.maxVelocity.setTo(400, 400);
        this.player.body.collideWorldBounds = true;

        // Create some baddies to waste :)
        this.enemies = [];

        this.player.bringToTop();

        this.createMonster();

        this.castle= this.game.add.sprite(DEFAULT_GAME_WIDTH/2, 30, 'castle');
        this.castle.anchor.setTo(0.5,0.5);
        this.castle.scale.setTo(0.4,0.4);
        

        this.game.physics.enable(this.castle, Phaser.Physics.ARCADE);
        this.castle.body.maxVelocity.setTo(0, 0);
        this.castle.body.immovable = true;
        this.castle.body.collideWorldBounds = true;
        this.castle.body.setSize(240, 235, 5, 0);
        this.castle.bringToTop();
        
        this.game.camera.follow(this.player);
        this.game.camera.deadzone = new Phaser.Rectangle(150, 150, DEFAULT_GAME_WIDTH -300, DEFAULT_GAME_HEIGHT-300);
        this.game.camera.focusOnXY(0, 0);

        this.cursors = this.game.input.keyboard.createCursorKeys();
    
        for (let i =0; i<5; i++){
            let button = this.game.add.button(i*70, DEFAULT_GAME_HEIGHT - 215, 'monsterbtn', this.createMonster.bind(this), this);
            button.scale.setTo(0.35,0.35);
            this.cardBtns.push(button);
        }
       

        this.weapon = this.game.add.weapon(4, 'bullet');

        //  The bullet will be automatically killed when it leaves the world bounds
        this.weapon.bulletKillType = Phaser.Weapon.KILL_WORLD_BOUNDS;

        //  The speed at which the bullet is fired
        this.weapon.bulletSpeed = 600;

        //  Speed-up the rate of fire, allowing them to shoot 1 bullet every 60ms
        this.weapon.fireRate = 100;

        //  Tell the Weapon to track the 'player' Sprite
        //  With no offsets from the position
        //  But the 'true' argument tells the weapon to track sprite rotation
        this.weapon.trackSprite(this.player, 0, 0, true);

        this.explosions = this.game.add.group();
        for (let i = 0; i < 10; i++)
        {
            const explosionAnimation = this.explosions.create(0, 0, 'kaboom', [0], false);
            explosionAnimation.anchor.setTo(0.5, 0.5);
            explosionAnimation.animations.add('kaboom');
        }

        // joystic
        this.pad = this.game.plugins.add(VirtualJoystickDeclarator.VirtualJoystick);

        this.stick = this.pad.addStick(0, 0, 200, 'generic');
        this.stick.scale = 0.5;
        this.stick.alignBottomLeft(20);

        this.buttonA = this.pad.addButton(500, 520, 'generic', 'button1-up', 'button1-down');
        this.buttonA.alignBottomRight(20);

        //this.buttonB = this.pad.addButton(615, 450, 'generic', 'button2-up', 'button2-down');
        //this.buttonB.onDown.add(this.pressButtonB, this);

        //this.buttonC = this.pad.addButton(730, 520, 'generic', 'button3-up', 'button3-down');
        //this.buttonC.onDown.add(this.pressButtonC, this);
        
        // Start listening for events
        this.setEventHandlers();
    }

    createMonster(){
        
        const startX = Math.random() * (DEFAULT_GAME_WIDTH -40) ;
        let monster = this.game.add.sprite(startX, DEFAULT_GAME_HEIGHT - 330 , 'monster');
        monster.anchor.setTo(0.5,0.5);
        monster.animations.add("slash",[156,157,158,159,160,161],15,true);
        monster.animations.add("move",[104,105,106,107,108,109,110,111,112],15,true);

        this.game.physics.enable(monster, Phaser.Physics.ARCADE);
        monster.body.maxVelocity.setTo(400, 400);
        monster.body.collideWorldBounds = true;
        monster.body.setSize(35, 45, 15, 18);
        monster.bringToTop();
        
        this.monsters.push(monster);
    }    
    
    setEventHandlers(){
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
    }

// Socket connected
    onSocketConnected() {
        console.log('Connected to socket server');

        // Reset enemies on reconnect
        this.enemies.forEach( enemy => {
            enemy.player.kill();
        });
        this.enemies = [];

        // Send local player data to the game server
        this.socket.emit('new player', {x: this.player.x, y: this.player.y, angle: this.player.angle});
    }

// Socket disconnected
    onSocketDisconnect() {
        this.socket.emit('disconnect');
        console.log('Disconnected from socket server');
    }

// New player
    onNewPlayer(data) {
        console.log('New player connected:', data.id);

        // Avoid possible duplicate players
        const duplicate = this.playerById(data.id);
        if (duplicate) {
            console.log('Duplicate player!');
            return
        }

        // Add new player to the remote players array
        this.enemies.push(new RemotePlayer(data.id, this.game, this.player, data.x, data.y, data.angle));
    }

// Move player
    onMovePlayer(data) {
        const movePlayer = this.playerById(data.id);

        // Player not found
        if (!movePlayer) {
            console.log('Player not found: ', data.id);
            return;
        }

        // Update player position
        movePlayer.player.x = data.x;
        movePlayer.player.y = data.y;
        movePlayer.player.rotation = data.angle;
    }

// Remove player
    onRemovePlayer(data) {
        const removePlayer = this.playerById(data.id);

        // Player not found
        if (!removePlayer) {
            console.log('Player not found: ', data.id);
            return;
        }

        removePlayer.player.kill();

        // Remove player from array
        this.enemies.splice(this.enemies.indexOf(removePlayer), 1);
    }

   // bulletHitPlayer(tank, bullet) {
   //     bullet.kill();
   // }

    bulletHitEnemy(enermy, bullet) {
        bullet.kill();
        
        const destroyed = this.playerById(enermy.name).damage();

        if (destroyed)
        {
            const explosionAnimation = this.explosions.getFirstExists(false);
            explosionAnimation.reset(enermy.x, enermy.y);
            explosionAnimation.play('kaboom', 30, false, true);
        }
    }

    bulletHitCastle(enermy, bullet) {
        bullet.kill();
        const explosionAnimation = this.explosions.getFirstExists(false);
        explosionAnimation.reset(enermy.x, enermy.y);
        explosionAnimation.play('kaboom', 30, false, true);
        
    }

    update() {
        //this.game.physics.arcade.overlap(this.enemyBullets, this.player, this.bulletHitPlayer.bind(this), null, this);

        for (let i = 0; i < this.enemies.length; i++) {
            if (this.enemies[i].alive) {
                this.enemies[i].update();
                this.game.physics.arcade.collide(this.player, this.enemies[i].player);
                this.game.physics.arcade.overlap(this.weapon.bullets, this.enemies[i].player, this.bulletHitEnemy.bind(this), null, this);
            }
        }

        this.game.physics.arcade.overlap(this.weapon.bullets,this.castle, this.bulletHitCastle.bind(this), null, this);

        const maxSpeed = 400;

        if (this.stick.isDown) {
            this.game.physics.arcade.velocityFromRotation(this.stick.rotation, this.stick.force * maxSpeed, this.player.body.velocity);
            this.player.rotation =this.stick.rotation;
        }
        else {
            this.player.body.velocity.set(0);
            this.currentSpeed = 0;
        }


        if (this.currentSpeed > 0) {
            this.player.animations.play('move');
        } else {
            this.player.animations.play('stop');
        }

        this.land.tilePosition.x = -this.game.camera.x;
        this.land.tilePosition.y = -this.game.camera.y;

        if (this.game.input.activePointer.isDown) {
            if (this.game.physics.arcade.distanceToPointer(this.player) >= 10) {
                this.currentSpeed = 300;
            }
        }
        
        if (this.buttonA.isDown){
            this.weapon.fire();
        }

        this.game.physics.arcade.collide(this.castle, this.player);
        for (let i = 0; i < this.monsters.length; i++) {
            this.game.physics.arcade.collide(this.castle, this.monsters[i]);
            if (this.game.physics.arcade.distanceBetween(this.monsters[i], this.castle)> 70){
                let radians = this.game.physics.arcade.angleBetween(this.monsters[i], this.castle);
                this.game.physics.arcade.velocityFromRotation(radians, 60, this.monsters[i].body.velocity);
                //this.monsters[i].angle = radians ;//+ (90 * Math.PI/180);
                //this.monsters[i].body.rotation = radians + (90 * Math.PI/180);
                this.monsters[i].animations.play("move");
            }
            else{
                this.monsters[i].animations.play("slash");
                this.monsters[i].body.velocity.set(0);
            }
        }
       

        this.socket.emit('move player', {x: this.player.x, y: this.player.y, angle: this.player.rotation})
    }

    render() {
       /* this.game.debug.body(this.castle);
        for (let i = 0; i < this.monsters.length; i++) {
            this.game.debug.body(this.monsters[i]);
        }
        */
    }

    playerById(id) {
        for (let i = 0; i < this.enemies.length; i++) {
            if (this.enemies[i].player.name === id) {
                return this.enemies[i];
            }
        }

        return false;
    }
}

new FunnyGame();