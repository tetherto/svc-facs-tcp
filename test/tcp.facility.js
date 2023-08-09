'use strict'

const sinon = require('sinon')
const { test } = require('brittle')

const { promiseSleep: sleep } = require('@bitfinex/lib-js-util-promise')

const { tcpServerFactory } = require('./helper')

const TcpFacility = require('../index')
const TcpClient = require('../src/tcp.client')
const TcpRpcClient = require('../src/tcp.rpc.client')
const { pick } = require('../src/utils')

test('tcp.rpc.client tests', async (t) => {
  const facCaller = {}
  const facOpts = {
    ns: 'm0',
    host: '127.0.0.1',
    port: 7070,
    encoding: 'utf-8',
    readStrategy: TcpFacility.TCP_READ_STRATEGY.ON_DATA,
    json: true,
    timeout: 3000,
    delay: 50
  }
  const facCtx = { env: 'test' }

  const sandbox = sinon.createSandbox()
  const server = await tcpServerFactory({
    host: facOpts.host,
    port: facOpts.port,
    encoding: facOpts.encoding,
    cmdHandler: async (socket, data) => {
      const req = JSON.parse(data)
      const res = JSON.stringify({ pong: req.ping + 1 })
      await new Promise((resolve, reject) => {
        socket.write(res, (err) => err ? reject(err) : resolve())
      })
      socket.end()
    }
  })

  t.teardown(async () => {
    server.close()
    sandbox.restore()
  })

  await t.test('start tests', async (t) => {
    const fac = new TcpFacility(facCaller, facOpts, facCtx)

    await new Promise((resolve, reject) => {
      fac.start((err) => err ? reject(err) : resolve())
    })

    t.teardown(async () => {
      await new Promise((resolve, reject) => {
        fac.stop((err) => err ? reject(err) : resolve())
      })
      await sleep(200)
    })

    t.ok(fac.tcp instanceof TcpClient)
    t.alike(fac.tcp._conf, pick(facOpts, ['host', 'port', 'encoding']))
    t.ok(fac.rpc instanceof TcpRpcClient)
    t.alike(fac.rpc._conf, pick(facOpts, ['json', 'timeout', 'readStrategy', 'delay']))
    t.ok(fac.tcp.isFullyOpen())
  })

  await t.test('stop tests', async (t) => {
    const fac = new TcpFacility(facCaller, facOpts, facCtx)

    await new Promise((resolve, reject) => {
      fac.start((err) => err ? reject(err) : resolve())
    })

    t.ok(fac.tcp.isFullyOpen())

    await new Promise((resolve, reject) => {
      fac.stop((err) => err ? reject(err) : resolve())
    })
    await sleep(200)

    t.ok(fac.tcp.isFullyOpen() === false)
    t.ok(fac.tcp.isAlive() === false)
  })

  await t.test('tcp tests', async (t) => {
    const fac = new TcpFacility(facCaller, facOpts, facCtx)

    await new Promise((resolve, reject) => {
      fac.start((err) => err ? reject(err) : resolve())
    })

    t.teardown(async () => {
      await new Promise((resolve, reject) => {
        fac.stop((err) => err ? reject(err) : resolve())
      })
      await sleep(200)
    })

    await fac.tcp.write(JSON.stringify({ ping: 1 }))
    const res = await fac.tcp.read({ strategy: TcpFacility.TCP_READ_STRATEGY.ON_END, timeout: facOpts.timeout })
    t.alike(JSON.parse(res), { pong: 2 })
  })

  await t.test('rpc tests', async (t) => {
    const fac = new TcpFacility(facCaller, facOpts, facCtx)

    await new Promise((resolve, reject) => {
      fac.start((err) => err ? reject(err) : resolve())
    })

    t.teardown(async () => {
      await new Promise((resolve, reject) => {
        fac.stop((err) => err ? reject(err) : resolve())
      })
      await sleep(200)
    })

    const res = await fac.rpc.request({ ping: 1 })
    t.alike(res, { pong: 2 })
  })
})
