"use client";

import { useEffect, useRef, useState } from "react";

export const MAX_RECORDING_SECONDS = 30;

export type VoiceNote = { blob: Blob; url: string; seconds: number };

// Tap to start, tap to stop; stops itself at the 30-second cap.
export function useRecorder(onDone: (note: VoiceNote) => void, onError: (message: string) => void) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const secondsRef = useRef(0);

  const stop = () => recorderRef.current?.state === "recording" && recorderRef.current.stop();

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);
        setRecording(false);
        const blob = new Blob(chunks, { type: recorder.mimeType });
        onDone({ blob, url: URL.createObjectURL(blob), seconds: secondsRef.current });
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
      onError("Microphone access was blocked. Allow it in your browser settings, or type instead.");
    }
  };

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
      recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    },
    []
  );

  return { recording, seconds, toggle: () => (recording ? stop() : start()) };
}

export const formatSeconds = (s: number) => `0:${String(s).padStart(2, "0")}`;
