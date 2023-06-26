import {getMangled} from './cases.js'
import test from 'ava'

const {cbor} = getMangled()

test('reset', t => {
  cbor.Encoder.SEMANTIC_TYPES.UNKNOWN_TYPE = () => null
  cbor.reset()
  t.is(cbor.Encoder.SEMANTIC_TYPES.UNKNOWN_TYPE, undefined)
})
