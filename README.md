# svc-facs-tcp

This facility implements a promise based tcp client and a simple tcp rpc client with support of different encodings.

## Config

This facility does not support config file but it's configured through these options:
- `host<string>` - server host
- `port<int>` - server port
- `encoding<string?>` - optional, encoding, e.g. `utf-8`
- `readStrategy<string?>` - optional, response read strategy, default: `TcpFacility.TCP_READ_STRATEGY.ON_DATA`
- `json<boolean?>` - optional, flag specifying that rpc requests/responses should be using json serialization, default: `false`
- `timeout<int?>` - optional, rpc response timeout, default: `500ms`
- `delay<int?>`- optional, delay between two rpc requests, default: `50ms`, useful when server closes connection on response

## API

### fac.rpc.request

Performs a TCP request and waits for response.

Params:
- `payload<string|JSON|Buffer>` - request payload

Response:
- `Promise<string|JSON|Buffer>` - response from server

Example:
```js
const res = await fac.rpc.request({ ping: 1 })
console.log(res) // { pong: 2 }
```

### fac.tcp.write

Sends data to tcp server

Params:
- `data<string|Buffer>` - data that will be sent to server

Reponse:
- `Promise<void>`

Example:
```js
await fac.tcp.write('{"ping":1}')
```

### fac.tcp.read

Waits and returns the data from the server

Params:
- `opts<Object>`
  - `strategy<int>` - read strategy, `1` (`TcpFacility.TCP_READ_STRATEGY.ON_DATA`) - on('data') event, `2` (`TcpFacility.TCP_READ_STRATEGY.ON_END`) - on('end') event
  - `timeout<int>` - response timeout

Response:
- `Promise<string|Buffer>`

Example:
```js
const res = await fac.tcp.read({ strategy: TcpFacility.TCP_READ_STRATEGY.ON_DATA })
console.log(res) // '{"pong":2}'
```
