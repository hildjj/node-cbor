/**
 * Reset all CBOR state information.
 */
export function reset(): void;
export { Simple } from "./simple.js";
export { CborMap as Map } from "./map.js";
export { SharedValueEncoder } from "./sharedValueEncoder.js";
import { Decoder } from './decoder.js';
export const decode: typeof Decoder.decodeFirstSync;
export const decodeAll: typeof Decoder.decodeAll;
export const decodeAllSync: typeof Decoder.decodeAllSync;
export const decodeFirst: typeof Decoder.decodeFirst;
export const decodeFirstSync: typeof Decoder.decodeFirstSync;
import { Commented } from './commented.js';
export const comment: typeof Commented.comment;
import { Diagnose } from './diagnose.js';
export const diagnose: typeof Diagnose.diagnose;
import { Encoder } from './encoder.js';
export const encode: typeof Encoder.encode;
export const encodeAsync: typeof Encoder.encodeAsync;
export const encodeCanonical: typeof Encoder.encodeCanonical;
export const encodeOne: typeof Encoder.encodeOne;
import { Tagged } from './tagged.js';
export namespace leveldb {
    const decode: typeof Decoder.decodeFirstSync;
    const encode: typeof Encoder.encode;
    const buffer: boolean;
    const name: string;
}
export { Decoder, Commented, Diagnose, Encoder, Tagged };
