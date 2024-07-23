import { fmWorkletManager } from '@/functions/fmWorkletManager';
import { frequencyToNote12 } from '../../functions/toneConverters';
import { EventParamsBase, Synth, SynthVoice } from '../types/Synth';
import { NumberSynthParam, OptionSynthParam, ParamType, SynthParam, numberSynthParam } from '../types/SynthParam';
import { ifDev } from '@/functions/isDev';
import { filterMap } from '@/functions/filterMap';




interface FmStopVoiceMessage {
    stop: true;
    ref: string;
}

interface FmStopAllMessage {
    stopall: true;
}

interface FmStartVoiceMessage {
    freq: number;
    amp: number;
    duration?: number;
    ref: string;
}
// TODO: 
interface FmParamsChangeMessage {
    bleed?: number;
    impulseDecay?: number;
    impulseAttack?: number;
    delaysDetune?: number;
}

type ResolvedFmWorkletManager = Awaited<ReturnType<typeof fmWorkletManager>>;
type CreatedWorkletObject = ReturnType<ResolvedFmWorkletManager["create"]>;
type FmWorklet = CreatedWorkletObject["worklet"];
type FmWorkletParams = CreatedWorkletObject["params"];

const voiceFactory = (worklet: FmWorklet, workletParams: FmWorkletParams, params: NumberSynthParam[]): SynthVoice => {
    const applyCurrentParams = () => {
        // return;
        for (const param of params) {
            const { displayName, value } = param;
            let workletParam: AudioParam | undefined;
            let desist = false;
            ifDev(() => {
                desist = true;
                try {
                    if (displayName in workletParams) {
                        // @ts-ignore
                        workletParam = workletParams[displayName];
                    } else {
                        throw new Error(`Param ${displayName} not found in worklet`);
                    }
                    // // @ts-ignore
                    // if(typeof value !== workletParam.value){
                    //     throw new Error(`Param ${displayName} value ${value} is not of type ${typeof workletParam?.value} but ${typeof value}`);
                    // }
                    desist = false;
                } catch (e) {
                    console.error(e);
                }
            });
            if (desist) continue;
            // console.log("setting", displayName, value);
            // @ts-ignore
            workletParam.value = value;

        }
    }
    const stop = () => {
        worklet.port.postMessage({
            noteOff: {
                key: frequencyToNote12(triggeredNote)
            }
        });
        retObj.inUse = false;
        return this;
    }

    let triggerStarted = 0;
    let triggeredVelocity = 0;
    let triggeredNote = 0;
    let currentReleaseTimeout = null as null | ReturnType<typeof setTimeout>;

    const retObj: SynthVoice = {
        inUse: false,
        output: worklet,
        scheduleStart(
            frequency: number,
            absoluteStartTime: number,
            { velocity }: EventParamsBase
        ) {
            if (currentReleaseTimeout !== null) {
                clearTimeout(currentReleaseTimeout);
                currentReleaseTimeout = null;
            }
            applyCurrentParams();
            this.inUse = true;
            triggerStarted = absoluteStartTime;
            triggeredVelocity = velocity;
            const note = frequencyToNote12(frequency);
            triggeredNote = note;
            // TODO: maybe use frequency directly, would need to edit the worklet
            // TODO: schedule start, don't start right away
            worklet.port.postMessage({
                noteOn: {
                    key: note,
                }
            });
            return this;
        },
        scheduleEnd(absoluteStopTime?: number) {
            if (absoluteStopTime) {
                const duration = absoluteStopTime - triggerStarted;
                currentReleaseTimeout = setTimeout(() => {
                    stop();
                }, duration * 1000);
            } else {
                stop();
            }
            return this;
        },
    }
    return retObj;
}
// TODO: make polyphonic
export class FmSynth extends Synth {
    workletParams?: NumberSynthParam[];
    needsFetching = true;
    presetSynthParam: OptionSynthParam;
    constructor(audioContext: AudioContext) {
        super(audioContext, () => {
            if (!workletManager) throw new Error("No engine");
            const { worklet, params } = workletManager.create();
            const ownWorkletParams = this.workletParams;
            if (!ownWorkletParams) throw new Error("No own worklet params");
            return voiceFactory(worklet, params, ownWorkletParams);
        });
        this.output.gain.value = 0.6;


        this.presetSynthParam = {
            type: ParamType.option,
            displayName: "Preset",
            _v: 0,
            options: presets.map((preset, i) => {
                return {
                    displayName: presetNames[i],
                    value: i,
                }
            }),
            set value(val) {
                const preset = presets[val];
                selectPreset(preset);
                this._v = val;
            },
            get value() {
                return this._v;
            },
            exportable: false,
        } as OptionSynthParam;
        this.params.push(this.presetSynthParam);

        const workletManagerPromise = fmWorkletManager(audioContext);
        let workletManager: ResolvedFmWorkletManager;
        this.enable = async () => {
            workletManager = await workletManagerPromise;
            this.workletParams = workletManager.paramDescriptors.map((desc) => {
                return {
                    displayName: desc.name,
                    value: desc.defaultValue,
                    type: ParamType.number,
                    min: desc.minValue,
                    max: desc.maxValue,
                } as NumberSynthParam;
            });
            this.params.push(...this.workletParams);
            this.markReady();
        }
        const selectPreset = (vals: Preset) => {
            const valKeys = Object.keys(vals);
            if (!this.workletParams) {
                console.error("No worklet params");
                return;
            }
            for (let keyName of valKeys) {
                if (keyName === "presetName") continue;
                const param = this.workletParams.find((param) => param.displayName === keyName);
                if (!param) {
                    console.warn(`Param ${keyName} not found in synth`);
                    continue;
                } else {
                    param.value = vals[keyName];
                }
            }
        }

    }

    credits = `
    Worklet from https://github.com/kazssym/web-fm-sound

    Copyright (C) 2020 Kaz Nishimura
    
    This program is free software: you can redistribute it and/or modify it
    under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or (at your
    option) any later version.
    
    This program is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
    FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public License
    for more details.
    
    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
    
    SPDX-License-Identifier: AGPL-3.0-or-later

    This file is a module script and shall be in strict mode by default.
    `

}

type Preset = { [key: string]: number };

const presetNames :string[] = [
    'Pluck 1',
    'Aggressive',
    'Minimal',
];

const presets: Preset[] = [
    {
        "connection[0,0]": 0,
        "connection[0,1]": 0,
        "connection[0,2]": 0,
        "connection[0,3]": 0,
        "connection[1,0]": 0,
        "connection[1,1]": 0,
        "connection[1,2]": 0,
        "connection[1,3]": 0,
        "connection[2,0]": 0,
        "connection[2,1]": 0,
        "connection[2,2]": 0,
        "connection[2,3]": 0,
        "connection[3,0]": 0,
        "connection[3,1]": 0,
        "connection[3,2]": 0.7049999999999997,
        "connection[3,3]": 0,
        "connection[4,0]": 0,
        "connection[4,1]": 0,
        "connection[4,2]": 0.6700000000000003,
        "connection[4,3]": 1,
        "operators[0].totalLevel": 1,
        "operators[0].multiple": 14,
        "operators[0].decay1Rate": 0.9998844821426083,
        "operators[0].decay1Level": 0.5,
        "operators[0].decay2Rate": 0.9999422394031608,
        "operators[1].totalLevel": 0.125,
        "operators[1].multiple": 1,
        "operators[1].decay1Rate": 0.9999566792395862,
        "operators[1].decay1Level": 0.5,
        "operators[1].decay2Rate": 0.9999422394031608,
        "operators[2].totalLevel": 0.04710678118654763,
        "operators[2].multiple": 4.133333333333336,
        "operators[2].decay1Rate": 8,
        "operators[2].decay1Level": 0,
        "operators[2].decay2Rate": 8,
        "operators[3].totalLevel": 0.19500000000000003,
        "operators[3].multiple": 1,
        "operators[3].decay1Rate": 4.826666666666666,
        "operators[3].decay1Level": 0.7750000000000001,
        "operators[3].decay2Rate": 3.36
    }, {
        "connection[0,0]": 0,
        "connection[0,1]": 0,
        "connection[0,2]": 0,
        "connection[0,3]": 0,
        "connection[1,0]": 1,
        "connection[1,1]": 0,
        "connection[1,2]": 0,
        "connection[1,3]": 0,
        "connection[2,0]": 0,
        "connection[2,1]": 0,
        "connection[2,2]": 0,
        "connection[2,3]": 0,
        "connection[3,0]": 0,
        "connection[3,1]": 0,
        "connection[3,2]": 1,
        "connection[3,3]": 0,
        "connection[4,0]": 0,
        "connection[4,1]": 1,
        "connection[4,2]": 0,
        "connection[4,3]": 1,
        "operators[0].totalLevel": 1,
        "operators[0].multiple": 14,
        "operators[0].decay1Rate": 0.9998844821426083,
        "operators[0].decay1Level": 0.5,
        "operators[0].decay2Rate": 0.9999422394031608,
        "operators[1].totalLevel": 0.125,
        "operators[1].multiple": 1,
        "operators[1].decay1Rate": 0.9999566792395862,
        "operators[1].decay1Level": 0.5,
        "operators[1].decay2Rate": 0.9999422394031608,
        "operators[2].totalLevel": 0.7071067811865475,
        "operators[2].multiple": 1,
        "operators[2].decay1Rate": 0.9999855595380028,
        "operators[2].decay1Level": 0,
        "operators[2].decay2Rate": 0,
        "operators[3].totalLevel": 0.125,
        "operators[3].multiple": 1,
        "operators[3].decay1Rate": 0.9999855595380028,
        "operators[3].decay1Level": 0,
        "operators[3].decay2Rate": 0
    }, {
        "connection[0,0]": 0,
        "connection[0,1]": 0,
        "connection[0,2]": 0,
        "connection[0,3]": 0,
        "connection[1,0]": 0,
        "connection[1,1]": 0,
        "connection[1,2]": 0,
        "connection[1,3]": 0,
        "connection[2,0]": 0,
        "connection[2,1]": 0,
        "connection[2,2]": 0,
        "connection[2,3]": 0,
        "connection[3,0]": 0,
        "connection[3,1]": 0,
        "connection[3,2]": 0,
        "connection[3,3]": 0,
        "connection[4,0]": 0,
        "connection[4,1]": 0,
        "connection[4,2]": 0,
        "connection[4,3]": 1,
        "operators[0].totalLevel": 0.5,
        "operators[0].multiple": 4,
        "operators[0].decay1Rate": 1,
        "operators[0].decay1Level": 0.5,
        "operators[0].decay2Rate": 0,
        "operators[1].totalLevel": 0.5,
        "operators[1].multiple": 3,
        "operators[1].decay1Rate": 1,
        "operators[1].decay1Level": 0.5,
        "operators[1].decay2Rate": 0,
        "operators[2].totalLevel": 0.5,
        "operators[2].multiple": 2,
        "operators[2].decay1Rate": 1,
        "operators[2].decay1Level": 0.5,
        "operators[2].decay2Rate": 0,
        "operators[3].totalLevel": 0.5,
        "operators[3].multiple": 1,
        "operators[3].decay1Rate": 1,
        "operators[3].decay1Level": 0.5,
        "operators[3].decay2Rate": 0,
    }
];