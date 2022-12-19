// deprecate
export class View {
  octaveOffset: number = 4.75;
  timeOffset: number = 0;
  centerFrequency: number = 440;
  
  constructor(
    public viewWidthPx: number,
    public viewHeightPx: number,
    public viewWidthTime: number,
    public viewHeightOctaves: number,
  ) { };

  updateSize(width: number, height: number) {
    this.viewWidthPx = width;
    this.viewHeightPx = height;
  }
  pxToTime(px: number): number {
    return px * this.viewWidthPx / this.viewWidthTime;
  }
  timeToPx(time: number): number {
    return time * this.viewWidthTime / this.viewWidthPx;
  }
  pxToOctave(px: number): number {
    return px * this.viewHeightOctaves / this.viewHeightPx;
  }
  octaveToPx(octave: number): number {
    return octave * this.viewHeightPx / this.viewHeightOctaves;
  }
  octaveToFrequency(octave: number): number {
    return this.centerFrequency * Math.pow(2, octave - this.octaveOffset);
  }
  frequencyToOctave(frequency: number): number {
    return Math.log2(frequency / this.centerFrequency) + this.octaveOffset;
  }
  
}
