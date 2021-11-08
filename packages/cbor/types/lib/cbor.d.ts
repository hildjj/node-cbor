export var Commented: typeof import("./commented");
export var Diagnose: typeof import("./diagnose");
export var Decoder: typeof import("./decoder");
export var Encoder: typeof import("./encoder");
export var Simple: typeof import("./simple");
export var Tagged: typeof import("./tagged");
export var Map: typeof import("./map");
export namespace leveldb {
    const decode: typeof import("./decoder").decodeFirstSync;
    const encode: typeof import("./encoder").encode;
    const buffer: boolean;
    const name: string;
}
export function reset(): void;
export { comment, decodeAll, decodeFirst, decodeAllSync, decodeFirstSync, diagnose, encode, encodeCanonical, encodeOne, encodeAsync, decodeFirstSync as decode };
