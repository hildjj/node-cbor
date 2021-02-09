/// <reference types="node" />
export = Tagged;
/**
 * A CBOR tagged item, where the tag does not have semantics specified at the
 * moment, or those semantics threw an error during parsing. Typically this will
 * be an extension point you're not yet expecting.
 */
declare class Tagged {
    static _tag_0(v: any): Date;
    static _tag_1(v: any): Date;
    static _tag_2(v: any): BigNumber;
    static _tag_3(v: any): BigNumber;
    static _tag_4(v: any): BigNumber;
    static _tag_5(v: any): BigNumber;
    static _tag_32(v: any): url.UrlWithStringQuery;
    static _tag_35(v: any): RegExp;
    /**
     * Creates an instance of Tagged.
     *
     * @param {number} tag - the number of the tag
     * @param {any} value - the value inside the tag
     * @param {Error} [err] - the error that was thrown parsing the tag, or null
     */
    constructor(tag: number, value: any, err?: Error);
    tag: number;
    value: any;
    err: Error;
    /**
     * Convert to a String
     *
     * @returns {string} string of the form '1(2)'
     */
    toString(): string;
    /**
     * Push the simple value onto the CBOR stream
     *
     * @param {Object} gen The generator to push onto
     */
    encodeCBOR(gen: any): any;
    /**
     * If we have a converter for this type, do the conversion.  Some converters
     * are built-in.  Additional ones can be passed in.  If you want to remove
     * a built-in converter, pass a converter in whose value is 'null' instead
     * of a function.
     *
     * @param {Object} converters - keys in the object are a tag number, the value
     *   is a function that takes the decoded CBOR and returns a JavaScript value
     *   of the appropriate type.  Throw an exception in the function on errors.
     * @returns {any} - the converted item
     */
    convert(converters: any): any;
}
import { BigNumber } from "./constants";
import url = require("url");
