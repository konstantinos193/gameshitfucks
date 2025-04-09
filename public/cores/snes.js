
// JSNES emulator core
class SNES {
  constructor() {
    this.nes = new jsnes.NES({
      onFrame: this.onFrame.bind(this),
      onAudioSample: this.onAudioSample.bind(this),
      sampleRate: 44100,
    });
    
    this.frameBuffer = new ArrayBuffer(256 * 240 * 4);
    this.frameData = new Uint8ClampedArray(this.frameBuffer);
  }

  setCanvas(canvas) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
    this.imageData = new ImageData(256, 240);
  }

  loadROM(data) {
    this.nes.loadROM(data);
  }

  start() {
    this.running = true;
    this.frame();
  }

  stop() {
    this.running = false;
  }

  frame() {
    if (!this.running) return;
    this.nes.frame();
    requestAnimationFrame(() => this.frame());
  }

  onFrame(frameBuffer) {
    for (let i = 0; i < frameBuffer.length; i++) {
      const pixel = frameBuffer[i];
      const offset = i * 4;
      this.frameData[offset] = pixel & 0xFF;         // R
      this.frameData[offset + 1] = (pixel >> 8) & 0xFF;  // G
      this.frameData[offset + 2] = (pixel >> 16) & 0xFF; // B
      this.frameData[offset + 3] = 0xFF;            // A
    }
    this.imageData.data.set(this.frameData);
    this.context.putImageData(this.imageData, 0, 0);
  }

  onAudioSample(left, right) {
    // Audio samples are handled by the core
  }

  buttonDown(button) {
    this.nes.buttonDown(1, button);
  }

  buttonUp(button) {
    this.nes.buttonUp(1, button);
  }
}

// Export to window
window.SNES = SNES;
