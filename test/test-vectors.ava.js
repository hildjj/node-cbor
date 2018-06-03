const BigNumber = require('bignumber.js')
const cbor = require('../')
const test = require('ava')
var vectors = null;
const rterror = 'roundtrip:'
try {
  vectors = require('../test-vectors/appendix_a')
} catch (ex) { }

test('test-vectors', t => {
  if (vectors) t.pass('test-vectors found')
  else t.fail('use command `git submodule update --init` to load test-vectors')
})

if (vectors) {
  vectors.forEach(v => {
    const hex = v.hex;
    if (hex) {

      test(`hex: ${hex}`, t => {
        const buffer = Buffer.from(hex, "hex")


        const decoded = cbor.decodeFirstSync(buffer)
        const encoded = cbor.encode(decoded)
        const redecoded = cbor.decodeFirstSync(encoded)

        if (v.hasOwnProperty('cbor'))
          t.deepEqual(Buffer.from(v.cbor, "base64"), buffer, "base64 and hex encoded bytes mismatched ")

        t.deepEqual(decoded, redecoded, `round trip error: ${hex} -> ${encoded.toString('hex')}`);

        if (v.hasOwnProperty('diagnostic')) {
          return cbor.diagnose(buffer)
            .then(d => t.deepEqual(d.trim().replace(/_\d+($|\))/, '$1'), v.diagnostic))
        }

        if (v.hasOwnProperty('decoded')) {

          if (!BigNumber.isBigNumber(decoded))
            t.deepEqual(decoded, v.decoded)
          else
            t.deepEqual(decoded, redecoded, "BigNum error")

          // if (v.roundtrip) {
          //   if (!encoded.equals(buffer)) {
          //     if (decoded)
          //     t.fail(`${rterror} ${hex} -> ${encoded.toString("hex")} [${decoded} -> ${cbor.decodeFirstSync(encoded)}]`)
          //   }
          // }
        } else {
          t.pass('no decoded member');
        }
      })
    }
  })
}