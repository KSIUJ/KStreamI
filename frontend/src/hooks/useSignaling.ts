import { useState, useCallback } from 'react';

type StreamStatus = "DISCONNECTED" | "LOBBY" | "STREAMING";

export function useSignaling() {
  const [status, setStatus] = useState<StreamStatus>("DISCONNECTED");
  const [serverBusy, setServerBusy] = useState(false);
  const [clientId, setClientId] = useState<string>("");

  // Zamiast wysyłać prawdziwe JOIN_REQUEST, tylko to symulujemy
  const joinLobby = useCallback((pin: string) => {
    console.log(`[Mock] Wysyłam JOIN_REQUEST dla pinu: ${pin}`);
    
    // Symulujemy opóźnienie sieci (500ms) i odpowiedź JOIN_RESPONSE
    setTimeout(() => {
      setClientId(`client-${Math.floor(Math.random() * 10000)}`);
      setStatus("LOBBY");
    }, 500);
  }, []);

  // Symulacja rozpoczęcia streamu (OFFER)
  const startCasting = useCallback(() => {
    console.log("[Mock] Wysyłam OFFER dla WebRTC...");
    setStatus("STREAMING");
  }, []);

  // Symulacja zatrzymania (STOP_CASTING)
  const stopCasting = useCallback(() => {
    console.log("[Mock] Wysyłam STOP_CASTING...");
    setStatus("LOBBY");
  }, []);

  return {
    status,
    serverBusy,
    setServerBusy, // Na razie zostawiamy, żeby DevTool działał
    clientId,
    joinLobby,
    startCasting,
    stopCasting
  };
}