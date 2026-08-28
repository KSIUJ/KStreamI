import { useEffect, useRef, useCallback } from "react"

export function useSenderWebRTC(
  stream: MediaStream | null,
  sendMessage: (type: string, payload: object) => void
) {
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)

  useEffect(() => {
    if (!stream) return

    console.log("Inicjalizacja WebRTC (Nadawca)...")
    
    const pc = new RTCPeerConnection({
       iceServers: [
         { urls: "stun:stun.l.google.com:19302" },
         {
           urls: `turn:${import.meta.env.VITE_TURN_HOST}:3478`,
           username: import.meta.env.VITE_TURN_USER,
           credential: import.meta.env.VITE_TURN_PASS,
         },
    ],
    // iceTransportPolicy: "relay",
})
    peerConnectionRef.current = pc

    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream)
    })

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendMessage("ICE_CANDIDATE", {
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid,
          sdpMLineIndex: event.candidate.sdpMLineIndex,
        })
      }
    }

    pc.createOffer()
      .then((offer) => pc.setLocalDescription(offer))
      .then(() => {
        if (pc.localDescription) {
          sendMessage("OFFER", { sdp: pc.localDescription.sdp })
        }
      })
      .catch((error) => console.error("Błąd tworzenia oferty WebRTC:", error))

    return () => {
      console.log("Zamykanie połączenia WebRTC...")
      pc.close()
      peerConnectionRef.current = null
    }
  }, [stream, sendMessage])

  const handleIncomingRTCMessage = useCallback(async (type: string, payload: any) => {
    const pc = peerConnectionRef.current
    if (!pc) return

    try {
      if (type === "ANSWER" && payload.sdp) {
        console.log("Otrzymano ANSWER od rzutnika, nawiązywanie połączenia!")
        await pc.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp: payload.sdp }))
      } 
      else if (type === "ICE_CANDIDATE" && payload.candidate) {
        console.log("Otrzymano drogę sieciową (ICE) od rzutnika")
        await pc.addIceCandidate(new RTCIceCandidate({
          candidate: payload.candidate,
          sdpMid: payload.sdpMid,
          sdpMLineIndex: payload.sdpMLineIndex
        }))
      }
    } catch (error) {
      console.error("Błąd podczas obsługi wiadomości WebRTC:", error)
    }
  }, [])

  return { handleIncomingRTCMessage }
}