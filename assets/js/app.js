var game = new Phaser.Game(
    800, 600,
    Phaser.CANVAS,
    "game", 
    { preload: preload, create: create }
);

function preload() {
    // game.load.image('einstein', 'assets/pics/ra_einstein.png');
}

function create() {

    // var s = game.add.sprite(80, 0, 'einstein');

    // s.rotation = 0.14;

}
