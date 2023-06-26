/// <reference types="node" />
/**
 * Generate the expanded format of RFC 8949, section 3.2.2.
 */
export class Commented extends Transform {
    /**
     * Comment on an input Buffer or string, creating a string passed to the
     * callback.  If callback not specified, a promise is returned.
     *
     * @param {string|Buffer|ArrayBuffer|Uint8Array|Uint8ClampedArray
     *   |DataView|import('stream').Readable} input Something to parse.
     * @param {CommentOptions|commentCallback|string|number} [options={}]
     *   Encoding, max_depth, or callback.
     * @param {commentCallback} [cb] If specified, called on completion.
     * @returns {Promise} If cb not specified.
     * @throws {Error} Input required.
     * @static
     */
    static comment(input: string | Buffer | ArrayBuffer | Uint8Array | Uint8ClampedArray | DataView | import('stream').Readable, options?: CommentOptions | commentCallback | string | number, cb?: commentCallback): Promise<any>;
    /**
     * Create a CBOR commenter.
     *
     * @param {CommentOptions} [options={}] Stream options.
     */
    constructor(options?: CommentOptions);
    depth: number;
    max_depth: number;
    all: NoFilter;
    parser: Decoder;
    /**
     * @param {Buffer} v Descend into embedded CBOR.
     * @private
     */
    private _tag_24;
    /**
     * @ignore
     */
    _on_error(er: any): void;
    /**
     * @ignore
     */
    _on_read(buf: any): void;
    /**
     * @ignore
     */
    _on_more(mt: any, len: any, parent_mt: any, pos: any): void;
    /**
     * @ignore
     */
    _on_start_string(mt: any, len: any, parent_mt: any, pos: any): void;
    /**
     * @ignore
     */
    _on_start(mt: any, tag: any, parent_mt: any, pos: any): void;
    /**
     * @ignore
     */
    _on_stop(mt: any): void;
    /**
     * @private
     */
    private _on_value;
    /**
     * @ignore
     */
    _on_data(): void;
}
export type CommentOptions = {
    /**
     * How many times to indent
     * the dashes.
     */
    max_depth?: number;
    /**
     * Initial indentation depth.
     */
    depth?: number;
    /**
     * If true, omit the summary
     * of the full bytes read at the end.
     */
    no_summary?: boolean;
    /**
     * Mapping from tag number to function(v),
     * where v is the decoded value that comes after the tag, and where the
     * function returns the correctly-created value for that tag.
     */
    tags?: object;
    /**
     * If true, prefer Uint8Arrays to
     * be generated instead of node Buffers.  This might turn on some more
     * changes in the future, so forward-compatibility is not guaranteed yet.
     */
    preferWeb?: boolean;
    /**
     * Encoding to use for input, if it
     * is a string.
     */
    encoding?: BufferEncoding;
};
export type commentCallback = (error?: Error, commented?: string) => void;
import { Transform } from 'stream';
import { NoFilter } from 'nofilter';
import { Decoder } from './decoder.js';
import { Buffer } from 'buffer';
