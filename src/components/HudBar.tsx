import { Pause, Radio, Volume2, VolumeX } from 'lucide-react';
import { HostPersona } from '../types/trivia';
import { BrandEmblem } from './BrandEmblem';
import { HostAvatar } from './HostAvatar';

interface HudBarProps {
  host: HostPersona;
  questionIndex: number;
  totalQuestions: number;
  score: number;
  streak: number;
  timeRemainingSec: number;
  totalTimeSec: number;
  autoVoice: boolean;
  fxMuted: boolean;
  liveOpen: boolean;
  isHostSpeaking: boolean;
  onToggleAutoVoice: () => void;
  onToggleLive: () => void;
  onToggleFxMute: () => void;
  onPause: () => void;
}

export function HudBar({
  host,
  questionIndex,
  totalQuestions,
  score,
  streak,
  timeRemainingSec,
  totalTimeSec,
  autoVoice,
  fxMuted,
  liveOpen,
  isHostSpeaking,
  onToggleAutoVoice,
  onToggleLive,
  onToggleFxMute,
  onPause,
}: HudBarProps) {
  const timerRatio = Math.max(
    0,
    Math.min(1, timeRemainingSec / Math.max(1, totalTimeSec))
  );
  const timerLow = timeRemainingSec <= 6;

  return (
    <header className="w-full border-b border-white/10 bg-[#0D1322]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-2.5">
        {/* Zone 1: Brand & Host */}
        <div className="flex items-center gap-2.5 min-w-0 order-1">
          <BrandEmblem size={28} className="shrink-0" />
          <div className="flex items-center gap-2 min-w-0">
            <HostAvatar
              name={host.name}
              portraitUrl={host.portraitUrl}
              isSpeaking={isHostSpeaking}
              sizeClass="w-8 h-8"
              roundedClass="rounded-lg"
            />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-100 truncate">
                {host.name}
              </div>
              <div className="hidden sm:block text-xs text-slate-400 truncate">
                {host.roleTitle}
              </div>
            </div>
          </div>
        </div>

        {/* Zone 2: Live Tabular Telemetry */}
        <div className="w-full lg:w-auto flex items-center justify-between sm:justify-start gap-5 sm:gap-8 order-3 lg:order-2 pt-1 lg:pt-0 border-t border-white/5 lg:border-t-0">
          <div className="flex flex-col">
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-slate-400">
              Question
            </span>
            <span className="font-mono-tabular text-sm sm:text-lg font-semibold text-slate-100">
              {questionIndex + 1} / {totalQuestions}
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-slate-400">
              Score
            </span>
            <span
              data-testid="hud-score"
              className="font-mono-tabular text-sm sm:text-lg font-semibold text-amber-400"
            >
              {Math.round(score)}
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-slate-400">
              Streak
            </span>
            <span
              data-testid="hud-streak"
              className="font-mono-tabular text-sm sm:text-lg font-semibold text-emerald-400"
            >
              {streak}x
            </span>
          </div>

          <div className="flex flex-col min-w-[72px]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-slate-400">
                Clock
              </span>
              <span
                className={`font-mono-tabular text-xs sm:text-sm font-semibold ${
                  timerLow ? 'text-red-400' : 'text-slate-100'
                }`}
              >
                {Math.round(timeRemainingSec)}s
              </span>
            </div>
            <div className="mt-1 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full transition-transform duration-300 origin-left ${
                  timerLow ? 'bg-red-500' : 'bg-amber-400'
                }`}
                style={{ transform: `scaleX(${timerRatio})` }}
              />
            </div>
          </div>
        </div>

        {/* Zone 3: Stage Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 order-2 lg:order-3">
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleAutoVoice();
            }}
            aria-pressed={autoVoice}
            aria-label={autoVoice ? 'Disable host auto-voice [V]' : 'Enable host auto-voice [V]'}
            title="Toggle Host TTS Auto-Read [V]"
            className={`hidden sm:inline-flex px-3 py-2 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              autoVoice
                ? 'bg-amber-500/15 border-amber-400/50 text-amber-200'
                : 'bg-[#131B2E] border-white/10 text-slate-300 hover:text-white'
            }`}
          >
            {autoVoice ? 'Voice On' : 'Voice Off'}
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleLive();
            }}
            aria-pressed={liveOpen}
            aria-label="Toggle live voice conversation with host [T]"
            className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              liveOpen
                ? 'bg-emerald-500/15 border-emerald-400/50 text-emerald-200'
                : 'bg-[#131B2E] border-white/10 text-slate-200 hover:border-amber-400/40'
            }`}
          >
            <Radio className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Talk Live</span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleFxMute();
            }}
            aria-label={fxMuted ? 'Unmute sound effects [M]' : 'Mute sound effects [M]'}
            title="Mute Sound Effects [M]"
            className="p-2 rounded-lg bg-[#131B2E] border border-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            {fxMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onPause();
            }}
            aria-label="Pause game [P]"
            title="Pause Game [P]"
            className="p-2 rounded-lg bg-[#131B2E] border border-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
