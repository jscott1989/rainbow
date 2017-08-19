var talkKey; 

var game = new Phaser.Game(
    800, 600,
    Phaser.CANVAS,
    "game", 
    { preload: preload, create: create, update: update }
);

function preload() {
    // game.load.image('einstein', 'assets/pics/ra_einstein.png');
}

function create() {

    // var s = game.add.sprite(80, 0, 'einstein');

    // s.rotation = 0.14;

    setupKeyBindings();
}


function setupKeyBindings() {
    talkKey = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);

    talkKey.onDown.add(() => {
        console.log("PRessed");

        $("#chat-overlay").show();
        $("#chat-overlay input").focus();
        removeKeyBindings();
    })
}

function removeKeyBindings() {
    game.input.keyboard.removeKey(Phaser.Keyboard.SPACEBAR);
}



function update() {
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