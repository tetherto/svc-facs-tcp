'use strict'

const net = require('net')

const tcpServerFactory = async ({
  host = '127.0.0.1',
  port = 7070,
  encoding = null,
  connectHandler = () => { },
  cmdHandler = () => { }
}) => {
  const server = new net.Server()

  await new Promise((resolve, reject) => {
    try {
      server.listen(port, host, () => resolve())
      server.once('error', reject)
    } catch (err) {
      reject(err)
    }
  })

  server.on('connection', function (socket) {
    connectHandler(socket)
    if (encoding) {
      socket.setEncoding(encoding)
    }
    socket.on('data', (data) => cmdHandler(socket, data))
  })

  return server
}

module.exports = {
  tcpServerFactory
}
