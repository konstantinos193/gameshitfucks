import { Emulator } from '@/src/emulator/core/emulator';

export class SNESEmulator {
    private emulator: Emulator | null = null;

    constructor() {
        console.debug('[DEBUG] SNESEmulator: Creating emulator instance');
        this.emulator = new Emulator();
        console.debug('[DEBUG] SNESEmulator initialized successfully');
    }

    async setCanvas(canvas: HTMLCanvasElement): Promise<void> {
        console.debug('[DEBUG] SNESEmulator: Setting canvas');
        if (!this.emulator) {
            throw new Error('Emulator not initialized');
        }
        this.emulator.setCanvas(canvas);
    }

    async loadROM(romData: Uint8Array, loadSRAM: boolean = false, loadState: boolean = false): Promise<boolean> {
        if (!this.emulator) {
            throw new Error('Emulator not initialized');
        }

        try {
            console.debug('[DEBUG] SNESEmulator: Starting ROM load process');
            console.debug('[DEBUG] ROM size:', romData.length, 'bytes');
            
            // Basic ROM validation
            if (romData.length < 0x8000) {
                throw new Error(`ROM too small: ${romData.length} bytes`);
            }
            
            // Check ROM header
            const loROMHeader = 0x7FC0;
            const hiROMHeader = 0xFFC0;
            const makeupByte = romData[loROMHeader + 0x25] || romData[hiROMHeader + 0x25];
            const romType = makeupByte & 0xF;
            console.debug('[DEBUG] ROM type:', romType, 'Makeup byte:', makeupByte.toString(16));
            
            // Load ROM into emulator
            this.emulator.loadROM(romData);
            
            // Verify ROM was loaded
            const state = this.emulator.getState();
            console.debug('[DEBUG] Emulator state after ROM load:', state);
            
            if (!state.romLoaded) {
                throw new Error('ROM failed to load into emulator');
            }
            
            console.debug('[DEBUG] ROM loaded successfully');
            return true;
        } catch (error) {
            console.error('[DEBUG] SNESEmulator ROM load error:', error);
            throw error;
        }
    }

    run(): void {
        if (!this.emulator) {
            throw new Error('Emulator not initialized');
        }
        console.debug('[DEBUG] SNESEmulator: Starting emulation');
        try {
            this.emulator.run();
            console.debug('[DEBUG] SNESEmulator: Emulation started successfully');
        } catch (error) {
            console.error('[DEBUG] SNESEmulator: Failed to start emulation:', error);
            throw error;
        }
    }

    stop(): void {
        if (!this.emulator) {
            throw new Error('Emulator not initialized');
        }
        console.debug('[DEBUG] SNESEmulator: Stopping emulation');
        try {
            this.emulator.stop();
            console.debug('[DEBUG] SNESEmulator: Emulation stopped successfully');
        } catch (error) {
            console.error('[DEBUG] SNESEmulator: Failed to stop emulation:', error);
            throw error;
        }
    }

    reset(): void {
        if (!this.emulator) {
            throw new Error('Emulator not initialized');
        }
        console.debug('[DEBUG] SNESEmulator: Resetting emulator');
        try {
            this.emulator.reset();
            console.debug('[DEBUG] SNESEmulator: Reset completed successfully');
        } catch (error) {
            console.error('[DEBUG] SNESEmulator: Failed to reset emulator:', error);
            throw error;
        }
    }

    setButtonState(button: string, pressed: boolean): void {
        if (!this.emulator) {
            throw new Error('Emulator not initialized');
        }
        this.emulator.setButtonState(button, pressed);
    }

    async cleanup(): Promise<void> {
        if (this.emulator) {
            console.debug('[DEBUG] SNESEmulator: Cleaning up');
            this.emulator.stop();
            this.emulator = null;
        }
    }
} 