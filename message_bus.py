from queue import Queue
from threading import Lock
from typing import List, Optional


class Subscription:
    _bus: "MessageBus"
    _queue: Queue

    # Class can be also gevent.queue.Queue
    def __init__(self, bus: "MessageBus", queue_class=Queue):
        self._bus = bus
        self._queue = queue_class()

    def __enter__(self):
        self._bus._subscribe_queue(self._queue)
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self._bus._unsubscribe_queue(self._queue)

    def await_message(self):
        # WTF!
        while True:
            # print("try")
            try:
                a = self._queue.get(True, 1.0)
                # print("got", type(a))
                return a
            except:
                # print("fail")
                pass
        # return self._queue.get()


# Asynchronous (fire-and-forget) message bus which retains the last message and re-plays it to new subscribers
class MessageBus:
    _subscriptions: List[Queue]
    _subscriptions_lock: Lock

    _last_message: Optional[object]

    def __init__(self):
        self._subscriptions = []
        self._subscriptions_lock = Lock()

        self._last_message = None

    def _subscribe_queue(self, queue) -> None:
        with self._subscriptions_lock:
            self._subscriptions.append(queue)

        # Repeat last message to subscriber
        message = self._last_message

        if message is not None:
            queue.put(message)

    def _unsubscribe_queue(self, queue: Queue) -> None:
        with self._subscriptions_lock:
            self._subscriptions.remove(queue)

    def publish(self, message):
        with self._subscriptions_lock:
            for queue in self._subscriptions:
                queue.put(message)

        self._last_message = message
