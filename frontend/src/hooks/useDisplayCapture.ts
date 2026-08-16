import { useCallback, useEffect, useRef, useState } from "react"

export type CaptureStatus = "idle" | "requesting" | "capturing"

export interface UseDisplayCaptureResult {
  stream: MediaStream | null
  status: CaptureStatus
  settings: MediaTrackSettings | null
  error: string | null
  startCapture: () => Promise<MediaStream | null>
  stopCapture: () => void
}

const DISPLAY_CAPTURE_OPTIONS = {
  video: {
    displaySurface: "monitor",
    width: { ideal: 1920, max: 1920 },
    height: { ideal: 1080, max: 1080 },
    frameRate: { ideal: 30, max: 30 },
  },
  audio: false,
} satisfies DisplayMediaStreamOptions

function stopTracks(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop())
}

function getCaptureErrorMessage(error: unknown): string {
  if (!(error instanceof DOMException)) {
    return "Nie udało się rozpocząć przechwytywania ekranu."
  }

  switch (error.name) {
    case "NotAllowedError":
      return "Nie wybrano źródła do udostępnienia."
    case "NotReadableError":
      return "Nie można odczytać wybranego ekranu. Sprawdź uprawnienia systemowe."

    default:
      return "Nie udało się rozpocząć przechwytywania ekranu."
  }
}

export function useDisplayCapture(): UseDisplayCaptureResult {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [status, setStatus] = useState<CaptureStatus>("idle")
  const [settings, setSettings] = useState<MediaTrackSettings | null>(null)
  const [error, setError] = useState<string | null>(null)

  const streamRef = useRef<MediaStream | null>(null)
  const statusRef = useRef<CaptureStatus>("idle")
  const requestIdRef = useRef(0)
  const mountedRef = useRef(false)

  const stopCapture = useCallback(() => {
    requestIdRef.current += 1

    const activeStream = streamRef.current
    streamRef.current = null
    statusRef.current = "idle"
    stopTracks(activeStream)

    if (mountedRef.current) {
      setStream(null)
      setSettings(null)
      setError(null)
      setStatus("idle")
    }
  }, [])

  const startCapture = useCallback(async (): Promise<MediaStream | null> => {
    if (statusRef.current === "capturing") {
      return streamRef.current
    }

    if (statusRef.current === "requesting") {
      return null
    }

    if (typeof window !== "undefined" && !window.isSecureContext) {
      const message =
        "Udostępnianie ekranu wymaga połączenia HTTPS lub otwarcia strony przez localhost."

      statusRef.current = "idle"
      setError(message)
      setStatus("idle")
      return null
    }

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getDisplayMedia
    ) {
      const message =
        "Ta przeglądarka nie obsługuje przechwytywania ekranu."

      statusRef.current = "idle"
      setError(message)
      setStatus("idle")
      return null
    }

    const requestId = ++requestIdRef.current
    statusRef.current = "requesting"
    setError(null)
    setStatus("requesting")

    try {
      const captureStream = await navigator.mediaDevices.getDisplayMedia(
        DISPLAY_CAPTURE_OPTIONS,
      )

      if (!mountedRef.current || requestId !== requestIdRef.current) {
        stopTracks(captureStream)
        return null
      }

      const [videoTrack] = captureStream.getVideoTracks()

      if (!videoTrack) {
        stopTracks(captureStream)
        statusRef.current = "idle"
        setError("Przeglądarka nie zwróciła obrazu przechwytywanego ekranu.")
        setStatus("idle")
        return null
      }

      videoTrack.addEventListener(
        "ended",
        () => {
          if (streamRef.current !== captureStream) return

          streamRef.current = null
          statusRef.current = "idle"

          if (mountedRef.current) {
            setStream(null)
            setSettings(null)
            setError(null)
            setStatus("idle")
          }
        },
        { once: true },
      )

      streamRef.current = captureStream
      statusRef.current = "capturing"
      setStream(captureStream)
      setSettings(videoTrack.getSettings())
      setStatus("capturing")

      return captureStream
    } catch (captureError) {
      if (!mountedRef.current || requestId !== requestIdRef.current) {
        return null
      }

      if (
        !(captureError instanceof DOMException) ||
        captureError.name !== "NotAllowedError"
      ) {
        const errorName =
          captureError instanceof Error ? captureError.name : "UnknownError"

        console.error(`Display capture failed (${errorName}):`, captureError)
      }

      statusRef.current = "idle"
      setError(getCaptureErrorMessage(captureError))
      setStatus("idle")
      return null
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false
      requestIdRef.current += 1
      stopTracks(streamRef.current)
      streamRef.current = null
      statusRef.current = "idle"
    }
  }, [])

  return {
    stream,
    status,
    settings,
    error,
    startCapture,
    stopCapture,
  }
}
