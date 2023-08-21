'use strict'

const net = require('net')
const { promiseTimeout, promiseFlat } = require('@bitfinex/lib-js-util-promise')

const TCP_READ_STRATEGY = Object.freeze({
  ON_DATA: 1,
  ON_END: 2
})

class TcpClient {
  /**
   * @param {object} opts
   * @param {string} opts.host
   * @param {number} opts.port
   * @param {string} [opts.encoding]
   */
  constructor ({ host, port, encoding = null }) {
    if (!host || typeof host !== 'string') {
      throw new Error('ERR_TCP_OPTS_HOST_INVALID')
    }
    if (!port || !Number.isInteger(port) || port < 1) {
      throw new Error('ERR_TCP_OPTS_PORT_INVALID')
    }
    if (encoding && typeof encoding !== 'string') {
      throw new Error('ERR_TCP_OPTS_ENCODING_INVALID')
    }

    this._conf = Object.freeze({ host, port, encoding })
  }

  isAlive () {
    return this._socket && !this._socket.closed && !this._socket.destroyed
  }

  isFullyOpen () {
    return this.isAlive() && this._socket.writable && this._socket.readable
  }

  async open () {
    if (this.isFullyOpen()) {
      throw new Error('ERR_TCP_FULLY_OPEN')
    }

    if (this.isAlive()) {
      await this.end()
    }

    this._socket = new net.Socket()
    if (this._conf.encoding) {
      this._socket.setEncoding(this._conf.encoding)
    }

    await new Promise((resolve, reject) => {
      this._socket.connect(this._conf.port, this._conf.host, resolve)
      this._socket.once('error', reject)
    })
  }

  async end () {
    await new Promise((resolve) => this._socket.end(resolve))
  }

  destroy () {
    this._socket.destroy()
    this._socket = null
  }

  /**
   * @param {string|Buffer} data
   */
  async write (data) {
    if (!this.isAlive() || !this._socket.writable) {
      await this.open()
    }

    if (!this._socket.writable) {
      throw new Error('ERR_TCP_SOCKET_NOT_WRITABLE')
    }

    const { promise, resolve, reject } = promiseFlat()
    const errHandler = (err) => reject(err)

    try {
      this._socket.once('error', errHandler)
      this._socket.write(data, this._conf.encoding, (err) => {
        return err ? reject(err) : resolve()
      })
      await promise
    } finally {
      this._socket.removeListener('error', errHandler)
    }
  }

  /**
   * @param {object} opts
   * @param {number} [opts.strategy] - default TCP_READ_STRATEGY.ON_DATA
   * @param {number} [opts.timeout] - default 500ms
   *
   * @returns {Promise<string|Buffer>}
   */
  async read ({ strategy = TCP_READ_STRATEGY.ON_DATA, timeout = 500 }) {
    if (!this.isAlive() || !this._socket.readable) {
      await this.open()
    }

    switch (strategy) {
      case TCP_READ_STRATEGY.ON_DATA: return this._readData(timeout)
      case TCP_READ_STRATEGY.ON_END: return this._readEnd(timeout)
      default: throw new Error('ERR_TCP_READ_STRATEGY_UNKOWN')
    }
  }

  /**
   * @param {number} opts.timeout
   * @returns {Promise<string|Buffer>}
   */
  async _readData (timeout) {
    const { promise, resolve, reject } = promiseFlat()

    const dataHandler = (data) => resolve(data)
    const errHandler = (err) => reject(err)

    try {
      this._socket.once('data', dataHandler)
      this._socket.once('error', errHandler)

      const res = await promiseTimeout(promise, timeout, 'ERR_TCP_READ_TIMEOUT')
      return res
    } finally {
      this._socket.removeListener('data', dataHandler)
      this._socket.removeListener('error', errHandler)
    }
  }

  /**
   * @param {number} opts.timeout
   * @returns {Promise<string|Buffer>}
   */
  async _readEnd (timeout) {
    const { promise, resolve, reject } = promiseFlat()

    const chunks = []
    const dataHandler = (data) => {
      chunks.push(data)
    }
    const endHandler = () => resolve()
    const errHandler = (err) => reject(err)

    try {
      this._socket.on('data', dataHandler)
      this._socket.once('end', endHandler)
      this._socket.addListener('error', errHandler)

      await promiseTimeout(promise, timeout, 'ERR_TCP_READ_TIMEOUT')
      return typeof chunks[0] === 'string' ? chunks.join('') : Buffer.concat(chunks)
    } finally {
      this._socket.removeListener('data', dataHandler)
      this._socket.removeListener('end', endHandler)
      this._socket.removeListener('error', errHandler)
      this._socket.end()
    }
  }
}

module.exports = TcpClient
module.exports.TCP_READ_STRATEGY = TCP_READ_STRATEGY
