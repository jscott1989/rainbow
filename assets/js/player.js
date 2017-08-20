const SMOOTHING_AMOUNT = 100;

class Player {
    constructor(game, sprites, myPlayer, easystar, x, y) {
        this.game = game;
        this.direction = "side";
        this.easystar = easystar;
        this.myPlayer = myPlayer;
        this.path = null;
        this.pathPointer = 0;
        this.sprite = game.add.sprite(x, y, 'guest-sprite');
        sprites.add(this.sprite);
        this.sprite.anchor.setTo(.5,1);
        this.sprite.animations.add('idle-side', [0], 1, true);
        this.sprite.animations.add('walk-side', [1,2,3,4,5,6], 6, true);
        this.sprite.animations.add('idle-up', [7], 1, true);
        this.sprite.animations.add('walk-up', [8,9,10,11,12,13], 6, true);
        this.sprite.animations.add('idle-down', [14], 1, true);
        this.sprite.animations.add('walk-down', [15,16,17,18,19,20], 6, true);
        this.sprite.animations.play('idle-side');
    }

    update() {
        if (this.chatText != null) {
            this.chatTextTimeout -= this.game.time.elapsed;
            if (this.chatTextTimeout <= 0) {
                this.chatText.destroy();
                this.chatText = null;
            } else {
                this.chatText.x = this.sprite.x;
                this.chatText.y = this.sprite.y - 64;
            }
        }

        if (this.path != null) {
            if (this.pathPointer < this.path.length) {
                var next = this.path[this.pathPointer];
                this.pathPointer += 1;

                var next_direction = this.direction;

                if (next.x < this.sprite.x) {
                    this.sprite.scale.x = -1;
                    next_direction = "side";
                } else if (next.x > this.sprite.x) {
                    this.sprite.scale.x = 1;
                    next_direction = "side";
                } else if (next.y < this.sprite.y) {
                    next_direction = "up";
                } else {
                    next_direction = "down";
                }

                if (next_direction != this.direction) {
                    // We're going to switch - to ensure we do it smoothly
                    // make sure we're not going to just switch back
                    var changeCount = 0;
                    var lpos = [next.x, next.y];
                    for (var i = this.pathPointer; i < this.pathPointer + SMOOTHING_AMOUNT && i < this.path.length; i++) {
                        var p = this.path[this.pathPointer];
                        if (p.x < lpos[0] || p.x > lpos[0]) {
                            // Side
                            if (next_direction == "side") {
                                changeCount += 1;
                            } else {
                                changeCount -= 1;
                            }
                        } else if (p.y < lpos[1]) {
                            // Up
                            if (next_direction == "up") {
                                changeCount += 1;
                            } else {
                                changeCount -= 1;
                            }
                        } else {
                            // Down
                            if (next_direction == "down") {
                                changeCount += 1;
                            } else {
                                changeCount -= 1;
                            }
                        }
                    }

                    if (changeCount > 0) {
                        this.direction = next_direction;
                    }
                }

                this.sprite.x = next.x;
                this.sprite.y = next.y;
                this.sprite.animations.play('walk-' + this.direction)
            } else {
                // Just finished
                if (this.myPlayer) {
                    // We're the main player
                    if (this.game.clickedItem != null) {
                        // We clicked an item
                        this.game.clickedItem.act();
                    }
                }
                this.path = null;
            }
        } else {
            this.sprite.animations.play('idle-' + this.direction)
        }
    }

    moveTo(x, y) {
        const self = this;
        this.easystar.findPath(this.sprite.x, this.sprite.y, x, y, function( path ) {
            if (path === null) {
                console.log("PATH NOT FOUND");
            } else {
                self.path = path;
                self.pathPointer = 0;
            }
        });
    }

    destroy() {
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