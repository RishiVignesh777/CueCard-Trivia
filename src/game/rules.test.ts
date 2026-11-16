import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculatePoints,
  computeShowSummary,
  getDifficultyVisualMeta,
  getNextStreak,
  parseTriviaResponseJson,
  sanitizeCustomTopic,
  stripTtsDirectives,
} from './rules';
import { buildCustomHost, HOST_PRESETS } from '../data/hosts';
import { SAMPLE_DECK } from '../data/sampleDeck';

test('calculatePoints awards zero on incorrect answers', () => {
  assert.equal(
    calculatePoints({
      isCorrect: false,
      streakBefore: 4,
      timeRemainingSec: 20,
      totalTimeSec: 24,
      difficulty: 'standard',
    }),
    0
  );
});

test('calculatePoints scales with difficulty, speed, and capped streak', () => {
  const fullSpeedCasual = calculatePoints({
    isCorrect: true,
    streakBefore: 0,
    timeRemainingSec: 30,
    totalTimeSec: 30,
    difficulty: 'casual',
  });
  assert.equal(fullSpeedCasual, 150); // 100 base + 50 speed

  const expertStreak = calculatePoints({
    isCorrect: true,
    streakBefore: 8, // caps at 5 -> +125
    timeRemainingSec: 9,
    totalTimeSec: 18,
    difficulty: 'expert',
  });
  assert.equal(expertStreak, 200 + 25 + 125); // 350
});

test('getNextStreak increments on correct and resets on wrong', () => {
  assert.equal(getNextStreak(0, true), 1);
  assert.equal(getNextStreak(3, true), 4);
  assert.equal(getNextStreak(4, false), 0);
});

test('computeShowSummary calculates score, accuracy, best streak, and average time', () => {
  const summary = computeShowSummary(SAMPLE_DECK, [
    { questionId: 'sample-1', selectedIndex: 1, isCorrect: true, pointsEarned: 180, timeSpentSec: 6, timedOut: false },
    { questionId: 'sample-2', selectedIndex: 1, isCorrect: true, pointsEarned: 200, timeSpentSec: 4, timedOut: false },
    { questionId: 'sample-3', selectedIndex: 0, isCorrect: false, pointsEarned: 0, timeSpentSec: 12, timedOut: false },
    { questionId: 'sample-4', selectedIndex: 1, isCorrect: true, pointsEarned: 170, timeSpentSec: 8, timedOut: false },
    { questionId: 'sample-5', selectedIndex: null, isCorrect: false, pointsEarned: 0, timeSpentSec: 24, timedOut: true },
  ]);

  assert.equal(summary.totalScore, 550);
  assert.equal(summary.correctCount, 3);
  assert.equal(summary.totalQuestions, 5);
  assert.equal(summary.accuracyPercent, 60);
  assert.equal(summary.bestStreak, 2);
  assert.equal(summary.averageTimeSec, 10.8);
  assert.equal(summary.gradeTitle, 'Sharp Challenger');
});

test('parseTriviaResponseJson handles fenced JSON and attaches grounding sources', () => {
  const raw = `\`\`\`json
  [
    {
      "category": "Space",
      "question": "Which moon has liquid methane lakes?",
      "options": ["Europa", "Titan", "Io", "Ganymede"],
      "correctIndex": 1,
      "explanation": "Titan features lakes of liquid hydrocarbons.",
      "hostIntroLine": "Look toward Saturn.",
      "hostCorrectLine": "Right on target.",
      "hostWrongLine": "Titan takes this one."
    }
  ]
  \`\`\``;

  const parsed = parseTriviaResponseJson(raw, 'Astronomy', 'expert', [
    { title: 'NASA Titan', uri: 'https://science.nasa.gov/saturn/moons/titan/' },
  ]);

  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].correctIndex, 1);
  assert.equal(parsed[0].difficulty, 'expert');
  assert.equal(parsed[0].sources.length, 1);
  assert.equal(parsed[0].sources[0].title, 'NASA Titan');
});

test('stripTtsDirectives cleans vocal tags for readable captions', () => {
  assert.equal(
    stripTtsDirectives('Welcome! <laugh> Let us begin. <breath> |yeah| Ready?'),
    'Welcome! Let us begin. yeah Ready?'
  );
});

test('buildCustomHost constructs valid persona and sanitizeCustomTopic trims whitespace', () => {
  assert.equal(sanitizeCustomTopic('   2026   Nobel   Prizes  '), '2026 Nobel Prizes');
  assert.equal(HOST_PRESETS.length, 4);
  const custom = buildCustomHost({
    name: 'Host Nova',
    roleTitle: 'Retro Synth Emcee',
    personalityPrompt: 'Speaks in upbeat analog studio metaphors.',
    ttsStyle: 'Warm 1980s FM radio host',
    voiceName: 'Zephyr',
  });
  assert.equal(custom.id, 'custom');
  assert.equal(custom.voiceName, 'Zephyr');
  assert.match(custom.systemInstruction, /Host Nova/);
});

test('getDifficultyVisualMeta maps casual, standard, and expert to distinct bars and tones', () => {
  assert.deepEqual(getDifficultyVisualMeta('casual'), {
    label: 'Casual',
    basePoints: 100,
    bars: 1,
    tone: 'emerald',
  });
  assert.deepEqual(getDifficultyVisualMeta('standard'), {
    label: 'Standard',
    basePoints: 150,
    bars: 2,
    tone: 'amber',
  });
  assert.deepEqual(getDifficultyVisualMeta('expert'), {
    label: 'Expert',
    basePoints: 200,
    bars: 3,
    tone: 'rose',
  });
});
