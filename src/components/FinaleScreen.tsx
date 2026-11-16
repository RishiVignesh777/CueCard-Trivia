import { useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  Radio,
  RotateCcw,
  Volume2,
  XCircle,
} from 'lucide-react';
import { computeShowSummary, stripTtsDirectives } from '../game/rules';
import {
  HostPersona,
  TriviaAnswerRecord,
  TriviaQuestion,
} from '../types/trivia';
import { HostAvatar } from './HostAvatar';
import { LiveHostPanel } from './LiveHostPanel';

interface FinaleScreenProps {
  host: HostPersona;
  questions: TriviaQuestion[];
  answers: TriviaAnswerRecord[];
  bestAllTimeScore: number;
  isHostSpeaking: boolean;
  onSpeakClosing: (closingText: string) => void;
  onPlayAgain: () => void;
  onReturnToSetup: () => void;
}

export function FinaleScreen({
  host,
  questions,
  answers,
  bestAllTimeScore,
  isHostSpeaking,
  onSpeakClosing,
  onPlayAgain,
  onReturnToSetup,
}: FinaleScreenProps) {
  const [livePostShowOpen, setLivePostShowOpen] = useState(false);
  const summary = computeShowSummary(questions, answers);

  const closingRemark =
    summary.accuracyPercent >= 80
      ? `Bravo! ${summary.correctCount} out of ${summary.totalQuestions} locked in for ${summary.totalScore} points. You made that look effortless.`
      : summary.accuracyPercent >= 50
        ? `A solid run under the studio lights—${summary.correctCount} of ${summary.totalQuestions} right and a top streak of ${summary.bestStreak}.`
        : `Rough night on the buzzer with ${summary.correctCount} of ${summary.totalQuestions}, though every sharp contestant starts somewhere.`;

  return (
    <main className="min-h-screen bg-[#0B101B] text-slate-100 py-10 px-4 sm:px-6">
      <div className="max-w-[1040px] mx-auto space-y-8">
        {/* Finale Header Card */}
        <section className="rounded-2xl bg-[#131B2E] border border-white/10 p-6 sm:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-amber-300">
                Final Broadcast Scorecard · {summary.gradeTitle}
              </div>
              <h1 className="font-display text-3xl sm:text-4xl font-bold text-white">
                Show Complete
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                data-start="true"
                onClick={onPlayAgain}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
                <span>Play Again</span>
              </button>
              <button
                type="button"
                onClick={onReturnToSetup}
                className="px-5 py-3 rounded-xl bg-[#1C2640] hover:bg-[#243152] border border-white/10 text-slate-100 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Change Host &amp; Topic
              </button>
            </div>
          </div>

          {/* 4 Tabular Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl bg-[#0D1322] border border-white/10 p-4">
              <div className="text-[11px] uppercase tracking-wider text-slate-400">
                Final Score
              </div>
              <div
                data-testid="final-score"
                className="font-mono-tabular text-2xl font-bold text-amber-400 mt-1"
              >
                {summary.totalScore}
              </div>
              <div className="text-xs text-slate-400 font-mono-tabular mt-1">
                Best: {bestAllTimeScore}
              </div>
            </div>

            <div className="rounded-xl bg-[#0D1322] border border-white/10 p-4">
              <div className="text-[11px] uppercase tracking-wider text-slate-400">
                Accuracy
              </div>
              <div className="font-mono-tabular text-2xl font-bold text-white mt-1">
                {summary.accuracyPercent}%
              </div>
              <div className="text-xs text-slate-400 font-mono-tabular mt-1">
                {summary.correctCount} / {summary.totalQuestions} correct
              </div>
            </div>

            <div className="rounded-xl bg-[#0D1322] border border-white/10 p-4">
              <div className="text-[11px] uppercase tracking-wider text-slate-400">
                Best Streak
              </div>
              <div className="font-mono-tabular text-2xl font-bold text-emerald-400 mt-1">
                {summary.bestStreak}x
              </div>
              <div className="text-xs text-slate-400 mt-1">Consecutive hits</div>
            </div>

            <div className="rounded-xl bg-[#0D1322] border border-white/10 p-4">
              <div className="text-[11px] uppercase tracking-wider text-slate-400">
                Avg Pace
              </div>
              <div className="font-mono-tabular text-2xl font-bold text-white mt-1">
                {summary.averageTimeSec}s
              </div>
              <div className="text-xs text-slate-400 mt-1">Per question</div>
            </div>
          </div>

          {/* Host Closing Remarks & Post-Show Live Interview */}
          <div className="rounded-xl bg-[#0D1322] border border-white/10 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4 min-w-0">
              <HostAvatar
                name={host.name}
                portraitUrl={host.portraitUrl}
                isSpeaking={isHostSpeaking}
                sizeClass="w-14 h-14"
                roundedClass="rounded-xl"
              />
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white">
                  {host.name}
                </div>
                <p className="text-sm text-slate-300 mt-1 leading-relaxed">
                  “{stripTtsDirectives(closingRemark)}”
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onSpeakClosing(closingRemark)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1C2640] hover:bg-[#243152] border border-white/10 text-xs font-semibold text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                <span>{isHostSpeaking ? 'Stop' : 'Hear Verdict'}</span>
              </button>

              <button
                type="button"
                onClick={() => setLivePostShowOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1C2640] hover:bg-[#243152] border border-white/10 text-xs font-semibold text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Radio className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                <span>{livePostShowOpen ? 'Close Mic' : 'Post-Show Chat'}</span>
              </button>
            </div>
          </div>

          {livePostShowOpen && (
            <LiveHostPanel
              host={host}
              gameContext={`Post-show interview! Contestant scored ${summary.totalScore} points with ${summary.correctCount}/${summary.totalQuestions} correct (${summary.accuracyPercent}%).`}
              onClose={() => setLivePostShowOpen(false)}
            />
          )}
        </section>

        {/* Round-by-Round Review */}
        <section aria-labelledby="round-review-heading" className="space-y-4">
          <h2 id="round-review-heading" className="font-display text-xl font-bold text-white">
            Round Breakdown &amp; Grounded Sources
          </h2>

          <div className="space-y-3">
            {questions.map((q, idx) => {
              const rec = answers[idx];
              const correctText = q.options[q.correctIndex];
              const chosenText =
                rec?.selectedIndex !== null && rec?.selectedIndex !== undefined
                  ? q.options[rec.selectedIndex]
                  : 'No answer (timed out)';

              return (
                <article
                  key={q.id}
                  className="rounded-xl bg-[#131B2E] border border-white/10 p-5 space-y-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs text-slate-400">
                      <span className="font-mono-tabular text-slate-300 font-semibold">
                        Q{idx + 1}
                      </span>
                      <span className="mx-1.5" aria-hidden="true">·</span>
                      <span>{q.category}</span>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                        rec?.isCorrect ? 'text-emerald-300' : 'text-red-300'
                      }`}
                    >
                      {rec?.isCorrect ? (
                        <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                      ) : (
                        <XCircle className="w-4 h-4" aria-hidden="true" />
                      )}
                      <span className="font-mono-tabular">
                        {rec?.isCorrect ? `+${rec.pointsEarned} pts` : '0 pts'}
                      </span>
                    </span>
                  </div>

                  <h3 className="text-base font-semibold text-white">
                    {q.question}
                  </h3>

                  <div className="text-xs text-slate-300 space-y-1">
                    <div>
                      <span className="text-slate-400">Your answer: </span>
                      <span className={rec?.isCorrect ? 'text-emerald-300' : 'text-red-300'}>
                        {chosenText}
                      </span>
                      {!rec?.isCorrect && (
                        <>
                          <span className="mx-2 text-slate-500">·</span>
                          <span className="text-slate-400">Correct: </span>
                          <span className="text-emerald-300">{correctText}</span>
                        </>
                      )}
                    </div>
                    <p className="text-slate-400 leading-relaxed pt-1">
                      {q.explanation}
                    </p>
                  </div>

                  {q.sources.length > 0 && (
                    <div className="flex flex-wrap gap-3 pt-1">
                      {q.sources.map((src) => (
                        <a
                          key={src.uri}
                          href={src.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-sky-300 hover:text-sky-200 underline underline-offset-2"
                        >
                          <span className="truncate max-w-[260px]">{src.title}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />
                        </a>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
