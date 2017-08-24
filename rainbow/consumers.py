from channels import Channel, Group
from rainbow.models import Player, Room, World
import json

colors = [
    "#FFFF00", "#1CE6FF", "#FF34FF", "#FF4A46", "#008941", "#006FA6", "#A30059",
    "#FFDBE5", "#7A4900", "#0000A6", "#63FFAC", "#B79762", "#004D43", "#8FB0FF", "#997D87",
    "#5A0007", "#809693", "#FEFFE6", "#1B4400", "#4FC601", "#3B5DFF", "#4A3B53", "#FF2F80",
    "#61615A", "#BA0900", "#6B7900", "#00C2A0", "#FFAA92", "#FF90C9", "#B903AA", "#D16100",
    "#DDEFFF", "#000035", "#7B4F4B", "#A1C299", "#300018", "#0AA6D8", "#013349", "#00846F",
    "#372101", "#FFB500", "#C2FFED", "#A079BF", "#CC0744", "#C0B9B2", "#C2FF99", "#001E09",
    "#00489C", "#6F0062", "#0CBD66", "#EEC3FF", "#456D75", "#B77B68", "#7A87A1", "#788D66",
    "#885578", "#FAD09F", "#FF8A9A", "#D157A0", "#BEC459", "#456648", "#0086ED", "#886F4C",

    "#34362D", "#B4A8BD", "#00A6AA", "#452C2C", "#636375", "#A3C8C9", "#FF913F", "#938A81",
    "#575329", "#00FECF", "#B05B6F", "#8CD0FF", "#3B9700", "#04F757", "#C8A1A1", "#1E6E00",
    "#7900D7", "#A77500", "#6367A9", "#A05837", "#6B002C", "#772600", "#D790FF", "#9B9700",
    "#549E79", "#FFF69F", "#201625", "#72418F", "#BC23FF", "#99ADC0", "#3A2465", "#922329",
    "#5B4534", "#FDE8DC", "#404E55", "#0089A3", "#CB7E98", "#A4E804", "#324E72", "#6A3A4C",
    "#83AB58", "#001C1E", "#D1F7CE", "#004B28", "#C8D0F6", "#A3A489", "#806C66", "#222800",
    "#BF5650", "#E83000", "#66796D", "#DA007C", "#FF1A59", "#8ADBB4", "#1E0200", "#5B4E51",
    "#C895C5", "#320033", "#FF6832", "#66E1D3", "#CFCDAC", "#D0AC94", "#7ED379", "#012C58"
]
color_index = 0


def get_world():
    world, created = World.objects.get_or_create(id=1, defaults={
            "state": {}
    })
    return world


def extract_id_from_path(path):
    return path[4:]


def chat_message(message):
    player = Player.objects.get(player_id=message["player"]["id"])
    Group(player.room.name).send({
        "text": json.dumps({
            "command": "chat",
            "player": message["player"],
            "text": message["text"]
        })
    })


def move_message(message):
    player = Player.objects.get(player_id=message["player"]["id"])
    player.x = message["x"]
    player.y = message["y"]
    player.save()


def ws_connect(message, id):
    global color_index
    message.reply_channel.send({"accept": True})

    player, created = Player.objects.get_or_create(
        player_id=id,
        defaults={
            "x": 279,
            "y": 310,
            "color": "#ffffff",
            "state": {"items": {}, "name": "Test Player"}
        }
    )

    if created:
        player.color = colors[color_index]
        color_index += 1
        player.room = Room.objects.get(name="lobby")
    player.enabled = True
    player.save()

    print("Added to " + player.room.name)
    Group(player.room.name).send({
        "text": json.dumps({
            "command": "add_player",
            "player": player.data()
        }),
    })

    message.reply_channel.send({
        "text": json.dumps({
            "command": "set_world_state",
            "state": get_world().state
        })
    })

    Group("all").add(message.reply_channel)
    Group(player.player_id).add(message.reply_channel)
    Group(player.room.name).add(message.reply_channel)
    welcome_to_room(player.room, message.reply_channel)


def welcome_to_room(room, channel):
    channel.send({
        "text": json.dumps({
            "command": "load_room",
            "room": room.data()
        }),
    })

    for player in room.player_set.filter(enabled=True):
        channel.send({
            "text": json.dumps({
                "command": "add_player",
                "player": player.data()
            }),
        })

def ws_disconnect(message):

    player_id = extract_id_from_path(message.content["path"])
    player = Player.objects.get(player_id=player_id)
    player.enabled = False
    player.save()

    Group(player.room.name).discard(message.reply_channel)

    Group(player.room.name).send({
        "text": json.dumps({
            "command": "remove_player",
            "player": {
                "id": player_id
            }
        }),
    })


def ws_message(message):
    player_id = extract_id_from_path(message.content["path"])

    content = json.loads(message.content["text"])
    print(content)

    if content["command"] == "chat":
        Channel("chat-message").send({
            "player": {
                "id": player_id
            },
            "text": content["text"]
        })
    elif content["command"] == "move":
        player = Player.objects.get(player_id=player_id)
        Channel("move-message").send({
            "player": {
                "id": player_id
            },
            "x": content["x"],
            "y": content["y"]
        })
        Group(player.room.name).send({
            "text": json.dumps({
                "command": "move",
                "player": {
                    "id": player_id
                },
                "x": content["x"],
                "y": content["y"]
            })
        })
    elif content["command"] == "go_to_room":
        player = Player.objects.get(player_id=player_id)

        # Remove from current room
        Group(player.room.name).send({
            "text": json.dumps({
                "command": "remove_player",
                "player": {
                    "id": player_id
                }
            }),
        })

        # Load new room
        room = Room.objects.get(name=content["room"])
        player.x = content["x"]
        player.y = content["y"]
        player.room = room
        player.save()

        Group(player.room.name).send({
            "text": json.dumps({
                "command": "add_player",
                "player": player.data()
            }),
        })

        Group(player.room.name).add(message.reply_channel)
        welcome_to_room(room, message.reply_channel)
    elif content["command"] == "pick_up_item":
        player = Player.objects.get(player_id=player_id)
        item = player.room.state["items"][content["item"]]
        item["id"] = content["item"]

        # First, remove the item from the room
        del player.room.state["items"][content["item"]]
        player.room.save()
        Group(player.room.name).send({
            "text": json.dumps({
                "command": "remove_item",
                "item": content["item"]
            }),
        })

        # Then put the item in the player's inventory
        player.add_item(item)
        player.save()
    elif content["command"] == "dialogue":
        player = Player.objects.get(player_id=player_id)
        # Update the character according to the dialogue
        if content["option"] not in player.room.state["characters"][content["character"]]["dialogue"]:
            Group(player.room.name).send({
                "text": json.dumps({
                    "command": "dialogue",
                    "player":  {
                        "id": player_id
                    },
                    "character": content["character"],
                    "option": "default"
                })
            })
            return
        option = player.room.state["characters"][content["character"]]["dialogue"][content["option"]]

        for s in option.get("sets", []):
            # Set variables and communicate them to the game
            new_value = True
            if s.startswith("!"):
                new_value = False
                s = s[1:]
            if s.startswith("."):
                # Setting player state
                s = s[1:]
                player.state[s] = new_value
                player.save()
                message.reply_channel.send({
                    "text": json.dumps({
                        "command": "set_state",
                        "state": player.state
                    })
                })
            else:
                # Setting world state
                world = get_world()
                world.state[s] = new_value
                world.save()
                Group("all").send({
                    "text": json.dumps({
                        "command": "set_world_state",
                        "state": world.state
                    })
                })

        # Tell everyone in the room about the dialogue
        # TODO: For some reason this sometimes doesn't work :/
        Group(player.room.name).send({
            "text": json.dumps({
                "command": "dialogue",
                "player":  {
                    "id": player_id
                },
                "character": content["character"],
                "option": content["option"]
            })
        })
    elif content["command"] == "give_item":
        player = Player.objects.get(player_id=player_id)
        other_player = Player.objects.get(player_id=content["player"])

        # Place item on other_player
        other_player.state["items"][content["item"]] = player.state["items"][content["item"]]
        other_player.save()
        del player.state["items"][content["item"]]
        player.save()

        Group(player.player_id).send({
            "text": json.dumps({
                "command": "remove_item_from_inventory",
                "item": content["item"]
            })
        })

        Group(other_player.player_id).send({
            "text": json.dumps({
                "command": "add_item_to_inventory",
                "item": other_player.state["items"][content["item"]]
            })
        })
