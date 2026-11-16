import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, MicOff, PhoneOff, Radio, Send } from 'lucide-react';
import { HostPersona, LiveTranscriptItem } from '../types/trivia';
import { float32ToPcm16Base64, LiveAudioOutputQueue } from '../utils/liveAudio';

interface LiveHostPanelProps {
  host: HostPersona;
  gameContext: string;
  onSpeakingChange?: (speaking: boolean) => void;
  onClose?: () => void;
}

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';

export function LiveHostPanel({
  host,
  gameContext,
  onSpeakingChange,
  onClose,
}: LiveHostPanelProps) {
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [micActive, setMicActive] = useState(false);
  const [inputLevel, setInputLevel] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');
  const [transcript, setTranscript] = useState<LiveTranscriptItem[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const outputQueueRef = useRef<LiveAudioOutputQueue | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const statusRef = useRef<ConnectionStatus>('idle');

  statusRef.current = status;

  const appendTranscript = useCallback(
    (speaker: LiveTranscriptItem['speaker'], text: string) => {
      const clean = text.trim();
      if (!clean) return;
      setTranscript((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.speaker === speaker && Date.now() - last.timestamp < 5000) {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...last,
            text: `${last.text} ${clean}`.replace(/\s+/g, ' ').trim(),
            timestamp: Date.now(),
          };
          return updated;
        }
        return [
          ...prev.slice(-24),
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            speaker,
            text: clean,
            timestamp: Date.now(),
          },
        ];
      });
    },
    []
  );

  const stopMic = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current.onaudioprocess = null;
      processorRef.current = null;
    }
    if (inputAudioCtxRef.current) {
      void inputAudioCtxRef.current.close();
      inputAudioCtxRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    setMicActive(false);
    setInputLevel(0);
  }, []);

  const disconnect = useCallback(() => {
    stopMic();
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (outputQueueRef.current) {
      outputQueueRef.current.clear();
    }
    onSpeakingChange?.(false);
    setStatus('idle');
  }, [onSpeakingChange, stopMic]);

  useEffect(() => {
    return () => {
      stopMic();
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (outputQueueRef.current) {
        outputQueueRef.current.dispose();
        outputQueueRef.current = null;
      }
    };
  }, [stopMic]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  useEffect(() => {
    if (status === 'connected' && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'context',
          context: gameContext,
        })
      );
    }
  }, [gameContext, status]);

  const startMicCapture = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setErrorMsg(
          'Microphone capture is unavailable in this browser. You can still message the live host below.'
        );
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      micStreamRef.current = stream;

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new AudioCtx({ sampleRate: 16000 });
      inputAudioCtxRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (event) => {
        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN || statusRef.current !== 'connected') {
          return;
        }
        const channel = event.inputBuffer.getChannelData(0);
        let peak = 0;
        for (let i = 0; i < channel.length; i += 16) {
          const abs = Math.abs(channel[i]);
          if (abs > peak) peak = abs;
        }
        setInputLevel(Math.min(1, peak * 3.5));

        const base64 = float32ToPcm16Base64(channel);
        ws.send(JSON.stringify({ type: 'audio', data: base64 }));
      };

      source.connect(processor);
      processor.connect(ctx.destination);
      setMicActive(true);
      setErrorMsg(null);
    } catch {
      setErrorMsg(
        'Microphone permission was denied or no mic is attached. Use the text cue box below to talk with the live host.'
      );
    }
  }, []);

  const connectLiveSession = useCallback(
    async (withMic: boolean) => {
      setErrorMsg(null);
      setStatus('connecting');

      if (!outputQueueRef.current) {
        const queue = new LiveAudioOutputQueue();
        queue.onPlaybackStateChange = (playing) => {
          onSpeakingChange?.(playing);
        };
        outputQueueRef.current = queue;
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/api/live`);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            type: 'setup',
            hostName: host.name,
            systemInstruction: host.systemInstruction,
            voiceName: host.voiceName,
            gameContext,
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string) as {
            type?: string;
            data?: string;
            text?: string;
            message?: string;
          };

          if (msg.type === 'ready') {
            setStatus('connected');
            appendTranscript(
              'system',
              `Live studio line open with ${host.name}.`
            );
            if (withMic) {
              void startMicCapture();
            }
          } else if (msg.type === 'audio' && msg.data) {
            outputQueueRef.current?.enqueuePcmBase64(msg.data);
          } else if (msg.type === 'inputTranscript' && msg.text) {
            appendTranscript('user', msg.text);
          } else if (msg.type === 'outputTranscript' && msg.text) {
            appendTranscript('host', msg.text);
          } else if (msg.type === 'interrupted') {
            outputQueueRef.current?.clear();
          } else if (msg.type === 'error') {
            setErrorMsg(msg.message || 'Live voice session encountered an error.');
            setStatus('error');
            stopMic();
          } else if (msg.type === 'closed') {
            setStatus('idle');
            stopMic();
          }
        } catch {
          // ignore malformed messages
        }
      };

      ws.onerror = () => {
        setErrorMsg('Unable to open Live API WebSocket connection.');
        setStatus('error');
        stopMic();
      };

      ws.onclose = () => {
        if (statusRef.current !== 'error') {
          setStatus('idle');
        }
        stopMic();
      };
    },
    [appendTranscript, gameContext, host.name, host.systemInstruction, host.voiceName, onSpeakingChange, startMicCapture, stopMic]
  );

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = textInput.trim();
    if (!trimmed) return;
    if (wsRef.current?.readyState === WebSocket.OPEN && status === 'connected') {
      wsRef.current.send(JSON.stringify({ type: 'text', text: trimmed }));
      appendTranscript('user', trimmed);
      setTextInput('');
    }
  };

  return (
    <section
      aria-label="Live Voice Conversation with AI Host"
      className="rounded-xl bg-[#0E1525] border border-white/10 p-4 flex flex-col gap-3"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Radio
            className={`w-4 h-4 shrink-0 ${
              status === 'connected' ? 'text-emerald-400' : 'text-amber-400'
            }`}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-100 truncate">
              Live Stage Mic · {host.name}
            </h3>
            <p className="text-xs text-slate-400 truncate">
              {status === 'connected'
                ? micActive
                  ? 'Live audio streaming (16kHz mic · 24kHz host)'
                  : 'Connected via Live API · Mic muted'
                : status === 'connecting'
                  ? 'Connecting to live studio line...'
                  : 'Real-time voice banter & clues'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {status !== 'connected' ? (
            <button
              type="button"
              onClick={() => void connectLiveSession(true)}
              disabled={status === 'connecting'}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {status === 'connecting' ? 'Connecting...' : 'Start Live Voice'}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => (micActive ? stopMic() : void startMicCapture())}
                aria-label={micActive ? 'Mute microphone' : 'Enable microphone'}
                className={`p-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                  micActive
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-800 border-white/10 text-slate-300 hover:text-white'
                }`}
              >
                {micActive ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={disconnect}
                aria-label="End live voice session"
                className="p-2 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 hover:bg-red-500/25 transition-colors cursor-pointer"
              >
                <PhoneOff className="w-4 h-4" />
              </button>
            </>
          )}
          {onClose && (
            <button
              type="button"
              onClick={() => {
                disconnect();
                onClose();
              }}
              className="px-2.5 py-1.5 rounded-lg border border-white/10 text-xs text-slate-300 hover:text-white hover:bg-white/5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {status === 'connected' && micActive && (
        <div className="flex items-center gap-2" aria-hidden="true">
          <span className="text-[11px] font-mono-tabular text-emerald-300 shrink-0">
            MIC
          </span>
          <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-emerald-400 transition-transform duration-75 origin-left"
              style={{ transform: `scaleX(${Math.max(0.06, inputLevel)})` }}
            />
          </div>
        </div>
      )}

      {errorMsg && (
        <div
          role="alert"
          className="rounded-lg bg-red-950/60 border border-red-500/30 px-3 py-2 text-xs text-red-200"
        >
          {errorMsg}
        </div>
      )}

      <div
        ref={scrollRef}
        className="max-h-36 overflow-y-auto space-y-2 rounded-lg bg-[#090E19] border border-white/5 p-3 text-xs"
      >
        {transcript.length === 0 ? (
          <p className="text-slate-400 leading-relaxed">
            Open the live mic to ask {host.name} for a subtle hint, debate an answer, or chat between rounds.
          </p>
        ) : (
          transcript.map((item) => (
            <div key={item.id} className="leading-relaxed">
              <span
                className={`font-semibold mr-1.5 ${
                  item.speaker === 'host'
                    ? 'text-amber-300'
                    : item.speaker === 'user'
                      ? 'text-sky-300'
                      : 'text-slate-400'
                }`}
              >
                {item.speaker === 'host'
                  ? `${host.name}:`
                  : item.speaker === 'user'
                    ? 'You:'
                    : 'Studio:'}
              </span>
              <span className="text-slate-200">{item.text}</span>
            </div>
          ))
        )}
      </div>

      {status === 'connected' && (
        <form onSubmit={handleSendText} className="flex items-center gap-2">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder={`Say or type something to ${host.name}...`}
            aria-label={`Message ${host.name} in live session`}
            className="flex-1 min-w-0 rounded-lg bg-[#131B2E] border border-white/10 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
          />
          <button
            type="submit"
            aria-label="Send message to live host"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-100 transition-colors cursor-pointer shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      )}
    </section>
  );
}
