class SNES {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.frameCallback = null;
    this.audioCallback = null;
    this.running = false;
    
    // Initialize memory
    this.ram = new Uint8Array(128 * 1024);  // 128KB
    this.vram = new Uint8Array(64 * 1024);  // 64KB
    this.rom = null;

    // Initialize CPU state
    this.cpu = {
      A: 0,    // Accumulator
      X: 0,    // Index X
      Y: 0,    // Index Y
      SP: 0,   // Stack Pointer
      PC: 0,   // Program Counter
      P: 0     // Status Register
    };

    this.frameBuffer = new Uint8Array(256 * 224 * 4);
    this.imageData = null;
  }

  setCanvas(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.imageData = new ImageData(256, 224);
  }

  setFrameCallback(callback) {
    this.frameCallback = callback;
  }

  setAudioCallback(callback) {
    this.audioCallback = callback;
  }

  loadROM(data) {
    this.rom = new Uint8Array(data);
    this.cpu.PC = 0x8000; // Standard SNES reset vector
    
    // For testing, generate a simple pattern
    this.generateTestPattern();
  }

  generateTestPattern() {
    for (let y = 0; y < 224; y++) {
      for (let x = 0; x < 256; x++) {
        const i = (y * 256 + x) * 4;
        // Create a more interesting test pattern
        this.frameBuffer[i] = Math.sin(x / 20) * 128 + 127;  // R
        this.frameBuffer[i + 1] = Math.cos(y / 20) * 128 + 127;  // G
        this.frameBuffer[i + 2] = ((x ^ y) & 0xFF);  // B
        this.frameBuffer[i + 3] = 255;  // A
      }
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.run();
  }

  stop() {
    this.running = false;
  }

  pause() {
    this.running = false;
  }

  resume() {
    if (!this.running) {
      this.running = true;
      this.run();
    }
  }

  reset() {
    this.cpu.PC = 0x8000;
    this.generateTestPattern();
  }

  run() {
    if (!this.running) return;

    // Update display
    if (this.ctx && this.frameBuffer) {
      this.imageData.data.set(this.frameBuffer);
      this.ctx.putImageData(this.imageData, 0, 0);
      if (this.frameCallback) {
        this.frameCallback(this.frameBuffer);
      }
    }

    // Generate audio samples
    if (this.audioCallback) {
      // Generate a simple sine wave for testing
      const time = Date.now() / 1000;
      const frequency = 440; // A4 note
      const sample = Math.sin(2 * Math.PI * frequency * time) * 0.5;
      this.audioCallback(sample, sample);
    }

    // Request next frame
    requestAnimationFrame(() => this.run());
  }

  keyDown(button) {
    // Handle button press
    console.log('Key down:', button);
  }

  keyUp(button) {
    // Handle button release
    console.log('Key up:', button);
  }
}

// Export to window
window.SNES = SNES; 