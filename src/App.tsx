import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  buildCustomHost,
  DEFAULT_CUSTOM_HOST,
  HOST_PRESETS,
  TOPIC_PRESETS,
} from './data/hosts';
import { SAMPLE_DECK } from './data/sampleDeck';
import {
  buildHostReaction,
  calculatePoints,
  DIFFICULTY_CONFIG,
  getNextStreak,
  sanitizeCustomTopic,
} from './game/rules';
import {
  CustomHostInput,
  Difficulty,
  GameState,
  GroundingSource,
  HostPersona,
  TriviaAnswerRecord,
  TriviaQuestion,
} from './types/trivia';
import { speakWithHostTts, stopHostSpeech } from './utils/audioTts';
import { soundFx } from './utils/soundFx';
import { FinaleScreen } from './components/FinaleScreen';
import { PauseModal } from './components/PauseModal';
import { TitleStage } from './components/TitleStage';
import { TriviaStage } from './components/TriviaStage';

const BEST_SCORE_STORAGE_KEY = 'cuecard_best_score_v1';

export default function App() {
  const [gameState, setGameState] = useState<GameState>('title');
  const [selectedHostId, setSelectedHostId] = useState<string>('arthur');
  const [customHostInput, setCustomHostInput] =
    useState<CustomHostInput>(DEFAULT_CUSTOM_HOST);
  const [topic, setTopic] = useState<string>(TOPIC_PRESETS[0]);
  const [difficulty, setDifficulty] = useState<Difficulty>('standard');
  const [questionCount, setQuestionCount] = useState<number>(5);

  const [questions, setQuestions] = useState<TriviaQuestion[]>(SAMPLE_DECK);
  const [questionIndex, setQuestionIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<TriviaAnswerRecord[]>([]);
  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [bestAllTimeScore, setBestAllTimeScore] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(BEST_SCORE_STORAGE_KEY);
      return saved ? Number(saved) || 0 : 0;
    } catch {
      return 0;
    }
  });

  const [timeRemainingSec, setTimeRemainingSec] = useState<number>(
    DIFFICULTY_CONFIG.standard.timerSec
  );
  const [currentAnswer, setCurrentAnswer] = useState<TriviaAnswerRecord | null>(null);
  const [hostDialogue, setHostDialogue] = useState<string>(
    SAMPLE_DECK[0].hostIntroLine
  );

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isHostSpeaking, setIsHostSpeaking] = useState<boolean>(false);
  const [ttsError, setTtsError] = useState<string | null>(null);
  const [autoVoice, setAutoVoice] = useState<boolean>(false);
  const [fxMuted, setFxMuted] = useState<boolean>(false);
  const [liveOpen, setLiveOpen] = useState<boolean>(false);
  const [deepDiveLoading, setDeepDiveLoading] = useState<boolean>(false);
  const [deepDiveSources, setDeepDiveSources] = useState<GroundingSource[]>([]);

  const activeHost: HostPersona = useMemo(() => {
    if (selectedHostId === 'custom') {
      return buildCustomHost(customHostInput);
    }
    return HOST_PRESETS.find((h) => h.id === selectedHostId) ?? HOST_PRESETS[0];
  }, [customHostInput, selectedHostId]);

  const totalTimeSec = DIFFICULTY_CONFIG[difficulty].timerSec;

  // Keep body data-state synchronized for deterministic state inspection
  useEffect(() => {
    const mapped =
      gameState === 'loading' ? 'title' : gameState;
    document.body.dataset.state = mapped;
  }, [gameState]);

  const speakLine = useCallback(
    (line: string, host: HostPersona) => {
      setTtsError(null);
      void speakWithHostTts({
        text: line,
        voiceName: host.voiceName,
        style: host.ttsStyle,
        onStart: () => setIsHostSpeaking(true),
        onEnd: () => setIsHostSpeaking(false),
        onError: (msg) => {
          setIsHostSpeaking(false);
          setTtsError(msg);
        },
      });
    },
    []
  );

  const beginShowWithDeck = useCallback(
    (deck: TriviaQuestion[], chosenDifficulty: Difficulty) => {
      stopHostSpeech();
      setIsHostSpeaking(false);
      setTtsError(null);
      setGenerationError(null);
      setQuestions(deck);
      setQuestionIndex(0);
      setAnswers([]);
      setScore(0);
      setStreak(0);
      setCurrentAnswer(null);
      setDeepDiveSources([]);
      const timer = DIFFICULTY_CONFIG[chosenDifficulty].timerSec;
      setTimeRemainingSec(timer);
      const openingLine = deck[0]?.hostIntroLine || activeHost.sampleGreeting;
      setHostDialogue(openingLine);
      setGameState('playing');
      soundFx.playStart();

      if (autoVoice) {
        speakLine(openingLine, activeHost);
      }
    },
    [activeHost, autoVoice, speakLine]
  );

  const handleStartSampleShow = useCallback(() => {
    const adapted = SAMPLE_DECK.map((q) => ({
      ...q,
      difficulty,
    }));
    beginShowWithDeck(adapted, difficulty);
  }, [beginShowWithDeck, difficulty]);

  const handleStartLiveShow = useCallback(async () => {
    const cleanTopic = sanitizeCustomTopic(topic) || TOPIC_PRESETS[0];
    setIsGenerating(true);
    setGenerationError(null);
    stopHostSpeech();

    try {
      const response = await fetch('/api/trivia/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: cleanTopic,
          difficulty,
          count: questionCount,
          host: {
            name: activeHost.name,
            roleTitle: activeHost.roleTitle,
            systemInstruction: activeHost.systemInstruction,
          },
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        questions?: TriviaQuestion[];
        error?: string;
      };

      if (!response.ok || !payload.questions?.length) {
        throw new Error(
          payload.error || 'Could not generate search-grounded trivia questions.'
        );
      }

      beginShowWithDeck(payload.questions, difficulty);
    } catch (err) {
      setGenerationError(
        err instanceof Error
          ? err.message
          : 'Failed to connect to Gemini trivia generator.'
      );
    } finally {
      setIsGenerating(false);
    }
  }, [activeHost, beginShowWithDeck, difficulty, questionCount, topic]);

  // Support ?autostart=1 query param for instant entry into active gameplay
  const autostartHandledRef = useRef(false);
  useEffect(() => {
    if (autostartHandledRef.current) return;
    autostartHandledRef.current = true;
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      handleStartSampleShow();
    }
  }, [handleStartSampleShow]);

  const lockAnswer = useCallback(
    (selectedIndex: number | null, timedOut: boolean) => {
      if (currentAnswer !== null || gameState !== 'playing') return;
      const q = questions[questionIndex];
      if (!q) return;

      const isCorrect =
        !timedOut && selectedIndex !== null && selectedIndex === q.correctIndex;
      const pointsEarned = calculatePoints({
        isCorrect,
        streakBefore: streak,
        timeRemainingSec,
        totalTimeSec,
        difficulty: q.difficulty,
      });
      const nextStreak = getNextStreak(streak, isCorrect);
      const timeSpentSec = Math.max(
        1,
        Math.round(totalTimeSec - timeRemainingSec)
      );

      const record: TriviaAnswerRecord = {
        questionId: q.id,
        selectedIndex,
        isCorrect,
        pointsEarned,
        timeSpentSec,
        timedOut,
      };

      setCurrentAnswer(record);
      setAnswers((prev) => [...prev, record]);
      setScore((prev) => prev + pointsEarned);
      setStreak(nextStreak);

      if (isCorrect) {
        soundFx.playCorrect();
      } else {
        soundFx.playWrong();
      }

      const reaction = buildHostReaction(
        activeHost,
        q,
        isCorrect,
        timedOut,
        nextStreak
      );
      setHostDialogue(reaction);
      if (autoVoice) {
        speakLine(reaction, activeHost);
      }
    },
    [
      activeHost,
      autoVoice,
      currentAnswer,
      gameState,
      questionIndex,
      questions,
      speakLine,
      streak,
      timeRemainingSec,
      totalTimeSec,
    ]
  );

  // Countdown timer during active unanswered question
  useEffect(() => {
    if (gameState !== 'playing' || currentAnswer !== null) return;

    const interval = window.setInterval(() => {
      setTimeRemainingSec((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          lockAnswer(null, true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [currentAnswer, gameState, lockAnswer]);

  const handleNextQuestion = useCallback(() => {
    stopHostSpeech();
    setIsHostSpeaking(false);
    setDeepDiveSources([]);

    if (questionIndex + 1 >= questions.length) {
      soundFx.playFinale();
      setBestAllTimeScore((prev) => {
        const nextBest = Math.max(prev, score);
        try {
          localStorage.setItem(BEST_SCORE_STORAGE_KEY, String(nextBest));
        } catch {
          // ignore storage errors
        }
        return nextBest;
      });
      setGameState('gameover');
      return;
    }

    const nextIdx = questionIndex + 1;
    const nextQ = questions[nextIdx];
    setQuestionIndex(nextIdx);
    setCurrentAnswer(null);
    setTimeRemainingSec(DIFFICULTY_CONFIG[nextQ.difficulty].timerSec);
    setHostDialogue(nextQ.hostIntroLine);

    if (autoVoice) {
      speakLine(nextQ.hostIntroLine, activeHost);
    }
  }, [activeHost, autoVoice, questionIndex, questions, score, speakLine]);

  const handleAskDeepDive = useCallback(
    async (userPrompt: string) => {
      const q = questions[questionIndex];
      if (!q) return;
      setDeepDiveLoading(true);
      try {
        const response = await fetch('/api/trivia/banter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: q.question,
            correctOption: q.options[q.correctIndex],
            userPrompt,
            host: {
              name: activeHost.name,
              systemInstruction: activeHost.systemInstruction,
            },
          }),
        });
        const payload = (await response.json().catch(() => ({}))) as {
          reply?: string;
          sources?: GroundingSource[];
          error?: string;
        };
        if (!response.ok || !payload.reply) {
          throw new Error(payload.error || 'Could not fetch fact-check deep dive.');
        }
        setHostDialogue(payload.reply);
        if (payload.sources?.length) {
          setDeepDiveSources(payload.sources);
        }
        if (autoVoice) {
          speakLine(payload.reply, activeHost);
        }
      } catch (err) {
        setTtsError(
          err instanceof Error ? err.message : 'Unable to reach host fact-check.'
        );
      } finally {
        setDeepDiveLoading(false);
      }
    },
    [activeHost, autoVoice, questionIndex, questions, speakLine]
  );

  const handleToggleFxMute = useCallback(() => {
    setFxMuted((prev) => {
      const next = !prev;
      soundFx.muted = next;
      return next;
    });
  }, []);

  const handleToggleAutoVoice = useCallback(() => {
    setAutoVoice((prev) => {
      const next = !prev;
      if (!next) {
        stopHostSpeech();
        setIsHostSpeaking(false);
      }
      return next;
    });
  }, []);

  // Keyboard shortcuts across title, playing, and paused states
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT';

      if (isTyping) return;

      if (gameState === 'title') {
        if ((e.key === 'Enter' || e.key === ' ') && !isGenerating) {
          e.preventDefault();
          void handleStartLiveShow();
        }
        return;
      }

      if (gameState === 'playing') {
        if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
          e.preventDefault();
          stopHostSpeech();
          setIsHostSpeaking(false);
          setGameState('paused');
          return;
        }
        if (e.key.toLowerCase() === 'm') {
          e.preventDefault();
          handleToggleFxMute();
          return;
        }
        if (e.key.toLowerCase() === 'v') {
          e.preventDefault();
          handleToggleAutoVoice();
          return;
        }
        if (e.key.toLowerCase() === 't') {
          e.preventDefault();
          setLiveOpen((v) => !v);
          return;
        }
        if (currentAnswer === null && ['1', '2', '3', '4'].includes(e.key)) {
          e.preventDefault();
          soundFx.playSelect();
          lockAnswer(Number(e.key) - 1, false);
          return;
        }
        if (currentAnswer !== null && e.key === 'Enter') {
          e.preventDefault();
          handleNextQuestion();
        }
        return;
      }

      if (gameState === 'paused') {
        if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
          e.preventDefault();
          setGameState('playing');
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    currentAnswer,
    gameState,
    handleNextQuestion,
    handleStartLiveShow,
    handleToggleAutoVoice,
    handleToggleFxMute,
    isGenerating,
    lockAnswer,
  ]);

  if (gameState === 'title' || gameState === 'loading') {
    return (
      <TitleStage
        selectedHostId={selectedHostId}
        activeHost={activeHost}
        customHostInput={customHostInput}
        topic={topic}
        difficulty={difficulty}
        questionCount={questionCount}
        isGenerating={isGenerating}
        generationError={generationError}
        isSpeakingPreview={isHostSpeaking}
        ttsError={ttsError}
        onSelectHostId={(id) => {
          stopHostSpeech();
          setIsHostSpeaking(false);
          setTtsError(null);
          setSelectedHostId(id);
        }}
        onUpdateCustomHost={setCustomHostInput}
        onChangeTopic={setTopic}
        onChangeDifficulty={setDifficulty}
        onChangeQuestionCount={setQuestionCount}
        onPreviewHostVoice={() => {
          if (isHostSpeaking) {
            stopHostSpeech();
            setIsHostSpeaking(false);
          } else {
            speakLine(activeHost.sampleGreeting, activeHost);
          }
        }}
        onStartLiveShow={() => void handleStartLiveShow()}
        onStartSampleShow={handleStartSampleShow}
      />
    );
  }

  if (gameState === 'gameover') {
    return (
      <FinaleScreen
        host={activeHost}
        questions={questions}
        answers={answers}
        bestAllTimeScore={bestAllTimeScore}
        isHostSpeaking={isHostSpeaking}
        onSpeakClosing={(closingText) => {
          if (isHostSpeaking) {
            stopHostSpeech();
            setIsHostSpeaking(false);
          } else {
            speakLine(closingText, activeHost);
          }
        }}
        onPlayAgain={() => beginShowWithDeck(questions, difficulty)}
        onReturnToSetup={() => {
          stopHostSpeech();
          setIsHostSpeaking(false);
          setLiveOpen(false);
          setGameState('title');
        }}
      />
    );
  }

  return (
    <>
      <TriviaStage
        host={activeHost}
        questions={questions}
        questionIndex={questionIndex}
        score={score}
        streak={streak}
        timeRemainingSec={timeRemainingSec}
        totalTimeSec={totalTimeSec}
        currentAnswer={currentAnswer}
        hostDialogue={hostDialogue}
        isHostSpeaking={isHostSpeaking}
        ttsError={ttsError}
        autoVoice={autoVoice}
        fxMuted={fxMuted}
        liveOpen={liveOpen}
        deepDiveLoading={deepDiveLoading}
        deepDiveSources={deepDiveSources}
        onSelectOption={(idx) => {
          soundFx.playSelect();
          lockAnswer(idx, false);
        }}
        onNextQuestion={handleNextQuestion}
        onReplayHostVoice={() => {
          if (isHostSpeaking) {
            stopHostSpeech();
            setIsHostSpeaking(false);
          } else {
            speakLine(hostDialogue, activeHost);
          }
        }}
        onAskDeepDive={(promptText) => void handleAskDeepDive(promptText)}
        onToggleAutoVoice={handleToggleAutoVoice}
        onToggleLive={() => setLiveOpen((v) => !v)}
        onToggleFxMute={handleToggleFxMute}
        onPause={() => {
          stopHostSpeech();
          setIsHostSpeaking(false);
          setGameState('paused');
        }}
      />

      {gameState === 'paused' && (
        <PauseModal
          score={score}
          questionIndex={questionIndex}
          totalQuestions={questions.length}
          onResume={() => setGameState('playing')}
          onRestart={() => beginShowWithDeck(questions, difficulty)}
          onExitToTitle={() => {
            stopHostSpeech();
            setIsHostSpeaking(false);
            setLiveOpen(false);
            setGameState('title');
          }}
        />
      )}
    </>
  );
}
