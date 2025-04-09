import { Memory } from './memory';

// Basic APU placeholder
export class APU {
    private memory: Memory | null = null;
    private cycles: number = 0;

    // Target sample rate for SNES audio
    public static readonly SAMPLE_RATE = 44100;

    // APU registers and internal state
    private registers: Uint8Array = new Uint8Array(256);
    private dspRegisters: Uint8Array = new Uint8Array(128);
    private dspAddress: number = 0;

    constructor() {
        // Initialize APU state
        this.reset();
        console.debug('[DEBUG] APU: Initialized');
    }

    reset(): void {
        this.cycles = 0;
        // TODO: Reset SPC700/DSP state here
        console.debug('[DEBUG] APU: Reset');
    }

    /**
     * Runs the APU for a number of equivalent CPU master cycles.
     * The SPC700 runs at roughly 1.024MHz, the CPU master clock is ~21.477MHz.
     * So APU cycles are roughly CPU cycles / 21.
     */
    runCycles(cpuCycles: number): void {
        const apuCycles = Math.floor(cpuCycles / 21); 
        this.cycles += apuCycles;
        // TODO: Emulate SPC700/DSP cycles here
    }

    /**
     * Generates audio samples into the provided buffer.
     * @param bufferL Left channel buffer
     * @param bufferR Right channel buffer
     */
    generateSamples(bufferL: Float32Array, bufferR: Float32Array): void {
        const length = bufferL.length;
        // TODO: Generate real audio samples from the S-DSP emulation

        // For now, fill with silence
        for (let i = 0; i < length; i++) {
            bufferL[i] = 0.0;
            bufferR[i] = 0.0;
        }
    }

    // TODO: Add methods for reading/writing APU registers ($2140-$217F)
    readRegister(address: number): number {
        console.warn(`[WARN] APU readRegister 0x${address.toString(16)} not implemented.`);
        // Read from memory map for now, needs proper handling
        return this.memory?.read8(address) || 0;
    }

    // Write to APU registers (SPC700, DSP)
    writeRegister(address: number, value: number): void {
        // Add APU register handling code
        const regIndex = address & 0xFF;
        
        // CRITICAL FIX: Don't call memory.write8 from here to prevent infinite recursion
        // Just update internal state directly
        
        // Store the register value
        this.registers[regIndex] = value;
        
        // Handle register writes based on address
        switch (regIndex) {
            case 0x40: // SOUND TEST register
                console.debug(`[DEBUG] APU: Sound Test Register Write: ${value.toString(16)}`);
                break;
            case 0x41: // Control register
                console.debug(`[DEBUG] APU: Control Register Write: ${value.toString(16)}`);
                break;
            case 0x42: // DSP Register Address
                this.dspAddress = value;
                console.debug(`[DEBUG] APU: DSP Register Address set to ${value.toString(16)}`);
                break;
            case 0x43: // DSP Register Data
                this.dspRegisters[this.dspAddress] = value;
                console.debug(`[DEBUG] APU: DSP Register ${this.dspAddress.toString(16)} set to ${value.toString(16)}`);
                break;
            default:
                // No need to write back to memory
                break;
        }
    }
} 