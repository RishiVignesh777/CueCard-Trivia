import 'dotenv/config';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { Request, Response } from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, LiveServerMessage, Modality, Type } from '@google/genai';
import { parseTriviaResponseJson } from './src/game/rules.ts';
import type { Difficulty, GroundingSource, HostVoiceName } from './src/types/trivia.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ALLOWED_VOICES: HostVoiceName[] = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];

function normalizeVoice(voice: unknown): HostVoiceName {
  if (typeof voice === 'string' && ALLOWED_VOICES.includes(voice as HostVoiceName)) {
    return voice as HostVoiceName;
  }
  return 'Charon';
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in the server environment.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function extractGroundingSources(response: {
  candidates?: Array<{
    groundingMetadata?: {
      groundingChunks?: Array<{
        web?: { uri?: string; title?: string };
      }>;
    };
  }>;
}): GroundingSource[] {
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const seen = new Set<string>();
  const sources: GroundingSource[] = [];

  for (const chunk of chunks) {
    const uri = chunk.web?.uri?.trim();
    if (!uri || seen.has(uri)) continue;
    seen.add(uri);
    sources.push({
      title: chunk.web?.title?.trim() || uri,
      uri,
    });
  }

  return sources.slice(0, 6);
}

function formatApiError(err: unknown): { status: number; message: string } {
  const rawMessage = err instanceof Error ? err.message : String(err);
  if (rawMessage.includes('GEMINI_API_KEY')) {
    return { status: 503, message: rawMessage };
  }
  if (rawMessage.includes('429') || rawMessage.includes('RESOURCE_EXHAUSTED')) {
    return {
      status: 429,
      message: 'Gemini API rate limit reached. Please wait a moment and try again.',
    };
  }
  if (rawMessage.includes('403') || rawMessage.includes('PERMISSION_DENIED')) {
    return {
      status: 403,
      message: 'Gemini API key permission denied. Check your API key in Settings > Secrets.',
    };
  }
  return {
    status: 500,
    message: rawMessage || 'Unexpected server error communicating with Gemini.',
  };
}

async function createAppServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    });
  });

  app.post('/api/trivia/generate', async (req: Request, res: Response) => {
    try {
      const {
        topic = '2026 World Events & Culture',
        difficulty = 'standard',
        count = 5,
        host = {
          name: 'Arthur Pendelton',
          roleTitle: 'Quizmaster',
          systemInstruction: 'You are a witty trivia game show host.',
        },
      } = req.body ?? {};

      const cleanTopic = String(topic).trim() || '2026 World Events & Culture';
      const cleanDifficulty: Difficulty =
        difficulty === 'casual' || difficulty === 'expert' ? difficulty : 'standard';
      const cleanCount = Math.max(3, Math.min(10, Number(count) || 5));

      const ai = getGeminiClient();

      const prompt = [
        `Create ${cleanCount} multiple-choice trivia questions on the topic: "${cleanTopic}".`,
        `Difficulty level: ${cleanDifficulty}.`,
        `Today's date is ${new Date().toISOString().slice(0, 10)}. Use Google Search grounding to verify facts, especially recent events, records, winners, releases, and scientific discoveries.`,
        `For each question, write host lines strictly in the persona of ${host.name} (${host.roleTitle}):`,
        `- hostIntroLine: 1-2 engaging sentences introducing the question before options are read (may include subtle <breath>, <laugh>, or <gasp> tags for TTS expression).`,
        `- hostCorrectLine: 1 punchy reaction line when the player gets it right.`,
        `- hostWrongLine: 1 punchy reaction line when the player misses it.`,
        `Ensure every question has exactly 4 distinct plausible options and 1 unambiguously verified correctIndex (0-3).`,
        `Return ONLY a JSON array of question objects.`,
      ].join('\n');

      const responseSchema = {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
            question: { type: Type.STRING },
            options: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            correctIndex: { type: Type.INTEGER },
            explanation: { type: Type.STRING },
            hostIntroLine: { type: Type.STRING },
            hostCorrectLine: { type: Type.STRING },
            hostWrongLine: { type: Type.STRING },
          },
          required: [
            'category',
            'question',
            'options',
            'correctIndex',
            'explanation',
            'hostIntroLine',
            'hostCorrectLine',
            'hostWrongLine',
          ],
        },
      };

      let response;
      try {
        response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: prompt,
          config: {
            systemInstruction: `${host.systemInstruction}\nAlways output valid JSON matching the requested schema.`,
            tools: [{ googleSearch: {} }],
            responseMimeType: 'application/json',
            responseSchema,
          },
        });
      } catch (schemaErr) {
        const msg = schemaErr instanceof Error ? schemaErr.message : '';
        if (msg.includes('400') || msg.includes('INVALID_ARGUMENT')) {
          response = await ai.models.generateContent({
            model: 'gemini-4-hydrogen',
            contents: `${prompt}\nRespond strictly with a valid JSON array with keys: category, question, options (4 strings), correctIndex (0-3), explanation, hostIntroLine, hostCorrectLine, hostWrongLine.`,
            config: {
              systemInstruction: host.systemInstruction,
              tools: [{ googleSearch: {} }],
            },
          });
        } else {
          throw schemaErr;
        }
      }

      const rawText = response.text ?? '';
      const sources = extractGroundingSources(response);
      const questions = parseTriviaResponseJson(
        rawText,
        cleanTopic,
        cleanDifficulty,
        sources
      );

      res.json({ questions, sources });
    } catch (err) {
      const { status, message } = formatApiError(err);
      res.status(status).json({ error: message });
    }
  });

  app.post('/api/trivia/banter', async (req: Request, res: Response) => {
    try {
      const {
        question = '',
        correctOption = '',
        userPrompt = 'Give me the deeper story behind this answer.',
        host = {
          name: 'Arthur Pendelton',
          systemInstruction: 'You are a witty trivia game show host.',
        },
      } = req.body ?? {};

      const ai = getGeminiClient();

      const prompt = [
        `Trivia Question: ${question}`,
        `Verified Answer: ${correctOption}`,
        `Contestant asks: "${userPrompt}"`,
        `Use Google Search to verify any latest context if relevant, and reply in character in 2-3 vivid sentences.`,
      ].join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction: host.systemInstruction,
          tools: [{ googleSearch: {} }],
        },
      });

      const sources = extractGroundingSources(response);
      res.json({
        reply: response.text?.trim() || 'That fact holds up cleanly on the record.',
        sources,
      });
    } catch (err) {
      const { status, message } = formatApiError(err);
      res.status(status).json({ error: message });
    }
  });

  app.post('/api/tts', async (req: Request, res: Response) => {
    try {
      const { text, voiceName, style } = req.body ?? {};
      const cleanText = typeof text === 'string' ? text.trim() : '';
      if (!cleanText) {
        res.status(400).json({ error: 'Text is required for speech synthesis.' });
        return;
      }

      const ai = getGeminiClient();
      const chosenVoice = normalizeVoice(voiceName);
      const chosenStyle =
        typeof style === 'string' && style.trim()
          ? style.trim()
          : 'Articulate, charismatic television trivia host';

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: cleanText,
                speechMetadata: {
                  style: chosenStyle,
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: chosenVoice,
              },
            },
          },
        },
      });

      const part = response.candidates?.[0]?.content?.parts?.[0];
      const base64Audio = part?.inlineData?.data;
      if (!base64Audio) {
        throw new Error('TTS model returned no audio payload.');
      }

      res.json({
        audioBase64: base64Audio,
        mimeType: part?.inlineData?.mimeType || 'audio/wav',
      });
    } catch (err) {
      const { status, message } = formatApiError(err);
      res.status(status).json({ error: message });
    }
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/api/live' });

  wss.on('connection', (clientWs: WebSocket) => {
    let liveSession: Awaited<ReturnType<GoogleGenAI['live']['connect']>> | null = null;
    let isClosing = false;

    const sendToClient = (payload: Record<string, unknown>) => {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify(payload));
      }
    };

    clientWs.on('message', async (rawData) => {
      try {
        const msg = JSON.parse(rawData.toString()) as {
          type?: string;
          data?: string;
          text?: string;
          hostName?: string;
          systemInstruction?: string;
          voiceName?: HostVoiceName;
          gameContext?: string;
          context?: string;
        };

        if (msg.type === 'setup') {
          if (liveSession) {
            try {
              liveSession.close();
            } catch {
              // ignore
            }
            liveSession = null;
          }

          const ai = getGeminiClient();
          const chosenVoice = normalizeVoice(msg.voiceName);
          const fullInstruction = [
            msg.systemInstruction || 'You are a charismatic AI trivia game show host.',
            'You are speaking live on stage with the contestant via real-time voice.',
            'Keep spoken turns crisp, natural, and conversational (1-3 sentences).',
            'If a question is currently active on stage, never blurt out the correct answer directly unless the round has already been revealed—offer witty encouragement or a subtle clue instead.',
            msg.gameContext ? `Current Stage Context:\n${msg.gameContext}` : '',
          ]
            .filter(Boolean)
            .join('\n\n');

          liveSession = await ai.live.connect({
            model: 'gemini-3.8-live',
            config: {
              responseModalities: [Modality.AUDIO],
              inputAudioTranscription: {},
              outputAudioTranscription: {},
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: chosenVoice },
                },
              },
              systemInstruction: fullInstruction,
            },
            callbacks: {
              onopen: () => {
                sendToClient({ type: 'ready' });
              },
              onmessage: (message: LiveServerMessage) => {
                const content = message.serverContent;
                if (content?.inputTranscription?.text) {
                  sendToClient({
                    type: 'inputTranscript',
                    text: content.inputTranscription.text,
                  });
                }
                if (content?.outputTranscription?.text) {
                  sendToClient({
                    type: 'outputTranscript',
                    text: content.outputTranscription.text,
                  });
                }
                for (const part of content?.modelTurn?.parts ?? []) {
                  if (part.inlineData?.data) {
                    sendToClient({
                      type: 'audio',
                      data: part.inlineData.data,
                    });
                  }
                }
                if (content?.interrupted) {
                  sendToClient({ type: 'interrupted' });
                }
                if (content?.turnComplete) {
                  sendToClient({ type: 'turnComplete' });
                }
              },
              onerror: (e: { message?: string }) => {
                sendToClient({
                  type: 'error',
                  message: e?.message || 'Live API connection error.',
                });
              },
              onclose: () => {
                if (!isClosing) {
                  sendToClient({ type: 'closed' });
                }
              },
            },
          });
          return;
        }

        if (!liveSession) return;

        if (msg.type === 'audio' && msg.data) {
          liveSession.sendRealtimeInput({
            audio: {
              data: msg.data,
              mimeType: 'audio/pcm;rate=16000',
            },
          });
        } else if (msg.type === 'text' && msg.text) {
          liveSession.sendClientContent({
            turns: [{ role: 'user', parts: [{ text: msg.text }] }],
            turnComplete: true,
          });
        } else if (msg.type === 'context' && msg.context) {
          liveSession.sendClientContent({
            turns: [
              {
                role: 'user',
                parts: [
                  {
                    text: `[STAGE UPDATE FOR HOST AWARENESS]: ${msg.context}`,
                  },
                ],
              },
            ],
            turnComplete: false,
          });
        }
      } catch (err) {
        const { message } = formatApiError(err);
        sendToClient({ type: 'error', message });
      }
    });

    clientWs.on('close', () => {
      isClosing = true;
      if (liveSession) {
        try {
          liveSession.close();
        } catch {
          // ignore
        }
        liveSession = null;
      }
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  server.listen(port, '0.0.0.0', () => {
    console.log(`CueCard Trivia server listening on http://localhost:${port}`);
  });
}

createAppServer().catch((err) => {
  console.error('Failed to start CueCard Trivia server:', err);
  process.exit(1);
});
