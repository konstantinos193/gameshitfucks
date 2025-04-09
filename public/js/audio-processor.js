class SNESAudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 2048;
    this.leftBuffer = new Float32Array(this.bufferSize);
    this.rightBuffer = new Float32Array(this.bufferSize);
    this.writeIndex = 0;
    this.readIndex = 0;
    
    this.port.onmessage = (e) => {
      if (e.data.type === 'sample') {
        // Convert audio sample from [-32768, 32767] to [-1, 1]
        this.leftBuffer[this.writeIndex] = e.data.left / 32768;
        this.rightBuffer[this.writeIndex] = e.data.right / 32768;
        this.writeIndex = (this.writeIndex + 1) % this.bufferSize;
      }
    };
  }

  process(inputs, outputs) {
    const output = outputs[0];
    if (!output) return true;

    // Get output channels, use mono if only one channel is available
    const left = output[0] || [];
    const right = output[1] || output[0] || [];
    
    if (left.length === 0) return true;

    const bufferLength = left.length;

    for (let i = 0; i < bufferLength; i++) {
      if (this.readIndex === this.writeIndex) {
        // Buffer underrun - output silence
        if (left[i] !== undefined) left[i] = 0;
        if (right[i] !== undefined) right[i] = 0;
      } else {
        const sample = this.leftBuffer[this.readIndex];
        if (left[i] !== undefined) left[i] = sample;
        if (right[i] !== undefined) right[i] = sample;
        this.readIndex = (this.readIndex + 1) % this.bufferSize;
      }
    }

    return true;
  }
}

registerProcessor('snes-audio-processor', SNESAudioProcessor); 