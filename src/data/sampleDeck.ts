import { TriviaQuestion } from '../types/trivia';

export const SAMPLE_DECK: TriviaQuestion[] = [
  {
    id: 'sample-1',
    category: 'Science & Space Discoveries',
    difficulty: 'standard',
    question:
      'Which spacecraft performed the closest human-made flyby of the Sun’s corona in December 2024, surviving temperatures near 980°C?',
    options: [
      'ESA Solar Orbiter',
      'NASA Parker Solar Probe',
      'Voyager 1 Interstellar Probe',
      'James Webb Space Telescope',
    ],
    correctIndex: 1,
    explanation:
      'NASA’s Parker Solar Probe dipped within 3.8 million miles of the solar surface on December 24, 2024, protected by its carbon-composite heat shield.',
    hostIntroLine:
      'We open tonight dangerously close to a star. <breath> Which robotic daredevil brushed the Sun’s outer atmosphere at record speed?',
    hostCorrectLine:
      'Spot on! <laugh> Parker Solar Probe clocked roughly 430,000 miles per hour on that pass.',
    hostWrongLine:
      'Not quite—our thermal shield belongs to NASA’s Parker Solar Probe, skimming right through the solar corona.',
    sources: [
      {
        title: 'NASA — Parker Solar Probe Makes History With Closest Pass to Sun',
        uri: 'https://science.nasa.gov/mission/parker-solar-probe/',
      },
    ],
  },
  {
    id: 'sample-2',
    category: 'World History & Civilizations',
    difficulty: 'standard',
    question:
      'The ancient city of Petra, famous for facades carved directly into rose-red sandstone cliffs, lies in which modern country?',
    options: ['Morocco', 'Jordan', 'Oman', 'Lebanon'],
    correctIndex: 1,
    explanation:
      'Petra was the thriving capital of the Nabataean Kingdom in southern Jordan, engineered with ingenious flash-flood dams and cisterns.',
    hostIntroLine:
      'Let us trade starlight for rose-red stone. <breath> Where would a traveler walk through the narrow Siq canyon to find Petra?',
    hostCorrectLine:
      'Well navigated! Southern Jordan holds the Nabataean jewel—and their hydraulic engineering was centuries ahead of its time.',
    hostWrongLine:
      'A detour off the caravan route—Petra sits in southern Jordan, carved by the Nabataeans.',
    sources: [
      {
        title: 'UNESCO World Heritage Centre — Petra',
        uri: 'https://whc.unesco.org/en/list/326/',
      },
    ],
  },
  {
    id: 'sample-3',
    category: 'Cinema, Music & Arts',
    difficulty: 'standard',
    question:
      'Which 1994 film won the Palme d’Or at Cannes and famously structured its chapters out of chronological order?',
    options: [
      'The Shawshank Redemption',
      'Pulp Fiction',
      'Chungking Express',
      'Forrest Gump',
    ],
    correctIndex: 1,
    explanation:
      'Quentin Tarantino’s Pulp Fiction took home the 1994 Palme d’Or and reshaped independent cinema with its interlocking, non-linear narrative.',
    hostIntroLine:
      'Cue the briefcase glow and a diner booth in Los Angeles. Which 1994 classic scrambled its timeline straight to Cannes glory?',
    hostCorrectLine:
      'Clean hit! <laugh> Pulp Fiction won the Palme d’Or before ever hitting wide theatrical release.',
    hostWrongLine:
      'Swing and a miss—the jury on the Croisette handed the 1994 Palme d’Or to Pulp Fiction.',
    sources: [
      {
        title: 'Festival de Cannes — 1994 Awards Archive',
        uri: 'https://www.festival-cannes.com/en/f/pulp-fiction/',
      },
    ],
  },
  {
    id: 'sample-4',
    category: 'Technology & Computing',
    difficulty: 'standard',
    question:
      'In color theory and digital displays, why do OLED screens achieve near-infinite contrast ratios compared to standard backlit LCD panels?',
    options: [
      'They refresh pixels at 1,000 Hz',
      'Each pixel emits its own light and can switch completely off',
      'They project light through liquid mercury prisms',
      'They double the subpixel resolution for black hues',
    ],
    correctIndex: 1,
    explanation:
      'Organic Light-Emitting Diode pixels are self-emissive—turning off individual diodes produces true zero-nit black beside bright highlights.',
    hostIntroLine:
      'Time for a sharp look at the screen right in front of you. Why do OLED blacks look bottomless?',
    hostCorrectLine:
      'Precision answer! When an OLED pixel wants black, it simply cuts the current altogether.',
    hostWrongLine:
      'Dim the stage lights—the secret is self-emissive pixels that switch completely off for true black.',
    sources: [
      {
        title: 'Britannica — Organic Light-Emitting Diode (OLED)',
        uri: 'https://www.britannica.com/technology/organic-light-emitting-diode',
      },
    ],
  },
  {
    id: 'sample-5',
    category: 'Sports & Championship Lore',
    difficulty: 'standard',
    question:
      'Which Grand Slam tennis tournament is the only major still played on natural grass courts?',
    options: [
      'Australian Open',
      'Roland-Garros (French Open)',
      'Wimbledon',
      'US Open',
    ],
    correctIndex: 2,
    explanation:
      'Since 1877, The Championships at Wimbledon in London have been contested exclusively on meticulously trimmed perennial ryegrass.',
    hostIntroLine:
      'Final round on the scoreboard. <gasp> Where do championship rallies still kick up chalk and fresh London turf?',
    hostCorrectLine:
      'Game, set, and match! Wimbledon has stayed loyal to grass since 1877.',
    hostWrongLine:
      'Out wide by a fraction—Wimbledon in southwest London is the lone surviving grass-court major.',
    sources: [
      {
        title: 'The Championships, Wimbledon — Grass Courts',
        uri: 'https://www.wimbledon.com/en_GB/atoz/grass_courts.html',
      },
    ],
  },
];
