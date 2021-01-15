export = Decoder;
/**
 * Decode a stream of CBOR bytes by transforming them into equivalent
 * JavaScript data.  Because of the limitations of Node object streams,
 * special symbols are emitted instead of NULL or UNDEFINED.  Fix those
 * up by calling {@link Decoder.nullcheck}.
 *
 * @extends {BinaryParseStream}
 */
declare class Decoder extends BinaryParseStream {
    /**
     * Check the given value for a symbol encoding a NULL or UNDEFINED value in
     * the CBOR stream.
     *
     * @static
     * @param {any} val - the value to check
     * @returns {any} the corrected value
     *
     * @example
     * myDecoder.on('data', function(val) {
     *   val = Decoder.nullcheck(val);
     *   ...
     * });
     */
    static nullcheck(val: any): any;
    /**
     * Decode the first CBOR item in the input, synchronously.  This will throw an
     * exception if the input is not valid CBOR.
     *
     * @static
     * @param {string|Buffer|ArrayBuffer|Uint8Array|Uint8ClampedArray
     *   |DataView|stream.Readable} input
     * @param {StaticDecoderOptions|string} [options={}] Options or encoding for
     *   input
     * @returns {any} - the decoded value
     */
    static decodeFirstSync(input: string | Buffer | ArrayBuffer | Uint8Array | Uint8ClampedArray | DataView | stream.Readable, options?: StaticDecoderOptions | string): any;
    /**
     * Decode all of the CBOR items in the input into an array.  This will throw
     * an exception if the input is not valid CBOR; a zero-length input will
     * return an empty array.
     *
     * @static
     * @param {string|Buffer|ArrayBuffer|Uint8Array|Uint8ClampedArray
     *   |DataView|stream.Readable} input
     * @param {StaticDecoderOptions|string} [options={}] Options or encoding
     *   for input
     * @returns {Array} - Array of all found items
     */
    static decodeAllSync(input: string | Buffer | ArrayBuffer | Uint8Array | Uint8ClampedArray | DataView | stream.Readable, options?: StaticDecoderOptions | string): any[];
    /**
     * Decode the first CBOR item in the input.  This will error if there are more
     * bytes left over at the end, and optionally if there were no valid CBOR
     * bytes in the input.  Emits the {Decoder.NOT_FOUND} Symbol in the callback
     * if no data was found and the `required` option is false.
     *
     * @static
     * @param {string|Buffer|ArrayBuffer|Uint8Array|Uint8ClampedArray
     *   |DataView|stream.Readable} input
     * @param {StaticDecoderOptions|decodeCallback|string} [options={}] - options,
     *   the callback, or input encoding
     * @param {decodeCallback} [cb] callback
     * @returns {Promise<any>} returned even if callback is specified
     */
    static decodeFirst(input: string | Buffer | ArrayBuffer | Uint8Array | Uint8ClampedArray | DataView | stream.Readable, options?: StaticDecoderOptions | decodeCallback | string, cb?: decodeCallback): Promise<any>;
    /**
     * @callback decodeAllCallback
     * @param {Error} error - if one was generated
     * @param {Array} value - all of the decoded values, wrapped in an Array
     */
    /**
     * Decode all of the CBOR items in the input.  This will error if there are
     * more bytes left over at the end.
     *
     * @static
     * @param {string|Buffer|ArrayBuffer|Uint8Array|Uint8ClampedArray
     *   |DataView|stream.Readable} input
     * @param {StaticDecoderOptions|decodeAllCallback|string} [options={}] -
     *   Decoding options, the callback, or the input encoding.
     * @param {decodeAllCallback} [cb] callback
     * @returns {Promise<Array>} even if callback is specified
     */
    static decodeAll(input: string | Buffer | ArrayBuffer | Uint8Array | Uint8ClampedArray | DataView | stream.Readable, options?: string | StaticDecoderOptions | ((error: Error, value: any[]) => any), cb?: (error: Error, value: any[]) => any): Promise<any[]>;
    /**
     * Create a parsing stream.
     *
     * @param {DecoderOptions} [options={}]
     */
    constructor(options?: DecoderOptions);
    running: boolean;
    max_depth: number;
    tags: any;
    preferWeb: boolean;
    bigint: boolean;
    /**
     * Stop processing
     */
    close(): void;
}
declare namespace Decoder {
    export { NOT_FOUND, DecoderOptions, StaticDecoderOptions, decodeCallback };
}
import BinaryParseStream = require("../vendor/binary-parse-stream");
import stream = require("node/stream");
type StaticDecoderOptions = {
    /**
     * - the maximum depth to parse.
     * Use -1 for "until you run out of memory".  Set this to a finite
     * positive number for un-trusted inputs.  Most standard inputs won't nest
     * more than 100 or so levels; I've tested into the millions before
     * running out of memory.
     */
    max_depth?: number;
    /**
     * - mapping from tag number to function(v),
     * where v is the decoded value that comes after the tag, and where the
     * function returns the correctly-created value for that tag.
     */
    tags?: object;
    /**
     * generate JavaScript BigInt's
     * instead of BigNumbers, when possible.
     */
    bigint?: boolean;
    /**
     * if true, prefer Uint8Arrays to
     * be generated instead of node Buffers.  This might turn on some more
     * changes in the future, so forward-compatibility is not guaranteed yet.
     */
    preferWeb?: boolean;
    /**
     * - The encoding of the input.
     * Ignored if input is a Buffer.
     */
    encoding?: string;
    /**
     * - Should an error be thrown when no
     * data is in the input?
     */
    required?: boolean;
};
type decodeCallback = (error?: Error, value?: any) => any;
type DecoderOptions = {
    /**
     * - the maximum depth to parse.
     * Use -1 for "until you run out of memory".  Set this to a finite
     * positive number for un-trusted inputs.  Most standard inputs won't nest
     * more than 100 or so levels; I've tested into the millions before
     * running out of memory.
     */
    max_depth?: number;
    /**
     * - mapping from tag number to function(v),
     * where v is the decoded value that comes after the tag, and where the
     * function returns the correctly-created value for that tag.
     */
    tags?: object;
    /**
     * generate JavaScript BigInt's
     * instead of BigNumbers, when possible.
     */
    bigint?: boolean;
    /**
     * if true, prefer Uint8Arrays to
     * be generated instead of node Buffers.  This might turn on some more
     * changes in the future, so forward-compatibility is not guaranteed yet.
     */
    preferWeb?: boolean;
};
declare const NOT_FOUND: unique symbol;
