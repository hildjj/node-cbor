export = CborMap;
/**
 * Wrapper around a JavaScript Map object that allows the keys to be
 * any complex type.  The base Map object allows this, but will only
 * compare the keys by identity, not by value.  CborMap translates keys
 * to CBOR first (and base64's them to ensure by-value comparison).
 *
 * This is not a subclass of Object, because it would be tough to get
 * the semantics to be an exact match.
 *
 * @class CborMap
 * @extends {Map}
 */
declare class CborMap extends Map<any, any> {
    /**
     * @private
     */
    private static _encode;
    /**
     * @private
     */
    private static _decode;
    /**
     * Creates an instance of CborMap.
     * @param {Iterable<[any, any]>} [iterable] An Array or other iterable
     *   object whose elements are key-value pairs (arrays with two elements, e.g.
     *   <code>[[ 1, 'one' ],[ 2, 'two' ]]</code>). Each key-value pair is added
     *   to the new CborMap; null values are treated as undefined.
     */
    constructor(iterable?: Iterable<[any, any]>);
    /**
     * Push the simple value onto the CBOR stream
     *
     * @param {Object} gen The generator to push onto
     * @returns {boolean} true on success
     */
    encodeCBOR(gen: any): boolean;
}
