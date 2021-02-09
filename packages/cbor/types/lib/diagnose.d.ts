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
     * @param {DiagnoseOptions |diagnoseCallback|string} [options={}] -
     *   options, the callback, or the input encoding
     * @param {diagnoseCallback} [cb] - callback
     * @returns {Promise} if callback not specified
     */
    static diagnose(input: string | Buffer | ArrayBuffer | Uint8Array | Uint8ClampedArray | DataView | stream.Readable, options?: DiagnoseOptions | diagnoseCallback | string, cb?: diagnoseCallback): Promise<any>;
    /**
     * Creates an instance of Diagnose.
     *
     * @param {DiagnoseOptions} [options={}] - options for creation
     */
    constructor(options?: DiagnoseOptions);
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
declare namespace Diagnose {
    export { DiagnoseOptions, diagnoseCallback };
}
import stream = require("stream");
import Decoder = require("./decoder");
type DiagnoseOptions = {
    /**
     * - output between detected objects
     */
    separator?: string;
    /**
     * - put error info into the
     * output stream
     */
    stream_errors?: boolean;
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
     * - if true, prefer Uint8Arrays to
     * be generated instead of node Buffers.  This might turn on some more
     * changes in the future, so forward-compatibility is not guaranteed yet.
     */
    preferWeb?: boolean;
    /**
     * - the encoding of input, ignored if
     * input is not string
     */
    encoding?: string;
};
type diagnoseCallback = (error?: Error, value?: string) => any;
