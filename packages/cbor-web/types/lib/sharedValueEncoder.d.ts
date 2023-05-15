/**
 * Implement value sharing.
 *
 * @see {@link http://cbor.schmorp.de/value-sharing}
 */
export class SharedValueEncoder extends Encoder {
    constructor(opts: any);
    /**
     * @type {ObjectRecorder}
     * @private
     */
    private valueSharing;
    /**
     * Between encoding runs, stop recording, and start outputing correct tags.
     */
    stopRecording(): void;
    /**
     * Remove the existing recording and start over.  Do this between encoding
     * pairs.
     */
    clearRecording(): void;
}
import { Encoder } from './encoder.js';
