# svc-facs-tcp

This facility implements a promise based tcp client and a simple tcp rpc client with support of different encodings.

## Config

This facility does not support config file and doesn't have any additional option beside default ones required by base facility.

## API

### fac.getClient

Initiates a tcp client instance for specific server.

Params:
- `host<string>` - server host
- `port<int>` - server port
- `encoding<string?>` - optional, encoding, e.g. `utf-8`

Result:
- `TcpClient`

Example:
```js
const tcp = fac.getClient({
  host: '127.0.0.1',
  port: 7070,
  encoding: 'utf-8'
})
```

### fac.getRPC

Initiates a RPC client instance for specific server.

Params:
- `tcp<TcpClient?>` - tcp client instance, use either `tcp` or `tcpOpts`
- `tcpOpts<object>` - new tcp client config
  - `host<string>` - server host
  - `port<int>` - server port
  - `encoding<string?>` - optional, encoding, e.g. `utf-8`
- `readStrategy<string?>` - optional, response read strategy, default: `TcpFacility.TCP_READ_STRATEGY.ON_DATA`
- `json<boolean?>` - optional, flag specifying that rpc requests/responses should be using json serialization, default: `false`
- `timeout<int?>` - optional, rpc response timeout, default: `500ms`
- `delay<int?>`- optional, delay between two rpc requests, default: `50ms`, useful when server closes connection on response

Result:
- `TcpRpcClient`

Example:
```js
const rpc1 = fac.getRPC({
  tcpOpts: {
    host: '127.0.0.1',
    port: 7070,
    encoding: 'utf-8'
  },
  readStrategy: TcpFacility.TCP_READ_STRATEGY.ON_DATA,
  json: true,
  timeout: 3000,
  delay: 50
})

// or with existing tcp client

const tcp2 = fac.getClient({
  host: '127.0.0.1',
  port: 7080,
  encoding: 'utf-8'
})
const rpc2 = fac.getRPC({
  tcp: tcp2,
  readStrategy: TcpFacility.TCP_READ_STRATEGY.ON_DATA,
  json: true,
  timeout: 3000,
  delay: 50
})
```

### rpc.request

Performs a TCP request and waits for response.

Params:
- `payload<string|JSON|Buffer>` - request payload

Result:
- `Promise<string|JSON|Buffer>` - response from server

Example:
```js
const rcp = fac.getRPC({ ... })
const res = await rpc.request({ ping: 1 })
console.log(res) // { pong: 2 }
```

### tcp.write

Sends data to tcp server

Params:
- `data<string|Buffer>` - data that will be sent to server

Reponse:
- `Promise<void>`

Example:
```js
const tcp = fac.getClient({ ... })
await tcp.write('{"ping":1}')
```

### tcp.read

Waits and returns the data from the server

Params:
- `opts<Object>`
  - `strategy<int>` - read strategy, `1` (`TcpFacility.TCP_READ_STRATEGY.ON_DATA`) - on('data') event, `2` (`TcpFacility.TCP_READ_STRATEGY.ON_END`) - on('end') event
  - `timeout<int>` - response timeout

Result:
- `Promise<string|Buffer>`

Example:
```js
const tcp = fac.getClient({ ... })
const res = await tcp.read({ strategy: TcpFacility.TCP_READ_STRATEGY.ON_DATA })
console.log(res) // '{"pong":2}'
```
