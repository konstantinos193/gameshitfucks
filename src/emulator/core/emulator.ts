import { Memory } from './memory';
import { CPU } from './cpu';
import { PPU } from './ppu';
import { APU } from './apu';
import { MemoryBus } from './memoryBus';

// --- START CPU State Interface ---
interface CPUState {
    a: number;
    x: number;
    y: number;
    sp: number;
    pc: number;
    pbr: number;
    dbr: number;
    d: number;
    p: number;
    emulationMode: boolean;
    cycles: number;
}
// --- END CPU State Interface ---

// Constants
const CYCLES_PER_FRAME = 536182; // SNES master cycles per frame (NTSC: ~60Hz)
const FRAME_TIME = 1000 / 60; // Target frame time in milliseconds (60 FPS)
const CYCLES_PER_SCANLINE = 1364;
const TOTAL_SCANLINES = 262;
const VBLANK_START_SCANLINE = 225;
const VBLANK_DURATION_CYCLES = 1364; // Assuming VBLANK_DURATION_CYCLES is defined

export class Emulator {
    private memory: Memory;
    private cpu: CPU;
    private ppu: PPU;
    private apu: APU;
    private memoryBus: MemoryBus;
    private isRunning: boolean = false;
    private romLoaded: boolean = false;
    private frameCount: number = 0;
    private totalCycles: number = 0;
    private cyclesSinceLastRender: number = 0;
    private canvas: HTMLCanvasElement | null = null;
    private lastLoopTime: number = 0;
    private timeoutId: any = null;
    
    // V-Blank related state
    private currentScanline: number = 0;
    private isInVBlank: boolean = false;
    private nmiEnabled: boolean = false;
    private hvbJoyReadRequested: boolean = false; // Status for 0x4212

    // Web Audio API components
    private audioContext: AudioContext | null = null;
    private scriptNode: ScriptProcessorNode | null = null;
    private audioBufferSize: number = 2048; // Adjust based on performance needs

    // Emergency mode to handle problematic ROMs
    private emergencyModeEnabled: boolean = false;
    private emergencyFrameCounter: number = 0;

    constructor() {
        console.debug('[DEBUG] Emulator: Initializing');
        this.memory = new Memory();
        this.cpu = new CPU(this.memory);
        this.ppu = new PPU(this.memory);
        this.apu = new APU();
        this.memoryBus = new MemoryBus(this.memory, this.ppu, this.apu);

        this.memory.setPPU(this.ppu);
        this.memory.setAPU(this.apu);
        this.memory.setEmulator(this);

        this.canvas = null;
        this.isRunning = false;
        this.reset();
        console.debug('[DEBUG] Emulator: Initialization complete');
    }

    setCanvas(canvas: HTMLCanvasElement): void {
        console.debug('[DEBUG] Emulator: Setting canvas');
        this.canvas = canvas;
        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error('Failed to get 2D context from canvas');
        }
        console.debug('[DEBUG] Emulator: Got 2D context:', !!context);
        this.ppu.setCanvasContext(context);
        console.debug('[DEBUG] Emulator: Canvas context passed to PPU');
    }

    reset(): void {
        console.debug('[DEBUG] Emulator: Resetting');
        this.memory.reset();
        this.ppu.reset();
        this.apu.reset();
        this.frameCount = 0;
        this.totalCycles = 0;
        this.cyclesSinceLastRender = 0;
        this.isRunning = false;
        this.romLoaded = false;
        this.lastLoopTime = 0;
        if (this.timeoutId !== null) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
        console.debug('[DEBUG] Emulator: Reset complete');
    }

    loadROM(romData: Uint8Array): void {
        if (!romData || romData.length === 0) {
            console.error('[ERROR] Invalid ROM data');
            return;
        }
        
        console.debug(`[DEBUG] Loading ROM data (${romData.length} bytes)`);
        this.memory.loadROM(romData);
        
        // Initialize memory bus with the ROM data for proper address mapping
        this.memoryBus.initialize(romData);
        
        this.romLoaded = true;
        this.reset();
        
        // Call validation and analyze ROM
        this.validateROMHeader();
        
        // Check for ROM issues and enable emergency mode if needed
        this.analyzeROM();
    }

    run(): void {
        if (!this.romLoaded) {
            throw new Error('Cannot start emulator: No ROM loaded');
        }

        if (!this.canvas) {
            throw new Error('Cannot start emulator: No canvas set');
        }

        if (!this.isRunning) {
            console.debug('[DEBUG] Emulator: Starting run loop');
            this.isRunning = true;
            this.lastLoopTime = performance.now();
            this.cpu.start();
            this.timeoutId = window.setTimeout(this.runLoop, 0);
            this.startAudio();
        }
    }

    private runLoop = (): void => {
        // Skip runLoop execution if we're not running
        if (!this.isRunning) {
            console.debug('[DEBUG] Skipping runLoop: emulator not running');
            return;
        }

        try {
            // Limit CPU usage by using fixed frame timing
            const cyclesPerFrame = 40000; // Approximate SNES cycles per frame 
            
            // Run CPU for a batch of cycles
            for (let i = 0; i < 100 && this.isRunning; i++) {
                this.cpu.step();
            }
            
            // Update frame counter and render
            this.frameCount++;
            
            // Render frame (either emergency or normal)
            if (this.emergencyModeEnabled) {
                this.renderEmergencyGraphics();
            } else {
                this.renderFrame();
            }
            
        } catch (e) {
            console.error('[ERROR] Exception in runLoop:', e);
            this.emergencyModeEnabled = true; // Enable emergency mode on exception
        }
        
        // Use requestAnimationFrame to limit to display refresh rate
        if (this.isRunning) {
            this.timeoutId = setTimeout(() => this.runLoop(), 16); // ~60fps
        }
        
        // Less logging to reduce browser load
        if (this.frameCount % 10 === 0) {
            console.debug(`[DEBUG] Frame: ${this.frameCount}`);
        }
    }
    
    stop(): void {
        if (this.isRunning) {
            this.isRunning = false;
            this.cpu.stop();
            this.stopAudio();
            if (this.timeoutId !== null) {
                clearTimeout(this.timeoutId);
                this.timeoutId = null;
            }
            console.debug('[DEBUG] Emulator: Stopped');
        }
    }

    setButtonState(button: string, pressed: boolean): void {
        console.debug(`[DEBUG] Button ${button} ${pressed ? 'pressed' : 'released'}`);
        // TODO: Link button state with controller input
    }

    getState(): { 
        romLoaded: boolean;
        isRunning: boolean;
        frameCount: number;
        memoryState: ReturnType<Memory['getState']>;
    } {
        return {
            romLoaded: this.romLoaded,
            isRunning: this.isRunning,
            frameCount: this.frameCount,
            memoryState: this.memory.getState()
        };
    }

    // Additional Features and Improvements:
    
    // Debug & Diagnostic Methods
    
    // ROM header validation and diagnosis
    public validateROMHeader(): void {
        // Get ROM header data from Memory
        const headerData = this.memory.dumpHeaderData();
        
        if (!headerData) {
            console.error('[ROM_DIAG] Could not get ROM header data');
            return;
        }

        console.info('[ROM_DIAG] ROM Header Diagnostics:');
        console.info(`[ROM_DIAG] Title: ${headerData.title}`);
        console.info(`[ROM_DIAG] Mapping: ${headerData.mappingMode}`);
        console.info(`[ROM_DIAG] ROM Type: ${headerData.romType}`);
        console.info(`[ROM_DIAG] ROM Size: ${headerData.romSize}KB`);
        console.info(`[ROM_DIAG] RAM Size: ${headerData.ramSize}KB`);
        console.info(`[ROM_DIAG] Checksum: 0x${headerData.checksum.toString(16)}`);
        console.info(`[ROM_DIAG] Complement: 0x${headerData.checksumComplement.toString(16)}`);
        
        // Calculate actual checksum
        const actualSum = (headerData.checksum + headerData.checksumComplement) & 0xFFFF;
        console.info(`[ROM_DIAG] Checksum validation: ${actualSum === 0xFFFF ? 'Valid' : 'Invalid'}`);
        
        // Specific advice based on header issues
        if (headerData.mappingMode !== 'LoROM' && headerData.mappingMode !== 'HiROM') {
            console.warn('[ROM_DIAG] Non-standard mapping mode may cause addressing problems');
        }
        
        if (actualSum !== 0xFFFF) {
            console.warn('[ROM_DIAG] Checksum mismatch - ROM may be corrupted or modified');
        }
    }
    
    // Enhanced debug rendering 
    public debugRender(): void {
        if (!this.ppu?.canvasContext) return;
        
        const ctx = this.ppu.canvasContext;
        ctx.save();
        
        // Draw frame counter
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(5, 5, 100, 40);
        ctx.fillStyle = 'lime';
        ctx.font = '10px monospace';
        ctx.fillText(`Frame: ${this.frameCount}`, 10, 20);
        ctx.fillText(`CPU Cycles: ${this.totalCycles}`, 10, 35);
        
        // Draw test pattern to verify rendering pipeline
        this.drawTestPattern(ctx);
        
        // Draw debug markers on corners to verify canvas bounds
        this.drawCornerMarkers(ctx);
        
        ctx.restore();
    }
    
    private drawTestPattern(ctx: CanvasRenderingContext2D): void {
        // Draw a gradient bar at the bottom to test color rendering
        const width = ctx.canvas.width;
        const barHeight = 10;
        const y = ctx.canvas.height - barHeight;
        
        const gradient = ctx.createLinearGradient(0, y, width, y);
        gradient.addColorStop(0, 'red');
        gradient.addColorStop(0.2, 'orange');
        gradient.addColorStop(0.4, 'yellow');
        gradient.addColorStop(0.6, 'green');
        gradient.addColorStop(0.8, 'blue');
        gradient.addColorStop(1, 'violet');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, y, width, barHeight);
    }
    
    private drawCornerMarkers(ctx: CanvasRenderingContext2D): void {
        const size = 10;
        const width = ctx.canvas.width;
        const height = ctx.canvas.height;
        
        // Top-left: Red
        ctx.fillStyle = 'red';
        ctx.fillRect(0, 0, size, size);
        
        // Top-right: Green
        ctx.fillStyle = 'green';
        ctx.fillRect(width - size, 0, size, size);
        
        // Bottom-left: Blue
        ctx.fillStyle = 'blue';
        ctx.fillRect(0, height - size, size, size);
        
        // Bottom-right: Yellow
        ctx.fillStyle = 'yellow';
        ctx.fillRect(width - size, height - size, size, size);
    }
    
    // DMA monitoring and diagnostics
    public getDMAState(): object {
        return this.memory.getDMAState();
    }
    
    // Public renderFrame method with debug info
    public renderFrame(): void {
        // First, let the PPU try to render normally
        if (this.ppu) {
            this.ppu.renderFrame();
            
            // Then add our debug information on top
            this.debugRender();
        } else {
            console.error('[ERROR] Cannot render frame: PPU is not initialized');
        }
    }

    private handleInterrupts(): void {
        // Manage CPU interrupts based on PPU state and external events
        // Add interrupt handling here to synchronize CPU and PPU.
    }

    private optimizePerformance(): void {
        // Add performance optimization, like throttling or adaptive timing
        // depending on screen resolution, ROM size, and frame complexity.
    }

    // Button state management integration with actual input:
    private processControllerInput(): void {
        // Integrate real controller input logic (e.g., keyboard, gamepad).
        // Map controller buttons to emulator button state here.
    }

    // --- Audio Handling Methods ---

    private initializeAudio(): void {
        if (this.audioContext) return; // Already initialized

        try {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ 
                sampleRate: APU.SAMPLE_RATE 
            });
            
            // Check if context was created successfully (might be suspended)
            if (!this.audioContext) {
                 console.error('[ERROR] Could not create AudioContext');
                 return;
            }

            // Handle potential suspended state (due to browser auto-play policies)
            if (this.audioContext.state === 'suspended') {
                console.warn('[WARN] AudioContext is suspended. User interaction might be required to resume.');
                // We might need a UI element for the user to click to resume audio
                // For now, we just log it.
            }

            this.scriptNode = this.audioContext.createScriptProcessor(this.audioBufferSize, 0, 2); // 0 input channels, 2 output channels (stereo)
            this.scriptNode.onaudioprocess = this.handleAudioProcess;
            console.debug('[DEBUG] Audio initialized. Sample Rate:', this.audioContext.sampleRate, 'Buffer Size:', this.audioBufferSize);
        } catch (e) {
            console.error('[ERROR] Failed to initialize Web Audio API:', e);
            this.audioContext = null;
            this.scriptNode = null;
        }
    }

    private handleAudioProcess = (audioProcessingEvent: AudioProcessingEvent): void => {
        if (!this.apu) return;

        // Get the output buffer pointers
        const outputBuffer = audioProcessingEvent.outputBuffer;
        const outputL = outputBuffer.getChannelData(0);
        const outputR = outputBuffer.getChannelData(1);

        // Ask the APU to fill the buffers with samples
        this.apu.generateSamples(outputL, outputR);
    };

    startAudio(): void {
        this.initializeAudio(); // Ensure audio is initialized

        if (this.scriptNode && this.audioContext) {
             // Resume context if suspended (important for user interaction requirement)
             if (this.audioContext.state === 'suspended') {
                 this.audioContext.resume().then(() => {
                     console.debug('[DEBUG] AudioContext resumed.');
                     this.scriptNode?.connect(this.audioContext!.destination);
                     console.debug('[DEBUG] Audio processing started (after resume).');
                 }).catch(err => console.error('[ERROR] Failed to resume AudioContext:', err));
             } else {
                 this.scriptNode.connect(this.audioContext.destination);
                 console.debug('[DEBUG] Audio processing started.');
             }
        } else {
            console.warn('[WARN] Cannot start audio: Audio components not available.');
        }
    }

    stopAudio(): void {
        if (this.scriptNode && this.audioContext) {
            try {
                this.scriptNode.disconnect(); // Disconnect from destination
                console.debug('[DEBUG] Audio processing stopped.');
            } catch (e) {
                // Ignore errors if already disconnected
            }
             // Optionally suspend or close context if not needed anymore
             // this.audioContext.suspend(); 
             // this.audioContext.close();
        }
    }

    getAPU(): APU {
        return this.apu;
    }

    public setNmiEnabled(enabled: boolean): void {
        this.nmiEnabled = enabled;
        console.debug(`[DEBUG] Emulator: NMI ${enabled ? 'Enabled' : 'Disabled'}`);
    }

    public getIsInVBlank(): boolean {
        return this.isInVBlank;
    }

    public getIsROMLoaded(): boolean {
        return this.romLoaded;
    }

    public setCanvasContext(canvasElement: HTMLCanvasElement) {
        try {
            // ... existing code ...
        } catch (e) {
            console.error('[ERROR] Failed to set canvas context:', e);
        }
    }

    // Add a new method to directly debug the canvas
    private debugCanvasDirectly(): void {
        try {
            if (this.ppu?.canvasContext) {
                console.warn('[CANVAS_DEBUG] Direct canvas access attempt - frame ' + this.frameCount);
                const ctx = this.ppu.canvasContext;
                
                // Save current state
                ctx.save();
                
                // Draw a flashing pattern that's impossible to miss
                const frame = this.frameCount % 6;
                const colors = ['red', 'blue', 'green', 'yellow', 'magenta', 'cyan'];
                ctx.fillStyle = colors[frame];
                
                // Draw a rectangle in top-right corner (avoid overlap with test pattern)
                ctx.fillRect(200, 0, 56, 56);
                
                // Add text
                ctx.fillStyle = 'white';
                ctx.font = '12px Arial';
                ctx.fillText(`F: ${this.frameCount}`, 205, 20);
                
                // Draw borders around the entire canvas to ensure we can see the full canvas
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 4;
                ctx.strokeRect(2, 2, 252, 220);
                
                // Restore state
                ctx.restore();
                
                console.warn('[CANVAS_DEBUG] Direct canvas draw completed');
            } else {
                console.error('[CANVAS_DEBUG] No canvas context available');
            }
        } catch (e) {
            console.error('[CANVAS_DEBUG] Exception during direct canvas access:', e);
        }
    }

    // Analyze ROM for potential issues and activate emergency mode if needed
    private analyzeROM(): void {
        // Get ROM header data
        const headerData = this.memory.dumpHeaderData();
        if (!headerData) {
            console.warn('[EMERGENCY] Could not read ROM header - enabling emergency mode');
            this.enableEmergencyMode();
            return;
        }
        
        // Check for issues that would require emergency mode
        let emergencyModeNeeded = false;
        
        // Check ROM checksums
        if ((headerData.checksum + headerData.checksumComplement) !== 0xFFFF) {
            console.warn('[EMERGENCY] ROM checksum validation failed - may affect operation');
            emergencyModeNeeded = true;
        }
        
        // Check ROM makeup byte
        if (headerData.romType > 0x10) {
            console.warn('[EMERGENCY] Unusual ROM type detected');
            emergencyModeNeeded = true;
        }
        
        // If issues detected, enable emergency mode
        if (emergencyModeNeeded) {
            this.enableEmergencyMode();
        }
    }
    
    // Enable emergency mode for problematic ROMs
    private enableEmergencyMode(): void {
        console.warn('[EMERGENCY] Activating emergency mode for problematic ROM');
        this.emergencyModeEnabled = true;
        
        // Force favorable CPU state for initialization
        this.cpu.getState(); // Just to ensure CPU state is accessible
        
        // Force PPU to a known good state
        if (this.ppu) {
            this.ppu.forceSafeState();
        }
        
        // Force memory to enable all PPU features
        this.memory.enableEmergencyMode();
    }
    
    // Emergency rendering mode - very basic and guaranteed not to crash
    private renderEmergencyGraphics(): void {
        if (!this.ppu?.canvasContext) return;
        
        const ctx = this.ppu.canvasContext;
        
        try {
            // Just draw a very simple emergency pattern
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            
            // Draw a red border
            ctx.strokeStyle = '#FF0000';
            ctx.lineWidth = 5;
            ctx.strokeRect(10, 10, ctx.canvas.width - 20, ctx.canvas.height - 20);
            
            // Simple text
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('EMERGENCY MODE', ctx.canvas.width / 2, 50);
            ctx.fillText(`FRAME: ${this.frameCount}`, ctx.canvas.width / 2, 80);
        } catch (e) {
            console.error('[ERROR] Failed to render emergency graphics:', e);
        }
    }
}
