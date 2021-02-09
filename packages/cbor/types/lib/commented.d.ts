export = Commented;
/**
 * Generate the expanded format of RFC 7049, section 2.2.1
 *
 * @extends {stream.Transform}
 */
declare class Commented extends stream.Transform {
    /**
     * Comment on an input Buffer or string, creating a string passed to the
     * callback.  If callback not specified, a promise is returned.
     *
     * @static
     * @param {string|Buffer|ArrayBuffer|Uint8Array|Uint8ClampedArray
     *   |DataView|stream.Readable} input
     * @param {CommentOptions|commentCallback|string|number} [options={}]
     *   encoding, max_depth, or callback
     * @param {commentCallback} [cb] - called on completion
     * @returns {Promise} if cb not specified
     */
    static comment(input: string | Buffer | ArrayBuffer | Uint8Array | Uint8ClampedArray | DataView | stream.Readable, options?: CommentOptions | commentCallback | string | number, cb?: commentCallback): Promise<any>;
    /**
     * Create a CBOR commenter.
     *
     * @param {CommentOptions} [options={}] - Stream options
     */
    constructor(options?: CommentOptions);
    depth: number;
    max_depth: number;
    all: any;
    parser: Decoder;
    /**
     * @private
     */
    private _tag_24;
    /**
     * @private
     */
    private _on_error;
    /**
     * @private
     */
    private _on_read;
    /**
     * @private
     */
    private _on_more;
    /**
     * @private
     */
    private _on_start_string;
    /**
     * @private
     */
    private _on_start;
    /**
     * @private
     */
    private _on_stop;
    /**
     * @private
     */
    private _on_value;
    /**
     * @private
     */
    private _on_data;
}
declare namespace Commented {
    export { CommentOptions, commentCallback };
}
import stream = require("stream");
import Decoder = require("./decoder");
type CommentOptions = {
    /**
     * - how many times to indent
     * the dashes
     */
    max_depth?: number;
    /**
     * - initial indentation depth
     */
    depth?: number;
    /**
     * - if true, omit the summary
     * of the full bytes read at the end
     */
    no_summary?: boolean;
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
     * - Encoding to use for input, if it
     * is a string
     */
    encoding?: string;
};
type commentCallback = (error?: Error, commented?: string) => any;
