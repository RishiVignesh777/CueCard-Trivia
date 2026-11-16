interface PauseModalProps {
  score: number;
  questionIndex: number;
  totalQuestions: number;
  onResume: () => void;
  onRestart: () => void;
  onExitToTitle: () => void;
}

export function PauseModal({
  score,
  questionIndex,
  totalQuestions,
  onResume,
  onRestart,
  onExitToTitle,
}: PauseModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-modal-title"
      className="fixed inset-0 z-50 bg-[#050811]/85 flex items-center justify-center p-4"
    >
      <div className="w-full max-w-md rounded-2xl bg-[#131B2E] border border-white/15 p-6 sm:p-7 space-y-6">
        <div className="space-y-1.5">
          <h2
            id="pause-modal-title"
            className="font-display text-2xl font-bold text-white"
          >
            Show Paused
          </h2>
          <p className="text-sm text-slate-300">
            Timer is frozen. Resume whenever you are ready to step back under the lights.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-[#0D1322] border border-white/10 p-3.5">
            <div className="text-[11px] uppercase tracking-wider text-slate-400">
              Current Score
            </div>
            <div className="font-mono-tabular text-xl font-bold text-amber-400 mt-1">
              {Math.round(score)}
            </div>
          </div>
          <div className="rounded-xl bg-[#0D1322] border border-white/10 p-3.5">
            <div className="text-[11px] uppercase tracking-wider text-slate-400">
              Progress
            </div>
            <div className="font-mono-tabular text-xl font-bold text-white mt-1">
              {questionIndex + 1} / {totalQuestions}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onResume}
            className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-bold transition-colors cursor-pointer"
          >
            Resume Show
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="w-full py-2.5 px-4 rounded-xl bg-[#1C2640] hover:bg-[#243152] border border-white/10 text-slate-100 text-sm font-semibold transition-colors cursor-pointer"
          >
            Restart Round
          </button>
          <button
            type="button"
            onClick={onExitToTitle}
            className="w-full py-2.5 px-4 rounded-xl bg-transparent hover:bg-white/5 border border-white/10 text-slate-300 text-sm font-medium transition-colors cursor-pointer"
          >
            Change Host &amp; Topic
          </button>
        </div>
      </div>
    </div>
  );
}
