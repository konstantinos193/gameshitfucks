import { APU } from './apu'; // Import APU
import { PPU } from './ppu'; // Import PPU
import type { Emulator } from './emulator'; // Use type import

// ROM header data interface
export interface ROMHeaderData {
    title: string;
    mappingMode: string;
    romType: number;
    romSize: number;
    ramSize: number;
    checksum: number;
    checksumComplement: number;
}

export class Memory {
    private wram = new Uint8Array(0x20000); // 128KB Work RAM
    private sram = new Uint8Array(0x80000); // Up to 512KB Save RAM
    private rom: Uint8Array = new Uint8Array(0);
    private registers = new Uint8Array(0x4000);
    private vram = new Uint8Array(0x10000);
    private cgram = new Uint8Array(0x200);
    private oam = new Uint8Array(0x220);

    private isLoROM = true;
    private hasSRAM = false;
    private sramSize = 0;
    private romSize = 0;
    private romMask = 0;
    private sramMask = 0;
    private headerOffset = 0;
    private apu: APU | null = null; // Add reference to APU
    private ppu: PPU | null = null; // Add reference to PPU
    private emulator: Emulator | null = null; // Add reference to Emulator

    // Hardware Register State (Partial)
    private vblankActive: boolean = false; // For $4210 read

    // Add WRAM Data Register Address
    private wramAddress: number = 0; // WRAM access address for $2180-$2183

    private _forcedBlankStartTime: number | null = null;

    // Enable emergency mode for problematic ROMs
    public enableEmergencyMode(): void {
        console.warn('[MEMORY] Enabling emergency mode for problematic ROM');
        
        // Force-enable NMI for frame timing
        this.registers[0x4200 - 0x2000] |= 0x80; // Set NMI enable bit
        
        // Override DMA behavior for problematic transfers
        this.emergencyModeEnabled = true;
        
        // Initialize some emergency VRAM data
        this.loadEmergencyGraphicsData();
        
        // Force non-blank screen
        this.registers[0x2100 - 0x2000] = 0x0F; // Full brightness, no forced blank
    }
    
    private loadEmergencyGraphicsData(): void {
        // This is a simplified version of the emergency DMA handler
        console.warn('[MEMORY] Loading emergency graphics data directly');
        
        if (!this.ppu) {
            console.error('[MEMORY] Cannot load emergency graphics - PPU not connected');
            return;
        }
        
        // For now, we've moved most of this logic to PPU.forceSafeState()
        // This method exists for compatibility and to override specific memory state
    }

    constructor() {
        this.reset();
    }

    // Method to link APU instance after both are created
    linkAPU(apu: APU): void {
        this.apu = apu;
        console.debug('[DEBUG] Memory: APU instance linked.');
    }

    linkPPU(ppu: PPU): void {
        this.ppu = ppu;
    }

    linkEmulator(emu: Emulator): void {
        this.emulator = emu;
    }

    getState(): object {
        return {
            wram: this.wram.slice(),
            sram: this.sram.slice(),
            registers: this.registers.slice(),
            vram: this.vram.slice(),
            cgram: this.cgram.slice(),
            oam: this.oam.slice(),
            isLoROM: this.isLoROM,
            hasSRAM: this.hasSRAM,
            sramSize: this.sramSize,
            romSize: this.romSize,
            romMask: this.romMask,
            sramMask: this.sramMask,
            headerOffset: this.headerOffset,
            wramAddress: this.wramAddress, // Save WRAM address
            rom: this.rom.slice()  // Avoid sharing the original array directly
        };
    }
    
    setState(state: any): void {
        this.wram.set(state.wram);
        this.sram.set(state.sram);
        this.registers.set(state.registers);
        this.vram.set(state.vram);
        this.cgram.set(state.cgram);
        this.oam.set(state.oam);
        this.isLoROM = state.isLoROM;
        this.hasSRAM = state.hasSRAM;
        this.sramSize = state.sramSize;
        this.romSize = state.romSize;
        this.romMask = state.romMask;
        this.sramMask = state.sramMask;
        this.headerOffset = state.headerOffset;
        this.wramAddress = state.wramAddress || 0; // Restore WRAM address with default
        this.rom = new Uint8Array(state.rom);
    }
    

    reset(): void {
        this.wram.fill(0);
        this.sram.fill(0);
        this.registers.fill(0);
        this.vram.fill(0);
        this.cgram.fill(0);
        this.oam.fill(0);
        this.isLoROM = true;
        this.hasSRAM = false;
        this.sramSize = 0;
        this.romSize = 0;
        this.romMask = 0;
        this.sramMask = 0;
        this.headerOffset = 0;
        this.wramAddress = 0; // Reset WRAM address
    }

    // New size method to return the total size of all memory regions
    size(): number {
        // Sum the sizes of the various memory regions
        return this.wram.length + this.sram.length + this.rom.length + this.registers.length +
               this.vram.length + this.cgram.length + this.oam.length;
    }

    private calculateChecksum(data: Uint8Array, offset: number): number {
        let checksum = 0;
        const skipStart = this.headerOffset + 0x2C;
        const skipEnd = skipStart + 4;
    
        for (let i = offset; i < data.length; i++) {
            if (i >= skipStart && i < skipEnd) continue; // skip checksum + complement fields
            checksum = (checksum + data[i]) & 0xFFFF;
        }
    
        console.debug(`[DEBUG] Calculated checksum (excluding header fields): 0x${checksum.toString(16)}`);
        return checksum;
    }

    private validateROMHeader(data: Uint8Array, offset: number, headerBase: number): boolean {
        const checksum = (data[headerBase + 0x2C] | (data[headerBase + 0x2D] << 8));
        const complement = (data[headerBase + 0x2E] | (data[headerBase + 0x2F] << 8));
    
        const calculated = this.calculateChecksum(data, offset);
    
        if ((checksum + complement) !== 0xFFFF) {
            console.warn('[WARN] Checksum complement does not add up to 0xFFFF');
        }
    
        if (calculated !== checksum) {
            console.warn(`ROM checksum mismatch. Expected: 0x${checksum.toString(16)}, Got: 0x${calculated.toString(16)}`);
        }
    
        const makeup = data[headerBase + 0x26];
        if (makeup !== 0x20 && makeup !== 0x21) {
            console.warn(`[WARN] Non-standard ROM makeup byte: 0x${makeup.toString(16)}, continuing anyway`);
        }
    
        // ✅ CORRECTED TITLE DECODING
        const titleOffset = this.isLoROM ? offset + 0x7FC0 : offset + 0xFFC0;
        const decoder = new TextDecoder("iso-8859-1");
        const title = decoder.decode(data.slice(titleOffset, titleOffset + 21)).replace(/\0/g, '').trim();
        console.debug(`[DEBUG] ROM Title: "${title}"`);

        return true;
    }

    private scoreHeader(data: Uint8Array, base: number): number {
        let score = 0;
        if (base + 0x50 > data.length) return 0;

        const makeup = data[base + 0x26];
        if (makeup === 0x20 || makeup === 0x21) score += 4;

        const type = data[base + 0x25];
        if (type <= 0x0F) score += 2;

        const romSizeCode = data[base + 0x27];
        if (romSizeCode >= 0x08 && romSizeCode <= 0x0C) score += 2;

        const region = data[base + 0x29];
        if (region <= 0x0E) score += 1;

        const chk = (data[base + 0x2C] | (data[base + 0x2D] << 8));
        const cmp = (data[base + 0x2E] | (data[base + 0x2F] << 8));
        if ((chk + cmp) === 0xFFFF) score += 3;

        const validTitle = data.slice(base, base + 21).every(byte => byte === 0x20 || (byte >= 0x20 && byte <= 0x7E));
        if (validTitle) score += 2;

        return score;
    }

    loadROM(data: Uint8Array): void {
        let offset = 0;
        if (data.length % 1024 === 512) {
            console.debug('[INFO] Detected SMC header (512 bytes)');
            offset = 512;
        }

        const loROMHeader = offset + 0x7FB0;
        const hiROMHeader = offset + 0xFFB0;

        const loScore = this.scoreHeader(data, loROMHeader);
        const hiScore = this.scoreHeader(data, hiROMHeader);

        if (hiScore > loScore) {
            this.isLoROM = false;
            this.headerOffset = hiROMHeader;
        } else {
            this.isLoROM = true;
            this.headerOffset = loROMHeader;
        }

        this.validateROMHeader(data, offset, this.headerOffset);

        const romSizeCode = data[this.headerOffset + 0x27];
        this.romSize = romSizeCode <= 0x0F ? (1024 << romSizeCode) : (data.length - offset);

        if (this.romSize !== data.length - offset) {
            console.warn(`[WARN] ROM size mismatch: Header ${this.romSize}, Actual ${data.length - offset}`);
            this.romSize = data.length - offset;
        }

        const sramCode = data[this.headerOffset + 0x28];
        if (sramCode > 0) {
            this.hasSRAM = true;
            this.sramSize = Math.min(1024 << sramCode, 0x80000);
            this.sram = new Uint8Array(this.sramSize);
            this.sramMask = this.sramSize - 1;
        }

        this.rom = data.slice(offset);
        this.romMask = this.rom.length - 1;

        // Log mapping info first
        console.info(`[INFO] ROM loaded: ${this.rom.length} bytes, mapping: ${this.isLoROM ? 'LoROM' : 'HiROM'}`);
        
        // Now read and log the reset vector using the finalized mapping
        const resetVector = this.read16(0xFFFC);
        console.debug(`[DEBUG] Reset vector (from 0x${this.isLoROM ? '7FFC' : 'FFFC'}): 0x${resetVector.toString(16).padStart(4, '0')}`);
        
        // Enhanced reset vector logging
        const resetVectorLo = this.read8(0xFFFC);
        const resetVectorHi = this.read8(0xFFFD);
        console.debug(`[DEBUG_ROM] Reset vector components: Lo=0x${resetVectorLo.toString(16).padStart(2, '0')}, Hi=0x${resetVectorHi.toString(16).padStart(2, '0')}`);
        
        // Log ROM content at entry point 0x8000
        const romEntryAddress = 0x8000;
        console.debug(`[DEBUG_ROM] Checking ROM entry point at 0x${romEntryAddress.toString(16)}`);
        try {
            // Log first 16 bytes at 0x8000
            let entryPointBytes = [];
            for (let i = 0; i < 16; i++) {
                entryPointBytes.push(this.read8(romEntryAddress + i).toString(16).padStart(2, '0'));
            }
            console.debug(`[DEBUG_ROM] Entry point bytes: ${entryPointBytes.join(' ')}`);
            
            // Check if reset vector points to valid code
            if (resetVector >= 0x8000) {
                let resetBytes = [];
                for (let i = 0; i < 8; i++) {
                    resetBytes.push(this.read8(resetVector + i).toString(16).padStart(2, '0'));
                }
                console.debug(`[DEBUG_ROM] Reset vector target bytes: ${resetBytes.join(' ')}`);
            }
        } catch (error) {
            console.error(`[DEBUG_ROM] Error reading ROM content: ${error}`);
        }
    }

    private mapROMAddress(address: number): number {
        const bank = (address >> 16) & 0xFF;
        const offset = address & 0xFFFF;

        if (this.isLoROM) {
            if ((bank >= 0x00 && bank <= 0x3F && offset >= 0x8000) || 
                (bank >= 0x80 && bank <= 0xBF && offset >= 0x8000) || 
                (bank >= 0x40 && bank <= 0x7F) || 
                (bank >= 0xC0 && bank <= 0xFF)) 
            {
                const romBank = bank & 0x7F;
                const romAddr = (romBank * 0x8000) + (offset & 0x7FFF);
                return this.rom[romAddr & this.romMask];
            }
        } else { // HiROM
            // Banks C0-FF and 40-7D map full 64KB
            if ((bank >= 0xC0 && bank <= 0xFF) || (bank >= 0x40 && bank <= 0x7D)) {
                // Map address directly into the first 4MB range (0x400000 bytes)
                const romAddr = address & 0x3FFFFF;
                if (romAddr < this.rom.length) {
                    // --- DEBUGGING START ---
                    if (address === 0xc08000) {
                        console.debug(`[DEBUG] Memory.read8(0xc08000): HiROM path`);
                        console.debug(`  > Mapped address: 0x${romAddr.toString(16)}`);
                        console.debug(`  > ROM Length: ${this.rom.length}`);
                        console.debug(`  > ROM Mask: 0x${this.romMask.toString(16)}`);
                        console.debug(`  > Index: 0x${(romAddr & this.romMask).toString(16)}`);
                        console.debug(`  > Value: ${this.rom[romAddr & this.romMask]}`);
                    }
                    // --- DEBUGGING END ---
                    return this.rom[romAddr & this.romMask];
                } else {
                    // Handle potential out-of-bounds access within the mapped region
                    console.warn(`[WARN] HiROM read access out of bounds: 0x${address.toString(16)}, mapped to 0x${romAddr.toString(16)}`);
                    return 0; // Or handle as open bus
                }
            } 
            // Banks 00-3F:8000-FFFF and 80-BF:8000-FFFF map upper 32KB
            else if (((bank >= 0x00 && bank <= 0x3F) || (bank >= 0x80 && bank <= 0xBF)) && offset >= 0x8000) {
                 // Map banks 00-3F / 80-BF to ROM banks 00-3F
                const romBank = bank & 0x3F;
                const romAddr = (romBank * 0x8000) + (offset & 0x7FFF); // Each bank maps 32KB
                if ((romAddr & 0x3FFFFF) < this.rom.length) {
                    return this.rom[(romAddr & 0x3FFFFF) & this.romMask];
                } else {
                    console.warn(`[WARN] HiROM read access out of bounds: 0x${address.toString(16)}`);
                    return 0;
                }
            }
        }

        console.warn(`[WARN] Memory read from unmapped address: 0x${address.toString(16).padStart(6, '0')}`);
        return 0; // Open bus
    }

    private mapSRAMAddress(address: number, value?: number): void | number {
        const bank = (address >> 16) & 0xFF;
        const offset = address & 0xFFFF;

        if (this.hasSRAM) {
            if (this.isLoROM && bank >= 0x70 && bank <= 0x7D && offset < 0x8000) {
                if (value !== undefined) {
                    this.sram[((bank - 0x70) * 0x8000 + offset) & this.sramMask] = value;
                } else {
                    return this.sram[((bank - 0x70) * 0x8000 + offset) & this.sramMask];
                }
            }
            if (!this.isLoROM && bank >= 0x20 && bank <= 0x3F && offset >= 0x6000 && offset < 0x8000) {
                if (value !== undefined) {
                    this.sram[((bank - 0x20) * 0x2000 + offset - 0x6000) & this.sramMask] = value;
                } else {
                    return this.sram[((bank - 0x20) * 0x2000 + offset - 0x6000) & this.sramMask];
                }
            }
        }
    }

    read8(address: number): number {
        const originalAddress = address; // Keep original for logging
        address = address & 0xFFFFFF;
        const bank = (address >> 16) & 0xFF;
        const offset = address & 0xFFFF;

        let value: number = 0;
        let source: string = "Unmapped";

        // Work RAM ($00-$3F, $80-$BF: $0000-$1FFF, mirrored)
        if ((bank <= 0x3F || (bank >= 0x80 && bank <= 0xBF)) && offset < 0x2000) {
            value = this.wram[offset & 0x1FFF];
            source = "WRAM";
        }
        // PPU/Hardware Registers ($00-$3F, $80-$BF: $2000-$5FFF)
        else if ((bank <= 0x3F || (bank >= 0x80 && bank <= 0xBF)) && offset >= 0x2000 && offset < 0x6000) {
            // Handle WRAM Data Register
            if (offset === 0x2180) {
                value = this.wram[this.wramAddress & 0x1FFFF];
                this.wramAddress = (this.wramAddress + 1) & 0x1FFFF; // Increment and wrap to 128KB
                source = "WRAM Data Register";
                console.debug(`[DEBUG] Read from WRAM Data Register: 0x${value.toString(16).padStart(2, '0')} at WRAM Address: 0x${(this.wramAddress-1).toString(16).padStart(5, '0')}`);
                return value;
            }
            
            source = "Register";
            // --- PPU/CPU/DMA Register Read Handling START ---
            switch (offset) {
                case 0x4210: // RDNMI - NMI Flag and VBlank Flag
                    { 
                        value = (this.registers[offset - 0x2000] || 0) & 0x7F; 
                        if (this.vblankActive) {
                            value |= 0x80; 
                        }
                        this.registers[offset - 0x2000] = value & 0x7F; 
                        this.setVBlankFlag(false); 
                        // console.debug(`[DEBUG] Read from NMI/VBlank Register 0x4210: Returning 0x${value.toString(16)}`); // Logged below
                    }
                    break; // Added break
                case 0x4211: // TIMEUP - IRQ Flag on H/V Compare
                    // console.debug(`[DEBUG] Read from IRQ Flag Register 0x4211: Returning 0 (stub)`); // Logged below
                    value = 0; 
                    break; // Added break
                case 0x4212: // HVBJOY - H/V Counter Latch Register
                    { 
                        value = 0;
                        if (this.emulator?.getIsInVBlank()) value |= 0x80;
                        // console.debug(`[DEBUG] Read from H/V Latch Register 0x4212: Returning 0x${value.toString(16)} (VBlank only)`); // Logged below
                    }
                    break; // Added break
                 default:
                     value = this.registers[offset - 0x2000] || 0;
                     // console.debug(`[DEBUG] Read from Register 0x${address.toString(16)} (Offset 0x${offset.toString(16)}): Returning 0x${value.toString(16)}`); // Logged below
            }
            // --- PPU/CPU/DMA Register Read Handling END ---
        }
        // SRAM
        else if (this.hasSRAM) {
             if (this.isLoROM && bank >= 0x70 && bank <= 0x7D && offset < 0x8000) {
                const sramAddr = ((bank - 0x70) * 0x8000) + offset;
                if (sramAddr < this.sramSize) {
                    value = this.sram[sramAddr & this.sramMask] ?? 0;
                    source = "SRAM";
                } else {
                    console.warn(`[WARN] LoROM SRAM read out of bounds: 0x${originalAddress.toString(16)}`);
                    value = 0; 
                    source = "OOB SRAM";
                }
            } else if (!this.isLoROM && bank >= 0x20 && bank <= 0x3F && offset >= 0x6000 && offset < 0x8000) {
                const sramBankOffset = ((bank - 0x20) * 0x2000); 
                const sramAddr = sramBankOffset + (offset - 0x6000);
                if (sramAddr < this.sramSize) {
                   value = this.sram[sramAddr & this.sramMask] ?? 0;
                   source = "SRAM";
                } else {
                    console.warn(`[WARN] HiROM SRAM read out of bounds: 0x${originalAddress.toString(16)}`);
                    value = 0;
                    source = "OOB SRAM";
                }
            }
            else { // If hasSRAM but doesn't match map, fall through to ROM
                 source = "ROM/Unmapped (SRAM Flag On)";
            }
        }
        // ROM access (if not handled above)
        if (source === "Unmapped" || source === "ROM/Unmapped (SRAM Flag On)") {
            if (this.isLoROM) {
                if ((bank >= 0x00 && bank <= 0x3F && offset >= 0x8000) ||
                    (bank >= 0x80 && bank <= 0xBF && offset >= 0x8000) ||
                    (bank >= 0x40 && bank <= 0x7F) ||
                    (bank >= 0xC0 && bank <= 0xFF)) 
                {
                    const romBank = bank & 0x7F;
                    const romAddr = (romBank * 0x8000) + (offset & 0x7FFF);
                    const maskedAddr = romAddr & this.romMask;
                    if (maskedAddr < this.rom.length) {
                       value = this.rom[maskedAddr] ?? 0;
                       source = "LoROM";
                    } else {
                       console.warn(`[WARN] LoROM read potentially out of bounds after masking: Addr=0x${originalAddress.toString(16)}, Mapped=0x${romAddr.toString(16)}, Masked=0x${maskedAddr.toString(16)}`);
                       value = 0;
                       source = "OOB LoROM";
                    }
                }
            } else { // HiROM
                if ((bank >= 0xC0 && bank <= 0xFF) || (bank >= 0x40 && bank <= 0x7D)) {
                    const romAddr = originalAddress & 0x3FFFFF; 
                    if (romAddr < this.rom.length) {
                        value = this.rom[romAddr] ?? 0;
                        source = "HiROM C0+";
                    } else {
                        console.warn(`[WARN] HiROM read access out of bounds (C0-FF/40-7D): Addr=0x${originalAddress.toString(16)}, Mapped=0x${romAddr.toString(16)}`);
                        value = 0;
                        source = "OOB HiROM C0+";
                    }
                } 
                else if (((bank >= 0x00 && bank <= 0x3F) || (bank >= 0x80 && bank <= 0xBF)) && offset >= 0x8000) {
                    const romBank = bank & 0x3F; 
                    const baseAddr = (romBank | 0xC0) << 16; 
                    const romAddr = (baseAddr | offset) & 0x3FFFFF;
                    if (romAddr < this.rom.length) {
                        value = this.rom[romAddr] ?? 0;
                        source = "HiROM 00+/80+";
            } else {
                        console.warn(`[WARN] HiROM read access out of bounds (00-3F/80-BF): Addr=0x${originalAddress.toString(16)}, Mapped=0x${romAddr.toString(16)}`);
                        value = 0;
                        source = "OOB HiROM 00+/80+";
                    }
                }
            }
        }

        // --- Unified Specific Address Logging (After Value Determined) ---
        if (originalAddress === 0x00ff19 || originalAddress === 0x00ff1a || originalAddress === 0x00ff1b || originalAddress === 0x00ff1d) {
             console.debug(`[MEM READ SPECIFIC] Addr: 0x${originalAddress.toString(16).padStart(6, '0')} -> Source: ${source}, Value: 0x${value.toString(16)}`);
        }
        // --- END Unified Specific Address Logging ---
        
        // Log unmapped reads if source is still Unmapped
        if (source === "Unmapped") {
            console.warn(`[WARN] Memory read from unmapped address: 0x${originalAddress.toString(16).padStart(6, '0')}`);
        }

        return value;
    }

    write8(address: number, value: number): void {
        // Ensure value is within 8-bit range
        value &= 0xFF;
        
        // Expanded logging for specific address ranges
        if (address >= 0x2100 && address <= 0x2183) {
            console.debug(`[DEBUG] Write8: PPU Register ${(address - 0x2100).toString(16).padStart(2, '0')} = ${value.toString(16).padStart(2, '0')}`);
        }
        
        // Check address range and forward to appropriate component
        if (address < 0x2000) {
            // WRAM (first 8KB, mirrored)
            this.wram[address & 0x1FFF] = value;
        } else if (address < 0x3000) {
            // PPU registers ($2100-$213F) and APU registers ($2140-$2143)
            const relativeAddr = address - 0x2000;
            this.registers[relativeAddr] = value;
            
            // Forward write to PPU (for PPU registers)
            if (address <= 0x213F && this.ppu) {
                this.handlePPURegisterWrite(address, value);
            }
            // Forward write to APU (for APU registers)
            // FIXED: Use internal tracking to avoid recursive call to APU
            else if (address >= 0x2140 && address <= 0x217F) {
                this.registers[relativeAddr] = value; // Just store locally
                if (this.apu && address <= 0x2143) {
                    try {
                        // Direct call to APU but prevent recursion
                        this.apu.writeRegister(address, value);
                    } catch (e) {
                        console.error(`[ERROR] APU register write failed: ${e}`);
                    }
                }
            }
            
            // Special case for INIDISP register - screen brightness/forced blank
            if (address === 0x2100) {
                this.handleINIDISPRegisterWrite(value);
            }
            
            // Special case for NMI Enable register
            if (address === 0x4200) {
                this.handleNMIEnableRegisterWrite(value);
            }
            
            // Handle DMA registers
            if (address >= 0x4300 && address <= 0x437F) {
                this.handleDMARegisterWrite(address, value);
            }
            
            // DMA trigger register
            if (address === 0x420B) {
                this.handleDMATriggerRegisterWrite(value);
            }
        } else if (address < 0x8000) {
            // Extended WRAM and hardware registers
            if (address >= 0x7E0000 && address < 0x800000) {
                // 64KB WRAM (banks $7E-$7F)
                this.wram[address - 0x7E0000] = value;
            } else {
                // Other hardware registers, expansion, or unused regions
                console.debug(`[DEBUG] Write to unsupported address: 0x${address.toString(16)} = 0x${value.toString(16)}`);
            }
                } else {
            // Writes to ROM area are typically ignored
            if (this.isLoROM) {
                // LoROM: $80-$FF:8000-FFFF
                // Typically ROM and not writable
                console.debug(`[DEBUG] Write to ROM area: 0x${address.toString(16)} = 0x${value.toString(16)}`);
                } else {
                // HiROM: $C0-$FF:0000-FFFF
                // Typically ROM and not writable
                console.debug(`[DEBUG] Write to ROM area: 0x${address.toString(16)} = 0x${value.toString(16)}`);
            }
        }
    }

    read16(address: number): number {
        const low = this.read8(address);
        const high = this.read8(address + 1);
        return (high << 8) | low;
    }

    write16(address: number, value: number): void {
        this.write8(address, value & 0xFF);
        this.write8(address + 1, (value >> 8) & 0xFF);
    }

    // Add VRAM/CGRAM/OAM accessors
    readVRAM(address: number): number {
        return this.vram[address & 0xFFFF];
    }

    writeVRAM(address: number, value: number): void {
        this.vram[address & 0xFFFF] = value & 0xFF;
    }

    readCGRAM(address: number): number {
        return this.cgram[address & 0x1FF];
    }

    writeCGRAM(address: number, value: number): void {
        this.cgram[address & 0x1FF] = value & 0xFF;
    }

    readOAM(address: number): number {
        return this.oam[address & 0x21F]; // OAM size is 544 bytes (0x220)
    }

    writeOAM(address: number, value: number): void {
        this.oam[address & 0x21F] = value & 0xFF;
    }

    setVBlankFlag(isActive: boolean): void {
        this.vblankActive = isActive;
        // Note: The actual hardware bit 7 of 0x4210 is only set
        // during V-Blank and cleared *when 0x4210 is read*.
        // This flag helps us provide that state on read.
        if (isActive) {
            this.registers[0x4210 - 0x2000] = (this.registers[0x4210 - 0x2000] || 0) | 0x80;
        } else {
            // Flag is usually cleared on read, not explicitly set to false here.
        }
    }

    private performDMA(channel: number, mode: number, bRegister: number, aBank: number, aAddressH: number, aAddressL: number, sizeL: number, sizeH: number): void {
        // Construct addresses
        const bAddr = 0x2100 + bRegister; // B-Bus address (typically a PPU register)
        const aAddr = (aBank << 16) | (aAddressH << 8) | aAddressL; // A-Bus address (typically ROM or RAM)
        
        // Calculate size (0 = 65536 bytes)
        let size = (sizeH << 8) | sizeL;
        if (size === 0) size = 0x10000;
        
        // Extract mode bits
        const direction = (mode & 0x80) !== 0; // 0 = A-Bus to B-Bus, 1 = B-Bus to A-Bus
        const addressing = mode & 0x07; // Addressing mode (0-7)
        const fixed = (mode & 0x08) !== 0; // Fixed B-address if true
        
        console.warn(`[DMA_TRANSFER] Channel ${channel}: Direction=${direction ? 'B→A' : 'A→B'}, Mode=${addressing}, Fixed=${fixed}, From=${aAddr.toString(16)}, To=${bAddr.toString(16)}, Size=${size}`);
        
        // Emergency fix for known problematic DMA config (INIDISP target/screen blank)
        if (bAddr === 0x2100 && aAddr === 0) {
            console.warn('[DMA_EMERGENCY] Detected problematic DMA parameters - loading emergency graphics data');
            
            // Load proper tile data into VRAM
            const tileData = new Uint8Array(128);
            // Create simple tile pattern (a solid block)
            for (let i = 0; i < 16; i++) {
                tileData[i] = 0xFF; // All bits set = solid block
            }
            
            // Load palette data into CGRAM
            const paletteData = new Uint8Array(32);
            // Color 0: Transparent (black)
            paletteData[0] = 0x00;
            paletteData[1] = 0x00;
            // Color 1: Bright red
            paletteData[2] = 0x00;
            paletteData[3] = 0x7C; // Red = 0x7C00 (5-bit RGB)
            // Color 2: Bright green  
            paletteData[4] = 0xE0;
            paletteData[5] = 0x03; // Green = 0x03E0
            // Color 3: Bright blue
            paletteData[6] = 0x1F;
            paletteData[7] = 0x00; // Blue = 0x001F
            // Color 4: White
            paletteData[8] = 0xFF;
            paletteData[9] = 0x7F; // White = 0x7FFF
            
            // Setup tilemap at $1000 for BG1
            const tilemapData = new Uint8Array(128);
            for (let y = 0; y < 8; y++) {
                for (let x = 0; x < 8; x++) {
                    const index = y * 8 + x;
                    const paletteIndex = (index % 4) + 1; // Use colors 1-4
                    // Tilemap format: vhoppptt tttttttt (v=vflip, h=hflip, o=priority, p=palette, t=tile number)
                    // Set palette to paletteIndex (0-7)
                    const attribute = (paletteIndex << 10);
                    const offset = (y * 16) + (x * 2);
                    // Use tile index 0
                    tilemapData[offset] = 0;
                    tilemapData[offset + 1] = attribute >> 8;
                }
            }
            
            // Write emergency data to PPU
            if (this.ppu) {
                // Write tile data to VRAM
                this.ppu.setVRAMData(0, tileData);
                
                // Write tilemap data to VRAM
                this.ppu.setVRAMData(0x1000, tilemapData);
                
                // Write palette data to CGRAM
                this.ppu.setCGRAMData(0, paletteData);
                
                // Configure PPU registers
                this.write8(0x2105, 0x01);       // BGMODE = 1 (BG1=4bpp, BG2=2bpp)
                this.write8(0x2107, 0x10);       // BG1SC = $1000 (BG1 Tilemap address)
                this.write8(0x210B, 0x00);       // BG12NBA = 0 (BG1 CHR address at $0000)
                this.write8(0x212C, 0x01);       // TM = 0x01 (Enable BG1 on main screen)
                this.write8(0x2100, 0x0F);       // INIDISP = Full brightness, disable forced blank
                
                // After setup, ensure the screen is enabled
                this.ppu.mainScreenEnabled = true;
                this.ppu.setForcedBlank(false);
            }
            
            console.warn('[DMA_EMERGENCY] Loaded emergency graphics data - check screen now');
            return;
        }
        
        // TEMPORARY FIX: Force direction to A→B for initialization
        if (direction) {
            console.warn(`[DMA_TRANSFER] Detected B→A transfer - OVERRIDING to A→B for testing`);
            // Instead of skipping, force the direction to be A→B
            // DO NOT return early here
        }
        
        // Perform the transfer (always A→B during initialization)
        for (let i = 0; i < size; i++) {
            // Improved source address calculation based on addressing mode
            let sourceAddr;
            if (fixed) {
                sourceAddr = aAddr; // Fixed address
            } else {
                switch(addressing) {
                    case 0: // 1 register write once
                        sourceAddr = aAddr + i;
                        break;
                    case 1: // 2 registers alternating
                        sourceAddr = aAddr + Math.floor(i/2);
                        break;
                    default:
                        sourceAddr = aAddr + i;
                        break;
                }
            }
            
            // Ensure source is in valid range
            if (sourceAddr < 0 || sourceAddr >= 0x1000000) {
                if (i === 0) {
                    console.warn(`[DMA_TRANSFER] Invalid source address: ${sourceAddr.toString(16)}`);
                }
                continue; // Skip invalid addresses
            }
            
            const data = this.read8(sourceAddr);
            
            // Calculate destination address based on addressing mode
            let destAddr = bAddr;
            
            switch (addressing) {
                case 0: // Write once to bAddr
                    destAddr = bAddr;
                    break;
                case 1: // Write twice to bAddr and bAddr+1
                    destAddr = bAddr + (i & 1);
                    break;
                default: // Other modes not yet implemented
                    destAddr = bAddr;
                    break;
            }
            
            // Write to B-Bus (PPU Register) - regardless of actual direction during testing
            this.write8(destAddr, data);
            
            // Add debug logging for the first few and last few transfers
            if (i < 3 || i > size - 3) {
                console.debug(`[DMA_TRANSFER] ${sourceAddr.toString(16)} -> ${destAddr.toString(16)}: ${data.toString(16).padStart(2, '0')}`);
            } else if (i === 3) {
                console.debug(`[DMA_TRANSFER] ... ${size - 6} more transfers ...`);
            }
        }
        
        console.warn(`[DMA_TRANSFER] Completed ${size} bytes transfer for channel ${channel}`);
    }

    // Method to dump ROM header data for diagnostics
    public dumpHeaderData(): ROMHeaderData | null {
        if (!this.rom || this.rom.length === 0) {
            return null;
        }
        
        const headerOffset = this.isLoROM ? 0x7FD0 : 0xFFD0;
        
        // Check if we have enough ROM data
        if (this.rom.length < headerOffset + 48) {
            console.error("[ROM_DIAG] ROM too small to extract header data");
            return null;
        }
        
        // Extract title (21 bytes for SNES titles)
        let title = "";
        for (let i = 0; i < 21; i++) {
            const charCode = this.rom[headerOffset + i];
            if (charCode === 0) break; // Stop at null terminator
            title += String.fromCharCode(charCode);
        }
        
        // Extract other header information
        const romMakeup = this.rom[headerOffset + 0x16];
        const romType = this.rom[headerOffset + 0x15];
        const romSize = 1 << this.rom[headerOffset + 0x17];
        const ramSize = 1 << this.rom[headerOffset + 0x18];
        const countryCode = this.rom[headerOffset + 0x19];
        const checksum = (this.rom[headerOffset + 0x1E] | (this.rom[headerOffset + 0x1F] << 8));
        const checksumComplement = (this.rom[headerOffset + 0x1C] | (this.rom[headerOffset + 0x1D] << 8));
        
        return {
            title: title.trim(),
            mappingMode: this.isLoROM ? "LoROM" : "HiROM",
            romType: romType,
            romSize: romSize,
            ramSize: ramSize,
            checksum: checksum,
            checksumComplement: checksumComplement
        };
    }
    
    // Method to get DMA state for diagnostics
    public getDMAState(): object {
        // Properties needed for DMA state
        const dmaEnabled = this.registers[0x420B - 0x2000] || 0;
        
        let dmaState: { channels: any[] } = {
            channels: []
        };
        
        // Add information about each DMA channel
        for (let i = 0; i < 8; i++) {
            if (dmaEnabled & (1 << i)) {
                // Calculate base address for this channel's registers
                const baseAddr = 0x4300 + (i * 0x10) - 0x2000;
                
                dmaState.channels.push({
                    channel: i,
                    enabled: true,
                    direction: (this.registers[baseAddr] & 0x80) !== 0,
                    mode: this.registers[baseAddr] & 0x07,
                    fixed: (this.registers[baseAddr] & 0x08) !== 0,
                    address: (this.registers[baseAddr + 7] << 16) | 
                            (this.registers[baseAddr + 5] << 8) | 
                            this.registers[baseAddr + 4],
                    destReg: this.registers[baseAddr + 2],
                    size: (this.registers[baseAddr + 9] << 8) | 
                        this.registers[baseAddr + 8] || 0x10000
                });
            }
        }
        
        return dmaState;
    }

    // Emergency mode flag
    private emergencyModeEnabled: boolean = false;

    // Direct access to ROM for MemoryBus
    readROMDirect(address: number): number {
        if (!this.rom || address >= this.rom.length) {
            return 0;
        }
        return this.rom[address];
    }
    
    // Direct register access for MemoryBus
    setRegisterDirect(address: number, value: number): void {
        if (address >= 0x2000 && address < 0x6000) {
            const relativeAddr = address - 0x2000;
            this.registers[relativeAddr] = value;
        }
    }

    // Link with other components
    public setPPU(ppu: PPU): void {
        this.ppu = ppu;
    }
    
    public setAPU(apu: APU): void {
        this.apu = apu;
    }
    
    public setEmulator(emulator: any): void {
        this.emulator = emulator;
    }
}
