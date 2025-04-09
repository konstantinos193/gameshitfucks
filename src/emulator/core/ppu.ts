import { Memory } from './memory';

export interface BGSettings {
    enabled: boolean;
    tileSize: boolean;   // false = 8x8, true = 16x16
    tilemapAddress: number;
    tilemapSize: number; // 0=32x32, 1=64x32, 2=32x64, 3=64x64
    characterAddress: number;
}

export class PPU {
    // Constants
    private static readonly SCREEN_WIDTH = 256;
    private static readonly SCREEN_HEIGHT = 224;
    
    // Canvas and rendering context
    public canvasContext: CanvasRenderingContext2D | null = null;
    public canvas: HTMLCanvasElement | null = null;
    
    // VRAM (64KB)
    public vram: Uint16Array = new Uint16Array(0x8000); // 64KB of VRAM (for tiles and tilemaps)
    
    // CGRAM (Color Generator RAM - 512 bytes)
    public cgram: Uint16Array = new Uint16Array(0x100); // 256 color palette entries (512 bytes)
    
    // OAM (Object Attribute Memory - 544 bytes)
    private oam: Uint8Array = new Uint8Array(0x220); // 128 sprites * 4 bytes + 32 bytes high table
    
    // PPU registers and state
    private _forcedBlank: boolean = true;
    private _brightness: number = 0;
    private _bgMode: number = 0;
    private _mainScreenEnabled: boolean = false;
    private _subScreenEnabled: boolean = false;
    
    // Frame counter
    private frameCount: number = 0;
    
    // Image data for rendering
    private imageData: ImageData;
    
    // Background settings
    public bgSettings: BGSettings[] = [
        { enabled: false, tileSize: false, tilemapAddress: 0, tilemapSize: 0, characterAddress: 0 },
        { enabled: false, tileSize: false, tilemapAddress: 0, tilemapSize: 0, characterAddress: 0 },
        { enabled: false, tileSize: false, tilemapAddress: 0, tilemapSize: 0, characterAddress: 0 },
        { enabled: false, tileSize: false, tilemapAddress: 0, tilemapSize: 0, characterAddress: 0 }
    ];
    
    // VRAM address and access registers
    private _vramAddress: number = 0;
    private _vramReadBuffer: number = 0;
    private _vramIncrement: number = 1;
    private _vramIncrementOnHigh: boolean = false;
    
    // CGRAM address and access registers
    private _cgramAddress: number = 0;
    private _cgramAddressLatch: boolean = false;
    private _cgramLowByte: number = 0;

    constructor(memory: Memory) {
        this.imageData = new ImageData(256, 224);
        this._bgMode = 1;
        this._brightness = 0xF;
        this._forcedBlank = false;
        this._mainScreenEnabled = false;
        this._subScreenEnabled = false;
        this.frameCount = 0;

        this.bgSettings = Array(4).fill(null).map(() => ({
            enabled: false,
            tileSize: false,
            tilemapAddress: 0,
            tilemapSize: 0,
            characterAddress: 0
        }));

        // Set up default background configuration for Mode 1
        this.bgSettings[0] = {
            enabled: true,
            tileSize: false,
            tilemapAddress: 0x1000,
            tilemapSize: 0,
            characterAddress: 0x0000
        };

        this.bgSettings[1] = {
            enabled: true,
            tileSize: false,
            tilemapAddress: 0x1400,
            tilemapSize: 0,
            characterAddress: 0x4000
        };

        console.debug('[DEBUG] PPU: Initialized with Mode 1 settings');
        console.debug('[DEBUG] PPU: BG1 settings:', this.bgSettings[0]);
        console.debug('[DEBUG] PPU: BG2 settings:', this.bgSettings[1]);
        console.debug('[DEBUG] PPU: Forced Blank initially set to:', this.forcedBlank);
        console.debug('[DEBUG] PPU: Screen Brightness initially set to:', this.brightness);
        
        // Initialize CGRAM with a default palette so we have some colors
        this.initializeDefaultPalette();
    }
    
    // Add a method to initialize a default palette
    private initializeDefaultPalette(): void {
        console.debug('[DEBUG] PPU: Initializing default palette');
        // SNES RGB values (5 bits per channel)
        const defaultColors = [
            0x0000, // Black
            0x001F, // Blue
            0x03E0, // Green
            0x03FF, // Cyan
            0x7C00, // Red
            0x7C1F, // Magenta
            0x7FE0, // Yellow
            0x7FFF  // White
        ];
        
        for (let i = 0; i < defaultColors.length; i++) {
            const color = defaultColors[i];
            this.cgram[i * 2] = color & 0xFF;
            this.cgram[i * 2 + 1] = (color >> 8) & 0xFF;
        }
    }
    
    // Add a method to render a test pattern
    renderTestPattern(): void {
        console.warn(`[CRITICAL_DEBUG] Canvas context: ${this.canvasContext ? 'EXISTS' : 'NULL'}`);
        
        if (!this.canvasContext) {
            console.error('[CRITICAL_ERROR] PPU: No canvas context available for test pattern');
            return;
        }
        
        console.debug('[DEBUG] PPU: Rendering enhanced test pattern');
        
        try {
        // Create a test pattern to verify the display works
        const width = 256;
        const height = 224;
        
            // ENHANCED: Clear to black first to ensure full wipe
            this.canvasContext.fillStyle = 'black';
            this.canvasContext.fillRect(0, 0, width, height);
            
            // EMERGENCY: Add a bright red rectangle that should be impossible to miss
            this.canvasContext.fillStyle = 'red';
            this.canvasContext.fillRect(20, 20, width - 40, height - 40);
            
            // Add white text that will be very visible
            this.canvasContext.font = "30px Arial";
            this.canvasContext.textAlign = "center";
            this.canvasContext.fillStyle = "white";
            this.canvasContext.fillText("EMERGENCY TEST", width/2, height/2);
            this.canvasContext.fillText(`FRAME: ${this.frameCount}`, width/2, height/2 + 40);
            
            console.warn('[CRITICAL_DEBUG] Emergency test pattern rendered');
        } catch (e) {
            console.error('[CRITICAL_ERROR] Error rendering test pattern:', e);
        }
    }

    setCanvasContext(context: CanvasRenderingContext2D): void {
        this.canvasContext = context;
        this.canvas = context.canvas;
        this.canvas.addEventListener('webglcontextlost', this.handleContextLost.bind(this));
        this.canvas.addEventListener('webglcontextrestored', this.handleContextRestored.bind(this));
        console.debug('[DEBUG] PPU: Canvas context set:', context !== null);
    }

    private handleContextLost(event: Event): void {
        event.preventDefault();
        console.warn('[DEBUG] PPU: Canvas context lost');
        this.canvasContext = null;
    }

    private handleContextRestored(event: Event): void {
        console.debug('[DEBUG] PPU: Attempting to restore canvas context');
        if (this.canvas) {
            const context = this.canvas.getContext('2d');
            if (context) {
                this.canvasContext = context;
                console.debug('[DEBUG] PPU: Canvas context restored');
            } else {
                console.error('[DEBUG] PPU: Failed to restore canvas context');
            }
        }
    }

    private ensureContext(): boolean {
        if (!this.canvasContext && this.canvas) {
            console.debug('[DEBUG] PPU: Attempting to recover lost context');
            const context = this.canvas.getContext('2d');
            if (context) {
                this.canvasContext = context;
                console.debug('[DEBUG] PPU: Context recovered successfully');
                return true;
            }
            console.warn('[DEBUG] PPU: Failed to recover context');
            return false;
        }
        return !!this.canvasContext;
    }

    setVRAMData(offset: number, data: Uint8Array): void {
        console.debug('[DEBUG] PPU: Setting VRAM data at offset', offset.toString(16), 'size:', data.length);
        this.vram.set(data, offset);
        console.debug('[DEBUG] PPU: VRAM updated, first 16 bytes:', 
            Array.from(this.vram.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' '));
    }

    setCGRAMData(offset: number, data: Uint8Array): void {
        console.debug(`[DEBUG] PPU: Setting CGRAM data at offset 0x${offset.toString(16)}, size: ${data.length} bytes`);
        if (offset >= this.cgram.length) {
            console.error(`[DEBUG] PPU: Invalid CGRAM offset: 0x${offset.toString(16)}`);
            return;
        }
        const bytesToCopy = Math.min(data.length, this.cgram.length - offset);
        this.cgram.set(data.subarray(0, bytesToCopy), offset);
        const colorsToLog = Math.min(8, Math.floor(bytesToCopy / 2));
        for (let i = 0; i < colorsToLog; i++) {
            const colorOffset = offset + (i * 2);
            const color = (this.cgram[colorOffset + 1] << 8) | this.cgram[colorOffset];
            const r = (color & 0x1F) * 8;
            const g = ((color >> 5) & 0x1F) * 8;
            const b = ((color >> 10) & 0x1F) * 8;
            console.debug(`[DEBUG] PPU: CGRAM[${i}] = 0x${color.toString(16).padStart(4, '0')} (R:${r} G:${g} B:${b})`);
        }
    }

    private validateCGRAM(): void {
        console.debug('[DEBUG] PPU: Validating CGRAM contents...');
        const isEmpty = this.cgram.every(value => value === 0);
        if (isEmpty) {
            console.warn('[DEBUG] PPU: CGRAM is completely empty!');
            const defaultPalette = [
                0x0000, 0x7FFF, 0x001F, 0x03E0, 0x7C00, 0x03FF, 0x7C1F, 0x7FE0
            ];
            for (let i = 0; i < defaultPalette.length; i++) {
                const color = defaultPalette[i];
                this.cgram[i * 2] = color & 0xFF;
                this.cgram[i * 2 + 1] = (color >> 8) & 0xFF;
            }
            console.debug('[DEBUG] PPU: Initialized CGRAM with default palette');
        }
        console.debug('[DEBUG] PPU: First 16 CGRAM colors:');
        for (let i = 0; i < 16; i++) {
            const color = (this.cgram[i * 2 + 1] << 8) | this.cgram[i * 2];
            console.debug(`[DEBUG] PPU: Color ${i}: 0x${color.toString(16).padStart(4, '0')}`);
        }
    }

    setBGMode(mode: number): void {
        this._bgMode = mode;
        console.debug('[DEBUG] PPU: BG mode set to', mode);
    }

    setBGSettings(bg: number, settings: BGSettings): void {
        this.bgSettings[bg] = settings;
        console.debug('[DEBUG] PPU: BG', bg, 'settings updated:', settings);
    }

    setForcedBlank(blank: boolean): void {
        this._forcedBlank = blank;
        console.debug(`[DEBUG] PPU: Forced Blank set to ${this._forcedBlank}`);
    }

    setBrightness(brightness: number): void {
        this._brightness = brightness & 0x0F;
        console.debug(`[DEBUG] PPU: Screen Brightness set to ${this._brightness}`);
    }

    renderFrame(): void {
        if (!this.canvasContext) {
            console.warn('[DEBUG] PPU: No canvas context available for renderFrame');
            return;
        }

        try {
            // Clear screen with black
            this.canvasContext.fillStyle = 'black';
        this.canvasContext.fillRect(0, 0, 256, 224);
            
            // Skip rendering if forced blank is enabled
            if (this._forcedBlank) {
                this.canvasContext.fillStyle = 'white';
                this.canvasContext.font = '12px Arial';
                this.canvasContext.fillText('FORCED BLANK', 10, 112);
            return;
        }
            
            // Skip if no layers are enabled
            if (!this._mainScreenEnabled) {
                this.canvasContext.fillStyle = 'white';
                this.canvasContext.font = '12px Arial';
                this.canvasContext.fillText('SCREEN DISABLED', 10, 112);
            return;
        }
            
            // Initialize our pixel buffer
            const imageData = this.canvasContext.createImageData(256, 224);
            const pixels = imageData.data;
            
            // Render backgrounds based on mode
            switch (this._bgMode) {
                case 0: // Mode 0: four 2bpp BGs
                    this.renderMode0(pixels);
                    break;
                case 1: // Mode 1: two 4bpp BGs, one 2bpp BG
                    this.renderMode1(pixels);
                    break;
                default:
                    // For other modes, just try basic rendering
                    this.renderBasicBG(pixels);
                    break;
            }
            
            // Put the image data onto the canvas
            this.canvasContext.putImageData(imageData, 0, 0);
            
            // Frame counter indicator
            this.canvasContext.fillStyle = (this.frameCount % 60 < 30) ? 'white' : 'red';
            this.canvasContext.fillRect(245, 5, 6, 6);
            
            // Increment frame counter
            this.frameCount++;
            
        } catch (e) {
            console.error('[ERROR] Failed to render frame:', e);
            // Fall back to basic colored rendering
            this.renderFallbackPattern();
        }
    }
    
    // Basic BG rendering for any mode
    private renderBasicBG(pixels: Uint8ClampedArray): void {
        // Get the first enabled background layer
        const bgIndex = this.bgSettings.findIndex(bg => bg.enabled);
        if (bgIndex === -1) return; // No enabled layers
        
        const bg = this.bgSettings[bgIndex];
        
        // Get VRAM addresses for tilemap and characters
        const tilemapBase = bg.tilemapAddress;
        const characterBase = bg.characterAddress;
        
        // Determine bits per pixel based on mode and BG
        const bpp = (this._bgMode === 0) ? 2 : (bgIndex < 2) ? 4 : 2;
        
        // Calculate bytes per character based on BPP (2bpp=16 bytes, 4bpp=32 bytes, 8bpp=64 bytes)
        const bytesPerChar = 8 * bpp;
        
        // Loop through each tile on screen (32x28 tiles for 256x224 resolution)
        for (let y = 0; y < 28; y++) {
            for (let x = 0; x < 32; x++) {
                // Calculate tilemap address for this tile
                const tilemapAddress = tilemapBase + (y * 32 + x) * 2;
                
                // Read tile data from VRAM (2 bytes per tile)
                const tileDataLow = this.vram[tilemapAddress];
                const tileDataHigh = this.vram[tilemapAddress + 1];
                
                // Extract tile information
                const tileNumber = tileDataLow & 0x3FF; // 10 bits for tile number
                const palette = (tileDataHigh & 0x1C) >> 2; // 3 bits for palette
                const hFlip = (tileDataHigh & 0x40) !== 0; // Horizontal flip
                const vFlip = (tileDataHigh & 0x80) !== 0; // Vertical flip
                
                // Render this tile
                this.renderTile(
                    pixels,
                    x * 8, y * 8, // Screen position
                    tileNumber,
                    characterBase,
                    palette,
                    bpp,
                    hFlip,
                    vFlip
                );
            }
        }
    }
    
    // Render a single tile to the pixel buffer
    private renderTile(
        pixels: Uint8ClampedArray,
        screenX: number,
        screenY: number,
        tileNumber: number,
        characterBase: number,
        palette: number,
        bpp: number,
        hFlip: boolean,
        vFlip: boolean
    ): void {
        // Calculate address of this tile in character data
        const tileAddress = characterBase + tileNumber * 8 * bpp / 4; // Divide by 4 since VRAM is 16-bit
        
        // For each pixel in the 8x8 tile
        for (let y = 0; y < 8; y++) {
            const actualY = vFlip ? 7 - y : y;
            
            // Get the bitplanes for this row
            const rowAddress = tileAddress + actualY * bpp / 8;
            
            // Read bitplanes - depends on bpp (2bpp=2 bytes, 4bpp=4 bytes, 8bpp=8 bytes per row)
            const bitplanes = [];
            for (let p = 0; p < bpp / 2; p++) {
                bitplanes.push(this.vram[rowAddress + p]);
            }
            
            // Process each pixel in the row
            for (let x = 0; x < 8; x++) {
                const actualX = hFlip ? 7 - x : x;
                
                // Build the color index for this pixel from all bitplanes
                let colorIndex = 0;
                for (let p = 0; p < bitplanes.length; p++) {
                    // Extract 2 bits from each bitplane word (shift right by bit position, then mask lowest 2 bits)
                    const bitplaneBits = (bitplanes[p] >> (14 - actualX * 2)) & 0x03;
                    // Add to color index in the right position (2 bits per plane)
                    colorIndex |= (bitplaneBits << (p * 2));
                }
                
                // Calculate palette index
                // For 2bpp: 4 colors per palette, 8 palettes total = 0-31
                // For 4bpp: 16 colors per palette, 8 palettes total = 0-127
                // For 8bpp: 256 colors = 0-255
                const paletteOffset = bpp === 2 ? (palette * 4) : (palette * 16);
                const finalColorIndex = colorIndex === 0 ? 0 : paletteOffset + colorIndex;
                
                // Skip transparent pixels (index 0)
                if (colorIndex === 0) continue;

                // Get the color from CGRAM
                const color = this.cgram[finalColorIndex];
                
                // Calculate RGB values (SNES format: 0bbbbbgg gggrrrrr)
                const r = (color & 0x1F) * 8; // 5 bits red
                const g = ((color >> 5) & 0x1F) * 8; // 5 bits green
                const b = ((color >> 10) & 0x1F) * 8; // 5 bits blue
                
                // Calculate the pixel position in the output buffer
                const pixelPos = ((screenY + y) * 256 + (screenX + x)) * 4;
                
                // Set the RGBA values in the buffer
                pixels[pixelPos] = r;
                pixels[pixelPos + 1] = g;
                pixels[pixelPos + 2] = b;
                pixels[pixelPos + 3] = 255; // Alpha
            }
        }
    }
    
    // Mode-specific rendering methods
    private renderMode0(pixels: Uint8ClampedArray): void {
        // Mode 0: four 2bpp BGs
        // Just use basic BG rendering for now - prioritize the first enabled background
        this.renderBasicBG(pixels);
    }
    
    private renderMode1(pixels: Uint8ClampedArray): void {
        // Mode 1: two 4bpp BGs, one 2bpp BG
        // Just use basic BG rendering for now - prioritize the first enabled background
        this.renderBasicBG(pixels);
    }
    
    // Fallback pattern for debugging
    private renderFallbackPattern(): void {
        if (!this.canvasContext) return;
        
        // Simple colored bars pattern
        const ctx = this.canvasContext;
        
        // Draw a simple pattern of colored bars
        const colors = ['red', 'green', 'blue', 'yellow', 'cyan', 'magenta'];
        const barHeight = 224 / colors.length;
        
        for (let i = 0; i < colors.length; i++) {
            ctx.fillStyle = colors[i];
            ctx.fillRect(0, i * barHeight, 256, barHeight);
        }
        
        // Add frame counter text
        ctx.fillStyle = 'white';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`FALLBACK: ${this.frameCount}`, 128, 112);
    }

    reset(): void {
        console.debug('[DEBUG] PPU: Resetting PPU state');
        this.vram.fill(0);
        this.cgram.fill(0);
        this._bgMode = 1;
        this.bgSettings[0] = {
            enabled: true,
            tileSize: false,
            tilemapAddress: 0x1000,
            tilemapSize: 0,
            characterAddress: 0x0000
        };
        this.bgSettings[1] = {
            enabled: true,
            tileSize: false,
            tilemapAddress: 0x1400,
            tilemapSize: 0,
            characterAddress: 0x4000
        };
        this.bgSettings[2] = {
            enabled: false,
            tileSize: false,
            tilemapAddress: 0x0800,
            tilemapSize: 0,
            characterAddress: 0x6000
        };
        this.bgSettings[3] = {
            enabled: false,
            tileSize: false,
            tilemapAddress: 0x0C00,
            tilemapSize: 0,
            characterAddress: 0x8000
        };
        console.debug('[DEBUG] PPU: Reset complete');
        console.debug('[DEBUG] PPU: Mode:', this._bgMode);
        console.debug('[DEBUG] PPU: BG settings:', this.bgSettings);
    }

    public get bgMode(): number { return this._bgMode; }
    public set bgMode(value: number) { this._bgMode = value; }

    public get mainScreenEnabled(): boolean { return this._mainScreenEnabled; }
    public set mainScreenEnabled(value: boolean) { this._mainScreenEnabled = value; }

    public get forcedBlank(): boolean { return this._forcedBlank; }
    public set forcedBlank(value: boolean) { this._forcedBlank = value; }

    public get brightness(): number { return this._brightness; }
    public set brightness(value: number) { this._brightness = value & 0x0F; }

    public get subScreenEnabled(): boolean { return this._subScreenEnabled; }
    public set subScreenEnabled(value: boolean) { this._subScreenEnabled = value; }

    // Method to force the PPU into a known good state for emergency mode
    public forceSafeState(): void {
        // Reset all internal state to known good values
        this._forcedBlank = false;
        this._mainScreenEnabled = true;
        this._subScreenEnabled = true;
        this.brightness = 15; // Full brightness
        
        // Enable the first two background layers
        this.bgSettings[0].enabled = true;
        this.bgSettings[1].enabled = true;
        
        // Set a visible palette (bright green, white, black, red)
        this.cgram[0] = 0x0000; // Transparent
        this.cgram[1] = 0x03E0; // Green
        this.cgram[2] = 0x7FFF; // White
        this.cgram[3] = 0x0000; // Black
        this.cgram[4] = 0x001F; // Red
        
        // Create some emergency tile data so something will be visible
        // Simple checkerboard pattern for BG1
        const emergencyPattern = [
            0xAA, 0x55, 0xAA, 0x55, 0xAA, 0x55, 0xAA, 0x55, // Checkerboard pattern - tile 1
            0x55, 0xAA, 0x55, 0xAA, 0x55, 0xAA, 0x55, 0xAA, // Inverse pattern - tile 2
            0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, // Solid white - tile 3
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00  // Solid black - tile 4
        ];
        
        // Copy the emergency pattern to both VRAM tile tables
        for (let i = 0; i < emergencyPattern.length; i++) {
            // Low-priority tileset in first 1KB
            this.vram[i] = emergencyPattern[i];
            // High-priority tileset in second 1KB
            this.vram[i + 0x400] = emergencyPattern[i];
        }
        
        // Set up a simple tilemap for BG1 - alternating checkerboard patterns
        for (let y = 0; y < 32; y++) {
            for (let x = 0; x < 32; x++) {
                const tileIndex = ((x + y) % 2) + 1; // Alternate between tiles 1 and 2
                const tileAddr = 0x1000 + (y * 32 + x) * 2; // BG1 tilemap at 0x1000
                
                // Tile index and attributes
                this.vram[tileAddr] = tileIndex;
                this.vram[tileAddr + 1] = 0x01; // Palette 1, no flipping
            }
        }
        
        // We can only set what's available in the interface
        // For BG1 settings, we'll rely on the emergency rendering instead
        this.bgSettings[0].enabled = true;
        
        console.warn('[PPU] Forced emergency PPU state established');
    }

    /**
     * Write to a PPU register (0x00-0xFF mapping to $2100-$21FF)
     */
    writeRegister(register: number, value: number): void {
        // Ensure register is in valid range and value is 8-bit
        const reg = register & 0xFF;
        const val = value & 0xFF;
        
        // Handle specific registers
        switch (reg) {
            // INIDISP - Screen Display Register ($2100)
            case 0x00:
                this.brightness = val & 0x0F; // Bits 0-3: Brightness (0-15)
                this._forcedBlank = (val & 0x80) !== 0; // Bit 7: Force blank
                break;
                
            // BGMODE - BG Mode and BG Character Size Register ($2105)
            case 0x05:
                this._bgMode = val & 0x07; // Bits 0-2: BG Mode
                // Bit 3: BG3 Priority - TODO
                this.bgSettings[0].tileSize = (val & 0x10) !== 0; // Bit 4: BG1 Tile Size (0=8x8, 1=16x16)
                this.bgSettings[1].tileSize = (val & 0x20) !== 0; // Bit 5: BG2 Tile Size
                this.bgSettings[2].tileSize = (val & 0x40) !== 0; // Bit 6: BG3 Tile Size
                this.bgSettings[3].tileSize = (val & 0x80) !== 0; // Bit 7: BG4 Tile Size
                break;
                
            // MOSAIC - Mosaic Register ($2106)
            case 0x06:
                // Bits 0-3: Mosaic Size
                // Bits 4-7: BG Mosaic Enable
                // TODO: Implement mosaic if needed
                break;
                
            // BG1SC - BG1 Tilemap Address ($2107)
            case 0x07:
                this.bgSettings[0].tilemapAddress = (val & 0xFC) << 8; // Bits 2-7 * 0x400
                this.bgSettings[0].tilemapSize = val & 0x03; // Bits 0-1: Tilemap Size
                break;
                
            // BG2SC - BG2 Tilemap Address ($2108)
            case 0x08:
                this.bgSettings[1].tilemapAddress = (val & 0xFC) << 8; // Bits 2-7 * 0x400
                this.bgSettings[1].tilemapSize = val & 0x03; // Bits 0-1: Tilemap Size  
                break;
                
            // BG3SC - BG3 Tilemap Address ($2109)
            case 0x09:
                this.bgSettings[2].tilemapAddress = (val & 0xFC) << 8; // Bits 2-7 * 0x400
                this.bgSettings[2].tilemapSize = val & 0x03; // Bits 0-1: Tilemap Size
                break;
                
            // BG4SC - BG4 Tilemap Address ($210A)
            case 0x0A:
                this.bgSettings[3].tilemapAddress = (val & 0xFC) << 8; // Bits 2-7 * 0x400
                this.bgSettings[3].tilemapSize = val & 0x03; // Bits 0-1: Tilemap Size
                break;
                
            // BG12NBA - BG1/BG2 Character Data Address ($210B)
            case 0x0B:
                this.bgSettings[0].characterAddress = (val & 0x0F) << 12; // Bits 0-3 * 0x1000
                this.bgSettings[1].characterAddress = (val & 0xF0) << 8;  // Bits 4-7 * 0x1000
                break;
                
            // BG34NBA - BG3/BG4 Character Data Address ($210C)
            case 0x0C:
                this.bgSettings[2].characterAddress = (val & 0x0F) << 12; // Bits 0-3 * 0x1000
                this.bgSettings[3].characterAddress = (val & 0xF0) << 8;  // Bits 4-7 * 0x1000
                break;
                
            // TM - Main Screen Designation ($212C)
            case 0x2C:
                this.bgSettings[0].enabled = (val & 0x01) !== 0; // Bit 0: BG1 Enable
                this.bgSettings[1].enabled = (val & 0x02) !== 0; // Bit 1: BG2 Enable
                this.bgSettings[2].enabled = (val & 0x04) !== 0; // Bit 2: BG3 Enable
                this.bgSettings[3].enabled = (val & 0x08) !== 0; // Bit 3: BG4 Enable
                // Bits 4-7: Object/Sprite enable, color window enable
                this._mainScreenEnabled = (val !== 0); // Any layer enabled means screen is on
                break;
                
            // TS - Sub Screen Designation ($212D)
            case 0x2D:
                // Set sub screen layer visibility (similar to TM)
                this._subScreenEnabled = (val !== 0);
                break;
                
            // CGADD - CGRAM Address ($2121)
            case 0x21:
                this._cgramAddress = val; // Set CGRAM Address (palette)
                this._cgramAddressLatch = false; // Reset low/high byte latch
                break;
                
            // CGDATA - CGRAM Data Write ($2122)
            case 0x22:
                if (!this._cgramAddressLatch) {
                    // First write: Low byte
                    this._cgramLowByte = val;
                    this._cgramAddressLatch = true;
                } else {
                    // Second write: High byte, then combine and write to CGRAM
                    const colorValue = (val << 8) | this._cgramLowByte;
                    this.cgram[this._cgramAddress] = colorValue;
                    
                    // Auto-increment CGRAM address after second byte
                    this._cgramAddress = (this._cgramAddress + 1) & 0xFF;
                    this._cgramAddressLatch = false;
                }
                break;
                
            // VMAIN - VRAM Address Increment Mode ($2115)
            case 0x15:
                switch (val & 0x03) {
                    case 0: this._vramIncrement = 1; break;
                    case 1: this._vramIncrement = 32; break;
                    default: this._vramIncrement = 128; break;
                }
                this._vramIncrementOnHigh = (val & 0x80) !== 0;
                break;
                
            // VMADDL - VRAM Address (Low) ($2116)
            case 0x16:
                this._vramAddress = (this._vramAddress & 0xFF00) | val;
                this._vramReadBuffer = this.vram[this._vramAddress]; // Read buffer for reads
                break;
                
            // VMADDH - VRAM Address (High) ($2117)
            case 0x17:
                this._vramAddress = (this._vramAddress & 0x00FF) | (val << 8);
                this._vramReadBuffer = this.vram[this._vramAddress]; // Read buffer for reads
                break;
                
            // VMDATAL - VRAM Data Write (Low) ($2118)
            case 0x18:
                if (!this._vramIncrementOnHigh) {
                    // Update VRAM and increment address
                    this.vram[this._vramAddress] = (this.vram[this._vramAddress] & 0xFF00) | val;
                    this._vramAddress = (this._vramAddress + this._vramIncrement) & 0xFFFF;
                } else {
                    // Just update low byte, don't increment yet
                    this.vram[this._vramAddress] = (this.vram[this._vramAddress] & 0xFF00) | val;
                }
                break;
                
            // VMDATAH - VRAM Data Write (High) ($2119)
            case 0x19:
                if (this._vramIncrementOnHigh) {
                    // Update VRAM and increment address
                    this.vram[this._vramAddress] = (this.vram[this._vramAddress] & 0x00FF) | (val << 8);
                    this._vramAddress = (this._vramAddress + this._vramIncrement) & 0xFFFF;
                } else {
                    // Just update high byte, don't increment
                    this.vram[this._vramAddress] = (this.vram[this._vramAddress] & 0x00FF) | (val << 8);
                }
                break;
                
            default:
                // Log unimplemented registers only for specific ranges
                if (reg <= 0x33 || (reg >= 0x40 && reg <= 0x43)) {
                    console.debug(`[PPU] Unimplemented register write: $21${reg.toString(16).padStart(2, '0')} = $${val.toString(16).padStart(2, '0')}`);
                }
                break;
        }
    }
}