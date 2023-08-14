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

module.exports = {
  isNil,
  pickBy
}
