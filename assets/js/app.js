import Player from "./player";


// We won't have enough players for uuid uniqueness to matter - so using this
// poor quality version
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
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

var game = new Phaser.Game(
    800, 600,
    Phaser.CANVAS,
    "game", 
    { preload: preload, create: create, update: update }
);

function preload() {
    game.stage.disableVisibilityChange = true;

    game.load.image('background', 'static/img/test-background.png');
    game.load.image('background-mask', 'static/img/test-background-mask.png');
    game.load.spritesheet('guest-sprite', 'static/img/guest-sprite.png', 32, 64, 7);
}

function create() {
    setupKeyBindings();

    const BG_WIDTH = 2734;
    const BG_HEIGHT = 600;


    var bmd = game.make.bitmapData(BG_WIDTH, BG_HEIGHT);
    bmd.draw(game.cache.getImage('background-mask'), 0, 0);
    bmd.update();
    var data = bmd.data;

    var map = []
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

    var background = game.add.tileSprite(0, 0, 2734, 600, 'background');

    // Create connection to server
    webSocketBridge.connect('/ws/' + id);
    webSocketBridge.listen((action) => {
        if (action.command == "chat") {
            players[action.player.id].chat(action.text);
        } else if (action.command == "add_player") {
            if (players[action.player.id] != null) {
                players[action.player.id].destroy();
            }
            players[action.player.id] = new Player(game, easystar, action.player.x, action.player.y);
        } else if (action.command == "remove_player") {
            players[action.player.id].destroy();
            delete players[action.player.id];
        } else if (action.command == "move") {
            players[action.player.id].moveTo(action.x, action.y);
        }
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
    if (game.input.activePointer.isDown) {
        webSocketBridge.send({command: 'move', x: game.input.x, y: game.input.y})
    }

    for (var player in players) {
        players[player].update();
    }

    easystar.calculate()
}

$("#chat-overlay form").submit((e) => {
    const text = $("#chat-overlay input").val();

    webSocketBridge.send({command: 'chat', text: text});

    $("#chat-overlay input").val("");
    e.preventDefault();

    setupKeyBindings();
    $("#chat-overlay").hide();
});