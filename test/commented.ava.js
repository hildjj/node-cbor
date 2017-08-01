'use strict'

const cbor = require('../')
const test = require('ava')
const cases = require('./cases')
const utils = require('../lib/utils')
const NoFilter = require('nofilter')

function testAll(t, list) {
  t.plan(list.length)
  return Promise.all(list.map(c => {
    return cbor.comment(cases.toBuffer(c))
      .then(d => t.is('\n' + d, c[2] + '\n'))
  }))
}

function failAll(t, list) {
  t.plan(list.length)
  return Promise.all(list.map(c => t.throws(cbor.comment(cases.toBuffer(c)))))
}

test('good', t => testAll(t, cases.good))
test('encode', t => testAll(t, cases.encodeGood))
test('decode', t => testAll(t, cases.decodeGood))
test('fail', t => failAll(t, cases.decodeBad))

test('input_errors', t => {
  t.throws(() => {
    cbor.comment(null, null)
  })
  t.throws(() => {
    cbor.comment('00', true)
  })
  cbor.comment('')
})

test.cb('max_depth', t => {
  cbor.comment('01', 2, (er, str) => {
    t.ifError(er)
    t.deepEqual('\n' + str, `
  01 -- 1
0x01
`)
    t.end()
  })
})

test.cb('stream', t => {
  const bs = new NoFilter()
  const parser = new cbor.Commented()
  parser.pipe(bs)

  parser.on('end', () => {
    t.deepEqual('\n' + bs.toString('utf8'), `
  61                -- String, length: 1
    61              -- "a"
0x6161
`)
    t.end()
  })
  parser.on('error', (er) => t.fail(er))

  const h = new utils.DeHexStream('6161')
  h.pipe(parser)
})

test.cb('function', t => {
  cbor.comment('00', c => {
    t.end()
  })
})

test('inputs', t => {
  return cbor.comment('mB4AAQIDBAUGBwgJAAECAwQFBgcICQABAgMEBQYHCAk=', 'base64')
    .then((c) => {
      t.deepEqual('\n' + c, `
  98                -- Array, length next 1 byte
    1e              -- Array, 30 items
      00            -- [0], 0
      01            -- [1], 1
      02            -- [2], 2
      03            -- [3], 3
      04            -- [4], 4
      05            -- [5], 5
      06            -- [6], 6
      07            -- [7], 7
      08            -- [8], 8
      09            -- [9], 9
      00            -- [10], 0
      01            -- [11], 1
      02            -- [12], 2
      03            -- [13], 3
      04            -- [14], 4
      05            -- [15], 5
      06            -- [16], 6
      07            -- [17], 7
      08            -- [18], 8
      09            -- [19], 9
      00            -- [20], 0
      01            -- [21], 1
      02            -- [22], 2
      03            -- [23], 3
      04            -- [24], 4
      05            -- [25], 5
      06            -- [26], 6
      07            -- [27], 7
      08            -- [28], 8
      09            -- [29], 9
0x981e000102030405060708090001020304050607080900010203040506070809
`)
      return cbor.comment('x\u001e012345678901234567890123456789',
        {encoding: 'utf8'})
    })
    .then((c) => {
      /* eslint-disable max-len */
      t.deepEqual('\n' + c, `
  78                -- String, length next 1 byte
    1e              -- String, length: 30
      303132333435363738393031323334353637383930313233343536373839 -- "012345678901234567890123456789"
0x781e303132333435363738393031323334353637383930313233343536373839
`)
      return cbor.comment('381d', {max_depth: 12})
    })
    .then((c) => {
      t.deepEqual('\n' + c, `
  38                    -- Negative number, next 1 byte
    1d                  -- -30
0x381d
`)
    })
})
