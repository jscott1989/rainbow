import Player from "./player";


// We won't have enough players for uuid uniqueness to matter - so using this
// poor quality version
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function calcStraightLine (startCoordinates, endCoordinates) {
    var coordinatesArray = new Array();
    // Translate coordinates
    var x1 = startCoordinates[0];
    var y1 = startCoordinates[1];
    var x2 = endCoordinates[0];
    var y2 = endCoordinates[1];
    // Define differences and error check
    var dx = Math.abs(x2 - x1);
    var dy = Math.abs(y2 - y1);
    var sx = (x1 < x2) ? 1 : -1;
    var sy = (y1 < y2) ? 1 : -1;
    var err = dx - dy;
    // Set first coordinates
    coordinatesArray.push([x1, y1]);
    // Main loop
    while (!((x1 == x2) && (y1 == y2))) {
      var e2 = err << 1;
      if (e2 > -dy) {
        err -= dy;
        x1 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y1 += sy;
      }
      // Set coordinates
      coordinatesArray.push([x1, y1]);
    }
    // Return the result
    return coordinatesArray;
  }

var id = localStorage.getItem("playerId");
if (id == null) {
    id = uuidv4();
    localStorage.setItem("playerId", id);
}

const webSocketBridge = new channels.WebSocketBridge();
var talkKey;
var players = {};
var easystar = new EasyStar.js();
var map;
var sprites;

var game = new Phaser.Game(
    800, 600,
    Phaser.CANVAS,
    "game", 
    { preload: preload, create: create, update: update, render: render }
);

function preload() {
    game.stage.disableVisibilityChange = true;

    game.load.image('background', 'static/img/test-background.png');
    game.load.image('foreground', 'static/img/test-foreground.png');
    game.load.image('background-mask', 'static/img/test-background-mask.png');
    game.load.spritesheet('guest-sprite', 'static/img/guest-sprite.png', 32, 64);
}

function create() {
    setupKeyBindings();

    const BG_WIDTH = 2734;
    const BG_HEIGHT = 600;

     game.world.setBounds(0, 0, BG_WIDTH, BG_HEIGHT);


    var bmd = game.make.bitmapData(BG_WIDTH, BG_HEIGHT);
    bmd.draw(game.cache.getImage('background-mask'), 0, 0);
    bmd.update();
    var data = bmd.data;

    map = []
    var i = 0;
    for (var y = 0; y < BG_HEIGHT; y++) {
        var r = [];

        for (var x = 0; x < BG_WIDTH; x++) {
            if (data[i + 3] > 0) {
                // Visible
                r.push(1);
            } else {
                r.push(0)
            }
            i += 4;
        }

        map.push(r);
    }

    easystar.setGrid(map);
    easystar.setAcceptableTiles([1]);

    var background = game.add.tileSprite(0, 0, BG_WIDTH, BG_HEIGHT, 'background');

    sprites = game.add.group();

    game.add.tileSprite(0, 0, BG_WIDTH, BG_HEIGHT, 'foreground');
    // game.add.tileSprite(0, 0, BG_WIDTH, BG_HEIGHT, 'background-mask');

    // Create connection to server
    webSocketBridge.connect('/ws/' + id);
    webSocketBridge.listen((action) => {
        if (action.command == "chat") {
            players[action.player.id].chat(action.text);
        } else if (action.command == "add_player") {
            if (players[action.player.id] != null) {
                players[action.player.id].destroy();
            }
            players[action.player.id] = new Player(game, sprites, easystar, action.player.x, action.player.y);

            if (action.player.id == id) {
                console.log("FOLLOW ME");
                game.camera.follow(players[action.player.id].sprite);
            }
        } else if (action.command == "remove_player") {
            players[action.player.id].destroy();
            delete players[action.player.id];
        } else if (action.command == "move") {
            players[action.player.id].moveTo(action.x, action.y);
        }
    });


    game.input.onDown.add(() => {
        var x = game.input.x + game.camera.x;
        var y = game.input.y + game.camera.y;
        if (map[y][x] < 1) {
            var currentPosition = [players[id].sprite.x, players[id].sprite.y];
            var targetPosition = [x, y];
            var possibleCoordinates = calcStraightLine(targetPosition, currentPosition);

            for (var c in possibleCoordinates) {
                var coordinate = possibleCoordinates[c];
                if (map[coordinate[1]][coordinate[0]] > 0) {
                    // Can use this one
                    x = coordinate[0];
                    y = coordinate[1];
                    break;
                }
            }
        }
        webSocketBridge.send({command: 'move', x: x, y: y})
    });
}


function setupKeyBindings() {
    talkKey = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);

    talkKey.onDown.add(() => {
        $("#chat-overlay").show();
        $("#chat-overlay input").focus();
        removeKeyBindings();
    })
}

function removeKeyBindings() {
    game.input.keyboard.removeKey(Phaser.Keyboard.SPACEBAR);
}


function update() {
    for (var player in players) {
        players[player].update();
    }

    easystar.calculate()
}

function render() {

    // game.debug.cameraInfo(game.camera, 32, 32);
    // game.debug.spriteCoords(players[id], 32, 500);

}

$("#chat-overlay form").submit((e) => {
    const text = $("#chat-overlay input").val();

    webSocketBridge.send({command: 'chat', text: text});

    $("#chat-overlay input").val("");
    e.preventDefault();

    setupKeyBindings();
    $("#chat-overlay").hide();
});