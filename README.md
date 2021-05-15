Run:

```shell


podman run -it --rm --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management

python3 -m virtualenv venv
. venv/bin/activate.fish
pip3 install "flask<2.0" flask-sockets gevent pika
python3 app.py

```