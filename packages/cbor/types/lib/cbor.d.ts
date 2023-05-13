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
export const comment: typeof import("./commented").comment;
export const decodeAll: typeof import("./decoder").decodeAll;
export const decodeAllSync: typeof import("./decoder").decodeAllSync;
export const decodeFirst: typeof import("./decoder").decodeFirst;
export const decodeFirstSync: typeof import("./decoder").decodeFirstSync;
export const decode: typeof import("./decoder").decodeFirstSync;
export const diagnose: typeof import("./diagnose").diagnose;
export const encode: typeof import("./encoder").encode;
export const encodeCanonical: typeof import("./encoder").encodeCanonical;
export const encodeOne: typeof import("./encoder").encodeOne;
export const encodeAsync: typeof import("./encoder").encodeAsync;
