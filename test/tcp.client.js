'use strict'

const sinon = require('sinon')
const { test } = require('brittle')
const { promiseSleep: sleep } = require('@bitfinex/lib-js-util-promise')

const { tcpServerFactory } = require('./helper')

const TcpClient = require('../src/tcp.client')

test('tcp.client tests', async (t) => {
  const host = '127.0.0.1'
  const port = 7070

  await t.test('open tests', async (t) => {
    const tcp = new TcpClient({ host, port, encoding: 'utf-8' })

    await t.exception(() => tcp.open(), 'should reject when server is not alive')

    const server = await tcpServerFactory({})

    t.teardown(async () => {
      tcp.end()
      server.close()
      await sleep(200)
    })

    await t.execution(() => tcp.open(), 'should resolve when server is alive')

    await t.exception(
      () => tcp.open(),
      /ERR_TCP_FULLY_OPEN/,
      'should reject when connection is fully open'
    )

    tcp._socket.end()
    t.is(tcp.isFullyOpen(), false)
    t.is(tcp.isAlive(), true)
    await t.execution(() => tcp.open(), 'should reopen connection when it is not fully open but alive')

    t.is(tcp.isFullyOpen(), true)
    t.is(tcp.isAlive(), true)
  })

  await t.test('write tests', async (t) => {
    const sandbox = sinon.createSandbox()
    let clientData = null

    const server = await tcpServerFactory({
      encoding: 'utf-8',
      cmdHandler: (socket, data) => {
        clientData = data
      }
    })

    const tcp = new TcpClient({ host, port, encoding: 'utf-8' })

    t.teardown(async () => {
      tcp.end()
      server.close()
      sandbox.restore()
      await sleep(200)
    })

    const spy = sandbox.spy(tcp, 'open')
    await t.execution(() => tcp.write('test'))
    await sleep(200)
    t.is(clientData, 'test')
    t.is(spy.callCount, 1, 'client should connect if it is not connected before on write')

    await t.execution(() => tcp.write('test 1'), 'client should not connect if connection is already open')
    await sleep(200)
    t.is(clientData, 'test 1')
    t.is(spy.callCount, 1, 'client should not reconnect if connection is open')

    tcp.end()
    await sleep(200)
    spy.resetHistory()

    await t.execution(tcp.write('test 2'), 'client should reopen connection before write')
    await sleep(200)
    t.is(clientData, 'test 2')
    t.is(spy.callCount, 1)
  })

  await t.test('read tests', async (t) => {
    await t.test('incorrect strategy and without data', async (t) => {
      const sandbox = sinon.createSandbox()
      const server = await tcpServerFactory({
        encoding: 'utf-8'
      })

      const tcp = new TcpClient({ host, port, encoding: 'utf-8' })

      t.teardown(async () => {
        await tcp.end()
        await server.close()
        await sandbox.restore()
        await sleep(500)
      })

      await t.exception(
        () => tcp.read({ strategy: 'all' }),
        /ERR_TCP_READ_STRATEGY_UNKOWN/,
        'client should fail when unknown read strategy is provided'
      )

      await t.exception(() => tcp.read({}), 'client should fail when connection is not opened')
      await t.exception(() => tcp.read(
        { strategy: TcpClient.TCP_READ_STRATEGY.ON_DATA }),
      'ON_DATA strategy should handle errors properly'
      )
      await t.exception(() => tcp.read(
        { strategy: TcpClient.TCP_READ_STRATEGY.ON_END }),
      'ON_END strategy should handle errors properly'
      )
    })
    await t.test('ON_DATA strategy', async (t) => {
      const sandbox = sinon.createSandbox()
      let serverSocket = null
      const server = await tcpServerFactory({
        encoding: 'utf-8',
        connectHandler: (socket) => {
          serverSocket = socket
        }
      })

      const tcp = new TcpClient({ host, port, encoding: 'utf-8' })
      await tcp.open()
      t.teardown(async () => {
        await tcp.end()
        await server.close()
        await sandbox.restore()
        await sleep(200)
      })
      const spy = sandbox.spy(tcp, 'open')
      serverSocket.write('test 1')
      const data = await tcp.read({ strategy: TcpClient.TCP_READ_STRATEGY.ON_DATA })
      t.is(data, 'test 1', 'reads data successfully on ON_DATA strategy')

      const batchData = []
      for (let i = 0; i < 3; i++) {
        serverSocket.write(i.toString())
        batchData.push(await tcp.read({ strategy: TcpClient.TCP_READ_STRATEGY.ON_DATA }))
      }
      t.alike(batchData, ['0', '1', '2'], 'should read data in order')
      t.is(spy.callCount, 0, 'should be able to read multiple data without closing connection on ON_DATA strategy')
    })

    await t.test('ON_END strategy', async (t) => {
      const sandbox = sinon.createSandbox()
      let serverSocket = null
      const server = await tcpServerFactory({
        encoding: 'utf-8',
        connectHandler: (socket) => {
          serverSocket = socket
        }
      })

      const tcp = new TcpClient({ host, port, encoding: 'utf-8' })
      await tcp.open()
      t.teardown(async () => {
        await tcp.end()
        server.close()
        sandbox.restore()
        await sleep(200)
      })
      const spy = sandbox.spy(tcp, 'open')
      serverSocket.write('test 1')
      await t.exception(
        () => tcp.read({ strategy: TcpClient.TCP_READ_STRATEGY.ON_END }),
        /ERR_TCP_READ_TIMEOUT/,
        'should fail to return response in ON_END strategy if end is not emitted on socket'
      )

      serverSocket.write('; test 2')
      serverSocket.write('; test 3')
      serverSocket.destroy()
      let data = await tcp.read({ strategy: TcpClient.TCP_READ_STRATEGY.ON_END })
      t.not(data, 'test 1; test 2; test 3', 'should discard old buffer on ON_END strategy')
      t.is(data, '; test 2; test 3', 'should return whole buffer data once end is emitted on ON_END strategy')

      let readPromise = tcp.read({ strategy: TcpClient.TCP_READ_STRATEGY.ON_END, timeout: 2000 })
      await sleep(500)
      serverSocket.write('spawn')
      await sleep(100)
      serverSocket.write(' from')
      await sleep(100)
      serverSocket.write(' dead')
      serverSocket.end()
      data = await readPromise
      t.is(data, 'spawn from dead')
      t.is(spy.callCount, 1, 'should re open connection once it is closed for ON_END strategy')

      spy.resetHistory()
      readPromise = tcp.read({ strategy: TcpClient.TCP_READ_STRATEGY.ON_DATA, timeout: 2000 })
      await sleep(500)
      serverSocket.write('spawn again from dead')
      data = await readPromise
      t.is(data, 'spawn again from dead')
      t.is(spy.callCount, 1, 'should re open connection once it is closed for ON_DATA strategy')
    })
  })

  await t.test('buffer tests', async (t) => {
    let clientData = null

    const server = await tcpServerFactory({
      cmdHandler: (socket, data) => {
        clientData = data
        const reply = Buffer.from('test reply', 'utf-8')
        socket.write(reply)
      }
    })

    const tcp = new TcpClient({ host, port })

    t.teardown(async () => {
      tcp.end()
      server.close()
      await sleep(200)
    })

    await t.execution(() => tcp.write(Buffer.from('test request', 'utf-8')))
    await sleep(200)
    const serverData = await tcp.read({ strategy: TcpClient.TCP_READ_STRATEGY.ON_DATA })
    t.ok(clientData instanceof Buffer)
    t.alike(clientData.toString('utf-8'), 'test request')
    t.ok(serverData instanceof Buffer)
    t.alike(serverData.toString('utf-8'), 'test reply')
  })
})
