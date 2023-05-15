import * as cases from './cases.js'
import {DeHexStream} from './streams.js'
import pEvent from 'p-event'
import test from 'ava'
import util from 'util'

const {cbor, NoFilter} = cases.getMangled()
const pcomment = util.promisify(cbor.comment)

function testAll(t, list) {
  t.plan(list.length)
  return Promise.all(
    list.map(
      c => cbor.comment(cases.toBuffer(c))
        .then(d => t.is(`\n${d}`, `${c[2]}\n`))
    )
  )
}

function failAll(t, list) {
  t.plan(list.length)
  return Promise.all(list.map(c => t.throwsAsync(
    cbor.comment(cases.toBuffer(c))
  )))
}

test('good', async t => {
  await testAll(t, cases.good)
})
test('encode', async t => {
  await testAll(t, cases.encodeGood)
})
test('decode', async t => {
  await testAll(t, cases.decodeGood)
})
test('fail', async t => {
  await failAll(t, cases.decodeBad)
})

test('input_errors', async t => {
  t.throws(() => {
    cbor.comment(null, null)
  })
  t.throws(() => {
    cbor.comment('00', true)
  })
  await t.throwsAsync(cbor.comment('d8184181'))
  t.is(await cbor.comment('', null), '')
})

test('max_depth', async t => {
  const str = await pcomment('01', 2)
  t.is(str, `\
  01 -- 1
0x01
`)
})

test('stream', async t => {
  const bs = new NoFilter()
  const parser = new cbor.Commented()
  parser.pipe(bs)
  parser.on('error', er => t.fail(`Failed: ${er}`))

  const h = new DeHexStream('6161')
  h.pipe(parser)

  await pEvent(parser, 'end')
  t.is(bs.toString('utf8'), `\
  61                -- String, length: 1
    61              -- "a"
0x6161
`)
})

test('function', async t => {
  const str = await pcomment('00')
  t.is(str, `\
  00                -- 0
0x00
`)
})

test('inputs', async t => {
  let c = await cbor.comment(
    'mB4AAQIDBAUGBwgJAAECAwQFBgcICQABAgMEBQYHCAk=',
    'base64'
  )
  t.is(c, `\
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
  c = await cbor.comment('x\u001e012345678901234567890123456789',
    {encoding: 'utf8'})
  t.is(c, `\
  78                -- String, length next 1 byte
    1e              -- String, length: 30
      303132333435363738393031323334353637383930313233343536373839 -- "012345678901234567890123456789"
0x781e303132333435363738393031323334353637383930313233343536373839
`)
  c = await cbor.comment('381d', {max_depth: 12})
  t.is(c, `\
  38                    -- Negative number, next 1 byte
    1d                  -- -30
0x381d
`)
})

test('options', t => {
  function newTag24() {
    return null
  }
  const c = new cbor.Commented({
    tags: {
      24: newTag24,
    },
  })
  t.is(c.parser.tags[24], newTag24)
})
