import Player from "./player";

var talkKey;
var player;

var game = new Phaser.Game(
    800, 600,
    Phaser.CANVAS,
    "game", 
    { preload: preload, create: create, update: update }
);

function preload() {
    // 32x48
    game.load.spritesheet('guest-sprite', 'static/img/guest-sprite.png', 32, 48, 7);
}

function create() {
    player = new Player(game);
    setupKeyBindings();
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
        player.moveTo(game.input.x, game.input.y);
    }
}


// Create connection to server
const webSocketBridge = new channels.WebSocketBridge();
webSocketBridge.connect('/ws/');
webSocketBridge.listen((action) => {
    action = JSON.parse(action["text"]);
    if (action["command"] == "chat") {
        $("#debug-log > ul").append($("<li>" + action["text"] + "</li>"));
    }
});

window.ws = webSocketBridge;

$("#chat-overlay form").submit((e) => {
    const text = $("#chat-overlay input").val();

    webSocketBridge.send({command: 'chat', text: text});

    $("#chat-overlay input").val("");
    e.preventDefault();

    setupKeyBindings();
    $("#chat-overlay").hide();
});