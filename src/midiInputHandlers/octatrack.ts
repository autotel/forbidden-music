import { MidiInputHandlerFactory } from "./inputHandlerTypes";

const midiLog = (...p: (string | number)[]) => {
    const transformedLog = p.map((p) => {
        if (typeof p === "number") {
            return p.toString(16)
        }
        return p
    });
    console.log(...transformedLog)
}

const midiTickIntervalToBpm = (tickInterval: number) => {
    const ticksPerSecond = 1 / tickInterval;
    return ticksPerSecond * 60000 / 24;
}

const octatrackMidiInputHandler: MidiInputHandlerFactory = (tick: () => void, play: () => void, stop: () => void, skip: (to: number) => void) => ({
    name: "octatrack",
    notes: [
        'follows play and stop',
        'does not sync to clock',
        'send midi notes to channel 16 to jump to a time',
        'time is determined by the note',
    ],
    messageState: 0,
    lastClockReceived: null as number | null,
    measuredBpm: null as number | null,
    isPlaying: false,
    startAction() {
        this.isPlaying = true;
        this.lastClockReceived = null;
        play();
    },
    stopAction() {
        this.isPlaying = false;
        stop();
    },
    clockAction(timestamp: number) {
        if (!this.isPlaying) return;
        tick()
    },
    nibbleAction(midi: number[], ts: number) {
        const [status, b1, b2] = midi;
        const head = status >> 4;
        switch (head) {
            case 0x9:
                if(status !== 0x9f) return false; // only chan 16
                if(b2 === 0) {
                    // bc. user might "preview" a note
                    midiLog("note off - stop", b1, b2);
                    this.stopAction();
                    return true;
                }
                midiLog("note on - skip", b1, "ignoring", b2);
                if(!this.isPlaying) {
                    this.startAction();
                }
                skip(b1); // could use velo for more range, or precision. it could cause confusion, though.
                return true;
            case 0x8:
                midiLog("note off - stop", b1, b2);
                this.stopAction();
                return true;
        }
        return false;

    },
    accumulatingMessageCase(midi: number[], ts: number) {
        if (!this.messageState) return false;
        // midiLog("\t>>", ...midi);
        return true;
    },
    headAction(midi: number[], ts: number) {
        const [head, d1, d2] = midi
        switch (head) {
            case 0xC0: {
                console.log("program change", d1, d2)
                const to = d1 - 0x10;
                console.log(" ->", to);
                return true;
            }
            case 0xF2: {
                console.log("jump", d1, d2)
                const to = (d1 + d2 * 128) / 4;
                skip(to);
                return true;
            }
            case 0xF8: {
                midiLog("clox", d1, d2)
                this.clockAction(ts)
                return true;
            }
            case 0xFA: {
                midiLog("area started", d1, d2)
                this.startAction();
                return true;
            }
            case 0xFB: {
                play();
                return true;
            }
            case 0xFC: {
                midiLog("area stopped", d1, d2)
                this.stopAction();
                return true;
            }

        }
        return false
    },
    inputAction(midi: number[], timeStamp: number) {
        if (this.accumulatingMessageCase(midi, timeStamp)) {
            return;
        }
        if (this.nibbleAction(midi, timeStamp)) {
            return;
        }
        if (this.headAction(midi, timeStamp)) {
            return;
        }
        midiLog("unrecognizable message", ...midi);
    }
})
export default octatrackMidiInputHandler;