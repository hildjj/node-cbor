export = BinaryParseStream;
/**
 * BinaryParseStream is a TransformStream that consumes buffers and outputs
 * objects on the other end.  It expects your subclass to implement a `_parse`
 * method that is a generator.  When your generator yields a number, it'll be
 * fed a buffer of that length from the input.  When your generator returns,
 * the return value will be pushed to the output side.
 *
 * @class BinaryParseStream
 * @extends {TransformStream}
 */
declare class BinaryParseStream extends Stream.Transform {
    constructor(options: any);
    bs: any;
    __fresh: boolean;
    __needed: number;
    /**
     * @abstract
     * @protected
     * @returns {Generator<number, undefined, Buffer>}
     */
    protected _parse(): Generator<number, undefined, Buffer>;
    __restart(): void;
    __parser: Generator<number, undefined, Buffer>;
}
import Stream = require("stream");
