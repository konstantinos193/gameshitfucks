// jsNES - NES emulator in JavaScript
// https://github.com/bfirsh/jsnes
(function(window) {
  window.JSNES = function(opts) {
    this.opts = {
      onFrame: function() {},
      onAudioSample: function() {},
      onStatusUpdate: function() {},
      onBatteryRamWrite: function() {},
      preferredFrameRate: 60,
      emulateSound: true,
      sampleRate: 44100
    };
    if (typeof opts !== "undefined") {
      for (var key in this.opts) {
        if (typeof opts[key] !== "undefined") {
          this.opts[key] = opts[key];
        }
      }
    }
    
    // CPU memory - increased for SNES
    this.cpuMemory = new Uint8Array(0x1000000); // 16MB
    
    // PPU memory - increased for SNES
    this.ppuMemory = new Uint8Array(0x40000);  // 256KB
    
    // Sprite memory - increased for SNES
    this.spriteMemory = new Uint8Array(0x1000);
    
    // Framebuffer
    this.frameBuffer = new Uint32Array(256 * 240);
    
    // Internal state
    this.isRunning = false;
    this.fpsInterval = 1000 / this.opts.preferredFrameRate;
    this.lastFrameTime = window.performance.now();
    
    // Keyboard state
    this.buttonDown = new Array(8).fill(false);
  };

  JSNES.prototype = {
    loadROM: function(romData) {
      // Increased size limit for SNES ROMs
      if (romData.length > 0x800000) { // 8MB limit
        throw new Error("ROM too large");
      }
      for (var i = 0; i < romData.length; i++) {
        this.cpuMemory[0x8000 + i] = romData[i];
      }
      console.log("ROM loaded:", romData.length, "bytes");
    },

    frame: function() {
      // Simple frame rendering - just fill with a pattern
      for (var i = 0; i < 256 * 240; i++) {
        this.frameBuffer[i] = (i % 256) << 16 | ((i / 256) | 0) << 8;
      }
      this.opts.onFrame(this.frameBuffer);
    },

    buttonDown: function(button) {
      this.buttonDown[button] = true;
    },

    buttonUp: function(button) {
      this.buttonDown[button] = false;
    },

    start: function() {
      if (this.isRunning) return;
      this.isRunning = true;
      this.frameInterval = setInterval(() => {
        var currentTime = window.performance.now();
        var elapsed = currentTime - this.lastFrameTime;
        
        if (elapsed > this.fpsInterval) {
          this.frame();
          this.lastFrameTime = currentTime - (elapsed % this.fpsInterval);
        }
      }, 1000 / 60);
    },

    stop: function() {
      if (!this.isRunning) return;
      this.isRunning = false;
      clearInterval(this.frameInterval);
    },

    reset: function() {
      this.cpuMemory.fill(0);
      this.ppuMemory.fill(0);
      this.spriteMemory.fill(0);
      this.frameBuffer.fill(0);
      this.buttonDown.fill(false);
    }
  };
})(window); 