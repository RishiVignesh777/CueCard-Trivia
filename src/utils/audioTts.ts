import { HostVoiceName } from '../types/trivia';

let activeAudio: HTMLAudioElement | null = null;
let activeAbortController: AbortController | null = null;

export function stopHostSpeech(): void {
  if (activeAbortController) {
    activeAbortController.abort();
    activeAbortController = null;
  }
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.src = '';
    activeAudio = null;
  }
}

export async function speakWithHostTts(params: {
  text: string;
  voiceName: HostVoiceName;
  style: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (message: string) => void;
}): Promise<void> {
  const { text, voiceName, style, onStart, onEnd, onError } = params;
  stopHostSpeech();

  const controller = new AbortController();
  activeAbortController = controller;

  try {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voiceName, style }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(payload.error || `TTS request failed (${response.status})`);
    }

    const data = (await response.json()) as { audioBase64?: string; mimeType?: string };
    if (!data.audioBase64) {
      throw new Error('No audio data returned by TTS service.');
    }

    if (controller.signal.aborted) {
      return;
    }

    const audio = new Audio(`data:${data.mimeType || 'audio/wav'};base64,${data.audioBase64}`);
    activeAudio = audio;
    onStart?.();

    audio.onended = () => {
      if (activeAudio === audio) {
        activeAudio = null;
      }
      onEnd?.();
    };

    audio.onerror = () => {
      if (activeAudio === audio) {
        activeAudio = null;
      }
      onEnd?.();
      onError?.('Unable to decode host audio stream.');
    };

    await audio.play();
  } catch (err) {
    if ((err as { name?: string })?.name === 'AbortError') {
      return;
    }
    onEnd?.();
    onError?.(err instanceof Error ? err.message : 'Host voice synthesis unavailable.');
  }
}
