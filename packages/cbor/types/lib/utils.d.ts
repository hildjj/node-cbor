/// <reference types="node" />
/**
 * Convert a UTF8-encoded Buffer to a JS string.  If possible, throw an error
 * on invalid UTF8.  Byte Order Marks are not looked at or stripped.
 *
 * @param {Buffer} buf The buffer to convert.
 * @returns {string} UTF8-decoded.
 * @private
 */
export function utf8(buf: Buffer): string;
export namespace utf8 {
    const checksUTF8: boolean;
}
/**
 * Type guard for buffer-like objects.
 *
 * @param {any} b The candidate object.
 * @returns {b is ArrayBufferView}
 *   Safe to typecast b (boolean).
 * @private
 */
export function isBufferish(b: any): b is ArrayBufferView;
/**
 * Convert object to a buffer.
 *
 * @param {Buffer|ArrayBuffer|ArrayBufferView} b Candidate object.
 * @returns {Buffer|null} Object converted to Buffer, if possible.
 *   Otherwise null.
 * @private
 */
export function bufferishToBuffer(b: Buffer | ArrayBuffer | ArrayBufferView): Buffer | null;
/**
 * Parse a CBOR integer from a Buffer.
 *
 * @param {number} ai Additional Information.
 * @param {Buffer} buf Buffer.
 * @returns {number|bigint} Converted integer.
 * @throws {Error} Invalid AI.
 * @private
 */
export function parseCBORint(ai: number, buf: Buffer): number | bigint;
/**
 * Write a half-sized (2 byte) float to a buffer.
 *
 * @param {Buffer} buf Buffer.
 * @param {number} half Number to encode.
 * @returns {boolean} Success if true.
 * @private
 */
export function writeHalf(buf: Buffer, half: number): boolean;
/**
 * Parse a half-sized (2 byte) float from a buffer.
 *
 * @param {Buffer} buf The buffer.
 * @returns {number} Retrieved value.
 * @private
 */
export function parseHalf(buf: Buffer): number;
/**
 * Parse a CBOR float from a buffer, with the type determined by the buffer's
 * length.
 *
 * @param {Buffer} buf The buffer.
 * @returns {number} The decoded float.
 * @throws {Error} Invalid buffer size, should be 2,4, or 8.
 * @private
 */
export function parseCBORfloat(buf: Buffer): number;
/**
 * Decode a hex-encoded string to a Buffer.  String may start with `0x`, which
 * is ignored.
 *
 * @param {string} s String to decode.
 * @returns {Buffer} The decoded value.
 * @private
 */
export function hex(s: string): Buffer;
/**
 * Decode a binary-encoded string to a Buffer.  Spaces will be ignored.
 *
 * @param {string} s String to decode.
 * @returns {Buffer} The decoded value.
 * @private
 */
export function bin(s: string): Buffer;
/**
 * Are the two arrays equal, by comparing each array element with `===`?
 *
 * @template T
 * @param {Array<T>} [a] First array.
 * @param {Array<T>} [b] Second array.
 * @returns {boolean} Are they equal?
 * @private
 */
export function arrayEqual<T>(a?: T[], b?: T[]): boolean;
/**
 * Convert a buffer to an unsigned bigint.  This is not efficient unless the
 * buffer is length 8.
 *
 * @param {Buffer} buf Buffer.
 * @returns {bigint} Decoded unsigned bigint.
 * @private
 */
export function bufferToBigInt(buf: Buffer): bigint;
/**
 * Convert the value to a string for diagnostics.
 *
 * @param {any} val The value to convert.
 * @param {number} [float_bytes=-1] The number of bytes in the float, if
 *   val is a floating point number.  -1 if val is not floating point.
 *   If -Infinity, don't prepend hex with `h`.
 * @returns {string} The string form of val.
 * @private
 */
export function cborValueToString(val: any, float_bytes?: number): string;
/**
 * Convert to a readable stream.
 *
 * @param {string|Buffer|ArrayBuffer|ArrayBufferView|Readable} input Source
 *   of input.
 * @param {BufferEncoding} [encoding] If the input is a string, how should it
 *   be encoded?
 * @returns {Readable} Input converted to Readable stream.
 * @throws {TypeError} Unknown input type.
 * @private
 */
export function guessEncoding(input: string | Buffer | ArrayBuffer | ArrayBufferView | Readable, encoding?: BufferEncoding): Readable;
/**
 * @param {Buffer|ArrayBufferView|ArrayBuffer} buf
 *   Buffer to convert.
 * @returns {string} Base64url string.
 * @private
 */
export function base64url(buf: Buffer | ArrayBufferView | ArrayBuffer): string;
/**
 * @param {Buffer|ArrayBufferView|ArrayBuffer} buf
 *   Buffer to convert.
 * @returns {string} Base64 string.
 * @private
 */
export function base64(buf: Buffer | ArrayBufferView | ArrayBuffer): string;
/**
 * Is the current system big-endian?  Tests, rather than using the node
 * os.endianness() function, so that it will work in the browser.
 *
 * @returns {boolean} If BigEndian, true.
 * @private
 */
export function isBigEndian(): boolean;
import { Buffer } from 'buffer';
import { Readable } from 'stream';
