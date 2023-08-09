'use strict'

const TcpFacility = require('./src/tcp.facility')
const { TCP_READ_STRATEGY } = require('./src/tcp.client')

module.exports = TcpFacility
module.exports.TCP_READ_STRATEGY = TCP_READ_STRATEGY
