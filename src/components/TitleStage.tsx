import { useState } from 'react';
import { Play, Radio, Search, Sliders, Volume2 } from 'lucide-react';
import {
  DEFAULT_CUSTOM_HOST,
  HOST_PRESETS,
  STUDIO_BACKDROP_URL,
  TOPIC_PRESETS,
  VOICE_OPTIONS,
} from '../data/hosts';
import { DIFFICULTY_CONFIG, stripTtsDirectives } from '../game/rules';
import { CustomHostInput, Difficulty, HostPersona } from '../types/trivia';
import { BrandEmblem } from './BrandEmblem';
import { HostAvatar } from './HostAvatar';
import { LiveHostPanel } from './LiveHostPanel';

interface TitleStageProps {
  selectedHostId: string;
  activeHost: HostPersona;
  customHostInput: CustomHostInput;
  topic: string;
  difficulty: Difficulty;
  questionCount: number;
  isGenerating: boolean;
  generationError: string | null;
  isSpeakingPreview: boolean;
  ttsError: string | null;
  onSelectHostId: (id: string) => void;
  onUpdateCustomHost: (next: CustomHostInput) => void;
  onChangeTopic: (next: string) => void;
  onChangeDifficulty: (next: Difficulty) => void;
  onChangeQuestionCount: (next: number) => void;
  onPreviewHostVoice: () => void;
  onStartLiveShow: () => void;
  onStartSampleShow: () => void;
}

export function TitleStage({
  selectedHostId,
  activeHost,
  customHostInput,
  topic,
  difficulty,
  questionCount,
  isGenerating,
  generationError,
  isSpeakingPreview,
  ttsError,
  onSelectHostId,
  onUpdateCustomHost,
  onChangeTopic,
  onChangeDifficulty,
  onChangeQuestionCount,
  onPreviewHostVoice,
  onStartLiveShow,
  onStartSampleShow,
}: TitleStageProps) {
  const [greenRoomLiveOpen, setGreenRoomLiveOpen] = useState(false);
  const [bgFailed, setBgFailed] = useState(false);

  return (
    <main className="relative min-h-screen w-full overflow-x-hidden bg-[#0B101B] text-slate-100 flex flex-col justify-between">
      {/* Stage Backdrop */}
      {!bgFailed && (
        <div className="pointer-events-none fixed inset-0 z-0">
          <img
            src={STUDIO_BACKDROP_URL}
            alt="Late-night trivia studio stage"
            referrerPolicy="no-referrer"
            onError={() => setBgFailed(true)}
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0B101B] via-[#0B101B]/90 to-[#0B101B]/75" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B101B] via-transparent to-[#0B101B]/80" />
        </div>
      )}

      {/* Main Content */}
      <div className="relative z-10 max-w-[1280px] w-full mx-auto px-6 py-8 lg:py-12 flex-1 flex items-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* Left Stage Hero & Selected Host Spotlight */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="flex items-center gap-3.5">
              <BrandEmblem size={42} />
              <span className="text-sm font-medium tracking-wide text-amber-300">
                CueCard Broadcast Studio
              </span>
            </div>

            <div className="space-y-3">
              <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-white text-balance leading-[1.1]">
                Your Trivia Show, Hosted Live
              </h1>
              <p className="text-base text-slate-300 leading-relaxed max-w-md">
                Cast an AI quizmaster with a distinct voice and personality, generate search-verified rounds on any topic, and talk to the host live on air.
              </p>
            </div>

            {/* Active Host Preview Card */}
            <div className="rounded-xl bg-[#131B2E]/95 border border-white/10 p-5 space-y-4">
              <div className="flex items-start gap-4">
                <HostAvatar
                  name={activeHost.name}
                  portraitUrl={activeHost.portraitUrl}
                  isSpeaking={isSpeakingPreview}
                  sizeClass="w-20 h-20"
                  roundedClass="rounded-xl"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-lg font-display font-bold text-white truncate">
                    {activeHost.name}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {activeHost.roleTitle} · Voice: {activeHost.voiceName}
                  </div>
                  <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                    {activeHost.tagline}
                  </p>
                </div>
              </div>

              <div className="rounded-lg bg-[#0B101B] border border-white/5 p-3.5 text-sm text-slate-200 italic leading-relaxed">
                “{stripTtsDirectives(activeHost.sampleGreeting)}”
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={onPreviewHostVoice}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#1C2640] hover:bg-[#243152] border border-white/10 text-xs font-semibold text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                  <span>{isSpeakingPreview ? 'Stop Voice' : 'Hear Host Intro'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setGreenRoomLiveOpen((v) => !v)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    greenRoomLiveOpen
                      ? 'bg-emerald-500/15 border-emerald-400/50 text-emerald-200'
                      : 'bg-[#1C2640] hover:bg-[#243152] border-white/10 text-slate-100'
                  }`}
                >
                  <Radio className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{greenRoomLiveOpen ? 'Hide Green Room' : 'Chat with Host Live'}</span>
                </button>
              </div>

              {ttsError && (
                <p className="text-xs text-amber-300" role="status">
                  {ttsError}
                </p>
              )}
            </div>

            {greenRoomLiveOpen && (
              <LiveHostPanel
                host={activeHost}
                gameContext={`Green Room warm-up before the show starts. Planned topic: ${topic}. Difficulty: ${difficulty}.`}
                onClose={() => setGreenRoomLiveOpen(false)}
              />
            )}
          </div>

          {/* Right Stage Setup Panel */}
          <div className="lg:col-span-7 rounded-2xl bg-[#131B2E]/95 border border-white/10 p-6 sm:p-7 space-y-6">
            {/* Step 1: Cast Your Host */}
            <section aria-labelledby="host-cast-heading" className="space-y-3">
              <div className="flex items-baseline justify-between gap-4">
                <h2
                  id="host-cast-heading"
                  className="text-base font-semibold text-white"
                >
                  01. Choose Host Personality
                </h2>
                <span className="text-xs text-slate-400">
                  Shapes dialogue, TTS tone &amp; live banter
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {HOST_PRESETS.map((preset) => {
                  const selected = selectedHostId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => onSelectHostId(preset.id)}
                      aria-pressed={selected}
                      className={`group text-left rounded-xl p-2.5 border transition-colors cursor-pointer flex flex-col gap-2 ${
                        selected
                          ? 'bg-[#1E2942] border-amber-400'
                          : 'bg-[#0D1322] border-white/10 hover:border-white/25'
                      }`}
                    >
                      <HostAvatar
                        name={preset.name}
                        portraitUrl={preset.portraitUrl}
                        sizeClass="w-full aspect-square"
                        roundedClass="rounded-lg"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-white truncate">
                          {preset.shortName}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {preset.roleTitle}
                        </div>
                      </div>
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => onSelectHostId('custom')}
                  aria-pressed={selectedHostId === 'custom'}
                  className={`text-left rounded-xl p-2.5 border transition-colors cursor-pointer flex flex-col justify-between gap-2 ${
                    selectedHostId === 'custom'
                      ? 'bg-[#1E2942] border-amber-400'
                      : 'bg-[#0D1322] border-white/10 hover:border-white/25'
                  }`}
                >
                  <div className="w-full aspect-square rounded-lg bg-[#162038] border border-dashed border-white/20 flex items-center justify-center text-amber-400">
                    <Sliders className="w-6 h-6" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white truncate">
                      Custom
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      Build Persona
                    </div>
                  </div>
                </button>
              </div>

              {selectedHostId === 'custom' && (
                <div className="rounded-xl bg-[#0D1322] border border-white/10 p-4 space-y-3 mt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="custom-host-name"
                        className="block text-xs font-medium text-slate-300 mb-1"
                      >
                        Host Name
                      </label>
                      <input
                        id="custom-host-name"
                        type="text"
                        value={customHostInput.name}
                        onChange={(e) =>
                          onUpdateCustomHost({ ...customHostInput, name: e.target.value })
                        }
                        placeholder={DEFAULT_CUSTOM_HOST.name}
                        className="w-full rounded-lg bg-[#131B2E] border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="custom-host-voice"
                        className="block text-xs font-medium text-slate-300 mb-1"
                      >
                        Voice Profile
                      </label>
                      <select
                        id="custom-host-voice"
                        value={customHostInput.voiceName}
                        onChange={(e) =>
                          onUpdateCustomHost({
                            ...customHostInput,
                            voiceName: e.target.value as CustomHostInput['voiceName'],
                          })
                        }
                        className="w-full rounded-lg bg-[#131B2E] border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                      >
                        {VOICE_OPTIONS.map((v) => (
                          <option key={v.value} value={v.value}>
                            {v.label} — {v.tone}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="custom-host-personality"
                      className="block text-xs font-medium text-slate-300 mb-1"
                    >
                      Personality &amp; Hosting Style
                    </label>
                    <textarea
                      id="custom-host-personality"
                      rows={2}
                      value={customHostInput.personalityPrompt}
                      onChange={(e) =>
                        onUpdateCustomHost({
                          ...customHostInput,
                          personalityPrompt: e.target.value,
                          ttsStyle: e.target.value,
                        })
                      }
                      placeholder="Describe how your host speaks, jokes, and reacts..."
                      className="w-full rounded-lg bg-[#131B2E] border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400 resize-none"
                    />
                  </div>
                </div>
              )}
            </section>

            {/* Step 2: Topic & Format */}
            <section aria-labelledby="topic-format-heading" className="space-y-4">
              <div className="flex items-baseline justify-between gap-4">
                <h2
                  id="topic-format-heading"
                  className="text-base font-semibold text-white"
                >
                  02. Topic &amp; Show Format
                </h2>
                <span className="text-xs text-slate-400 inline-flex items-center gap-1">
                  <Search className="w-3 h-3 text-amber-400" aria-hidden="true" />
                  Search-grounded trivia
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                {TOPIC_PRESETS.map((presetTopic) => {
                  const active = topic === presetTopic;
                  return (
                    <button
                      key={presetTopic}
                      type="button"
                      onClick={() => onChangeTopic(presetTopic)}
                      aria-pressed={active}
                      className={`px-3 py-2 rounded-lg text-xs font-medium border text-left transition-colors truncate cursor-pointer ${
                        active
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-semibold'
                          : 'bg-[#0D1322] text-slate-300 border-white/10 hover:border-white/25 hover:text-white'
                      }`}
                    >
                      {presetTopic}
                    </button>
                  );
                })}
              </div>

              <div>
                <label
                  htmlFor="custom-topic-input"
                  className="block text-xs font-medium text-slate-300 mb-1.5"
                >
                  Or enter any custom topic or recent event
                </label>
                <input
                  id="custom-topic-input"
                  type="text"
                  value={topic}
                  onChange={(e) => onChangeTopic(e.target.value)}
                  placeholder="e.g., 2026 Winter Olympics, Deep Sea Bioluminescence, 90s Hip-Hop..."
                  className="w-full rounded-lg bg-[#0D1322] border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="block text-xs font-medium text-slate-300 mb-1.5">
                    Difficulty &amp; Timer
                  </span>
                  <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-[#0D1322] border border-white/10">
                    {(['casual', 'standard', 'expert'] as Difficulty[]).map((level) => {
                      const active = difficulty === level;
                      return (
                        <button
                          key={level}
                          type="button"
                          onClick={() => onChangeDifficulty(level)}
                          aria-pressed={active}
                          className={`py-2 px-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            active
                              ? 'bg-[#1E2942] text-amber-300 font-semibold'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {DIFFICULTY_CONFIG[level].label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <span className="block text-xs font-medium text-slate-300 mb-1.5">
                    Round Length
                  </span>
                  <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-[#0D1322] border border-white/10">
                    {[5, 8, 10].map((len) => {
                      const active = questionCount === len;
                      return (
                        <button
                          key={len}
                          type="button"
                          onClick={() => onChangeQuestionCount(len)}
                          aria-pressed={active}
                          className={`py-2 px-2 rounded-md text-xs font-medium font-mono-tabular transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            active
                              ? 'bg-[#1E2942] text-amber-300 font-semibold'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {len} Qs
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            {generationError && (
              <div
                role="alert"
                className="rounded-xl bg-red-950/60 border border-red-500/35 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="text-xs text-red-200 leading-relaxed">
                  {generationError}
                </div>
                <button
                  type="button"
                  onClick={onStartSampleShow}
                  className="px-3.5 py-2 rounded-lg bg-white text-slate-950 text-xs font-semibold hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Play Sample Show
                </button>
              </div>
            )}

            {/* Primary Actions */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                data-start="true"
                disabled={isGenerating}
                onClick={onStartLiveShow}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 text-sm font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" aria-hidden="true" />
                <span>{isGenerating ? 'Building Show...' : 'Start Live Show'}</span>
              </button>

              <button
                type="button"
                disabled={isGenerating}
                onClick={onStartSampleShow}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#1C2640] hover:bg-[#243152] disabled:opacity-60 border border-white/10 text-slate-100 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Play Sample Show</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Control Hint */}
      <footer className="relative z-10 max-w-[1280px] w-full mx-auto px-6 pb-5 pt-2">
        <p className="text-xs text-slate-400">
          Enter or Space to start · Keys 1–4 to lock an answer · T for Live Host Mic · P to pause
        </p>
      </footer>
    </main>
  );
}
