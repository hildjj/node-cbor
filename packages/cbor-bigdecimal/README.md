# cbor-bignumber

This package adds suppot for BigDecimal and BigFloats to the [cbor](../cbor)
package, relying on [bignumber.js](https://github.com/MikeMcl/bignumber.js).

## Installation

```sh
npm install cbor cbor-bignumber
```

## Usage

Before trying to encode or decode:

```js
const cbor = require('cbor')
const bdec = require('cbor-bigdecimal')
bdec(cbor)
```

If you want to remove the added encoders and decoders:

```js
cbor.reset()
```

If you need to access the same BigNumber class that `cbor-bigdecimal` is (e.g.
because the class has been mangled by your compressor), it is available as
`bdec.BigNumber`.

## Supported Types

Decoding supports the following CBOR tag numbers:

| Tag | Generated Type      |
|-----|---------------------|
| 4   | bignumber           |
| 5   | bignumber           |

