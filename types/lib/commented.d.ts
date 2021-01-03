export = Commented;
/**
 * Generate the expanded format of RFC 7049, section 2.2.1
 *
 * @extends {stream.Transform}
 */
declare class Commented extends stream.Transform {
    /**
     * @callback commentCallback
     * @param {Error} [error] - if one was generated
     * @param {string} [commented] - the comment string
     */
    /**
     * @typedef CommentOptions
     * @property {number} [max_depth=10] how many times to indent the dashes
     * @property {string} [encoding='hex'] encoding of the input
     */
    /**
     * Comment on an input Buffer or string, creating a string passed to the
     * callback.  If callback not specified, a promise is returned.
     *
     * @static
     * @param {string|Buffer|ArrayBuffer|Uint8Array|Uint8ClampedArray
     *   |DataView|stream.Readable} input
     * @param {CommentOptions|commentCallback|string} [options] or callback
     * @param {commentCallback=} cb
     * @returns {Promise} if cb not specified
     */
    static comment(input: string | Buffer | ArrayBuffer | Uint8Array | Uint8ClampedArray | DataView | stream.Readable, options?: string | {
        /**
         * how many times to indent the dashes
         */
        max_depth?: number;
        /**
         * encoding of the input
         */
        encoding?: string;
    } | ((error?: Error, commented?: string) => any), cb?: (error?: Error, commented?: string) => any): Promise<any>;
    /**
     * Create a CBOR commenter.
     *
     * @param {object} [options={}] - Stream options
     * @param {number} [options.max_depth=10] - how many times to indent
     *   the dashes
     * @param {number} [options.depth=1] - initial indentation depth
     * @param {boolean} [options.no_summary=false] - if true, omit the summary
     *   of the full bytes read at the end
     * @param {object} [options.tags] - mapping from tag number to function(v),
     *   where v is the decoded value that comes after the tag, and where the
     *   function returns the correctly-created value for that tag.
     */
    constructor(options?: {
        max_depth: number;
        depth: number;
        no_summary: boolean;
        tags: object;
    });
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
import stream = require("node/stream");
import Decoder = require("./decoder");
