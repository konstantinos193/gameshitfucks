// SNES emulator core using Snes9x WebAssembly
(function(window) {
  const SCREEN_WIDTH = 256;
  const SCREEN_HEIGHT = 224;  // SNES height is 224

  class SNESCore {
    constructor(options = {}) {
      this.canvas = options.canvas || document.createElement('canvas');
      this.useWebGL = options.useWebGL !== undefined ? options.useWebGL : true;
      this.ctx = null;
      this.running = false;
      this.paused = false;
      this.romLoaded = false;
      this.onFrame = options.onFrame || (() => {});
      this.onAudioSample = options.onAudioSample || (() => {});
      this.snes = null;

      // Set canvas size
      this.canvas.width = SCREEN_WIDTH;
      this.canvas.height = SCREEN_HEIGHT;

      // Initialize context based on options
      this.initializeContext();
    }

    initializeContext() {
      // If WebGL is disabled, go straight to 2D context
      if (!this.useWebGL) {
        console.log('WebGL disabled, using 2D context');
        this.ctx = this.canvas.getContext('2d', {
          alpha: false,
          willReadFrequently: true
        });
        return;
      }

      // Try WebGL2 first if enabled
      let gl = null;
      try {
        gl = this.canvas.getContext('webgl2', {
          alpha: false,
          antialias: false,
          depth: false,
          stencil: false,
          preserveDrawingBuffer: true,
          powerPreference: 'high-performance'
        });
      } catch (e) {
        console.warn('WebGL2 initialization error:', e);
      }

      // Try WebGL1 as fallback
      if (!gl && this.useWebGL) {
        try {
          gl = this.canvas.getContext('webgl', {
            alpha: false,
            antialias: false,
            depth: false,
            stencil: false,
            preserveDrawingBuffer: true,
            powerPreference: 'high-performance'
          });
        } catch (e) {
          console.warn('WebGL initialization error:', e);
        }
      }

      // Final fallback to 2D context
      if (!gl) {
        console.warn('WebGL not available, falling back to 2D context');
        this.ctx = this.canvas.getContext('2d', {
          alpha: false,
          willReadFrequently: true
        });
      } else {
        this.ctx = gl;
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.viewport(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
      }
    }

    async loadCore() {
      try {
        // Create SNES wrapper
        class SNES {
          constructor() {
            this.canvas = null;
            this.ctx = null;
            this.useWebGL = false;
            this.frameTexture = null;
            this.frameBuffer = null;
            this.frameWidth = 256;
            this.frameHeight = 224;
            this.module = null;
            this.running = false;
            this.romLoaded = false;
            this.onFrame = () => {};
            this.onAudioSample = () => {};
            this.snes = null;
          }

          setCanvas(canvas, useWebGL = false) {
            this.canvas = canvas;
            this.useWebGL = useWebGL;
            
            if (!this.canvas) {
              console.error('Canvas is not provided');
              return;
            }

            // Set canvas size
            this.canvas.width = this.frameWidth;
            this.canvas.height = this.frameHeight;

            // Initialize context based on useWebGL flag
            if (this.useWebGL) {
              try {
                this.ctx = this.canvas.getContext('webgl2') || 
                          this.canvas.getContext('webgl') || 
                          this.canvas.getContext('2d');
                if (this.ctx instanceof WebGLRenderingContext) {
                  this.initializeWebGL();
                } else {
                  console.log('WebGL not available, using 2D context');
                  this.useWebGL = false;
                  this.ctx = this.canvas.getContext('2d');
                }
              } catch (e) {
                console.error('WebGL initialization failed:', e);
                this.useWebGL = false;
                this.ctx = this.canvas.getContext('2d');
              }
            } else {
              this.ctx = this.canvas.getContext('2d');
            }

            // Initialize frame buffer
            this.frameBuffer = new Uint8Array(this.frameWidth * this.frameHeight * 4);
          }

          initializeWebGL() {
            if (!this.ctx || !(this.ctx instanceof WebGLRenderingContext)) {
              return;
            }

            // Create and initialize texture
            this.frameTexture = this.ctx.createTexture();
            this.ctx.bindTexture(this.ctx.TEXTURE_2D, this.frameTexture);
            this.ctx.texParameteri(this.ctx.TEXTURE_2D, this.ctx.TEXTURE_MIN_FILTER, this.ctx.NEAREST);
            this.ctx.texParameteri(this.ctx.TEXTURE_2D, this.ctx.TEXTURE_MAG_FILTER, this.ctx.NEAREST);
            this.ctx.texParameteri(this.ctx.TEXTURE_2D, this.ctx.TEXTURE_WRAP_S, this.ctx.CLAMP_TO_EDGE);
            this.ctx.texParameteri(this.ctx.TEXTURE_2D, this.ctx.TEXTURE_WRAP_T, this.ctx.CLAMP_TO_EDGE);
          }

          async init() {
            try {
              console.log('Starting Snes9x module initialization...');
              
              // Ensure canvas exists and is properly initialized
              if (!this.canvas) {
                this.canvas = document.createElement('canvas');
                this.canvas.width = SCREEN_WIDTH;
                this.canvas.height = SCREEN_HEIGHT;
              }
              
              // Set up canvas with an ID
              this.canvas.id = 'snes9x-canvas';
              
              // Import the module dynamically
              const moduleExports = await import('/public/wasm/snes9x_libretro.js');
              console.log('Module imported successfully');
              
              // Get the initialization function from the default export
              const initFn = moduleExports.default;
              if (typeof initFn !== 'function') {
                console.error('Module exports:', moduleExports);
                throw new Error('Failed to get initialization function from module');
              }

              console.log('Creating Snes9x instance...');
              // Initialize the module with the correct options
              const moduleInstance = await initFn({
                canvas: this.canvas,
                canvasElement: this.canvas,
                wasmBinary: null,
                noInitialRun: true,
                preserveDrawingBuffer: true,
                antialias: false,
                alpha: false,
                depth: false,
                stencil: false,
                premultipliedAlpha: false,
                failIfMajorPerformanceCaveat: false,
                powerPreference: 'high-performance',
                locateFile: (path) => {
                  if (path.endsWith('.wasm')) {
                    return '/public/wasm/snes9x.wasm';
                  }
                  return path;
                },
                memory: new WebAssembly.Memory({ 
                  initial: 256,  // Too small
                  maximum: 512,  // Too small
                  shared: true   // Not needed unless using web workers
                })
              });

              // Store the module instance
              this.module = moduleInstance;

              // Wait for module to be ready
              if (this.module.ready) {
                console.log('Waiting for module ready promise...');
                await this.module.ready;
                console.log('Module ready');
              }

              // Initialize core
              if (typeof this.module._init === 'function') {
                console.log('Initializing core...');
                this.module._init();
              }

              // Set up canvas size
              if (typeof this.module.setCanvasSize === 'function') {
                console.log('Setting canvas size...');
                this.module.setCanvasSize(256, 224);
              }

              // Map required methods
              this.loadROM = async (...args) => {
                console.log('Loading ROM with args:', args);
                // Cancel any existing main loop before loading ROM
                if (typeof this.module._emscripten_cancel_main_loop === 'function') {
                  this.module._emscripten_cancel_main_loop();
                }
                // Reset the core state
                if (typeof this.module._reset === 'function') {
                  this.module._reset();
                }
                // Load the ROM
                return this.module._main(...args);
              };

              this.runFrame = (...args) => {
                console.log('Running frame with args:', args);
                return this.module._run_frame(...args);
              };

              this.getFrameBuffer = (...args) => {
                console.log('Getting frame buffer with args:', args);
                return this.module._get_frame(...args);
              };

              this.getAudioBuffer = (...args) => {
                console.log('Getting audio buffer with args:', args);
                return this.module._get_audio(...args);
              };

              console.log('SNES core initialization complete');
              return true;
            } catch (error) {
              console.error('Error initializing SNES core:', error);
              throw error;
            }
          }

          async loadROM(data) {
            if (!this.module) {
              console.error('Module not initialized');
              return false;
            }
            
            try {
              console.log('[DEBUG] Loading ROM...', data instanceof Uint8Array ? 'Uint8Array' : typeof data);
              
              // Ensure data is Uint8Array and validate size
              let romData;
              if (data instanceof Uint8Array) {
                romData = data;
              } else if (data instanceof ArrayBuffer) {
                romData = new Uint8Array(data);
              } else if (ArrayBuffer.isView(data)) {
                romData = new Uint8Array(data.buffer);
              } else {
                console.error('Invalid ROM data type:', typeof data);
                return false;
              }

              if (romData.length < 1024) {
                console.error('ROM data too small:', romData.length);
                return false;
              }

              console.log('[DEBUG] ROM data size:', romData.length);
              
              // Allocate memory for ROM data
              const romPtr = this.module._malloc(romData.length);
              if (!romPtr) {
                throw new Error('Failed to allocate memory for ROM');
              }

              try {
                // Copy ROM data to module memory
                this.module.HEAPU8.set(romData, romPtr);
                
                // Initialize the core if not already done
                if (typeof this.module._S9xInit === 'function') {
                  console.log('[DEBUG] Initializing S9x core...');
                  this.module._S9xInit();
                }
                
                // Load the ROM using S9x function
                if (typeof this.module._S9xLoadROM === 'function') {
                  console.log('[DEBUG] Loading ROM into S9x...');
                  const result = this.module._S9xLoadROM(romPtr, romData.length);
                  if (result !== 0) {
                    throw new Error(`ROM loading failed with code: ${result}`);
                  }
                  console.log('[DEBUG] ROM loaded successfully');
                  
                  // Reset the system
                  if (typeof this.module._S9xReset === 'function') {
                    console.log('[DEBUG] Resetting system...');
                    this.module._S9xReset();
                  }
                  
                  this.romLoaded = true;
                  return true;
                } else {
                  throw new Error('S9xLoadROM function not found in module');
                }
              } finally {
                // Free allocated memory
                this.module._free(romPtr);
              }
            } catch (error) {
              console.error('[DEBUG] Failed to load ROM:', error);
              this.romLoaded = false;
              return false;
            }
          }

          start() {
            if (this.running) {
              console.log('[DEBUG] Already running');
              return;
            }
            if (!this.romLoaded) {
              console.warn('[DEBUG] Cannot start emulation - no ROM loaded');
              return;
            }
            console.log('[DEBUG] Starting emulation...');
            this.running = true;
            this.frame();
          }

          stop() {
            if (!this.running) {
              console.log('[DEBUG] Already stopped');
              return;
            }
            console.log('[DEBUG] Stopping emulation...');
            this.running = false;
          }

          frame() {
            if (!this.running || !this.romLoaded) {
              console.log('[DEBUG] Frame skipped - running:', this.running, 'romLoaded:', this.romLoaded);
              return;
            }

            try {
              // Run a frame
              if (typeof this.module._S9xMainLoop === 'function') {
                this.module._S9xMainLoop();
              }

              // Get frame data from the framebuffer
              if (this.module && this.module.HEAPU8 && typeof this.module._S9xGetFrameBuffer === 'function') {
                const frameBufferPtr = this.module._S9xGetFrameBuffer();
                if (frameBufferPtr) {
                  // Copy frame data from WASM memory
                  const frameData = new Uint8Array(this.module.HEAPU8.buffer, frameBufferPtr, SCREEN_WIDTH * SCREEN_HEIGHT * 4);
                  const imageData = new ImageData(
                    new Uint8ClampedArray(frameData),
                    SCREEN_WIDTH,
                    SCREEN_HEIGHT
                  );
                  this.ctx.putImageData(imageData, 0, 0);
                  this.onFrame();
                }
              }

              // Request next frame if still running
              if (this.running) {
                requestAnimationFrame(() => this.frame());
              }
            } catch (error) {
              console.error('[DEBUG] Error in frame loop:', error);
              this.stop();
            }
          }

          buttonDown(button) {
            if (this.module) {
              this.module.keyDown(button);
            }
          }

          buttonUp(button) {
            if (this.module) {
              this.module.keyUp(button);
            }
          }

          reset() {
            if (this.module) {
              this.module.reset();
            }
          }
        }

        // Initialize SNES
        this.snes = new SNES();
        await this.snes.init();
        this.snes.setCanvas(this.canvas);
        this.snes.audioCallback = this.onAudioSample;

      } catch (error) {
        console.error('Failed to load Snes9x:', error);
        throw error;
      }
    }

    async loadROM(data) {
      if (!this.snes) {
        await this.loadCore();
      }

      try {
        await this.snes.loadROM(data);
      } catch (error) {
        console.error('Failed to load ROM:', error);
        throw error;
      }
    }

    start() {
      if (this.running) {
        console.log('[DEBUG] Already running');
        return;
      }
      if (!this.romLoaded) {
        console.warn('[DEBUG] Cannot start emulation - no ROM loaded');
        return;
      }
      console.log('[DEBUG] Starting emulation...');
      this.running = true;
      this.frame();
    }

    stop() {
      if (!this.running) {
        console.log('[DEBUG] Already stopped');
        return;
      }
      console.log('[DEBUG] Stopping emulation...');
      this.running = false;
    }

    pause() {
      this.paused = true;
      this.running = false;
      if (this.snes) {
        this.snes.stop();
      }
    }

    resume() {
      if (this.paused) {
        this.paused = false;
        this.running = true;
        if (this.snes) {
          this.snes.start();
        }
      }
    }

    reset() {
      if (this.snes) {
        this.snes.reset();
      }
    }

    keyDown(button) {
      if (this.snes) {
        this.snes.buttonDown(this.mapButton(button));
      }
    }

    keyUp(button) {
      if (this.snes) {
        this.snes.buttonUp(this.mapButton(button));
      }
    }

    mapButton(button) {
      // Map our button codes to Snes9x button codes
      const buttonMap = {
        0: 16,  // Up
        1: 32,  // Down
        2: 64,  // Left
        3: 128, // Right
        4: 2,   // B
        5: 1,   // A
        6: 8,   // Y
        7: 4,   // X
        8: 256, // Start
        9: 512, // Select
        10: 1024, // L
        11: 2048  // R
      };
      return buttonMap[button] || 0;
    }
  }

  // Export to window
  window.SNESCore = SNESCore;
})(window); 