from channels.routing import route
from channels.staticfiles import StaticFilesConsumer
from rainbow.consumers import ws_connect, ws_disconnect, ws_message

channel_routing = [
    route("http.request", StaticFilesConsumer()),
    route("websocket.connect", ws_connect),
    route("websocket.disconnect", ws_disconnect),
    route("websocket.receive", ws_message),
]
