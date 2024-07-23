import workleturl from "./fmWorklet.js?url";


const defaultConnection = [
  [0, 0, 0, 0],
  [1, 0, 0, 0],
  [0, 0, 0, 0],
  [0, 0, 1, 0],
  [0, 1, 0, 1],
]

const defaultOperators = (sampleRate:number)=>[{
  totalLevel: 1.0,
  multiple: 14.0,
  decay1Rate: Math.pow(2, -8.0 / sampleRate),
  decay1Level: Math.pow(2, -1.0),
  decay2Rate: Math.pow(2, -4.0 / sampleRate),
}, {
  totalLevel: Math.pow(2, -3.0),
  multiple: 1.0,
  decay1Rate: Math.pow(2, -3.0 / sampleRate),
  decay1Level: Math.pow(2, -1.0),
  decay2Rate: Math.pow(2, -4.0 / sampleRate),
}, {
  totalLevel: Math.pow(2, -0.5),
  multiple: 1.0,
  decay1Rate: Math.pow(2, -1.0 / sampleRate),
  decay1Level: 0,
  decay2Rate: 0,
}, {
  totalLevel: Math.pow(2, -3.0),
  multiple: 1.0,
  decay1Rate: Math.pow(2, -1.0 / sampleRate),
  decay1Level: 0,
  decay2Rate: 0,
}];


type ExpectedWorkletParameters = {
  'connection[0,0]': AudioParam,
  'connection[0,1]': AudioParam,
  'connection[0,2]': AudioParam,
  'connection[0,3]': AudioParam,
  'connection[1,0]': AudioParam,
  'connection[1,1]': AudioParam,
  'connection[1,2]': AudioParam,
  'connection[1,3]': AudioParam,
  'connection[2,0]': AudioParam,
  'connection[2,1]': AudioParam,
  'connection[2,2]': AudioParam,
  'connection[2,3]': AudioParam,
  'connection[3,0]': AudioParam,
  'connection[3,1]': AudioParam,
  'connection[3,2]': AudioParam,
  'connection[3,3]': AudioParam,
  'operators[0].totalLevel': AudioParam,
  'operators[0].multiple': AudioParam,
  'operators[0].decay1Rate': AudioParam,
  'operators[0].decay1Level': AudioParam,
  'operators[0].decay2Rate': AudioParam,
  'operators[1].totalLevel': AudioParam,
  'operators[1].multiple': AudioParam,
  'operators[1].decay1Rate': AudioParam,
  'operators[1].decay1Level': AudioParam,
  'operators[1].decay2Rate': AudioParam,
  'operators[2].totalLevel': AudioParam,
  'operators[2].multiple': AudioParam,
  'operators[2].decay1Rate': AudioParam,
  'operators[2].decay1Level': AudioParam,
  'operators[2].decay2Rate': AudioParam,
  'operators[3].totalLevel': AudioParam,
  'operators[3].multiple': AudioParam,
  'operators[3].decay1Rate': AudioParam,
  'operators[3].decay1Level': AudioParam,
  'operators[3].decay2Rate': AudioParam,
}

export async function fmWorkletManager(
  context: BaseAudioContext
) {
  const sr = context.sampleRate;
  // We're assuming code sameness with the worklet. 
  // Don't want to spend a month automating this.
  const paramDescriptors = [
    ...defaultConnection.map((connLine, i) => (
      connLine.map((_, j) => (
        {
          name: `connection[${i},${j}]`,
          defaultValue: defaultConnection[i][j],
          minValue: 0,
          maxValue: 1,
          automationRate: "k-rate",
        }
      )
      )
    )).flat(),
    ...defaultOperators(sr).map((op, i) => (
      [
        {
          name: `operators[${i}].totalLevel`,
          defaultValue: op.totalLevel,
          minValue: 0,
          maxValue: 1,
          automationRate: "k-rate",
        },
        {
          name: `operators[${i}].multiple`,
          defaultValue: op.multiple,
          minValue: 0,
          maxValue: 100,
          automationRate: "k-rate",
        },
        {
          name: `operators[${i}].decay1Rate`,
          defaultValue: op.decay1Rate,
          minValue: 0,
          maxValue: 1,
          automationRate: "k-rate",
        },
        {
          name: `operators[${i}].decay1Level`,
          defaultValue: op.decay1Level,
          minValue: 0,
          maxValue: 1,
          automationRate: "k-rate",
        },
        {
          name: `operators[${i}].decay2Rate`,
          defaultValue: op.decay2Rate,
          minValue: 0,
          maxValue: 1,
          automationRate: "k-rate",
        },
      ]
    )).flat(),
  ]

  await context.audioWorklet.addModule(workleturl);

  const create = () => {
    const worklet = new AudioWorkletNode(context, "fm-synth");

    let protoParams: { [key: string]: AudioNode } = {};

    for (let pDesc of paramDescriptors) {
      // @ts-ignore
      const param = worklet.parameters.get(pDesc.name);
      if (!param) {
        console.error(`Parameter ${pDesc.name} not found in worklet`);
      }
      protoParams[pDesc.name] = param;
    };
    // @ts-ignore
    const params: ExpectedWorkletParameters = protoParams;
    return {
      worklet,
      params,
    };
  }

  return {
    create, paramDescriptors,
  }
}
