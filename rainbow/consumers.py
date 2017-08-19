from channels import Group
import json


def ws_connect(message):
    message.reply_channel.send({"accept": True})
    # TODO: what if they reconnect during a game?
    print("Added to lobby")
    Group("lobby").add(message.reply_channel)


def ws_disconnect(message):
    # TODO: What if they disconnect during a game?
    Group("lobby").discard(message.reply_channel)


def ws_message(message):
    # TODO: Ensure it only goes to the correct people
    msg = {
        "text": message.content["text"]
    }

    print("Sending to group")

    Group("lobby").send({
        "text": json.dumps(msg),
    })
