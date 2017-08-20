from channels import Channel, Group
from rainbow.models import Player
import json


def extract_id_from_path(path):
    return path[4:]


def chat_message(message):
    Group("lobby").send({
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
    message.reply_channel.send({"accept": True})

    player, created = Player.objects.get_or_create(
        player_id=id,
        defaults={
            "x": 279,
            "y": 310
        }
    )

    player.enabled = True
    player.save()

    print("Added to lobby")
    Group("lobby").add(message.reply_channel)
    Group("lobby").send({
        "text": json.dumps({
            "command": "add_player",
            "player": player.data()
        }),
    })

    for player in Player.objects.filter(enabled=True):
        if not player.player_id == id:
            message.reply_channel.send({
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

    Group("lobby").discard(message.reply_channel)

    Group("lobby").send({
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
        Channel("move-message").send({
            "player": {
                "id": player_id
            },
            "x": content["x"],
            "y": content["y"]
        })
        Group("lobby").send({
            "text": json.dumps({
                "command": "move",
                "player": {
                    "id": player_id
                },
                "x": content["x"],
                "y": content["y"]
            })
        })
