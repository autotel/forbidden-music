import { fmWorkletManager } from '@/functions/fmWorkletManager';
import { frequencyToNote12 } from '../../functions/toneConverters';
import { EventParamsBase, Synth, SynthVoice } from '../types/Synth';
import { NumberSynthParam, ParamType, SynthParam, numberSynthParam } from '../types/SynthParam';
import { ifDev } from '@/functions/isDev';


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
                    }else{
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
            if(desist) continue;
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
    constructor(audioContext: AudioContext) {
        super(audioContext, () => {
            if (!workletManager) throw new Error("No engine");
            const { worklet, params } = workletManager.create();
            const ownWorkletParams = this.workletParams;
            if(!ownWorkletParams) throw new Error("No own worklet params");
            return voiceFactory(worklet, params, ownWorkletParams);
        });
        this.output.gain.value = 0.6;


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