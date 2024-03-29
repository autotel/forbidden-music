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

const reaperMidiInputHandler:MidiInputHandlerFactory = (tick: () => void, play:()=>void, stop:()=>void, skip:(to:number)=>void) => ({
    name: "reaper",
    notes: [
        'follows playback, jumps and stops within a range',
        'does not sync to clock',
    ],
    messageState: 0,
    lastClockReceived: null as number | null,
    measuredBpm: null as number | null,
    startAction(){
        this.lastClockReceived = null;
        play();
    },
    stopAction(){
        stop();
    },
    clockAction(timestamp: number) {
        // not working 
        // if (this.lastClockReceived !== null) {
            // const tickInterval = timestamp - this.lastClockReceived 
            // if(!this.measuredBpm) this.measuredBpm = midiTickIntervalToBpm(tickInterval);
            // this.measuredBpm = midiTickIntervalToBpm(tickInterval) * 0.01 + this.measuredBpm * 0.99;
            // console.log("bpm?",this.measuredBpm)
        // }
        // this.lastClockReceived = timestamp;
        tick()
    },
    caseAction(midi: number[], ts: number) {
        if (!this.messageState) return false;
        // midiLog("\t>>", ...midi);
        return true;
    },
    headAction(midi: number[], ts: number) {
        const [head, d1, d2] = midi
        switch (head) {
            case 0xF2:
                // console.log("jump", d1, d2)
                const to = (d1 + d2 * 128) / 4;
                skip(to);
                return true;
            case 0xF8:
                // midiLog("clox", d1, d2)
                this.clockAction(ts)
                return true;
            case 0xFB:
                play();
                return true;
            case 0xFC:
                // midiLog("area stopped", d1, d2)
                this.stopAction();
                return true;
            case 0xFA:
                // midiLog("area started", d1, d2)
                this.startAction();
                return true;

        }
        return false
    },
    inputAction(midi: number[], timeStamp: number) {
        if (this.caseAction(midi, timeStamp)) {
            return;
        }
        if (this.headAction(midi, timeStamp)) {
            return;
        }
        midiLog("unrecognizable message", ...midi);
    }
})
export default reaperMidiInputHandler;