export = SharedValueEncoder;
/** @import {EncodingOptions, ObjectOptions} from ('./encoder') */
/**
 * Implement value sharing.
 *
 * @see {@link cbor.schmorp.de/value-sharing}
 */
declare class SharedValueEncoder extends Encoder {
    /**
     * Encode one JavaScript object using the given options.
     *
     * @param {any} obj The object to encode.
     * @param {EncodingOptions} [options={}]
     *   Passed to the Encoder constructor.
     * @returns {Buffer} The encoded objects.
     */
    static encodeOne(obj: any, options?: EncodingOptions): Buffer;
    /**
     * Encode one JavaScript object using the given options in a way that
     * is more resilient to objects being larger than the highWaterMark
     * number of bytes.  As with the other static encode functions, this
     * will still use a large amount of memory.  Use a stream-based approach
     * directly if you need to process large and complicated inputs.
     *
     * @param {any} obj The object to encode.
     * @param {EncodingOptions} [options={}]
     *   Passed to the Encoder constructor.
     * @returns {Promise<Buffer>} A promise for the encoded buffer.
     */
    static encodeAsync(obj: any, options?: EncodingOptions): Promise<Buffer>;
    constructor(opts: any);
    valueSharing: ObjectRecorder;
    /**
     * @param {object} obj Object to encode.
     * @param {ObjectOptions} [opts] Options for encoding
     *   this object.
     * @returns {boolean} True on success.
     * @throws {Error} Loop detected.
     * @ignore
     */
    _pushObject(obj: object, opts?: ObjectOptions): boolean;
    /**
     * Between encoding runs, stop recording, and start outputing correct tags.
     */
    stopRecording(): void;
    /**
     * Remove the existing recording and start over.  Do this between encoding
     * pairs.
     */
    clearRecording(): void;
}
import Encoder = require("./encoder");
import ObjectRecorder = require("./objectRecorder");
import { Buffer } from "node:buffer";
