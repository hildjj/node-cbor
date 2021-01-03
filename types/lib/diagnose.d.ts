export = Diagnose;
/**
 * Output the diagnostic format from a stream of CBOR bytes.
 *
 * @extends {stream.Transform}
 */
declare class Diagnose extends stream.Transform {
    /**
     * Convenience function to return a string in diagnostic format.
     *
     * @param {string|Buffer|ArrayBuffer|Uint8Array|Uint8ClampedArray
     *   |DataView|stream.Readable} input - the CBOR bytes to format
     * @param {string} [encoding='hex'] - the encoding of input, ignored if
     *   input is not string
     * @param {function(Error, string): undefined} [cb] - callback
     * @returns {Promise} if callback not specified
     */
    static diagnose(input: string | Buffer | ArrayBuffer | Uint8Array | Uint8ClampedArray | DataView | stream.Readable, encoding?: string, cb?: (arg0: Error, arg1: string) => undefined): Promise<any>;
    /**
     * Creates an instance of Diagnose.
     *
     * @param {Object} [options={}] - options for creation
     * @param {string} [options.separator='\n'] - output between detected objects
     * @param {boolean} [options.stream_errors=false] - put error info into the
     *   output stream
     * @param {number} [options.max_depth=-1] - -1 for "until you run out of
     *   memory".  Set this to a finite positive number for un-trusted inputs.
     *   Most standard inputs won't nest more than 100 or so levels; I've tested
     *   into the millions before running out of memory.
     */
    constructor(options?: {
        separator: string;
        stream_errors: boolean;
        max_depth: number;
    });
    float_bytes: number;
    separator: string;
    stream_errors: boolean;
    parser: Decoder;
    _on_error(er: any): boolean;
    _on_more(mt: any, len: any, parent_mt: any, pos: any): any;
    _fore(parent_mt: any, pos: any): boolean;
    _on_value(val: any, parent_mt: any, pos: any): boolean;
    _on_start(mt: any, tag: any, parent_mt: any, pos: any): boolean;
    _on_stop(mt: any): boolean;
    _on_data(): boolean;
}
import stream = require("node/stream");
import Decoder = require("./decoder");
