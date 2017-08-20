class Player {
    constructor(game) {
        this.game = game;
        this.tween = null;
        this.sprite = game.add.sprite(100, 100, 'guest-sprite');
        this.sprite.anchor.setTo(.5,.5);
        this.sprite.animations.add('idle', [1], 1, true);
        this.sprite.animations.add('walk', [2,3,4,5,6,7], 6, true);
        this.sprite.animations.play('idle');
    }

    moveTo(x, y) {
        var distance = Math.sqrt(Math.pow(this.sprite.x - x, 2) + Math.pow(this.sprite.y - y, 2));
        var time = distance * 10;

        if (x < this.sprite.x) {
            this.sprite.scale.x = -1;
        } else {
            this.sprite.scale.x = 1;
        }

        this.sprite.animations.play('walk');
        if (this.tween != null) {
            this.tween.stop();
        }
        this.tween = this.game.add.tween(this.sprite).to({ x: x, y: y }, time, Phaser.Easing.Linear.None, true, 0, 0, false)

        this.tween.onComplete.add(() => {
            this.sprite.animations.play('idle');
        });
    }
}

module.exports = Player;