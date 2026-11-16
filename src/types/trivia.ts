export type HostVoiceName = 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';

export type Difficulty = 'casual' | 'standard' | 'expert';

export type GameState = 'title' | 'loading' | 'playing' | 'paused' | 'gameover';

export interface HostPersona {
  id: string;
  name: string;
  shortName: string;
  roleTitle: string;
  tagline: string;
  portraitUrl: string;
  voiceName: HostVoiceName;
  ttsStyle: string;
  systemInstruction: string;
  sampleGreeting: string;
  isCustom?: boolean;
}

export interface CustomHostInput {
  name: string;
  roleTitle: string;
  personalityPrompt: string;
  ttsStyle: string;
  voiceName: HostVoiceName;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface TriviaQuestion {
  id: string;
  category: string;
  difficulty: Difficulty;
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
  hostIntroLine: string;
  hostCorrectLine: string;
  hostWrongLine: string;
  sources: GroundingSource[];
}

export interface TriviaAnswerRecord {
  questionId: string;
  selectedIndex: number | null;
  isCorrect: boolean;
  pointsEarned: number;
  timeSpentSec: number;
  timedOut: boolean;
}

export interface ShowSummary {
  totalScore: number;
  correctCount: number;
  totalQuestions: number;
  accuracyPercent: number;
  bestStreak: number;
  averageTimeSec: number;
  gradeTitle: string;
}

export interface LiveTranscriptItem {
  id: string;
  speaker: 'user' | 'host' | 'system';
  text: string;
  timestamp: number;
}
