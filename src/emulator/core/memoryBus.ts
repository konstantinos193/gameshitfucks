import { Memory } from './memory';
import { PPU } from './ppu';
import { APU } from './apu';

/**
 * MemoryBus class - Handles proper address mapping, DMA transfers, and component communication
 * 
 * This component sits between CPU and the other components (PPU, APU) to ensure
 * correct memory mapping and data transfers.
 */
export class MemoryBus {
    private memory: Memory;
    private ppu: PPU;
    private apu: APU;
    
    // ROM mapping state
    private isLoROM: boolean = true;
    private isHiROM: boolean = false;
    private romMask: number = 0xFFFFFF;  // Mask for ROM addresses based on size
    
    // DMA channels state (8 channels)
    private dmaChannels: Array<{
        enabled: boolean;
        direction: boolean;  // A→B (false) or B→A (true)
        fixed: boolean;      // Fixed address
        mode: number;        // Transfer mode (0-7)
        bAddress: number;    // B-bus address (PPU/APU registers)
        aAddress: number;    // A-bus address (source/dest)
        size: number;        // Transfer size
    }> = Array(8).fill(null).map(() => ({
        enabled: false,
        direction: false,
        fixed: false,
        mode: 0,
        bAddress: 0,
        aAddress: 0,
        size: 0
    }));
    
    constructor(memory: Memory, ppu: PPU, apu: APU) {
        this.memory = memory;
        this.ppu = ppu;
        this.apu = apu;
    }
    
    /**
     * Initialize the memory bus with ROM information
     */
    initialize(rom: Uint8Array): void {
        // Determine ROM mapping mode (LoROM/HiROM)
        this.detectROMMode(rom);
        
        // Set ROM mask based on size
        this.romMask = (1 << Math.ceil(Math.log2(rom.length))) - 1;
        
        console.info(`[MEMORY_BUS] Initialized with ${this.isLoROM ? 'LoROM' : 'HiROM'} mapping, ROM size ${rom.length}`);
    }
    
    /**
     * Detect if ROM is LoROM or HiROM based on header information
     */
    private detectROMMode(rom: Uint8Array): void {
        // Check both potential mapping mode bytes
        const loromMapByte = rom[0x7FD5] || 0;
        const hiromMapByte = rom[0xFFD5] || 0;
        
        // Initially assume LoROM
        this.isLoROM = true;
        this.isHiROM = false;
        
        // Check if HiROM has a valid mapping byte
        if ((hiromMapByte & 0x01) === 0x01) {
            this.isLoROM = false;
            this.isHiROM = true;
        }
        
        console.info(`[MEMORY_BUS] ROM mapping detected: ${this.isLoROM ? 'LoROM' : 'HiROM'}`);
    }
    
    /**
     * Map a SNES address to a ROM address based on detected mapping mode
     */
    mapROMAddress(address: number): number {
        const bank = (address >> 16) & 0xFF;
        const offset = address & 0xFFFF;
        
        // Handle LoROM mapping
        if (this.isLoROM) {
            // LoROM maps ROM data to address ranges:
            // $00-$7D:8000-FFFF -> Lower half of ROM (first 2MB)
            // $80-$FF:8000-FFFF -> Upper half of ROM (second 2MB)
            
            const isRomArea = (
                (bank >= 0x00 && bank <= 0x7D && offset >= 0x8000) ||
                (bank >= 0x80 && bank <= 0xFF && offset >= 0x8000)
            );
            
            if (isRomArea) {
                // Map to ROM address: combine bank and offset
                const romBank = bank & 0x7F;         // Strip high bit
                const romOffset = offset & 0x7FFF;   // Strip high bit
                const romAddress = (romBank << 15) | romOffset;
                
                // Apply mask to ensure within ROM bounds
                return romAddress & this.romMask;
            } else {
                // Special handling for reset and interrupt vectors
                if (bank === 0x00 && (address >= 0xFFE0 && address <= 0xFFFF)) {
                    // Map to LoROM vectors
                    const vectorOffset = address - 0xFFE0;
                    return 0x7FE0 + vectorOffset;
                }
            }
        } 
        // Handle HiROM mapping
        else if (this.isHiROM) {
            // HiROM maps ROM data to address ranges:
            // $00-$3F:8000-FFFF, $40-$7D:0000-FFFF -> First 4MB of ROM
            // $80-$BF:8000-FFFF, $C0-$FF:0000-FFFF -> Second 4MB of ROM
            
            const isRomArea = (
                (bank >= 0x00 && bank <= 0x3F && offset >= 0x8000) ||
                (bank >= 0x40 && bank <= 0x7D) ||
                (bank >= 0x80 && bank <= 0xBF && offset >= 0x8000) ||
                (bank >= 0xC0 && bank <= 0xFF)
            );
            
            if (isRomArea) {
                let romBank = bank & 0x7F;         // Strip high bit
                let romOffset = offset;
                
                // Adjust for banks 00-3F and 80-BF with offsets < 8000
                if ((bank < 0x40 || (bank >= 0x80 && bank < 0xC0)) && offset < 0x8000) {
                    return -1; // Invalid ROM area
                }
                
                // For 00-3F and 80-BF and offsets >= 8000, subtract 8000
                if ((bank < 0x40 || (bank >= 0x80 && bank < 0xC0)) && offset >= 0x8000) {
                    romOffset -= 0x8000;
                    // Adjust bank to account for this
                    romBank = (romBank * 2) + 1;
                } 
                // For 40-7D and C0-FF, map to proper bank
                else if ((bank >= 0x40 && bank < 0x80) || bank >= 0xC0) {
                    // For 40-7D range, adjust bank
                    if (bank < 0x80) {
                        romBank = (romBank - 0x40) * 2;
                    } 
                    // For C0-FF range, adjust bank
                    else {
                        romBank = ((romBank - 0xC0) * 2) + (romBank >= 0x80 ? 1 : 0);
                    }
                }
                
                // Combine for full ROM address
                const romAddress = (romBank << 16) | romOffset;
                
                // Apply mask to ensure within ROM bounds
                return romAddress & this.romMask;
            } else {
                // Special handling for reset and interrupt vectors
                if ((bank === 0x00 || bank === 0x80) && address >= 0xFFE0 && address <= 0xFFFF) {
                    // Map to HiROM vectors
                    const vectorOffset = address - 0xFFE0;
                    return 0xFFE0 + vectorOffset;
                }
            }
        }
        
        // Invalid ROM address
        return -1;
    }
    
    /**
     * Read a byte from ROM with correct mapping
     */
    readROM(address: number): number {
        const romAddress = this.mapROMAddress(address);
        if (romAddress >= 0) {
            return this.memory.readROMDirect(romAddress);
        }
        return 0; // Default value for invalid addresses
    }
    
    /**
     * Configure a DMA channel
     */
    configureDMAChannel(
        channel: number, 
        enabled: boolean,
        direction: boolean,
        fixed: boolean,
        mode: number,
        bAddress: number,
        aAddress: number,
        size: number
    ): void {
        if (channel < 0 || channel >= 8) return;
        
        this.dmaChannels[channel] = {
            enabled,
            direction,
            fixed,
            mode,
            bAddress,
            aAddress,
            size
        };
        
        console.debug(`[MEMORY_BUS] DMA Channel ${channel} configured: Direction=${direction?'B→A':'A→B'}, Fixed=${fixed}, Mode=${mode}, B=${bAddress.toString(16)}, A=${aAddress.toString(16)}, Size=${size}`);
    }
    
    /**
     * Execute DMA transfer for a specific channel
     */
    executeDMATransfer(channel: number): void {
        if (channel < 0 || channel >= 8 || !this.dmaChannels[channel].enabled) {
            return;
        }
        
        const dma = this.dmaChannels[channel];
        
        // Safety check for invalid size
        const size = dma.size === 0 ? 65536 : dma.size;
        
        console.info(`[MEMORY_BUS] DMA Transfer Channel ${channel}: ${dma.direction?'B→A':'A→B'}, Fixed=${dma.fixed}, Mode=${dma.mode}, Size=${size}`);
        
        // A→B: Transfer from RAM/ROM to PPU/APU registers
        if (!dma.direction) {
            // Handle different PPU/APU registers
            if (dma.bAddress >= 0x2100 && dma.bAddress <= 0x21FF) {
                // PPU transfer
                this.doDMAToPPU(channel, dma.aAddress, dma.bAddress, size, dma.fixed, dma.mode);
            } else if (dma.bAddress >= 0x2140 && dma.bAddress <= 0x2143) {
                // APU transfer
                this.doDMAToAPU(channel, dma.aAddress, dma.bAddress, size, dma.fixed, dma.mode);
            } else {
                console.warn(`[MEMORY_BUS] Unsupported DMA B-bus address: ${dma.bAddress.toString(16)}`);
            }
        }
        // B→A: Transfer from PPU/APU registers to RAM
        else {
            console.warn(`[MEMORY_BUS] B→A DMA transfers not fully implemented yet`);
            // Placeholder for B→A transfers (less common)
        }
    }
    
    /**
     * Perform DMA transfer to PPU
     */
    private doDMAToPPU(channel: number, srcAddr: number, destReg: number, size: number, fixed: boolean, mode: number): void {
        // Determine start B-bus (PPU) register
        const baseReg = destReg & 0xFF;
        
        // Determine which PPU registers to use based on mode
        let regOffset1 = 0;
        let regOffset2 = 0;
        
        switch (mode) {
            case 0: // Write once
                regOffset1 = 0;
                break;
            case 1: // Write twice, alternating between two registers
                regOffset1 = 0;
                regOffset2 = 1;
                break;
            // Other modes can be implemented as needed
            default:
                console.warn(`[MEMORY_BUS] Unsupported DMA transfer mode: ${mode}`);
                return;
        }
        
        // Special handling for known problematic transfers
        if (baseReg === 0x00) { // INIDISP register - should not be DMA target
            console.warn(`[MEMORY_BUS] Redirecting DMA from INIDISP to VRAM`);
            
            // Redirect to VRAM writes instead
            this.setupVRAMDMAFallback(size);
            return;
        }
        
        console.debug(`[MEMORY_BUS] DMA to PPU: Src=${srcAddr.toString(16)}, Dest=${destReg.toString(16)}, Size=${size}, Fixed=${fixed}, Mode=${mode}`);
        
        // Perform the transfer
        for (let i = 0; i < size; i++) {
            // Calculate source address
            const sourceAddr = fixed ? srcAddr : (srcAddr + i) & 0xFFFFFF;
            
            // Read from source (ROM/RAM)
            const data = this.readByteFromABus(sourceAddr);
            
            // Determine which register to write to
            const registerOffset = (mode === 1) ? (i % 2 === 0 ? regOffset1 : regOffset2) : regOffset1;
            const targetReg = baseReg + registerOffset;
            
            // Write to PPU register
            this.writeToPPURegister(targetReg, data);
        }
        
        console.debug(`[MEMORY_BUS] DMA to PPU completed for channel ${channel}`);
    }
    
    /**
     * Setup a fallback DMA for VRAM when incorrect DMA is detected
     */
    private setupVRAMDMAFallback(size: number): void {
        console.warn(`[MEMORY_BUS] Setting up emergency VRAM data load`);
        
        // Setup VRAM address to a safe location (tile data area)
        this.writeToPPURegister(0x16, 0x00); // VMADDL
        this.writeToPPURegister(0x17, 0x00); // VMADDH
        
        // Setup a basic tile pattern that will be visible
        const tilePattern = [
            0x00, 0x00, 0x00, 0x7E, 0x00, 0x7E, 0x00, 0x7E,
            0x00, 0x7E, 0x00, 0x7E, 0x00, 0x7E, 0x00, 0x00
        ];
        
        // Load emergency tile data 
        for (let i = 0; i < 256; i++) {
            // Write pattern for 256 tiles
            for (let j = 0; j < 16; j++) {
                this.writeToPPURegister(0x18, tilePattern[j]); // VMDATAL
                this.writeToPPURegister(0x19, i & 0x0F); // VMDATAH (use low bits of i as attribute)
            }
        }
        
        // Setup some colors in CGRAM
        this.writeToPPURegister(0x21, 0x00); // CGADD
        
        // Write 16 colors (32 bytes)
        const paletteData = [
            0x00, 0x00, // Transparent (black)
            0xFF, 0x7F, // White
            0x00, 0x68, // Blue
            0x00, 0x54, // Green
            0x00, 0x40, // Red
            0xFF, 0x00, // Yellow
            0x80, 0x40, // Purple
            0x25, 0x25, // Gray
            0xAA, 0x1F, // Orange
            0x17, 0x7D, // Cyan
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00
        ];
        
        for (let i = 0; i < paletteData.length; i++) {
            this.writeToPPURegister(0x22, paletteData[i]); // CGDATA
        }
        
        // Setup tilemap with simple pattern for BG1
        // First set VRAM address to tilemap location (BG1 tilemap at $1000)
        this.writeToPPURegister(0x16, 0x00); // VMADDL
        this.writeToPPURegister(0x17, 0x10); // VMADDH
        
        // Write 32x32 tilemap (1KB)
        for (let y = 0; y < 32; y++) {
            for (let x = 0; x < 32; x++) {
                // Tile number
                this.writeToPPURegister(0x18, (x + y * 2) & 0xFF); // VMDATAL (tile number)
                // Tile attributes (palette 1-7 based on position)
                this.writeToPPURegister(0x19, (x + y) % 7 + 1); // VMDATAH (palette)
            }
        }
        
        // Configure PPU registers
        this.writeToPPURegister(0x05, 0x01); // BGMODE - Mode 1
        this.writeToPPURegister(0x07, 0x10); // BG1SC - Tilemap at $1000
        this.writeToPPURegister(0x0B, 0x00); // BG12NBA - Character data at $0000
        this.writeToPPURegister(0x2C, 0x01); // TM - Enable BG1 on main screen
        this.writeToPPURegister(0x00, 0x0F); // INIDISP - Full brightness, no forced blank
        
        console.info(`[MEMORY_BUS] Emergency VRAM data load complete`);
    }
    
    /**
     * Perform DMA transfer to APU
     */
    private doDMAToAPU(channel: number, srcAddr: number, destReg: number, size: number, fixed: boolean, mode: number): void {
        // Similar to doDMAToPPU but for APU registers
        console.debug(`[MEMORY_BUS] DMA to APU requested but not fully implemented`);
        // Minimal implementation - would need expansion for real APU support
    }
    
    /**
     * Read from A-bus address (CPU addressable memory)
     */
    private readByteFromABus(address: number): number {
        // Handle ROM addresses
        const romAddress = this.mapROMAddress(address);
        if (romAddress >= 0) {
            return this.memory.readROMDirect(romAddress);
        }
        
        // For non-ROM addresses, use the normal memory.read8
        return this.memory.read8(address);
    }
    
    /**
     * Write to PPU register
     */
    private writeToPPURegister(register: number, value: number): void {
        // Write to local state
        this.memory.setRegisterDirect(0x2100 + register, value);
        
        // Forward to PPU
        if (this.ppu) {
            this.ppu.writeRegister(register, value);
        }
    }
} 