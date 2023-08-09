'use strict'

const BaseFacility = require('bfx-facs-base')

const TcpClient = require('./tcp.client')
const TcpRpcClient = require('./tcp.rpc.client')
const { isNil, pickBy } = require('./utils')

class TcpFacility extends BaseFacility {
  constructor (caller, opts, ctx) {
    super(caller, opts, ctx)

    this.name = 'tcp'
    this._hasConf = false

    this.init()
  }

  async _start (cb) {
    try {
      this.tcp = new TcpClient(
        pickBy({
          host: this.opts.host,
          port: this.opts.port,
          encoding: this.opts.encoding
        }, (v) => !isNil(v))
      )
      this.rpc = new TcpRpcClient(
        pickBy({
          tcp: this.tcp,
          readStrategy: this.opts.readStrategy,
          json: this.opts.json,
          timeout: this.opts.timeout,
          delay: this.opts.delay
        }, (v) => !isNil(v))
      )

      await this.rpc.start()
      cb()
    } catch (err) {
      cb(err)
    }
  }

  async _stop (cb) {
    try {
      await this.rpc.stop()
      cb()
    } catch (err) {
      cb(err)
    }
  }
}

module.exports = TcpFacility
