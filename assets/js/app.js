import Player from "./player";
import Character from "./character";

const ROOMS = ["lobby", "room1"];
const ITEMS = ["thing", "thing2"];

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
var characters = {};
var easystar = new EasyStar.js();
var sprites;
var items;
var hotspots;
var items_by_key;
var hotspots_by_key;
var roomLoaded = false;
var worldState;

var game = new Phaser.Game(
    800, 600,
    Phaser.CANVAS,
    "game", 
    { preload: preload, create: create, update: update, render: render }
);

game.hoveredItem = null;
game.clickedItem = null;
game.usedItem = null;

game.talk = (text) => {
    webSocketBridge.send({command: 'chat', text: text});
}

function preload() {
    game.stage.disableVisibilityChange = true;

    ROOMS.forEach((room) => {
        game.load.image(room + '-background', 'static/img/rooms/' + room + '/background.png');
        game.load.image(room + '-foreground', 'static/img/rooms/' + room + '/foreground.png');
        game.load.image(room + '-mask',       'static/img/rooms/' + room + '/mask.png');
    });

    ITEMS.forEach((item) => {
        game.load.image('item-' + item, 'static/img/items/' + item + '.png');
    });

    game.load.spritesheet('guest-sprite', 'static/img/guest-sprite.png', 32, 64);
}



// Room properties
var map;

function loadRoom(room) {
    // TODO: Probably have to clear the previous room if we're entering a new one

    // TODO: Allow variable background sizes
    const BG_WIDTH = 2734;
    const BG_HEIGHT = 600;

    game.world.setBounds(0, 0, BG_WIDTH, BG_HEIGHT);

    var bmd = game.make.bitmapData(BG_WIDTH, BG_HEIGHT);
    bmd.draw(game.cache.getImage(room.name + '-mask'), 0, 0);
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

    var background = game.add.tileSprite(0, 0, BG_WIDTH, BG_HEIGHT, room.name + '-background');

    hotspots = game.add.group();
    items = game.add.group();
    items_by_key = {};
    hotspots_by_key = {};
    sprites = game.add.group();

    game.add.tileSprite(0, 0, BG_WIDTH, BG_HEIGHT, room.name + '-foreground');


    // Load items
    for (var key in room.state.items) {
        var item = room.state.items[key];
        item.id = key;
        createItem(item);
    }
    for (var key in room.state.hotspots) {
        var hotspot = room.state.hotspots[key];
        hotspot.id = key;
        createHotspot(hotspot);
    }
    for (var key in room.state.characters) {
        var character = room.state.characters[key];
        character.id = key;
        createCharacter(character);
    }

    roomLoaded = true;
}

function createItem(item) {
    const ITEM_WIDTH = 32;
    const ITEM_HEIGHT = 32;
    var itemSprite = game.add.tileSprite(item.x, item.y, ITEM_WIDTH, ITEM_HEIGHT, 'item-' + item.type);
    itemSprite.anchor.setTo(.5,1);
    itemSprite.inputEnabled = true;
    
    itemSprite.events.onInputOver.add(() => {
        game.hoveredItem = {
            "type": "item",
            "item": item,
            "sprite": itemSprite,
            "act": () => {
                if (item.holdable) {
                    webSocketBridge.send({command: 'pick_up_item', item: item.id});
                    addToInventory(players[id], item)
                }
            }
        };
        game.updateCursor();
    });

    itemSprite.events.onInputOut.add(() => {
        if (game.hoveredItem != null && game.hoveredItem.item == item) {
            game.hoveredItem = null;
        }
        game.updateCursor();
    });

    items.add(itemSprite);
    items_by_key[item.id] = {"item": item, "sprite": itemSprite};
}

function createHotspot(hotspot) {
    var bmd = game.add.bitmapData(hotspot.w,hotspot.h);

    // Debug draw
    // bmd.ctx.beginPath();
    // bmd.ctx.rect(0,0,hotspot.w,hotspot.h);
    // bmd.ctx.fillStyle = '#ff0000';
    // bmd.ctx.fill();

    var hotspotSprite = game.add.sprite(hotspot.x, hotspot.y, bmd);

    if (hotspot.enter == "top") {
        hotspotSprite.anchor.setTo(.5,0);
    } else {
        hotspotSprite.anchor.setTo(.5,1);
    }


    hotspotSprite.inputEnabled = true;


    hotspotSprite.events.onInputOver.add(() => {
        game.hoveredItem = {
            "type": hotspot,
            "item": hotspot,
            "sprite": hotspotSprite,
            "act": () => {
                if (hotspot.type == "door") {
                    roomLoaded = false;
                    webSocketBridge.send({command: 'go_to_room', room: hotspot.target, x: hotspot.target_x, y: hotspot.target_y});
                }
            }
        };
        game.updateCursor();
    });

    hotspotSprite.events.onInputOut.add(() => {
        if (game.hoveredItem != null && game.hoveredItem.item == hotspot) {
            game.hoveredItem = null;
        }
        game.updateCursor();
    });

    hotspots.add(hotspotSprite);
    hotspots_by_key[hotspot.id] = {"item": hotspot, "sprite": hotspotSprite};
}

function createCharacter(character) {
    console.log("Create character ", character);
    characters[character.id] = new Character(game, sprites, easystar, character.x, character.y, character.dialogue, character.color);
}

function create() {
    setupKeyBindings();

    // Create connection to server
    webSocketBridge.connect('/ws/' + id);
    webSocketBridge.listen((action) => {
        if (action.command == "chat" && roomLoaded) {
            players[action.player.id].chat(action.text);
        } else if (action.command == "add_player" && roomLoaded) {
            if (players[action.player.id] != null) {
                players[action.player.id].destroy();
            }
            players[action.player.id] = new Player(action.player.id, game, sprites, (action.player.id == id), easystar, action.player.x, action.player.y, action.player.state, action.player.color);

            if (action.player.id == id) {
                game.camera.follow(players[action.player.id].sprite);
                refreshInventory(players[action.player.id]);
            }
        } else if (action.command == "remove_player" && roomLoaded) {
            players[action.player.id].destroy();
            delete players[action.player.id];
        } else if (action.command == "remove_item" && roomLoaded) {
            items_by_key[action.item].sprite.destroy();
            delete items_by_key[action.item];
            if (game.hoveredItem.item.id == action.item) {
                game.hoveredItem = null;
            }
        } else if (action.command == "move" && roomLoaded) {
            players[action.player.id].moveTo(action.x, action.y);
        } else if (action.command == "load_room") {
            loadRoom(action.room);
        } else if (action.command == "set_world_state") {
            worldState = action.state;
        } else if (action.command == "remove_item_from_inventory") {
            removeFromInventory(players[id], action.item);
        } else if (action.command == "add_item_to_inventory") {
            addToInventory(players[id], action.item);
        }
    });


    game.input.onDown.add((pointer) => {

        var x = game.input.x + game.camera.x;
        var y = game.input.y + game.camera.y;
        game.clickedItem = null;
        game.usedItem = null;

        if (pointer.button == Phaser.Mouse.RIGHT_BUTTON && selectedItem != null) {
            // Deselect
            deselectItem();
            return;
        }


        if (game.hoveredItem != null) {
            if (pointer.button == Phaser.Mouse.RIGHT_BUTTON) {
                // We're looking at something
                webSocketBridge.send({command: 'move', x: players[id].sprite.x, y: players[id].sprite.y})
                game.talk(game.hoveredItem.item.look_at);

                return;
            } else {
                // Just moving
                // We will walk over to the item and then activate it.
                // for now we assume the point where we want to walk is the bottom centre
                // of the item

                if (game.hoveredItem.type == "player" || game.hoveredItem.type == "character") {
                    x = game.hoveredItem.item.sprite.x;
                    y = game.hoveredItem.item.sprite.y;
                } else {
                    x = game.hoveredItem.item.x;
                    y = game.hoveredItem.item.y;
                }
                var currentPosition = [players[id].sprite.x, players[id].sprite.y];
                var targetPosition = [x, y];
                var possibleCoordinates = calcStraightLine(targetPosition, currentPosition);

                var index = Math.min(possibleCoordinates.length - 1, 20);
                for (var c = index; c >= 0; c--) {
                    var coordinate = possibleCoordinates[c]
                    if (map[coordinate[1]][coordinate[0]] > 0) {
                        // Can use this one
                        x = coordinate[0];
                        y = coordinate[1];
                        break;
                    }
                }

                game.clickedItem = game.hoveredItem;

                if (selectedItem != null) {
                    game.usedItem = selectedItem;
                }
            }
        }
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

    easystar.calculate();
}

function render() {

    // game.debug.cameraInfo(game.camera, 32, 32);
    // game.debug.spriteCoords(players[id], 32, 500);

}

game.updateCursor = () => {
    if (game.hoveredItem == null) {
        game.canvas.style.cursor = "default";
    } else {
        game.canvas.style.cursor = "pointer";
    }
}

var inventory_list = $("#inventory ul");

function refreshInventory(player) {
    inventory_list.html("");
    Object.keys(player.state.items).forEach((key) => {
        inventory_list.append($("<li data-item-id=\"" + player.state.items[key].id + "\"><img src=\"/static/img/items/" + player.state.items[key].type + "-inventory.png\"></li>"));
    });
}

function addToInventory(player, item) {
    player.state.items[item.id] = item;
    refreshInventory(player);
}

function removeFromInventory(player, item) {
    if (selectedItem.item_id == item) {
        deselectItem();
    }
    delete player.state.items[item];
    refreshInventory(player);
}

$("#chat-overlay form").submit((e) => {
    const text = $("#chat-overlay input").val();

    game.talk(text);

    $("#chat-overlay input").val("");
    e.preventDefault();

    setupKeyBindings();
    $("#chat-overlay").hide();
});


$("body").on("mousedown", "#inventory li",  (evt) => {
    var $li = $(evt.target).parent();
    var li = $li[0]

    if (inDialogueWith != null) {
        // We're in a discussion, we can only talk about this object
        if (evt.which == 3) {
            return;
        }

        dialogueSay($li.data('item-id'));

        return;
    }

    if (evt.which == 3) {
        // Right mouse button, just looking
        game.talk(players[id].state.items[$li.data('item-id')].look_at);
        return;
    }
    
    // First , we care if we have something selected already
    if (selectedItem != null) {
        if (selectedItem.item_id == $li.data('item-id')) {
            // If they are the same item, just release it
            $li.removeClass("selected");
            selectedItem.hover_img.remove();
            selectedItem = null;
        } else {
            // Otherwise try to use them together
            useTogetherInInventory(selectedItem.item_id, $li.data('item-id'));
        }
    } else {
        // Otherwise, just select it
        selectedItem = {
            "item_id": $li.data('item-id'),
            "inventory_li": $li,
            "hover_img": $("<img id=\"hover_img\" src=\"" + $li.find("img").attr("src") + "\">")
        };
        selectedItem.inventory_li.addClass("selected");
        $("body").append(selectedItem.hover_img);
        selectedItem.hover_img.css({left: mouseX + 10, top: mouseY});
    }
});

var mouseX = 0;
var mouseY = 0;

$("body").on("mousemove", (evt) => {
    mouseX = evt.pageX;
    mouseY = evt.pageY;

    if (selectedItem != null) {
        selectedItem.hover_img.css({left: mouseX + 10, top: mouseY});
    }
});

$("body").on("contextmenu", (e) => {
    e.preventDefault();
});

game.useItem = (item1, item2) => {
    // item1 is inventory
    // item2 is in the world

    if (item2.type == "player") {
        if (item2.item.id == id) {
            // Giving to myself
            game.talk("What am I supposed to do?");
            return;
        }
        // Giving them the item
        webSocketBridge.send({command: 'give_item', item: item1.item_id, player: item2.item.id});
    } else {
        // TODO: implement a reaction
        game.talk("I don't think that will work.");
    }
}

function useTogetherInInventory(item1, item2) {
    var i1 = players[id].state.items[item1];
    var i2 = players[id].state.items[item2];
    console.log("using ", i1, " with ", i2);
    // TODO: Implement a reaction
    game.talk("I don't think that will work.");
}

var selectedItem;


$("#menu").on("click", (e) => {
    // TODO: Check that we're not clicking on an item, if we're not
    // and e.which == 3 - then deselect the item
});

var inDialogueWith;

game.beginDialogue = (character) => {
    inDialogueWith = character;
    $("#dialogue").show();
}

function deselectItem() {
    selectedItem.hover_img.remove();
    selectedItem.inventory_li.removeClass("selected");
    selectedItem = null;
}

function dialogueSay(option) {
    webSocketBridge.send({command: 'dialogue', option: option, character: inDialogueWith});
}

$("body").on("mousedown", "#dialogue .option", (el) => {
    dialogueSay($(el.target).data('option-id'));
});