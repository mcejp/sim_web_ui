Transport: RabbitMQ / WebSocket

Encoding format: CBOR

Payload tree:

```
(root): dict
|-- objects: array
    |-- (entry): dict
        |-- topic: string
        |-- name: string     (deprecated alias for `topic`)
        |-- displayName: string
        |-- mimeType: string -> image/* text/plain application/json <custom type>
        |-- data: bytes
|-- controls: array
    |-- (entry): dict
        |-- name: string
        |-- displayName: string
```
