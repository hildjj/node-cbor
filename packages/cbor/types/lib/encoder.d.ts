/// <reference types="node" />
export = Encoder;
/**
 * @typedef EncodingOptions
 * @property {any[]|Object} [genTypes=[]] - array of pairs of
 *   `type`, `function(Encoder)` for semantic types to be encoded.  Not
 *   needed for Array, Date, Buffer, Map, RegExp, Set, or URL.
 *   If an object, the keys are the constructor names for the types.
 * @property {boolean} [canonical=false] - should the output be
 *   canonicalized
 * @property {boolean|WeakSet} [detectLoops=false] - should object loops
 *   be detected?  This will currently add memory to track every part of the
 *   object being encoded in a WeakSet.  Do not encode
 *   the same object twice on the same encoder, without calling
 *   `removeLoopDetectors` in between, which will clear the WeakSet.
 *   You may pass in your own WeakSet to be used; this is useful in some
 *   recursive scenarios.
 * @property {("number"|"float"|"int"|"string")} [dateType="number"] -
 *   how should dates be encoded?  "number" means float or int, if no
 *   fractional seconds.
 * @property {any} [encodeUndefined=undefined] - How should an
 *   "undefined" in the input be encoded.  By default, just encode a CBOR
 *   undefined.  If this is a buffer, use those bytes without re-encoding
 *   them.  If this is a function, the function will be called (which is a
 *   good time to throw an exception, if that's what you want), and the
 *   return value will be used according to these rules.  Anything else will
 *   be encoded as CBOR.
 * @property {boolean} [disallowUndefinedKeys=false] - Should
 *   "undefined" be disallowed as a key in a Map that is serialized?  If
 *   this is true, encode(new Map([[undefined, 1]])) will throw an
 *   exception.  Note that it is impossible to get a key of undefined in a
 *   normal JS object.
 * @property {boolean} [collapseBigIntegers=false] - Should integers
 *   that come in as ECMAscript bigint's be encoded
 *   as normal CBOR integers if they fit, discarding type information?
 * @property {number} [chunkSize=4096] - Number of characters or bytes
 *   for each chunk, if obj is a string or Buffer, when indefinite encoding
 * @property {boolean} [omitUndefinedProperties=false] - When encoding
 *   objects or Maps, do not include a key if its corresponding value is
 *   `undefined`.
 */
/**
 * Transform JavaScript values into CBOR bytes.  The `Writable` side of
 * the stream is in object mode.
 *
 * @extends {stream.Transform}
 */
declare class Encoder extends stream.Transform {
    /**
     * Encode the given object with indefinite length.  There are apparently
     * some (IMO) broken implementations of poorly-specified protocols that
     * REQUIRE indefinite-encoding.  Add this to an object or class as the
     * `encodeCBOR` function to get indefinite encoding:
     * @example
     * const o = {
     *   a: true,
     *   encodeCBOR: cbor.Encoder.encodeIndefinite
     * }
     * const m = []
     * m.encodeCBOR = cbor.Encoder.encodeIndefinite
     * cbor.encodeOne([o, m])
     *
     * @param {Encoder} gen - the encoder to use
     * @param {String|Buffer|Array|Map|Object} [obj] - the object to encode.  If
     *   null, use "this" instead.
     * @param {EncodingOptions} [options={}] - Options for encoding
     * @returns {boolean} - true on success
     */
    static encodeIndefinite(gen: Encoder, obj?: string | Buffer | any[] | Map<any, any> | any, options?: EncodingOptions): boolean;
    /**
     * Encode one or more JavaScript objects, and return a Buffer containing the
     * CBOR bytes.
     *
     * @param {...any} objs - the objects to encode
     * @returns {Buffer} - the encoded objects
     */
    static encode(...objs: any[]): Buffer;
    /**
     * Encode one or more JavaScript objects canonically (slower!), and return
     * a Buffer containing the CBOR bytes.
     *
     * @param {...any} objs - the objects to encode
     * @returns {Buffer} - the encoded objects
     */
    static encodeCanonical(...objs: any[]): Buffer;
    /**
     * Encode one JavaScript object using the given options.
     *
     * @static
     * @param {any} obj - the object to encode
     * @param {EncodingOptions} [options={}] - passed to the Encoder constructor
     * @returns {Buffer} - the encoded objects
     */
    static encodeOne(obj: any, options?: EncodingOptions): Buffer;
    /**
     * Encode one JavaScript object using the given options in a way that
     * is more resilient to objects being larger than the highWaterMark
     * number of bytes.  As with the other static encode functions, this
     * will still use a large amount of memory.  Use a stream-based approach
     * directly if you need to process large and complicated inputs.
     *
     * @param {any} obj - the object to encode
     * @param {EncodingOptions} [options={}] - passed to the Encoder constructor
     */
    static encodeAsync(obj: any, options?: EncodingOptions): Promise<any>;
    /**
     * Creates an instance of Encoder.
     *
     * @param {EncodingOptions} [options={}] - options for the encoder
     */
    constructor(options?: EncodingOptions);
    canonical: boolean;
    encodeUndefined: any;
    disallowUndefinedKeys: boolean;
    dateType: "string" | "number" | "float" | "int";
    collapseBigIntegers: boolean;
    /** @type WeakSet? */
    detectLoops: WeakSet<any> | null;
    omitUndefinedProperties: boolean;
    semanticTypes: {
        [x: string]: ((gen: any, obj: any, opts: any) => boolean) | ((gen: any, obj: any) => any);
        [x: number]: (gen: any, obj: any) => any;
        Array: (gen: any, obj: any, opts: any) => boolean;
        Date: (gen: any, obj: any) => any;
        Buffer: (gen: any, obj: any) => any;
        Map: (gen: any, obj: any, opts: any) => boolean;
        NoFilter: (gen: any, obj: any) => any;
        RegExp: (gen: any, obj: any) => any;
        Set: (gen: any, obj: any) => boolean;
        ArrayBuffer: (gen: any, obj: any) => any;
        Uint8ClampedArray: (gen: any, obj: any) => any;
        Uint8Array: (gen: any, obj: any) => any;
        Uint16Array: (gen: any, obj: any) => any;
        Uint32Array: (gen: any, obj: any) => any;
        Int8Array: (gen: any, obj: any) => any;
        Int16Array: (gen: any, obj: any) => any;
        Int32Array: (gen: any, obj: any) => any;
        Float32Array: (gen: any, obj: any) => any;
        Float64Array: (gen: any, obj: any) => any;
        URL: (gen: any, obj: any) => any;
        Boolean: (gen: any, obj: any) => any;
        Number: (gen: any, obj: any) => any;
        String: (gen: any, obj: any) => any;
    };
    /**
     * @callback encodeFunction
     * @param {Encoder} encoder - the encoder to serialize into.  Call "write"
     *   on the encoder as needed.
     * @return {boolean} - true on success, else false
     */
    /**
     * Add an encoding function to the list of supported semantic types.  This is
     * useful for objects for which you can't add an encodeCBOR method
     *
     * @param {any} type
     * @param {any} fun
     * @returns {encodeFunction}
     */
    addSemanticType(type: any, fun: any): (encoder: Encoder) => boolean;
    _pushUInt8(val: any): boolean;
    _pushUInt16BE(val: any): boolean;
    _pushUInt32BE(val: any): boolean;
    _pushFloatBE(val: any): boolean;
    _pushDoubleBE(val: any): boolean;
    _pushNaN(): boolean;
    _pushInfinity(obj: any): boolean;
    _pushFloat(obj: any): boolean;
    _pushInt(obj: any, mt: any, orig: any): boolean;
    _pushIntNum(obj: any): boolean;
    _pushNumber(obj: any): boolean;
    _pushString(obj: any): boolean;
    _pushBoolean(obj: any): boolean;
    _pushUndefined(obj: any): boolean;
    _pushNull(obj: any): boolean;
    _pushArray(gen: any, obj: any, opts: any): boolean;
    _pushTag(tag: any): boolean;
    _pushDate(gen: any, obj: any): any;
    _pushBuffer(gen: any, obj: any): any;
    _pushNoFilter(gen: any, obj: any): any;
    _pushRegexp(gen: any, obj: any): any;
    _pushSet(gen: any, obj: any): boolean;
    _pushURL(gen: any, obj: any): any;
    _pushBoxed(gen: any, obj: any): any;
    /**
     * @param {bigint} obj
     * @private
     */
    private _pushJSBigint;
    _pushMap(gen: any, obj: any, opts: any): boolean;
    _pushTypedArray(gen: any, obj: any): any;
    _pushArrayBuffer(gen: any, obj: any): any;
    /**
     * Remove the loop detector WeakSet for this Encoder.
     *
     * @returns {boolean} - true when the Encoder was reset, else false
     */
    removeLoopDetectors(): boolean;
    _pushObject(obj: any, opts: any): any;
    /**
     * Push any supported type onto the encoded stream
     *
     * @param {any} obj
     * @returns {boolean} true on success
     */
    pushAny(obj: any): boolean;
    _pushAny(obj: any): boolean;
    _encodeAll(objs: any): any;
}
declare namespace Encoder {
    export { EncodingOptions };
}
import stream = require("stream");
import { Buffer } from "buffer";
type EncodingOptions = {
    /**
     * - array of pairs of
     * `type`, `function(Encoder)` for semantic types to be encoded.  Not
     * needed for Array, Date, Buffer, Map, RegExp, Set, or URL.
     * If an object, the keys are the constructor names for the types.
     */
    genTypes?: any[] | any;
    /**
     * - should the output be
     * canonicalized
     */
    canonical?: boolean;
    /**
     * - should object loops
     * be detected?  This will currently add memory to track every part of the
     * object being encoded in a WeakSet.  Do not encode
     * the same object twice on the same encoder, without calling
     * `removeLoopDetectors` in between, which will clear the WeakSet.
     * You may pass in your own WeakSet to be used; this is useful in some
     * recursive scenarios.
     */
    detectLoops?: boolean | WeakSet<any>;
    /**
     * -
     * how should dates be encoded?  "number" means float or int, if no
     * fractional seconds.
     */
    dateType?: ("number" | "float" | "int" | "string");
    /**
     * - How should an
     * "undefined" in the input be encoded.  By default, just encode a CBOR
     * undefined.  If this is a buffer, use those bytes without re-encoding
     * them.  If this is a function, the function will be called (which is a
     * good time to throw an exception, if that's what you want), and the
     * return value will be used according to these rules.  Anything else will
     * be encoded as CBOR.
     */
    encodeUndefined?: any;
    /**
     * - Should
     * "undefined" be disallowed as a key in a Map that is serialized?  If
     * this is true, encode(new Map([[undefined, 1]])) will throw an
     * exception.  Note that it is impossible to get a key of undefined in a
     * normal JS object.
     */
    disallowUndefinedKeys?: boolean;
    /**
     * - Should integers
     * that come in as ECMAscript bigint's be encoded
     * as normal CBOR integers if they fit, discarding type information?
     */
    collapseBigIntegers?: boolean;
    /**
     * - Number of characters or bytes
     * for each chunk, if obj is a string or Buffer, when indefinite encoding
     */
    chunkSize?: number;
    /**
     * - When encoding
     * objects or Maps, do not include a key if its corresponding value is
     * `undefined`.
     */
    omitUndefinedProperties?: boolean;
};
