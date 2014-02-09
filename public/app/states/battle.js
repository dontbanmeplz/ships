define(['Phaser', 'io', 'app/math.js', 'app/game.js', 'app/global.js'], function(Phaser, io, math, game, global) {


    var cursors;
    var player;
    var enemies;
    var gameSprites = {}; //I will put all the ship sprites here
    
    var serverState = null;
    var gameStarted = false;
    var initializationPacket = null;
    var socket = io.connect('http://ships.cloudapp.net:8000/');

    function updateFromServerState(state) {
        if (!state) {
            return;
        }
        var i = 0, sprite;
        for (i = state.length-1; i >= 0; i--) {
          sprite = gameSprites[state[i].id];
          if (!sprite){
            continue;
          }
          sprite.x = state[i].x;
          sprite.y = state[i].y;
          sprite.rotation = state[i].rotation;
        }
    }

    function handleKeys() {
        var keys = {};
        var toSend = false;
        if (cursors.up.isDown) {
            keys.up = true;
            toSend = true;
        }

        if (cursors.left.isDown) {
            keys.left = true;
            toSend = true;
        } else if (cursors.right.isDown) {
            keys.right = true;
            toSend = true;
        }

        if (toSend) {
            socket.emit('client-keys-pressed', keys);
        }
    }

    var battle = {

        preload: function() {
            game.load.image('ship', 'assets/sprites/ship.png');
            game.stage.disableVisibilityChange = true;
        },

        create: function() {
            cursors = game.input.keyboard.createCursorKeys();
            player = game.add.sprite(0, 0, 'ship');
            player.anchor.setTo(0.2, 0.5);
            player.kill();
            enemies = game.add.group();

            socket.on('server-state', function(state) {
                serverState = state;
            });

            socket.on('server-initialize', function(data) {
                player.reset(data.x, data.y);
                player.rotation = data.rotation;
                player.serverId = data.id;
                gameSprites[data.id] = player;
                gameStarted = true;
            });

            socket.on('server-player-connected', function(data) { //This happens when other player connects
                var enemy = enemies.create(data.x, data.y, 'ship');
                enemy.anchor.setTo(0.2, 0.5);
                enemy.rotation = data.rotation;
                enemy.serverId = data.id;
                gameSprites[data.id] = enemy;
            });

            socket.emit("client-ready"); //Signal the server that this client is ready to accept data
        },

        update: function() {
            if (!gameStarted) {
                return;
            }
            var keys = {};
            updateFromServerState(serverState);
            serverState = null;
            handleKeys();

        }
    };

    return battle;
});