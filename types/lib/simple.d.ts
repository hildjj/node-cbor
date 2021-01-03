/// <reference types="node" />
export = Simple;
/**
 * A CBOR Simple Value that does not map onto a known constant.
 */
declare class Simple {
    /**
     * Is the given object a Simple?
     *
     * @param {any} obj - object to test
     * @returns {boolean} - is it Simple?
     */
    static isSimple(obj: any): boolean;
    /**
     * Decode from the CBOR additional information into a JavaScript value.
     * If the CBOR item has no parent, return a "safe" symbol instead of
     * `null` or `undefined`, so that the value can be passed through a
     * stream in object mode.
     *
     * @param {number} val - the CBOR additional info to convert
     * @param {boolean} [has_parent=true] - Does the CBOR item have a parent?
     * @param {boolean} [parent_indefinite=false] - Is the parent element
     *   indefinitely encoded?
     * @returns {(null|undefined|boolean|Symbol|Simple)} - the decoded value
     */
    static decode(val: number, has_parent?: boolean, parent_indefinite?: boolean): (null | undefined | boolean | Symbol | Simple);
    /**
     * Creates an instance of Simple.
     *
     * @param {number} value - the simple value's integer value
     */
    constructor(value: number);
    value: number;
    /**
     * Debug string for simple value
     *
     * @returns {string} simple(value)
     */
    toString(): string;
    /**
     * Debug string for simple value (backward-compatibility version)
     *
     * @returns {string} simple(value)
     */
    inspect(depth: any, opts: any): string;
    /**
     * Push the simple value onto the CBOR stream
     *
     * @param {Object} gen The generator to push onto
     */
    encodeCBOR(gen: any): any;
    /**
     * Debug string for simple value
     *
     * @returns {string} simple(value)
     */
    [util.inspect.custom](depth: any, opts: any): string;
}
import util = require("util");
