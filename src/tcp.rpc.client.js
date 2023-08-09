'use strict'

const { promiseSleep } = require('@bitfinex/lib-js-util-promise')

const TaskQueue = require('./task.queue')
const TcpClient = require('./tcp.client')

class TcpRpcClient {
  /**
   * @param {object} opts
   * @param {TcpClient} opts.tcp
   * @param {object} [opts.tcpOpts]
   * @param {string} opts.tcpOpts.host
   * @param {number} opts.tcpOpts.port
   * @param {string} [opts.tcpOpts.encoding]
   * @param {number} [opts.readStrategy] - default TCP_READ_STRATEGY.ON_DATA
   * @param {boolean} [opts.json] - parse json
   * @param {number} [opts.timeout] - default 500ms
   * @param {number} [opts.delay] - delay between requests
   */
  constructor ({ tcp, tcpOpts, readStrategy = TcpClient.TCP_READ_STRATEGY.ON_DATA, json = true, timeout = 500, delay = 50 }) {
    if (!tcpOpts && !tcp) {
      throw new Error('ERR_TCP_OPTS_MISSING')
    }
    if (tcpOpts && tcp) {
      throw new Error('ERR_TCP_AND_TCP_OPTS_CONFLICT')
    }
    if (tcp && !(tcp instanceof TcpClient)) {
      throw new Error('ERR_TCP_OPT_INVALID_INSTANCE')
    }
    if (tcpOpts && typeof tcpOpts !== 'object') {
      throw new Error('ERR_TCP_OPTS_INVALID_TYPE')
    }

    this._tcp = tcp || new TcpClient(tcpOpts)
    this._conf = Object.freeze({ json, timeout, readStrategy, delay })
    this._queue = new TaskQueue(1)
  }

  async start () {
    if (!this._tcp.isFullyOpen()) {
      await this._tcp.open()
    }
  }

  async stop () {
    await this._tcp.end()
  }

  async request (payload) {
    const res = await this._queue.pushTask(async () => {
      // send request
      await this._tcp.write(this._conf.json ? JSON.stringify(payload) : payload)

      // accept response
      const respRaw = await this._tcp.read({
        strategy: this._conf.readStrategy,
        timeout: this._conf.timeout
      })
      await promiseSleep(this._conf.delay)

      // parse response
      return this._conf.json ? JSON.parse(respRaw) : respRaw
    })

    return res
  }
}

module.exports = TcpRpcClient
