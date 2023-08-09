'use strict'

const sinon = require('sinon')
const { test } = require('brittle')

const { promiseSleep: sleep } = require('@bitfinex/lib-js-util-promise')

const { tcpServerFactory } = require('./helper')

const TcpClient = require('../src/tcp.client')
const TcpRpcClient = require('../src/tcp.rpc.client')

test('tcp.rpc.client tests', async (t) => {
  const host = '127.0.0.1'
  const port = 7070

  await t.test('server close tests', async (t) => {
    const sandbox = sinon.createSandbox()
    const server = await tcpServerFactory({
      encoding: 'utf-8',
      cmdHandler: async (socket, data) => {
        const req = JSON.parse(data)
        const res = JSON.stringify({ pong: req.ping + 1 })
        await new Promise((resolve, reject) => {
          socket.write(res, (err) => err ? reject(err) : resolve())
        })
        socket.end()
      }
    })

    const rpcClient = new TcpRpcClient({
      tcpOpts: {
        host, port, encoding: 'utf-8'
      },
      readStrategy: TcpClient.TCP_READ_STRATEGY.ON_END,
      json: true
    })

    t.teardown(async () => {
      await rpcClient.stop()
      server.close()
      sandbox.restore()
      await sleep(200)
    })
    const spy = sandbox.spy(rpcClient._tcp, 'open')

    let res = await rpcClient.request({ ping: 1 })
    t.alike(res, { pong: 2 })
    t.is(spy.callCount, 1, 'should connect before request if it is not connected')

    spy.resetHistory()
    res = await rpcClient.request({ ping: 2 })
    t.alike(res, { pong: 3 })
    t.is(spy.callCount, 1, 'should re connect before request if it is disconnected')

    const batchData = []
    const requests = [{ ping: 2 }, { ping: 3 }, { ping: 4 }]
    const responses = [{ pong: 3 }, { pong: 4 }, { pong: 5 }]
    for (const req of requests) {
      batchData.push(await rpcClient.request(req))
    }
    t.alike(batchData, responses, 'should support batch serialized requests')

    const batchPromises = []
    for (const req of requests) {
      batchPromises.push(rpcClient.request(req))
    }
    t.alike(await Promise.all(batchPromises), responses, 'should support batch parallel requests')
  })

  await t.test('server keep alive tests', async (t) => {
    const sandbox = sinon.createSandbox()
    let serverSocket
    const server = await tcpServerFactory({
      encoding: 'utf-8',
      connectHandler: (socket) => {
        serverSocket = socket
      },
      cmdHandler: async (socket, data) => {
        const req = JSON.parse(data)
        const res = JSON.stringify({ pong: req.ping + 1 })
        await new Promise((resolve, reject) => {
          socket.write(res, (err) => err ? reject(err) : resolve())
        })
      }
    })

    const rpcClient = new TcpRpcClient({
      tcpOpts: {
        host, port, encoding: 'utf-8'
      },
      readStrategy: TcpClient.TCP_READ_STRATEGY.ON_DATA,
      json: true
    })

    t.teardown(async () => {
      await rpcClient.stop()
      server.close()
      sandbox.restore()
      await sleep(200)
    })
    const spy = sandbox.spy(rpcClient._tcp, 'open')

    let res = await rpcClient.request({ ping: 1 })
    t.alike(res, { pong: 2 })
    t.is(spy.callCount, 1, 'should connect before request if it is not connected')

    spy.resetHistory()
    res = await rpcClient.request({ ping: 2 })
    t.alike(res, { pong: 3 })
    t.is(spy.callCount, 0, 'should not re connect before request if it is still connected')

    serverSocket.end()
    await sleep(200)

    spy.resetHistory()
    res = await rpcClient.request({ ping: 2 })
    t.alike(res, { pong: 3 })
    t.is(spy.callCount, 1, 'should re connect before request if it is disconnected')

    const batchData = []
    const requests = [{ ping: 2 }, { ping: 3 }, { ping: 4 }]
    const responses = [{ pong: 3 }, { pong: 4 }, { pong: 5 }]
    for (const req of requests) {
      batchData.push(await rpcClient.request(req))
    }
    t.alike(batchData, responses, 'should support batch serialized requests')

    const batchPromises = []
    for (const req of requests) {
      batchPromises.push(rpcClient.request(req))
    }
    t.alike(await Promise.all(batchPromises), responses, 'should support batch parallel requests')
  })

  await t.test('buffer tests', async (t) => {
    let clientReq
    const server = await tcpServerFactory({
      cmdHandler: (socket, data) => {
        clientReq = data
        const clientRes = Buffer.from('reply', 'utf-8')
        socket.write(clientRes)
      }
    })

    const rpcClient = new TcpRpcClient({
      tcpOpts: { host, port },
      readStrategy: TcpClient.TCP_READ_STRATEGY.ON_DATA,
      json: false
    })

    t.teardown(async () => {
      await rpcClient.stop()
      server.close()
      await sleep(200)
    })

    const clientRes = await rpcClient.request(Buffer.from('request', 'utf-8'))
    t.ok(clientReq instanceof Buffer)
    t.alike(clientReq.toString('utf-8'), 'request')
    t.ok(clientRes instanceof Buffer)
    t.alike(clientRes.toString('utf-8'), 'reply')
  })
})
