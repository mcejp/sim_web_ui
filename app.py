import logging
from dataclasses import dataclass
import os
from threading import Thread, Event

import gevent.queue
import pika
from flask import Flask, render_template, current_app, Blueprint
from flask_sockets import Sockets
from geventwebsocket.websocket import WebSocket

from message_bus import Subscription, MessageBus


@dataclass
class Message:
    body: bytes


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

html = Blueprint(r'html', __name__)
ws = Blueprint(r'ws', __name__)

pika_cancellation_event: Event = None


@html.route("/")
def index():
    return render_template("index.html")


@ws.route("/ws")
def ws_handler(socket: WebSocket):
    logger.info("Socket open")

    with Subscription(current_app.bus, queue_class=gevent.queue.Queue) as sub:
    # with Subscription(current_app.bus) as sub:
        while not socket.closed:
            # logger.info("await message")
            message = sub.await_message()
            # logger.info("Forward message")
            socket.send(message.body)
            # logger.info("Ok")

        logger.info("Socket closed")


def amqp_subscriber(*, bus, exchange_name, cancellation_event):
    while True:
        try:
            with pika.BlockingConnection(pika.ConnectionParameters("localhost")) as connection:
                channel = connection.channel()

                channel.exchange_declare(exchange=exchange_name,
                                        exchange_type="fanout")

                result = channel.queue_declare(queue="", exclusive=True)
                queue_name = result.method.queue

                channel.queue_bind(exchange=exchange_name, queue=queue_name)

                for method, properties, body in channel.consume(queue=queue_name):
                    if cancellation_event.is_set():
                        break

                    # logger.info("internal pub")
                    bus.publish(Message(body=body))
                    channel.basic_ack(method.delivery_tag)
        except Exception as e:
            logger.exception("AMQP error", e)

        time.sleep(1)


def create_app():
    app = Flask(__name__)
    sockets = Sockets(app)

    app.register_blueprint(html, url_prefix=r'/')
    sockets.register_blueprint(ws, url_prefix=r'/')

    app.config["exchange_name"] = os.getenv("EXCHANGE_NAME")

    app.bus = MessageBus()

    @app.before_first_request
    def reinit_thread():
        global pika_cancellation_event

        # Pika doesn't play well with gevent, so we shove it in a separate thread
        if pika_cancellation_event is not None:
            pika_cancellation_event.set()

        pika_cancellation_event = Event()
        thread = Thread(target=amqp_subscriber, kwargs=dict(bus=app.bus,
                                                            exchange_name=app.config["exchange_name"],
                                                            cancellation_event=pika_cancellation_event))
        thread.start()

    return app


def main():
    from gevent import pywsgi
    from geventwebsocket.handler import WebSocketHandler

    logger.info("Starting WSGI server on http://localhost:5000")
    server = pywsgi.WSGIServer(('', 5000), create_app(), handler_class=WebSocketHandler)
    server.serve_forever()


if __name__ == "__main__":
    main()
