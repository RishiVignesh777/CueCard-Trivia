import {
  Difficulty,
  GroundingSource,
  HostPersona,
  ShowSummary,
  TriviaAnswerRecord,
  TriviaQuestion,
} from '../types/trivia';

export const DIFFICULTY_CONFIG: Record<
  Difficulty,
  { label: string; basePoints: number; timerSec: number; description: string }
> = {
  casual: {
    label: 'Casual',
    basePoints: 100,
    timerSec: 30,
    description: 'Approachable prompts, 30s clock',
  },
  standard: {
    label: 'Standard',
    basePoints: 150,
    timerSec: 24,
    description: 'Broadcast-grade challenge, 24s clock',
  },
  expert: {
    label: 'Expert',
    basePoints: 200,
    timerSec: 18,
    description: 'Deep cuts, rapid 18s clock',
  },
};

export function getDifficultyVisualMeta(difficulty: Difficulty): {
  label: string;
  basePoints: number;
  bars: 1 | 2 | 3;
  tone: 'emerald' | 'amber' | 'rose';
} {
  const cfg = DIFFICULTY_CONFIG[difficulty] ?? DIFFICULTY_CONFIG.standard;
  if (difficulty === 'casual') {
    return { label: cfg.label, basePoints: cfg.basePoints, bars: 1, tone: 'emerald' };
  }
  if (difficulty === 'expert') {
    return { label: cfg.label, basePoints: cfg.basePoints, bars: 3, tone: 'rose' };
  }
  return { label: cfg.label, basePoints: cfg.basePoints, bars: 2, tone: 'amber' };
}

export function calculatePoints(params: {
  isCorrect: boolean;
  streakBefore: number;
  timeRemainingSec: number;
  totalTimeSec: number;
  difficulty: Difficulty;
}): number {
  const { isCorrect, streakBefore, timeRemainingSec, totalTimeSec, difficulty } = params;
  if (!isCorrect) {
    return 0;
  }

  const base = DIFFICULTY_CONFIG[difficulty].basePoints;
  const clampedTotal = Math.max(1, totalTimeSec);
  const clampedRemaining = Math.max(0, Math.min(clampedTotal, timeRemainingSec));
  const speedRatio = clampedRemaining / clampedTotal;
  const speedBonus = Math.round(speedRatio * 50);
  const streakBonus = Math.min(streakBefore, 5) * 25;

  return Math.round(base + speedBonus + streakBonus);
}

export function getNextStreak(currentStreak: number, isCorrect: boolean): number {
  return isCorrect ? currentStreak + 1 : 0;
}

export function getGradeTitle(accuracyPercent: number): string {
  if (accuracyPercent >= 90) return 'Studio Legend';
  if (accuracyPercent >= 75) return 'Prime-Time Contender';
  if (accuracyPercent >= 50) return 'Sharp Challenger';
  if (accuracyPercent > 0) return 'Rising Wildcard';
  return 'Backstage Warm-Up';
}

export function computeShowSummary(
  questions: TriviaQuestion[],
  answers: TriviaAnswerRecord[]
): ShowSummary {
  const totalQuestions = questions.length;
  const totalScore = answers.reduce((sum, a) => sum + a.pointsEarned, 0);
  const correctCount = answers.filter((a) => a.isCorrect).length;
  const accuracyPercent =
    totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  let bestStreak = 0;
  let runningStreak = 0;
  for (const ans of answers) {
    if (ans.isCorrect) {
      runningStreak += 1;
      if (runningStreak > bestStreak) {
        bestStreak = runningStreak;
      }
    } else {
      runningStreak = 0;
    }
  }

  const totalTime = answers.reduce((sum, a) => sum + a.timeSpentSec, 0);
  const averageTimeSec =
    answers.length > 0 ? Number((totalTime / answers.length).toFixed(1)) : 0;

  return {
    totalScore,
    correctCount,
    totalQuestions,
    accuracyPercent,
    bestStreak,
    averageTimeSec,
    gradeTitle: getGradeTitle(accuracyPercent),
  };
}

export function buildHostReaction(
  host: HostPersona,
  question: TriviaQuestion,
  isCorrect: boolean,
  timedOut: boolean,
  newStreak: number
): string {
  if (timedOut) {
    return `${host.name}: Time ran out! ${question.hostWrongLine}`;
  }
  if (isCorrect) {
    const streakNote =
      newStreak >= 3 ? ` (${newStreak} in a row!)` : '';
    return `${question.hostCorrectLine}${streakNote}`;
  }
  return question.hostWrongLine;
}

export function sanitizeCustomTopic(topic: string): string {
  return topic.replace(/\s+/g, ' ').trim().slice(0, 120);
}

export function stripTtsDirectives(text: string): string {
  return text
    .replace(/<(laugh|gasp|breath|sigh|chuckle)>/gi, '')
    .replace(/\|(mhm|yeah|uh-huh|oh)\|/gi, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractJsonString(rawText: string): string {
  const trimmed = rawText.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch && fencedMatch[1]) {
    return fencedMatch[1].trim();
  }
  const firstBracket = trimmed.indexOf('[');
  const firstBrace = trimmed.indexOf('{');
  if (firstBracket === -1 && firstBrace === -1) {
    return trimmed;
  }
  const start =
    firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)
      ? firstBracket
      : firstBrace;
  const end =
    start === firstBracket ? trimmed.lastIndexOf(']') : trimmed.lastIndexOf('}');
  if (end > start) {
    return trimmed.slice(start, end + 1);
  }
  return trimmed;
}

export function parseTriviaResponseJson(
  rawText: string,
  fallbackCategory: string,
  fallbackDifficulty: Difficulty,
  sharedSources: GroundingSource[] = []
): TriviaQuestion[] {
  const jsonText = extractJsonString(rawText);
  const parsed: unknown = JSON.parse(jsonText);

  const rawItems: unknown[] = Array.isArray(parsed)
    ? parsed
    : typeof parsed === 'object' &&
        parsed !== null &&
        Array.isArray((parsed as { questions?: unknown[] }).questions)
      ? (parsed as { questions: unknown[] }).questions
      : [];

  if (rawItems.length === 0) {
    throw new Error('No trivia questions found in model response.');
  }

  return rawItems.map((item, idx) => {
    const record = (typeof item === 'object' && item !== null ? item : {}) as Record<
      string,
      unknown
    >;

    const rawOptions = Array.isArray(record.options)
      ? record.options.map((opt) => String(opt).trim()).filter(Boolean)
      : [];

    const normalizedOptions: [string, string, string, string] = [
      rawOptions[0] || 'Option A',
      rawOptions[1] || 'Option B',
      rawOptions[2] || 'Option C',
      rawOptions[3] || 'Option D',
    ];

    const rawIndex =
      typeof record.correctIndex === 'number' ? Math.round(record.correctIndex) : 0;
    const correctIndex = Math.max(0, Math.min(3, rawIndex));

    return {
      id: `q-${Date.now()}-${idx + 1}`,
      category:
        typeof record.category === 'string' && record.category.trim()
          ? record.category.trim()
          : fallbackCategory,
      difficulty: fallbackDifficulty,
      question:
        typeof record.question === 'string' && record.question.trim()
          ? record.question.trim()
          : `Question ${idx + 1}`,
      options: normalizedOptions,
      correctIndex,
      explanation:
        typeof record.explanation === 'string' && record.explanation.trim()
          ? record.explanation.trim()
          : 'Verified via Google Search grounding.',
      hostIntroLine:
        typeof record.hostIntroLine === 'string' && record.hostIntroLine.trim()
          ? record.hostIntroLine.trim()
          : 'Let us examine the next prompt on the board.',
      hostCorrectLine:
        typeof record.hostCorrectLine === 'string' && record.hostCorrectLine.trim()
          ? record.hostCorrectLine.trim()
          : 'Nicely played—point secured.',
      hostWrongLine:
        typeof record.hostWrongLine === 'string' && record.hostWrongLine.trim()
          ? record.hostWrongLine.trim()
          : 'Close, though the facts point elsewhere this round.',
      sources: sharedSources,
    };
  });
}
