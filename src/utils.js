'use strict'

const isNil = (val) => {
  return val === undefined || val == null
}

const pickBy = (obj, predicate) => {
  if (obj === null) {
    return {}
  }

  const newObj = {}
  for (const key in obj) {
    const val = obj[key]
    if (predicate(val)) {
      newObj[key] = val
    }
  }

  return newObj
}

const pick = (obj, keys) => {
  if (obj === null) {
    return {}
  }

  const set = new Set(keys)

  const newObj = {}
  for (const key in obj) {
    if (set.has(key)) {
      newObj[key] = obj[key]
    }
  }

  return newObj
}

module.exports = {
  isNil,
  pick,
  pickBy
}
