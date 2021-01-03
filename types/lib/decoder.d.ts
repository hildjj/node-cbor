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
     * @typedef DecodeOptions
     * @property {string} [encoding='hex'] - The encoding of the input.
     *   Ignored if input is a Buffer.
     */
    /**
     * Decode the first CBOR item in the input, synchronously.  This will throw an
     * exception if the input is not valid CBOR.
     *
     * @static
     * @param {string|Buffer|ArrayBuffer|Uint8Array|Uint8ClampedArray
     *   |DataView|stream.Readable} input
     * @param {DecodeOptions|string} [options] Options
     * @returns {any} - the decoded value
     */
    static decodeFirstSync(input: string | Buffer | ArrayBuffer | Uint8Array | Uint8ClampedArray | DataView | stream.Readable, options?: string | {
        /**
         * - The encoding of the input.
         * Ignored if input is a Buffer.
         */
        encoding?: string;
    }): any;
    /**
     * Decode all of the CBOR items in the input into an array.  This will throw
     * an exception if the input is not valid CBOR; a zero-length input will
     * return an empty array.
     *
     * @static
     * @param {string|Buffer|ArrayBuffer|Uint8Array|Uint8ClampedArray
     *   |DataView|stream.Readable} input
     * @param {DecodeOptions|string} [options] Options or encoding string
     * @returns {Array} - Array of all found items
     */
    static decodeAllSync(input: string | Buffer | ArrayBuffer | Uint8Array | Uint8ClampedArray | DataView | stream.Readable, options?: string | {
        /**
         * - The encoding of the input.
         * Ignored if input is a Buffer.
         */
        encoding?: string;
    }): any[];
    /**
     * @callback decodeCallback
     * @param {Error} [error] - if one was generated
     * @param {any} [value] - the decoded value
     */
    /**
     * Decode the first CBOR item in the input.  This will error if there are more
     * bytes left over at the end, and optionally if there were no valid CBOR
     * bytes in the input.  Emits the {Decoder.NOT_FOUND} Symbol in the callback
     * if no data was found and the `required` option is false.
     *
     * @static
     * @param {string|Buffer|ArrayBuffer|Uint8Array|Uint8ClampedArray
     *   |DataView|stream.Readable} input
     * @param {DecodeOptions|decodeCallback|string} [options] - options
     * @param {decodeCallback} [cb] callback
     * @returns {Promise<any>} returned even if callback is specified
     */
    static decodeFirst(input: string | Buffer | ArrayBuffer | Uint8Array | Uint8ClampedArray | DataView | stream.Readable, options?: string | {
        /**
         * - The encoding of the input.
         * Ignored if input is a Buffer.
         */
        encoding?: string;
    } | ((error?: Error, value?: any) => any), cb?: (error?: Error, value?: any) => any): Promise<any>;
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
     * @param {string|Object} options - Decoding options.
     *   If string, the input encoding.
     * @param {decodeAllCallback} [cb] callback
     * @returns {Promise<Array>} even if callback is specified
     */
    static decodeAll(input: string | Buffer | ArrayBuffer | Uint8Array | Uint8ClampedArray | DataView | stream.Readable, options: string | any, cb?: (error: Error, value: any[]) => any): Promise<any[]>;
    /**
     * Create a parsing stream.
     *
     * @param {object} [options={}]
     * @param {number} [options.max_depth=-1] - the maximum depth to parse.
     *   Use -1 for "until you run out of memory".  Set this to a finite
     *   positive number for un-trusted inputs.  Most standard inputs won't nest
     *   more than 100 or so levels; I've tested into the millions before
     *   running out of memory.
     * @param {object} [options.tags] - mapping from tag number to function(v),
     *   where v is the decoded value that comes after the tag, and where the
     *   function returns the correctly-created value for that tag.
     * @param {boolean} [options.bigint=true] generate JavaScript BigInt's
     *   instead of BigNumbers, when possible.
     */
    constructor(options?: {
        max_depth: number;
        tags: object;
        bigint: boolean;
    });
    running: boolean;
    max_depth: number;
    tags: any;
    bigint: boolean;
    /**
     * Stop processing
     */
    close(): void;
}
declare namespace Decoder {
    export { NOT_FOUND };
}
import BinaryParseStream = require("../vendor/binary-parse-stream");
import stream = require("node/stream");
declare const NOT_FOUND: unique symbol;
