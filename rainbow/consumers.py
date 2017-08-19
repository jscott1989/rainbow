from channels import Group


def ws_connect(message):
    message.reply_channel.send({"accept": True})
    # TODO: what if they reconnect during a game?
    Group("lobby").add(message.reply_channel)


def ws_disconnect(message):
    # TODO: What if they disconnect during a game?
    Group("lobby").discard(message.reply_channel)


def ws_message(message):
    # TODO: Ensure it only goes to the correct people
    Group("lobby").send({
        "text": "[user] %s" % message.content['text'],
    })
