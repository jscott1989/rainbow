class Player {
    constructor(game, x, y) {
        this.game = game;
        this.tween = null;
        this.sprite = game.add.sprite(x, y, 'guest-sprite');
        this.sprite.anchor.setTo(.5,.5);
        this.sprite.animations.add('idle', [1], 1, true);
        this.sprite.animations.add('walk', [2,3,4,5,6,7], 6, true);
        this.sprite.animations.play('idle');
    }

    update() {
        if (this.chatText != null) {
            this.chatTextTimeout -= this.game.time.elapsed;
            if (this.chatTextTimeout <= 0) {
                this.chatText.destroy();
                this.chatText = null;
            } else {
                this.chatText.x = this.sprite.x;
                this.chatText.y = this.sprite.y - 30;
            }
        }
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

    destroy() {
        console.log("Destroying ", this.sprite);
        this.sprite.destroy();
    }

    chat(text) {
        if (this.chatText != null) {
            this.chatText.destroy();
        }

        this.chatText = this.game.add.text(
            this.sprite.x,
            this.sprite.y - 30, text, {
                font: "18px Press Start 2P",
                fill: "#ffffff",
                align: "center"
            });
        this.chatText.anchor.setTo(0.5);
        this.chatTextTimeout = 3000;
    }
}

module.exports = Player;