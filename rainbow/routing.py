from channels.routing import route
from channels.staticfiles import StaticFilesConsumer
from rainbow.consumers import ws_connect, ws_disconnect, ws_message, chat_message, move_message

channel_routing = [
    route("http.request", StaticFilesConsumer()),
    route("chat-message", chat_message),
    route("move-message", move_message),
    route("websocket.connect", ws_connect, path=r'^/ws/(?P<id>.+)$'),
    route("websocket.disconnect", ws_disconnect),
    route("websocket.receive", ws_message),
]
