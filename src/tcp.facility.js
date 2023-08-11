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

  getClient (opts) {
    const tcp = new TcpClient(
      pickBy({
        host: opts.host,
        port: opts.port,
        encoding: opts.encoding
      }, (v) => !isNil(v))
    )

    return tcp
  }

  async getRPC (opts) {
    const rpc = new TcpRpcClient(
      pickBy({
        tcp: opts.tcp,
        tcpOpts: opts.tcpOpts,
        readStrategy: opts.readStrategy,
        json: opts.json,
        timeout: opts.timeout,
        delay: opts.delay
      }, (v) => !isNil(v))
    )

    return rpc
  }
}

module.exports = TcpFacility
