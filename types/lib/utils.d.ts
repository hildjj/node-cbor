export function utf8(buf: any): string;
export namespace utf8 {
    const checksUTF8: boolean;
}
export function parseCBORint(ai: any, buf: any, bigInt?: boolean): any;
export function writeHalf(buf: any, half: any): boolean;
export function parseHalf(buf: any): number;
export function parseCBORfloat(buf: any): any;
export function hex(s: any): Buffer;
export function bin(s: any): Buffer;
export function extend(old?: {}, ...adds: any[]): {};
export function arrayEqual(a: any, b: any): any;
export function bufferEqual(a: any, b: any): boolean;
export function bufferToBignumber(buf: any): bignumber;
export function bufferToBigInt(buf: any): bigint;
export function cborValueToString(val: any, float_bytes?: number): string;
export function guessEncoding(input: any, encoding: any): any;
import bignumber_1 = require("bignumber.js");
import bignumber = bignumber_1.BigNumber;
