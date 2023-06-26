import {getMangled} from './cases.js'
import test from 'ava'

const {cbor, Buffer} = getMangled()
const {SharedValueEncoder} = cbor

test('create SVE', async t => {
  const a = {}
  a.b = a

  const sve = new SharedValueEncoder()
  t.truthy(sve)
  // eslint-disable-next-line no-empty-function
  sve.on('data', () => {})
  sve.pushAny(a)
  sve.stopRecording()
  let bufs = []
  sve.on('data', b => bufs.push(b))
  sve.pushAny(a)
  t.is(Buffer.concat(bufs).toString('hex'), 'd81ca16162d81d00')
  bufs = []
  sve.clearRecording()
  sve.pushAny(a)
  t.is(Buffer.concat(bufs).toString('hex'), 'a16162d81d00')

  t.is(SharedValueEncoder.encode(a).toString('hex'), 'd81ca16162d81d00')
  t.is(SharedValueEncoder.encode(null).toString('hex'), 'f6')

  const buf = await SharedValueEncoder.encodeAsync(a)
  t.is(buf.toString('hex'), 'd81ca16162d81d00')

  t.is(SharedValueEncoder.encodeOne(a).toString('hex'), 'd81ca16162d81d00')

  t.throws(() => SharedValueEncoder.encodeCanonical(a))
})
