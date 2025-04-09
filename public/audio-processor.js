class SNESAudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this.volume = 1.0
    this.bufferSize = 2048
    this.audioBuffer = new Float32Array(this.bufferSize)
    this.bufferIndex = 0
  }

  static get parameterDescriptors() {
    return [{
      name: 'volume',
      defaultValue: 1.0,
      minValue: 0,
      maxValue: 1.0,
      automationRate: 'k-rate'
    }]
  }

  process(inputs, outputs, parameters) {
    const output = outputs[0]
    const volume = parameters.volume[0]

    // Process each channel (stereo)
    for (let channel = 0; channel < output.length; channel++) {
      const outputChannel = output[channel]

      // Fill output buffer with audio data
      for (let i = 0; i < outputChannel.length; i++) {
        if (this.bufferIndex >= this.audioBuffer.length) {
          this.bufferIndex = 0
        }
        outputChannel[i] = this.audioBuffer[this.bufferIndex++] * volume
      }
    }

    return true
  }

  // Method to receive audio data from the emulator
  receiveAudioData(data) {
    // Copy new audio data to our buffer
    this.audioBuffer.set(data)
    this.bufferIndex = 0
  }
}

registerProcessor('snes-audio-processor', SNESAudioProcessor) 