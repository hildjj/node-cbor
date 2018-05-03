const BigNumber = require('bignumber.js')
const cbor = require('../')
const test = require('ava')
const vectors = require('../test-vectors/appendix_a')
const rterror = 'roundtrip:'

console.log(`${vectors.length} entries in RFC Appendix A test vectors`)

vectors.forEach( v => {
  const hex = v.hex;
  if (hex) {

    test(`hex: ${hex}`, t => {
      const buffer = Buffer.from(hex, "hex")
      if (v.cbor) 
        t.deepEqual( Buffer.from(v.cbor,"base64"), buffer, "base64 and hex encoded bytes mismatched ")
     
      if (v.hasOwnProperty('decoded')) {
        const decoded = cbor.decodeFirstSync(buffer)
        if (!BigNumber.isBigNumber(decoded)) 
          t.deepEqual(decoded, v.decoded)
        if (v.roundtrip) {
          const encoded = cbor.encode(decoded)
          if (!encoded.equals(buffer))
            t.fail(`${rterror} ${hex} -> ${encoded.toString("hex")} [${decoded}]`)
        }
      } else {
        t.pass('no decoded member');
      }
    })
  }

});

