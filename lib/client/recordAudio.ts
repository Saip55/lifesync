"use client";

import { useEffect, useRef, useState } from "react";

export const MAX_RECORDING_SECONDS = 30;

// Speech needs little bandwidth: 32 kbit/s keeps a full 30-second note near 120 KB.
const AUDIO_BITS_PER_SECOND = 32_000;
const PREFERRED_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];

export type VoiceNote = { blob: Blob; seconds: number };

/** The first compact format this browser can record, or "" to let it choose. */
export function pickMimeType(isSupported: (type: string) => boolean = (t) => MediaRecorder.isTypeSupported(t)) {
  return PREFERRED_TYPES.find((t) => isSupported(t)) ?? "";
}

// Tap to start, tap to stop; stops itself at the 30-second cap.
export function useRecorder(onDone: (note: VoiceNote) => void, onError: () => void) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const secondsRef = useRef(0);

  const stop = () => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  };

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, { ...(mimeType && { mimeType }), audioBitsPerSecond: AUDIO_BITS_PER_SECOND });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);
        setRecording(false);
        onDone({ blob: new Blob(chunks, { type: recorder.mimeType }), seconds: secondsRef.current });
      };
      recorderRef.current = recorder;
      secondsRef.current = 0;
      setSeconds(0);
      recorder.start();
      setRecording(true);
      timerRef.current = setInterval(() => {
        secondsRef.current += 1;
        setSeconds(secondsRef.current);
        if (secondsRef.current >= MAX_RECORDING_SECONDS) stop();
      }, 1000);
    } catch {
      onError();
    }
  };

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
      recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    },
    [],
  );

  return { recording, seconds, toggle: () => (recording ? stop() : void start()) };
}

export const formatSeconds = (s: number) => `0:${String(s).padStart(2, "0")}`;
