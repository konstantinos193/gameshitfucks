import { useEffect, useRef, useState, useCallback } from 'react'
import { SNESEmulator } from '../emulator/core'

interface EmulatorState {
  isReady: boolean
  isRunning: boolean
  isLoading: boolean
  error: string | null
}

export function useEmulator(canvasRef: React.RefObject<HTMLCanvasElement>) {
  const [state, setState] = useState<EmulatorState>({
    isReady: false,
    isRunning: false,
    isLoading: false,
    error: null
  })
  const emulatorRef = useRef<SNESEmulator | null>(null)
  const initializedRef = useRef<boolean>(false)
  const initAttemptsRef = useRef<number>(0)
  const maxInitAttempts = 3

  // Initialize emulator
  useEffect(() => {
    const initializeEmulator = async () => {
      try {
        if (initializedRef.current) {
          console.debug('[DEBUG] Emulator already initialized')
          return
        }

        // Wait for canvas to be available
        if (!canvasRef.current) {
          if (initAttemptsRef.current < maxInitAttempts) {
            console.debug('[DEBUG] Canvas not ready, retrying in 500ms...')
            initAttemptsRef.current++
            setTimeout(initializeEmulator, 500)
            return
          } else {
            throw new Error('Canvas not available after maximum retries')
          }
        }

        console.debug('[DEBUG] Starting emulator initialization...')
        setState(prev => ({ ...prev, isLoading: true }))

        // Clean up existing instance if any
        if (emulatorRef.current) {
          console.debug('[DEBUG] Cleaning up existing emulator instance')
          await emulatorRef.current.cleanup()
          emulatorRef.current = null
        }

        // Create new instance
        console.debug('[DEBUG] Creating new emulator instance')
        const emulator = new SNESEmulator()
        emulatorRef.current = emulator

        // Set canvas
        console.debug('[DEBUG] Setting canvas')
        await emulator.setCanvas(canvasRef.current)

        initializedRef.current = true
        setState(prev => ({
          ...prev,
          isReady: true,
          isLoading: false,
          error: null
        }))
        console.debug('[DEBUG] Emulator initialization complete')

      } catch (err) {
        console.error('[DEBUG] Emulator initialization failed:', err)
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : 'Failed to initialize emulator'
        }))

        // Retry initialization if under max attempts
        if (initAttemptsRef.current < maxInitAttempts) {
          console.debug(`[DEBUG] Retrying initialization (attempt ${initAttemptsRef.current + 1}/${maxInitAttempts})...`)
          initAttemptsRef.current++
          setTimeout(initializeEmulator, 500)
          return
        }

        // Clean up on error after max retries
        if (emulatorRef.current) {
          await emulatorRef.current.cleanup()
          emulatorRef.current = null
        }
        initializedRef.current = false
      }
    }

    // Reset attempt counter when effect runs
    initAttemptsRef.current = 0
    initializeEmulator()

    return () => {
      const cleanup = async () => {
        if (emulatorRef.current) {
          console.debug('[DEBUG] Cleaning up emulator on unmount...')
          await emulatorRef.current.cleanup()
          emulatorRef.current = null
        }
        initializedRef.current = false
        initAttemptsRef.current = 0
      }
      cleanup()
    }
  }, [canvasRef])

  // ROM loading
  const loadROM = useCallback(async (romData: Uint8Array) => {
    if (!emulatorRef.current || !initializedRef.current) {
      throw new Error('Emulator not initialized')
    }

    try {
      console.debug('[DEBUG] useEmulator: Starting ROM load')
      setState(prev => ({ ...prev, isLoading: true }))
      const result = await emulatorRef.current.loadROM(romData)
      setState(prev => ({ ...prev, isLoading: false }))
      console.debug('[DEBUG] useEmulator: ROM load completed')
      return result
    } catch (err) {
      console.error('[DEBUG] useEmulator: ROM load failed:', err)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load ROM'
      }))
      throw err
    }
  }, [])

  // Emulator control
  const start = useCallback(() => {
    if (!emulatorRef.current || !initializedRef.current) {
      console.error('[DEBUG] Cannot start: Emulator not initialized')
      throw new Error('Emulator not initialized')
    }
    console.debug('[DEBUG] useEmulator: Starting emulator...')
    try {
      console.debug('[DEBUG] useEmulator: Calling emulator.run()')
      emulatorRef.current.run()
      setState(prev => ({ ...prev, isRunning: true }))
      console.debug('[DEBUG] useEmulator: Emulator started successfully')
    } catch (err) {
      console.error('[DEBUG] useEmulator: Failed to start emulator:', err)
      setState(prev => ({
        ...prev,
        isRunning: false,
        error: err instanceof Error ? err.message : 'Failed to start emulator'
      }))
      throw err
    }
  }, [])

  const stop = useCallback(() => {
    if (!emulatorRef.current || !initializedRef.current) {
      console.debug('[DEBUG] Cannot stop: Emulator not initialized')
      return
    }
    console.debug('[DEBUG] useEmulator: Stopping emulator...')
    try {
      emulatorRef.current.stop()
      setState(prev => ({ ...prev, isRunning: false }))
      console.debug('[DEBUG] useEmulator: Emulator stopped successfully')
    } catch (err) {
      console.error('[DEBUG] useEmulator: Failed to stop emulator:', err)
      throw err
    }
  }, [])

  const reset = useCallback(() => {
    if (!emulatorRef.current || !initializedRef.current) return
    emulatorRef.current.reset()
    setState(prev => ({ ...prev, isRunning: false }))
  }, [])

  // Input handling
  const setButtonState = useCallback((button: string, pressed: boolean) => {
    if (!emulatorRef.current || !initializedRef.current) return
    emulatorRef.current.setButtonState(button, pressed)
  }, [])

  return {
    ...state,
    loadROM,
    start,
    stop,
    reset,
    setButtonState,
    emulator: emulatorRef.current
  }
}
