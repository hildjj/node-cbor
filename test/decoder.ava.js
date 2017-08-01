'use strict'

const cbor = require('../')
const test = require('ava')
const cases = require('./cases')
const utils = require('../lib/utils')

function testAll(t, list) {
  t.plan(list.length)
  return Promise.all(list.map(c => {
    return cbor.decodeFirst(cases.toBuffer(c))
      .then(d => {
        if ((typeof(c[0]) === 'number') && isNaN(c[0])) {
          t.truthy(isNaN(d))
        } else {
          t.deepEqual(d, c[0], cases.toString(c))
        }
      })
  }))
}

function failAll(t, list) {
  t.plan(list.length)
  list.map(c => t.throws(() => cbor.decode(cases.toBuffer(c))))
}

function failFirstAll(t, list) {
  t.plan(list.length)
  return Promise.all(
    list.map(c => t.throws(cbor.decodeFirst(cases.toBuffer(c)))))
}

function failFirstAllCB(t, list) {
  t.plan(list.length)
  list.map(c => cbor.decodeFirst(cases.toBuffer(c), (er, d) => {
    if (d == null) {
      t.truthy(er)
    } else {
      t.throws(() => cbor.Decoder.nullcheck(d))
    }
  }))
}

test('good', t => testAll(t, cases.good))
test('decode', t => testAll(t, cases.decodeGood))
test('edges', t => failAll(t, cases.decodeBad))
test('bad first', t => failFirstAll(t, cases.decodeBad))
test('bad first cb', t => failFirstAllCB(t, cases.decodeBad))

test('decodeFirstSync', t => {
  t.deepEqual(cbor.decodeFirstSync('02'), 2)
  t.deepEqual(cbor.Decoder.decodeFirstSync('Ag==', 'base64'), 2)
  t.deepEqual(cbor.decode('02', {}), 2)
  t.deepEqual(cbor.decode('f6'), null)
  t.throws(() => cbor.decode(), Error)
  t.throws(() => cbor.decode(''), Error)
  t.throws(() => cbor.decode('63666f'), Error)
})

test('decodeAllSync', t => {
  t.deepEqual(cbor.Decoder.decodeAllSync('0202'), [2, 2])
  t.deepEqual(cbor.Decoder.decodeAllSync('AgI=', 'base64'), [2, 2])
  t.deepEqual(cbor.Decoder.decodeAllSync('0202', {}), [2, 2])
  t.deepEqual(cbor.Decoder.decodeAllSync('f6f6'), [null, null])
  t.deepEqual(cbor.Decoder.decodeAllSync(''), [])
  t.throws(() => cbor.Decoder.decodeAllSync('63666f'), Error)
})

test.cb('add_tag', t => {
  function replaceTag(val) {
    return {foo: val}
  }
  function newTag(val) {
    throw new Error('Invalid tag')
  }
  const d = new cbor.Decoder({
    tags: {0: replaceTag, 127: newTag}
  })
  t.deepEqual(d.tags[0], replaceTag)
  t.deepEqual(d.tags[127], newTag)

  d.on('error', (er) => {
    t.truthy(false, er)
  })
  let count = 0
  d.on('data', (val) => {
    switch (count++) {
      case 0:
        t.deepEqual(val, new cbor.Tagged(127, 1, new Error('Invalid tag')))
        break
      case 1:
        t.deepEqual(val, {foo: 1})
        t.end()
        break
    }
  })
  const b = new Buffer('d87f01c001', 'hex')
  d.end(b)
})

test.cb('parse_tag', t => {
  cbor.decodeFirst('d87f01', 'hex', (er, vals) => {
    t.ifError(er)
    t.deepEqual(vals, new cbor.Tagged(127, 1))
    t.end()
  })
})

test.cb('error', t => {
  cbor.decodeFirst('d87f01c001', 'hex').catch((er) => {
    t.truthy(er)
    cbor.Decoder.decodeFirst('', {required: true}, (er, d) => {
      t.truthy(er)
      t.falsy(d)
      t.end()
    })
  })
})

test.cb('stream', t => {
  const dt = new cbor.Decoder()

  dt.on('data', (v) => t.deepEqual(v, 1))
  dt.on('end', () => t.end())
  dt.on('error', (er) => t.ifError(er))

  const d = new utils.DeHexStream('01')
  d.pipe(dt)
})

test('decodeFirst', t => {
  return cbor.decodeFirst('01')
    .then((v) => {
      t.is(1, v)
      return cbor.decodeFirst('AQ==', {
        encoding: 'base64'
      })
    })
    .then((v) => {
      t.is(1, v)
      return cbor.decodeFirst('')
    })
    .then((v) => {
      t.is(cbor.Decoder.NOT_FOUND, v)
      return cbor.decodeFirst('', {required: true})
    })
    .catch((er) => {
      t.truthy(er)
      cbor.decodeFirst(new Buffer(0), (er, v) => {
        t.ifError(er)
        t.is(cbor.Decoder.NOT_FOUND, v)
        return cbor.decodeFirst(new Buffer(0), {required: true}, (er, v) => {
          t.truthy(er)
        })
      })
    })
})

test('decodeAll', t => {
  return cbor.decodeAll('01')
    .then((v) => {
      t.deepEqual([1], v)
      return cbor.decodeAll('7f')
    })
    .catch(() => {
      cbor.decodeAll('01', (er, v) => {
        t.ifError(er)
        t.deepEqual([1], v)
        cbor.decodeAll('AQ==', {encoding: 'base64'}, (er, v) => {
          t.ifError(er)
          t.deepEqual([1], v)
          return cbor.decodeAll('7f', {}, (er, v) => {
            t.truthy(er)
            return cbor.decodeAll('AQ==', 'base64', (er, v) => {
              t.ifError(er)
              t.deepEqual([1], v)
            })
          })
        })
      })
    })
})

test('depth', t => {
  return t.throws(cbor.decodeFirst('818180', {max_depth: 1}))
})
