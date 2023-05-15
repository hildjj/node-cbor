import {Readable, Transform} from 'stream'
import {Buffer} from 'buffer' // Not the mangled version
import {fileURLToPath} from 'url'
import fs from 'fs'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export class DeHexStream extends Readable {
  constructor(hex) {
    super()
    hex = hex.replace(/^0x/, '')
    if (hex) {
      this.push(Buffer.from(hex, 'hex'))
    }
    this.push(null)
  }
}

export class HexStream extends Transform {
  constructor(options) {
    super(options)
  }

  _transform(fresh, encoding, cb) {
    this.push(fresh.toString('hex'))
    return cb()
  }
}

/**
 * If error is non-null, prints it to stderr.
 *
 * @param {Error} [er] Potential error.
 * @private
 */
export function printError(er) {
  if (er != null) {
    console.error(er)
  }
}

/**
 * @callback StreamFunction
 * @param {string|Readable} file
 * @returns {Transform}
 */

/**
 * Stream each file in the list through a separate instance of a stream
 * returend from the stream function.
 *
 * @param {(string|Readable)[]} files Each file to process, or '-' for stdin.
 * @param {StreamFunction} streamFunc Create a particular kind of Transform
 *   stream.
 */
export async function streamFiles(files, streamFunc) {
  for (const f of files) {
    await new Promise((resolve, reject) => {
      const sf = streamFunc(f)
      sf.on('end', resolve)
      sf.on('error', reject)

      let s = (f === '-') ? process.stdin : f
      if (!(s instanceof Readable)) {
        s = fs.createReadStream(s)
      }
      s.on('error', reject)
      s.pipe(sf)
    })
  }
}

/**
 * Get the package.json file as an object.
 *
 * @returns {Promise<object>} The contents of the file, parsed.
 */
export async function pkg() {
  const txt = await fs.promises.readFile(
    path.resolve(__dirname, '../package.json'),
    'utf8'
  )
  return JSON.parse(txt)
}
