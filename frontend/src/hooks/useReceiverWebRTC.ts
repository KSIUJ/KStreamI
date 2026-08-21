import { useRef, useState, useCallback } from "react"

export function useReceiverWebRTC(
  sendMessage: (type: string, payload: object) => void
) {
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)

  const handleIncomingRTCMessage = useCallback(async (type: string, payload: any) => {
    try {
      if (type === "OFFER" && payload.sdp) {
        console.log("Otrzymano ofertę wideo (OFFER) od studenta!")
        
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
        })
        peerConnectionRef.current = pc

        pc.ontrack = (event) => {
          console.log("Hura! Otrzymano ścieżkę wideo od studenta!", event.streams)
          if (event.streams && event.streams.length > 0) {
            setRemoteStream(event.streams[0])
          }
        }

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            sendMessage("ICE_CANDIDATE", {
              candidate: event.candidate.candidate,
              sdpMid: event.candidate.sdpMid,
              sdpMLineIndex: event.candidate.sdpMLineIndex,
            })
          }
        }

        await pc.setRemoteDescription(new RTCSessionDescription({ type: "offer", sdp: payload.sdp }))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        
        if (pc.localDescription) {
          sendMessage("ANSWER", { sdp: pc.localDescription.sdp })
        }
      } 
      else if (type === "ICE_CANDIDATE" && payload.candidate && peerConnectionRef.current) {
        console.log("Otrzymano drogę sieciową (ICE) od studenta")
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate({
          candidate: payload.candidate,
          sdpMid: payload.sdpMid,
          sdpMLineIndex: payload.sdpMLineIndex
        }))
      }
    } catch (error) {
      console.error("Błąd podczas konfiguracji WebRTC na rzutniku:", error)
    }
  }, [sendMessage])

  const stopWebRTC = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }
    setRemoteStream(null)
  }, [])

  return { remoteStream, handleIncomingRTCMessage, stopWebRTC }
}