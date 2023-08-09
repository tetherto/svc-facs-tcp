'use strict'

const _isNil = require('lodash/isNil')
const _pickBy = require('lodash/pickBy')
const BaseFacility = require('bfx-facs-base')

const TcpClient = require('./tcp.client')
const TcpRpcClient = require('./tcp.rpc.client')

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
        _pickBy({
          host: this.opts.host,
          port: this.opts.port,
          encoding: this.opts.encoding
        }, (v) => !_isNil(v))
      )
      this.rpc = new TcpRpcClient(
        _pickBy({
          tcp: this.tcp,
          readStrategy: this.opts.readStrategy,
          json: this.opts.json,
          timeout: this.opts.timeout,
          delay: this.opts.delay
        }, (v) => !_isNil(v))
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
