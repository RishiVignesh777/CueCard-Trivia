import { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Radio,
  Search,
  Volume2,
  XCircle,
} from 'lucide-react';
import { getDifficultyVisualMeta, stripTtsDirectives } from '../game/rules';
import {
  GroundingSource,
  HostPersona,
  TriviaAnswerRecord,
  TriviaQuestion,
} from '../types/trivia';
import { HostAvatar } from './HostAvatar';
import { HudBar } from './HudBar';
import { LiveHostPanel } from './LiveHostPanel';

interface TriviaStageProps {
  host: HostPersona;
  questions: TriviaQuestion[];
  questionIndex: number;
  score: number;
  streak: number;
  timeRemainingSec: number;
  totalTimeSec: number;
  currentAnswer: TriviaAnswerRecord | null;
  hostDialogue: string;
  isHostSpeaking: boolean;
  ttsError: string | null;
  autoVoice: boolean;
  fxMuted: boolean;
  liveOpen: boolean;
  deepDiveLoading: boolean;
  deepDiveSources: GroundingSource[];
  onSelectOption: (index: number) => void;
  onNextQuestion: () => void;
  onReplayHostVoice: () => void;
  onAskDeepDive: (promptText: string) => void;
  onToggleAutoVoice: () => void;
  onToggleLive: () => void;
  onToggleFxMute: () => void;
  onPause: () => void;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

export function TriviaStage({
  host,
  questions,
  questionIndex,
  score,
  streak,
  timeRemainingSec,
  totalTimeSec,
  currentAnswer,
  hostDialogue,
  isHostSpeaking,
  ttsError,
  autoVoice,
  fxMuted,
  liveOpen,
  deepDiveLoading,
  deepDiveSources,
  onSelectOption,
  onNextQuestion,
  onReplayHostVoice,
  onAskDeepDive,
  onToggleAutoVoice,
  onToggleLive,
  onToggleFxMute,
  onPause,
}: TriviaStageProps) {
  const [followUpText, setFollowUpText] = useState('');
  const question = questions[questionIndex];

  if (!question) return null;

  const isRevealed = currentAnswer !== null;
  const combinedSources = [
    ...question.sources,
    ...deepDiveSources.filter(
      (ds) => !question.sources.some((qs) => qs.uri === ds.uri)
    ),
  ];

  const liveContextSummary = [
    `Round ${questionIndex + 1} of ${questions.length}. Category: ${question.category}.`,
    `Player Score: ${score}. Current Streak: ${streak}.`,
    `Current Question: ${question.question}`,
    isRevealed
      ? `Answer has been revealed. Correct option: ${question.options[question.correctIndex]}. Player was ${currentAnswer.isCorrect ? 'correct' : 'incorrect'}.`
      : 'Question is currently active and unanswered. Do not reveal the correct option.',
  ].join(' ');

  const handleFollowUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = followUpText.trim();
    if (!trimmed || deepDiveLoading) return;
    onAskDeepDive(trimmed);
    setFollowUpText('');
  };

  return (
    <div className="min-h-screen bg-[#0B101B] text-slate-100 flex flex-col">
      <HudBar
        host={host}
        questionIndex={questionIndex}
        totalQuestions={questions.length}
        score={score}
        streak={streak}
        timeRemainingSec={timeRemainingSec}
        totalTimeSec={totalTimeSec}
        autoVoice={autoVoice}
        fxMuted={fxMuted}
        liveOpen={liveOpen}
        isHostSpeaking={isHostSpeaking}
        onToggleAutoVoice={onToggleAutoVoice}
        onToggleLive={onToggleLive}
        onToggleFxMute={onToggleFxMute}
        onPause={onPause}
      />

      <main className="flex-1 max-w-[1280px] w-full mx-auto px-4 sm:px-6 py-6 lg:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Left 7 Columns: Question & Answer Board */}
          <section
            aria-label="Trivia Question Board"
            className="lg:col-span-7 space-y-6"
          >
            <div className="rounded-2xl bg-[#131B2E] border border-white/10 p-6 sm:p-8 space-y-6">
              {/* Unboxed Metadata & Visual Difficulty Gauge */}
              {(() => {
                const diffMeta = getDifficultyVisualMeta(question.difficulty);
                const toneClasses =
                  diffMeta.tone === 'emerald'
                    ? { text: 'text-emerald-300', bar: 'bg-emerald-400' }
                    : diffMeta.tone === 'rose'
                      ? { text: 'text-rose-300', bar: 'bg-rose-400' }
                      : { text: 'text-amber-300', bar: 'bg-amber-400' };

                return (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
                      <span className="text-amber-300 font-medium whitespace-nowrap">
                        {question.category}
                      </span>
                      <span className="font-mono-tabular whitespace-nowrap">
                        · Round {questionIndex + 1} of {questions.length}
                      </span>
                    </div>

                    <div
                      data-testid="difficulty-indicator"
                      data-difficulty={question.difficulty}
                      aria-label={`Difficulty: ${diffMeta.label}, ${diffMeta.basePoints} base points`}
                      className={`inline-flex items-center gap-2 text-xs font-semibold whitespace-nowrap shrink-0 ${toneClasses.text}`}
                    >
                      <span
                        className="inline-flex items-end gap-0.5 h-3.5"
                        aria-hidden="true"
                      >
                        {[1, 2, 3].map((step) => (
                          <span
                            key={step}
                            className={`w-1 rounded-xs ${
                              step === 1 ? 'h-1.5' : step === 2 ? 'h-2.5' : 'h-3.5'
                            } ${
                              step <= diffMeta.bars ? toneClasses.bar : 'bg-slate-700'
                            }`}
                          />
                        ))}
                      </span>
                      <span>{diffMeta.label}</span>
                      <span className="font-mono-tabular text-[11px] text-slate-400 font-normal">
                        · {diffMeta.basePoints} pts
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Question Prompt */}
              <h1 className="font-display text-2xl sm:text-[28px] font-semibold text-white leading-snug text-balance">
                {question.question}
              </h1>

              {/* 4 Answer Choices */}
              <div className="space-y-3">
                {question.options.map((optionText, idx) => {
                  const isSelected = currentAnswer?.selectedIndex === idx;
                  const isCorrectChoice = idx === question.correctIndex;

                  let cardClasses =
                    'bg-[#0D1322] border-white/10 hover:border-amber-400/60 hover:bg-[#162038] text-slate-100';
                  let statusLabel: string | null = null;

                  if (isRevealed) {
                    if (isCorrectChoice) {
                      cardClasses =
                        'bg-emerald-950/60 border-emerald-400 text-emerald-50';
                      statusLabel = isSelected ? 'Correct · Your Pick' : 'Correct Answer';
                    } else if (isSelected && !currentAnswer.isCorrect) {
                      cardClasses = 'bg-red-950/60 border-red-400 text-red-50';
                      statusLabel = 'Incorrect · Your Pick';
                    } else {
                      cardClasses =
                        'bg-[#0D1322]/60 border-white/5 text-slate-400 opacity-75';
                    }
                  }

                  return (
                    <button
                      key={`${question.id}-opt-${idx}`}
                      type="button"
                      disabled={isRevealed}
                      onClick={() => onSelectOption(idx)}
                      className={`w-full text-left rounded-xl border px-4 py-3.5 min-h-[56px] transition-colors duration-150 flex items-center justify-between gap-4 ${
                        isRevealed ? 'cursor-default' : 'cursor-pointer'
                      } ${cardClasses}`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <span
                          className={`w-7 h-7 rounded-md font-mono-tabular text-xs font-semibold flex items-center justify-center shrink-0 border ${
                            isRevealed && isCorrectChoice
                              ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                              : isRevealed && isSelected && !currentAnswer.isCorrect
                                ? 'bg-red-500/20 border-red-400 text-red-200'
                                : 'bg-[#192338] border-white/10 text-slate-300'
                          }`}
                        >
                          {OPTION_LETTERS[idx]}
                        </span>
                        <span className="text-sm sm:text-base font-medium leading-snug">
                          {optionText}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {statusLabel && (
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap ${
                              isCorrectChoice ? 'text-emerald-300' : 'text-red-300'
                            }`}
                          >
                            {isCorrectChoice ? (
                              <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                            ) : (
                              <XCircle className="w-4 h-4" aria-hidden="true" />
                            )}
                            <span>{statusLabel}</span>
                          </span>
                        )}
                        {!isRevealed && (
                          <span className="hidden sm:inline font-mono-tabular text-[11px] text-slate-500">
                            [{idx + 1}]
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Post-Answer Reveal & Grounded Sources */}
              {isRevealed && (
                <div className="pt-4 border-t border-white/10 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {currentAnswer.isCorrect ? (
                        <CheckCircle2
                          className="w-5 h-5 text-emerald-400 shrink-0"
                          aria-hidden="true"
                        />
                      ) : (
                        <XCircle
                          className="w-5 h-5 text-red-400 shrink-0"
                          aria-hidden="true"
                        />
                      )}
                      <span
                        className={`text-sm font-bold ${
                          currentAnswer.isCorrect ? 'text-emerald-300' : 'text-red-300'
                        }`}
                      >
                        {currentAnswer.timedOut
                          ? 'Time Up'
                          : currentAnswer.isCorrect
                            ? `Correct · +${currentAnswer.pointsEarned} pts`
                            : 'Incorrect · 0 pts'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={onNextQuestion}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <span>
                        {questionIndex + 1 >= questions.length
                          ? 'View Final Results'
                          : 'Next Question'}
                      </span>
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>

                  <p className="text-sm text-slate-200 leading-relaxed">
                    {question.explanation}
                  </p>

                  {combinedSources.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                        <Search className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                        <span>Verified Search Sources</span>
                      </div>
                      <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
                        {combinedSources.map((src) => (
                          <li key={src.uri}>
                            <a
                              href={src.uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-sky-300 hover:text-sky-200 underline underline-offset-2"
                            >
                              <span className="truncate max-w-[280px] sm:max-w-[440px]">
                                {src.title}
                              </span>
                              <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Follow-up Search Grounded Deep Dive */}
                  <form onSubmit={handleFollowUpSubmit} className="flex flex-wrap gap-2 pt-1">
                    <input
                      type="text"
                      value={followUpText}
                      onChange={(e) => setFollowUpText(e.target.value)}
                      placeholder={`Ask ${host.name} a follow-up fact-check...`}
                      aria-label={`Ask ${host.name} a follow-up question`}
                      className="flex-1 min-w-[200px] rounded-lg bg-[#0D1322] border border-white/10 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                    />
                    <button
                      type="submit"
                      disabled={deepDiveLoading || !followUpText.trim()}
                      className="px-3.5 py-2 rounded-lg bg-[#1C2640] hover:bg-[#243152] disabled:opacity-50 border border-white/10 text-xs font-semibold text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {deepDiveLoading ? 'Checking...' : 'Fact-Check'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </section>

          {/* Right 5 Columns: Host Podium & Live Conversation */}
          <aside aria-label="AI Host Booth" className="lg:col-span-5 space-y-4">
            <div className="rounded-2xl bg-[#131B2E] border border-white/10 p-6 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <HostAvatar
                    name={host.name}
                    portraitUrl={host.portraitUrl}
                    isSpeaking={isHostSpeaking}
                    sizeClass="w-16 h-16"
                    roundedClass="rounded-xl"
                  />
                  <div className="min-w-0">
                    <h2 className="font-display text-lg font-bold text-white truncate">
                      {host.name}
                    </h2>
                    <p className="text-xs text-slate-400 truncate">
                      {host.roleTitle}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onReplayHostVoice}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1C2640] hover:bg-[#243152] border border-white/10 text-xs font-semibold text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                  <span>{isHostSpeaking ? 'Stop' : 'Speak'}</span>
                </button>
              </div>

              <div className="rounded-xl bg-[#0D1322] border border-white/5 p-4 text-sm text-slate-200 leading-relaxed">
                {stripTtsDirectives(hostDialogue)}
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <span className="text-xs text-slate-400">
                  Voice: {host.voiceName}
                </span>
                <button
                  type="button"
                  onClick={onToggleLive}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    liveOpen
                      ? 'bg-emerald-500/15 border-emerald-400/50 text-emerald-200'
                      : 'bg-[#1C2640] hover:bg-[#243152] border-white/10 text-slate-200'
                  }`}
                >
                  <Radio className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{liveOpen ? 'Hide Live Mic' : 'Talk Live with Host'}</span>
                </button>
              </div>

              {ttsError && (
                <p className="text-xs text-amber-300" role="status">
                  {ttsError}
                </p>
              )}
            </div>

            {liveOpen && (
              <LiveHostPanel
                host={host}
                gameContext={liveContextSummary}
                onClose={onToggleLive}
              />
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
