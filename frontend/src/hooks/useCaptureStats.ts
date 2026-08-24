import { type RefObject, useEffect, useState } from "react"

export interface CaptureStats {
  width: number | null
  height: number | null
  framesPerSecond: number | null
}

const EMPTY_CAPTURE_STATS: CaptureStats = {
  width: null,
  height: null,
  framesPerSecond: null,
}

export function useCaptureStats(
  videoRef: RefObject<HTMLVideoElement | null>,
  stream: MediaStream,
): CaptureStats {
  const [stats, setStats] = useState<CaptureStats>(EMPTY_CAPTURE_STATS)

  useEffect(() => {
    const videoElement = videoRef.current
    const [videoTrack] = stream.getVideoTracks()

    if (!videoElement || !videoTrack) {
      setStats(EMPTY_CAPTURE_STATS)
      return
    }

    const initialSettings = videoTrack.getSettings()
    let latestWidth = initialSettings.width ?? null
    let latestHeight = initialSettings.height ?? null
    let framesSinceSample = 0
    let previousPresentedFrames: number | null = null
    let lastSampleTime = performance.now()
    let frameCallbackId: number | null = null

    setStats({
      width: latestWidth,
      height: latestHeight,
      framesPerSecond: null,
    })

    if (typeof videoElement.requestVideoFrameCallback !== "function") {
      return
    }

    const handleVideoFrame: VideoFrameRequestCallback = (_, metadata) => {
      const presentedFramesDifference =
        previousPresentedFrames === null
          ? 1
          : Math.max(1, metadata.presentedFrames - previousPresentedFrames)

      framesSinceSample += presentedFramesDifference
      previousPresentedFrames = metadata.presentedFrames
      latestWidth = metadata.width
      latestHeight = metadata.height
      frameCallbackId =
        videoElement.requestVideoFrameCallback(handleVideoFrame)
    }

    frameCallbackId = videoElement.requestVideoFrameCallback(handleVideoFrame)

    const sampleIntervalId = window.setInterval(() => {
      const now = performance.now()
      const elapsedMilliseconds = now - lastSampleTime

      setStats({
        width: latestWidth,
        height: latestHeight,
        framesPerSecond:
          elapsedMilliseconds > 0
            ? (framesSinceSample * 1000) / elapsedMilliseconds
            : null,
      })

      framesSinceSample = 0
      lastSampleTime = now
    }, 1000)

    return () => {
      window.clearInterval(sampleIntervalId)

      if (frameCallbackId !== null) {
        videoElement.cancelVideoFrameCallback(frameCallbackId)
      }
    }
  }, [stream, videoRef])

  return stats
}
