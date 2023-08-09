'use strict'

const async = require('async')
const { promiseFlat } = require('@bitfinex/lib-js-util-promise')

class TaskQueue {
  constructor (concurrency = 1) {
    this.queue = async.queue(async (job, cb) => {
      try {
        const res = await job.task()
        job.resolve(res)
      } catch (err) {
        job.reject(err)
      } finally {
        cb() // task queue cb
      }
    }, concurrency)
  }

  /**
   * @param {() => Promise<any>} task
   */
  pushTask (task) {
    const { promise, resolve, reject } = promiseFlat()
    const job = { task, resolve, reject }
    this.queue.push(job)

    return promise
  }
}

module.exports = TaskQueue
