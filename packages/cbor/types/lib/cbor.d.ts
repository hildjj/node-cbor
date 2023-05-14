export const Commented: typeof import("./commented");
export const Diagnose: typeof import("./diagnose");
export const Decoder: typeof import("./decoder");
export const Encoder: typeof import("./encoder");
export const Simple: typeof import("./simple");
export const Tagged: typeof import("./tagged");
export const Map: typeof import("./map");
export const SharedValueEncoder: typeof import("./sharedValueEncoder");
export namespace leveldb {
    const decode: typeof import("./decoder").decodeFirstSync;
    const encode: typeof import("./encoder").encode;
    const buffer: boolean;
    const name: string;
}
export function reset(): void;
export { comment, decodeAll, decodeFirst, decodeAllSync, decodeFirstSync, diagnose, encode, encodeCanonical, encodeOne, encodeAsync, decodeFirstSync as decode };
