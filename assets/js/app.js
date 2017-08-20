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

var game = new Phaser.Game(
    800, 600,
    Phaser.CANVAS,
    "game", 
    { preload: preload, create: create, update: update }
);

function preload() {
    game.stage.disableVisibilityChange = true;
    
    // 32x48
    game.load.spritesheet('guest-sprite', 'static/img/guest-sprite.png', 32, 64, 7);
}

function create() {
    setupKeyBindings();

    // Create connection to server
    webSocketBridge.connect('/ws/' + id);
    webSocketBridge.listen((action) => {
        if (action.command == "chat") {
            $("#debug-log > ul").append($("<li>" + action["text"] + "</li>"));
        } else if (action.command == "add_player") {
            if (players[action.player.id] != null) {
                players[action.player.id].destroy();
            }
            players[action.player.id] = new Player(game, action.player.x, action.player.y);
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
        // players[id].moveTo(game.input.x, game.input.y);
    }
}

$("#chat-overlay form").submit((e) => {
    const text = $("#chat-overlay input").val();

    webSocketBridge.send({command: 'chat', text: text});

    $("#chat-overlay input").val("");
    e.preventDefault();

    setupKeyBindings();
    $("#chat-overlay").hide();
});