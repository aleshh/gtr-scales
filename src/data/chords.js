const CHORD_COMPLEXITY_OPTIONS = [
  { id: 'triads', label: 'Triads' },
  { id: 'sevenths', label: '7th Chords' },
  { id: 'extended', label: 'Extended' },
  { id: 'advanced', label: 'Advanced' },
]

const PLAYABILITY_OPTIONS = [
  { id: 'easy', label: 'Easy' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'full', label: 'Full Fretboard' },
  { id: 'jazz', label: 'Jazz Voicings' },
]

const CHORD_QUALITIES = {
  maj: {
    id: 'maj',
    suffix: '',
    formula: '1  3  5',
    toneLabels: {
      0: '1',
      4: '3',
      7: '5',
    },
  },
  min: {
    id: 'min',
    suffix: 'm',
    formula: '1  b3  5',
    toneLabels: {
      0: '1',
      3: 'b3',
      7: '5',
    },
  },
  dim: {
    id: 'dim',
    suffix: 'dim',
    formula: '1  b3  b5',
    toneLabels: {
      0: '1',
      3: 'b3',
      6: 'b5',
    },
  },
  sus4: {
    id: 'sus4',
    suffix: 'sus4',
    formula: '1  4  5',
    toneLabels: {
      0: '1',
      5: '4',
      7: '5',
    },
  },
  six: {
    id: 'six',
    suffix: '6',
    formula: '1  3  5  6',
    toneLabels: {
      0: '1',
      4: '3',
      7: '5',
      9: '6',
    },
  },
  min6: {
    id: 'min6',
    suffix: 'm6',
    formula: '1  b3  5  6',
    toneLabels: {
      0: '1',
      3: 'b3',
      7: '5',
      9: '6',
    },
  },
  dominant7: {
    id: 'dominant7',
    suffix: '7',
    formula: '1  3  5  b7',
    toneLabels: {
      0: '1',
      4: '3',
      7: '5',
      10: 'b7',
    },
  },
  major7: {
    id: 'major7',
    suffix: 'maj7',
    formula: '1  3  5  7',
    toneLabels: {
      0: '1',
      4: '3',
      7: '5',
      11: '7',
    },
  },
  minor7: {
    id: 'minor7',
    suffix: 'm7',
    formula: '1  b3  5  b7',
    toneLabels: {
      0: '1',
      3: 'b3',
      7: '5',
      10: 'b7',
    },
  },
  minor7Flat5: {
    id: 'minor7Flat5',
    suffix: 'm7b5',
    formula: '1  b3  b5  b7',
    toneLabels: {
      0: '1',
      3: 'b3',
      6: 'b5',
      10: 'b7',
    },
  },
  diminished7: {
    id: 'diminished7',
    suffix: 'dim7',
    formula: '1  b3  b5  6',
    toneLabels: {
      0: '1',
      3: 'b3',
      6: 'b5',
      9: '6',
    },
  },
  dominant9: {
    id: 'dominant9',
    suffix: '9',
    formula: '1  3  5  b7  9',
    toneLabels: {
      0: '1',
      2: '9',
      4: '3',
      7: '5',
      10: 'b7',
    },
  },
  dominant7Sus4: {
    id: 'dominant7Sus4',
    suffix: '7sus4',
    formula: '1  4  5  b7',
    toneLabels: {
      0: '1',
      5: '4',
      7: '5',
      10: 'b7',
    },
  },
}

function defineFlavor(id, name, family, sound, usage, groups) {
  return { id, name, family, sound, usage, groups }
}

function defineChord(interval, numeral, qualities, summary, tags = []) {
  return { interval, numeral, qualities, summary, tags }
}

const CHORD_FLAVOR_LIBRARY = [
  defineFlavor(
    'major',
    'Major',
    'Diatonic centers',
    'Stable, bright, and flexible enough to support both straight harmony and a few borrowed detours.',
    'Use this when you want practical major-key harmony ordered from home base to motion and color chords.',
    [
      {
        id: 'tonic',
        label: 'Tonic',
        description: 'Start with the settled shapes that feel like home.',
        chords: [
          defineChord(0, 'I', { triads: 'maj', sevenths: 'major7', extended: 'six', advanced: 'major7' }, 'Home base and the main point of arrival.', ['stable', 'resolved']),
          defineChord(9, 'vi', { triads: 'min', sevenths: 'minor7', extended: 'minor7', advanced: 'minor7' }, 'Relative minor color that still belongs to the key center.', ['soft', 'inside']),
          defineChord(4, 'iii', { triads: 'min', sevenths: 'minor7', extended: 'minor7', advanced: 'minor7' }, 'A lighter tonic-side option for passing movement.', ['inside', 'lighter']),
        ],
      },
      {
        id: 'predominant',
        label: 'Predominant',
        description: 'Push away from the tonic toward stronger motion.',
        chords: [
          defineChord(2, 'ii', { triads: 'min', sevenths: 'minor7', extended: 'minor7', advanced: 'minor7' }, 'Classic setup chord before a dominant.', ['motion', 'pre-dominant']),
          defineChord(5, 'IV', { triads: 'maj', sevenths: 'major7', extended: 'six', advanced: 'six' }, 'Broad major lift that opens the harmony up.', ['open', 'supportive']),
        ],
      },
      {
        id: 'dominant',
        label: 'Dominant',
        description: 'Use these when you want clear pull and release.',
        chords: [
          defineChord(7, 'V', { triads: 'maj', sevenths: 'dominant7', extended: 'dominant9', advanced: 'dominant9' }, 'The main tension chord that wants to resolve.', ['tense', 'cadential']),
          defineChord(11, 'vii°', { triads: 'dim', sevenths: 'minor7Flat5', extended: 'minor7Flat5', advanced: 'minor7Flat5' }, 'Leading-tone tension without a big root movement.', ['unstable', 'leading']),
        ],
      },
      {
        id: 'color',
        label: 'Color / Borrowed',
        description: 'Borrowed colors that still sit naturally next to the major center.',
        chords: [
          defineChord(5, 'iv', { triads: 'min', sevenths: 'minor7', extended: 'min6', advanced: 'min6' }, 'Borrowed minor iv for a wistful side-step.', ['borrowed', 'melancholy']),
          defineChord(10, 'bVII', { triads: 'maj', sevenths: 'dominant7', extended: 'dominant7Sus4', advanced: 'dominant7Sus4' }, 'Loose rock and modal color that relaxes the key.', ['modal', 'loose']),
          defineChord(8, 'bVI', { triads: 'maj', sevenths: 'major7', extended: 'six', advanced: 'six' }, 'A strong borrowed major color for dramatic turns.', ['borrowed', 'dramatic']),
        ],
      },
    ],
  ),
  defineFlavor(
    'natural-minor',
    'Natural Minor',
    'Diatonic centers',
    'Grounded minor with familiar, song-friendly gravity and a little space for borrowed dominant color.',
    'Good for practical minor-key writing when you want useful chords before stricter theory distinctions.',
    [
      {
        id: 'center',
        label: 'Center',
        description: 'The chords that keep the minor center feeling settled.',
        chords: [
          defineChord(0, 'i', { triads: 'min', sevenths: 'minor7', extended: 'minor7', advanced: 'minor7' }, 'The main minor home chord.', ['stable', 'minor']),
          defineChord(3, 'bIII', { triads: 'maj', sevenths: 'major7', extended: 'six', advanced: 'six' }, 'Relative-major lift that still feels connected.', ['warm', 'inside']),
          defineChord(8, 'bVI', { triads: 'maj', sevenths: 'major7', extended: 'six', advanced: 'six' }, 'Wide-screen minor color with a cinematic feel.', ['broad', 'dark']),
        ],
      },
      {
        id: 'motion',
        label: 'Motion',
        description: 'Use these to move away from the center without overcomplicating the sound.',
        chords: [
          defineChord(5, 'iv', { triads: 'min', sevenths: 'minor7', extended: 'minor7', advanced: 'min6' }, 'Natural minor support chord with a soft pull.', ['supportive', 'minor']),
          defineChord(10, 'bVII', { triads: 'maj', sevenths: 'dominant7', extended: 'dominant7Sus4', advanced: 'dominant7Sus4' }, 'A familiar modal push used all over rock and folk harmony.', ['modal', 'driving']),
        ],
      },
      {
        id: 'tension',
        label: 'Tension',
        description: 'The chords that add sharper gravity when natural minor alone feels too passive.',
        chords: [
          defineChord(2, 'ii°', { triads: 'dim', sevenths: 'minor7Flat5', extended: 'minor7Flat5', advanced: 'minor7Flat5' }, 'A useful unstable chord for darker movement.', ['unstable', 'lean']),
          defineChord(7, 'V', { triads: 'min', sevenths: 'dominant7', extended: 'dominant7', advanced: 'dominant9' }, 'Borrow the dominant when you want a stronger cadence.', ['borrowed', 'cadential']),
        ],
      },
      {
        id: 'color',
        label: 'Color',
        description: 'Side colors that sit well around the minor center.',
        chords: [
          defineChord(1, 'bII', { triads: 'maj', sevenths: 'major7', extended: 'major7', advanced: 'major7' }, 'Phrygian-style color for a dramatic side step.', ['phrygian', 'dark']),
        ],
      },
    ],
  ),
  defineFlavor(
    'harmonic-minor',
    'Harmonic Minor',
    'Diatonic centers',
    'Dramatic minor harmony with a true dominant pull and a sharper leading tone.',
    'Pick this when you want minor-key cadences to feel stronger and more theatrical.',
    [
      {
        id: 'tonic',
        label: 'Tonic',
        description: 'The minor center and its closest resting colors.',
        chords: [
          defineChord(0, 'i', { triads: 'min', sevenths: 'minor7', extended: 'min6', advanced: 'min6' }, 'The tonic minor sound, kept practical rather than overly formal.', ['stable', 'dramatic']),
          defineChord(8, 'bVI', { triads: 'maj', sevenths: 'major7', extended: 'six', advanced: 'six' }, 'A rich companion color that still supports the tonic.', ['broad', 'inside']),
        ],
      },
      {
        id: 'predominant',
        label: 'Predominant',
        description: 'Use these to set up the dominant side of the key.',
        chords: [
          defineChord(2, 'ii°', { triads: 'dim', sevenths: 'minor7Flat5', extended: 'minor7Flat5', advanced: 'minor7Flat5' }, 'Half-diminished tension that points toward V.', ['tense', 'leading']),
          defineChord(5, 'iv', { triads: 'min', sevenths: 'minor7', extended: 'min6', advanced: 'min6' }, 'Minor support chord before the cadence turns sharper.', ['minor', 'supportive']),
        ],
      },
      {
        id: 'dominant',
        label: 'Dominant',
        description: 'These are the shapes that give harmonic minor its pull.',
        chords: [
          defineChord(7, 'V', { triads: 'maj', sevenths: 'dominant7', extended: 'dominant9', advanced: 'dominant9' }, 'The signature strong dominant in minor.', ['cadential', 'bright tension']),
          defineChord(11, 'vii°', { triads: 'dim', sevenths: 'diminished7', extended: 'diminished7', advanced: 'diminished7' }, 'Compressed leading-tone grip for a tense approach.', ['symmetry', 'unstable']),
        ],
      },
      {
        id: 'color',
        label: 'Color',
        description: 'A few extra colors that still sound natural in this world.',
        chords: [
          defineChord(1, 'bII', { triads: 'maj', sevenths: 'major7', extended: 'major7', advanced: 'major7' }, 'A dramatic Neapolitan-style side color.', ['dramatic', 'borrowed']),
        ],
      },
    ],
  ),
  defineFlavor(
    'dorian',
    'Dorian',
    'Modal colors',
    'Minor-centered but lifted by the natural 6, with a groove-friendly, open feel.',
    'Useful for vamps, modal writing, funk, and jazz grooves where the center stays put for a while.',
    [
      {
        id: 'center',
        label: 'Center',
        description: 'Keep the modal center obvious before adding brighter support chords.',
        chords: [
          defineChord(0, 'i', { triads: 'min', sevenths: 'minor7', extended: 'minor7', advanced: 'minor7' }, 'The core modal resting sound.', ['stable', 'modal']),
          defineChord(5, 'IV', { triads: 'maj', sevenths: 'dominant7', extended: 'dominant9', advanced: 'dominant9' }, 'The classic Dorian brightness chord.', ['lift', 'signature']),
        ],
      },
      {
        id: 'support',
        label: 'Support',
        description: 'Companion chords that keep the Dorian color intact.',
        chords: [
          defineChord(7, 'v', { triads: 'min', sevenths: 'minor7', extended: 'minor7', advanced: 'minor7' }, 'A softer modal push than a major-key dominant.', ['inside', 'subtle']),
          defineChord(3, 'bIII', { triads: 'maj', sevenths: 'major7', extended: 'six', advanced: 'six' }, 'Relative-major color without leaving the mode.', ['warm', 'inside']),
          defineChord(10, 'bVII', { triads: 'maj', sevenths: 'dominant7', extended: 'dominant7Sus4', advanced: 'dominant7Sus4' }, 'Common modal support in vamp-based harmony.', ['modal', 'driving']),
        ],
      },
    ],
  ),
  defineFlavor(
    'mixolydian',
    'Mixolydian',
    'Modal colors',
    'Dominant-centered, loose, and blues-adjacent without sounding fully altered.',
    'Use it for static dominant grooves, rock jams, and tunes that sit on a I7 center.',
    [
      {
        id: 'center',
        label: 'Center',
        description: 'The dominant center and the chords that make it feel like a home base.',
        chords: [
          defineChord(0, 'I', { triads: 'maj', sevenths: 'dominant7', extended: 'dominant9', advanced: 'dominant9' }, 'The home dominant chord for the mode.', ['center', 'groove']),
          defineChord(10, 'bVII', { triads: 'maj', sevenths: 'major7', extended: 'six', advanced: 'six' }, 'The classic Mixolydian side-step.', ['modal', 'wide']),
        ],
      },
      {
        id: 'support',
        label: 'Support',
        description: 'Companion chords that keep the dominant center broad and open.',
        chords: [
          defineChord(5, 'IV', { triads: 'maj', sevenths: 'dominant7', extended: 'dominant9', advanced: 'dominant9' }, 'A blues-friendly support chord.', ['bluesy', 'supportive']),
          defineChord(7, 'v', { triads: 'min', sevenths: 'minor7', extended: 'minor7', advanced: 'minor7' }, 'A softer dominant-side move than a true V chord.', ['inside', 'modal']),
          defineChord(2, 'ii', { triads: 'min', sevenths: 'minor7', extended: 'minor7', advanced: 'minor7' }, 'Useful for vamp movement without changing the center.', ['inside', 'groove']),
        ],
      },
    ],
  ),
  defineFlavor(
    'lydian',
    'Lydian',
    'Modal colors',
    'Major-centered but more floating, with the sharp 4 turning the II chord into a useful bright color.',
    'Works well when you want a major center that feels open and less earthbound than straight Ionian harmony.',
    [
      {
        id: 'center',
        label: 'Center',
        description: 'Let the tonic stay clear before leaning into the sharper modal color.',
        chords: [
          defineChord(0, 'I', { triads: 'maj', sevenths: 'major7', extended: 'six', advanced: 'major7' }, 'The main resting major sound.', ['center', 'open']),
          defineChord(2, 'II', { triads: 'maj', sevenths: 'dominant7', extended: 'dominant9', advanced: 'dominant9' }, 'The signature Lydian support chord.', ['bright', 'signature']),
        ],
      },
      {
        id: 'support',
        label: 'Support',
        description: 'Use these to widen the harmony without losing the Lydian atmosphere.',
        chords: [
          defineChord(7, 'V', { triads: 'maj', sevenths: 'major7', extended: 'six', advanced: 'six' }, 'A broad major support chord rather than a strong cadence.', ['wide', 'major']),
          defineChord(4, 'III', { triads: 'min', sevenths: 'minor7', extended: 'minor7', advanced: 'minor7' }, 'A gentle side color that still stays inside the mode.', ['inside', 'soft']),
          defineChord(11, 'vii', { triads: 'min', sevenths: 'minor7', extended: 'minor7', advanced: 'minor7' }, 'A quieter support chord from the raised-four world.', ['inside', 'floating']),
        ],
      },
    ],
  ),
  defineFlavor(
    'jazz-major',
    'Jazz Major',
    'Jazz and borrowed',
    'Functional major harmony with a stronger pull toward movement and secondary dominants.',
    'A practical songwriting and comping palette when you want major harmony to move like jazz, not just sit still.',
    [
      {
        id: 'center',
        label: 'Center',
        description: 'Keep the key center obvious before opening up the dominant chain.',
        chords: [
          defineChord(0, 'I', { triads: 'maj', sevenths: 'major7', extended: 'six', advanced: 'major7' }, 'The home major sonority.', ['center', 'clean']),
          defineChord(9, 'vi', { triads: 'min', sevenths: 'minor7', extended: 'minor7', advanced: 'minor7' }, 'Relative minor that connects easily into ii-V movement.', ['inside', 'connected']),
        ],
      },
      {
        id: 'movement',
        label: 'Movement',
        description: 'These are the chords that keep the progression turning.',
        chords: [
          defineChord(2, 'ii', { triads: 'min', sevenths: 'minor7', extended: 'minor7', advanced: 'minor7' }, 'The classic setup for V.', ['pre-dominant', 'swing']),
          defineChord(7, 'V', { triads: 'maj', sevenths: 'dominant7', extended: 'dominant9', advanced: 'dominant9' }, 'Core dominant for resolution.', ['dominant', 'swing']),
          defineChord(4, 'III7', { triads: 'maj', sevenths: 'dominant7', extended: 'dominant9', advanced: 'dominant9' }, 'Secondary dominant for forward motion.', ['secondary dominant', 'push']),
          defineChord(9, 'VI7', { triads: 'maj', sevenths: 'dominant7', extended: 'dominant9', advanced: 'dominant9' }, 'A practical turnaround dominant.', ['turnaround', 'push']),
        ],
      },
    ],
  ),
  defineFlavor(
    'jazz-minor',
    'Jazz Minor',
    'Jazz and borrowed',
    'A smoother minor center with modern dominant options and brighter upper colors than natural minor.',
    'Useful when you want minor harmony to feel more modern, less purely diatonic, and more cadence-friendly.',
    [
      {
        id: 'center',
        label: 'Center',
        description: 'Keep the minor center clear while using brighter supporting colors.',
        chords: [
          defineChord(0, 'i', { triads: 'min', sevenths: 'minor7', extended: 'min6', advanced: 'min6' }, 'The practical tonic minor center for this palette.', ['modern minor', 'center']),
          defineChord(3, 'bIII', { triads: 'maj', sevenths: 'major7', extended: 'six', advanced: 'six' }, 'A bright upper color above the tonic.', ['bright', 'color']),
        ],
      },
      {
        id: 'movement',
        label: 'Movement',
        description: 'These are the chords that make the minor palette feel more modern and fluid.',
        chords: [
          defineChord(5, 'IV', { triads: 'maj', sevenths: 'dominant7', extended: 'dominant9', advanced: 'dominant9' }, 'A bright dominant support chord from melodic-minor harmony.', ['modern', 'lift']),
          defineChord(7, 'V', { triads: 'maj', sevenths: 'dominant7', extended: 'dominant9', advanced: 'dominant9' }, 'A stronger dominant than natural minor usually offers.', ['cadential', 'push']),
          defineChord(9, 'viø', { triads: 'dim', sevenths: 'minor7Flat5', extended: 'minor7Flat5', advanced: 'minor7Flat5' }, 'Useful unstable color for inner movement.', ['unstable', 'lean']),
          defineChord(11, 'viiø', { triads: 'dim', sevenths: 'minor7Flat5', extended: 'minor7Flat5', advanced: 'minor7Flat5' }, 'Leading color that works well in compact voicings.', ['leading', 'dark']),
        ],
      },
    ],
  ),
  defineFlavor(
    'modal-interchange',
    'Modal Interchange',
    'Jazz and borrowed',
    'Major-center harmony with a deliberately borrowed minor side for immediate emotional contrast.',
    'Treat this as a practical grab bag for writing in a major key but borrowing the most musical minor colors.',
    [
      {
        id: 'home',
        label: 'Home',
        description: 'Start from the clear major center before borrowing more emotional colors.',
        chords: [
          defineChord(0, 'I', { triads: 'maj', sevenths: 'major7', extended: 'six', advanced: 'major7' }, 'The anchor major chord.', ['center', 'bright']),
          defineChord(2, 'ii', { triads: 'min', sevenths: 'minor7', extended: 'minor7', advanced: 'minor7' }, 'Keeps the harmony connected to the major side.', ['inside', 'motion']),
          defineChord(7, 'V', { triads: 'maj', sevenths: 'dominant7', extended: 'dominant9', advanced: 'dominant9' }, 'The cleanest way back home after borrowed color.', ['cadential', 'return']),
        ],
      },
      {
        id: 'borrowed',
        label: 'Borrowed',
        description: 'These are the emotional detours people actually use all the time.',
        chords: [
          defineChord(5, 'iv', { triads: 'min', sevenths: 'minor7', extended: 'min6', advanced: 'min6' }, 'The classic borrowed chord for bittersweet color.', ['borrowed', 'wistful']),
          defineChord(8, 'bVI', { triads: 'maj', sevenths: 'major7', extended: 'six', advanced: 'six' }, 'A dramatic borrowed major chord.', ['borrowed', 'cinematic']),
          defineChord(10, 'bVII', { triads: 'maj', sevenths: 'dominant7', extended: 'dominant7Sus4', advanced: 'dominant7Sus4' }, 'A loose borrowed color that works in pop, rock, and modal writing.', ['borrowed', 'loose']),
        ],
      },
    ],
  ),
  defineFlavor(
    'blues',
    'Blues',
    'Blues and roots',
    'Dominant-heavy, earthy, and flexible enough to cover basic blues movement and a few classic passing colors.',
    'This is a practical blues writing set built around what guitarists actually reach for first.',
    [
      {
        id: 'foundation',
        label: 'Foundation',
        description: 'The core three-chord frame and the grips that make it feel right on guitar.',
        chords: [
          defineChord(0, 'I', { triads: 'maj', sevenths: 'dominant7', extended: 'dominant9', advanced: 'dominant9' }, 'The blues home chord.', ['gritty', 'center']),
          defineChord(5, 'IV', { triads: 'maj', sevenths: 'dominant7', extended: 'dominant9', advanced: 'dominant9' }, 'The essential move away from the tonic.', ['blues', 'motion']),
          defineChord(7, 'V', { triads: 'maj', sevenths: 'dominant7', extended: 'dominant9', advanced: 'dominant9' }, 'Main turnaround tension.', ['turnaround', 'tension']),
        ],
      },
      {
        id: 'passing',
        label: 'Passing / Color',
        description: 'These are the classic side colors that make a basic blues feel more alive.',
        chords: [
          defineChord(6, '#IV°', { triads: 'dim', sevenths: 'diminished7', extended: 'diminished7', advanced: 'diminished7' }, 'Classic passing diminished move between I and IV territory.', ['passing', 'chromatic']),
          defineChord(3, 'bIII', { triads: 'maj', sevenths: 'dominant7', extended: 'dominant7', advanced: 'dominant7' }, 'Major-third side color for quick contrast.', ['side-slip', 'roots']),
          defineChord(10, 'bVII', { triads: 'maj', sevenths: 'dominant7', extended: 'dominant7Sus4', advanced: 'dominant7Sus4' }, 'Loose dominant color for turnarounds and vamps.', ['roots', 'loose']),
        ],
      },
    ],
  ),
]

const CHORD_VOICING_TEMPLATES = [
  { id: 'maj-e', quality: 'maj', label: 'Low E shape', anchorString: 6, frets: [0, 2, 2, 1, 0, 0], tags: ['open', 'barre'], priority: 1 },
  { id: 'maj-a', quality: 'maj', label: 'A-string shape', anchorString: 5, frets: [-1, 0, 2, 2, 2, 0], tags: ['barre'], priority: 2 },
  { id: 'maj-d', quality: 'maj', label: 'Upper D shape', anchorString: 4, frets: [-1, -1, 0, 2, 3, 2], tags: ['compact'], priority: 3 },
  { id: 'maj-a-compact', quality: 'maj', label: 'Compact triad', anchorString: 5, frets: [-1, 0, 2, 2, 2, -1], tags: ['compact', 'jazz'], priority: 4 },

  { id: 'min-e', quality: 'min', label: 'Low E shape', anchorString: 6, frets: [0, 2, 2, 0, 0, 0], tags: ['open', 'barre'], priority: 1 },
  { id: 'min-a', quality: 'min', label: 'A-string shape', anchorString: 5, frets: [-1, 0, 2, 2, 1, 0], tags: ['barre'], priority: 2 },
  { id: 'min-d', quality: 'min', label: 'Upper D shape', anchorString: 4, frets: [-1, -1, 0, 2, 3, 1], tags: ['compact'], priority: 3 },
  { id: 'min-a-compact', quality: 'min', label: 'Compact triad', anchorString: 5, frets: [-1, 0, 2, 2, 1, -1], tags: ['compact', 'jazz'], priority: 4 },

  { id: 'sus4-e', quality: 'sus4', label: 'Low E sus shape', anchorString: 6, frets: [0, 2, 2, 2, 0, 0], tags: ['open', 'barre'], priority: 1 },
  { id: 'sus4-a', quality: 'sus4', label: 'A-string sus shape', anchorString: 5, frets: [-1, 0, 2, 2, 3, 0], tags: ['barre'], priority: 2 },
  { id: 'sus4-d', quality: 'sus4', label: 'Upper sus shape', anchorString: 4, frets: [-1, -1, 0, 2, 3, 3], tags: ['compact'], priority: 3 },

  { id: 'six-e', quality: 'six', label: 'Low E 6 shape', anchorString: 6, frets: [0, 2, 2, 1, 2, 0], tags: ['open', 'barre'], priority: 1 },
  { id: 'six-a', quality: 'six', label: 'A-string 6 shape', anchorString: 5, frets: [-1, 0, 2, 2, 2, 2], tags: ['barre'], priority: 2 },
  { id: 'six-d', quality: 'six', label: 'Upper 6 shape', anchorString: 4, frets: [-1, -1, 0, 2, 0, 2], tags: ['compact', 'jazz'], priority: 3 },

  { id: 'min6-e', quality: 'min6', label: 'Low E m6 shape', anchorString: 6, frets: [0, 2, 2, 0, 2, 0], tags: ['open', 'barre'], priority: 1 },
  { id: 'min6-a', quality: 'min6', label: 'A-string m6 shape', anchorString: 5, frets: [-1, 0, 2, 2, 1, 2], tags: ['barre'], priority: 2 },
  { id: 'min6-compact', quality: 'min6', label: 'Compact m6 shape', anchorString: 5, frets: [-1, 0, 2, 2, 1, -1], tags: ['compact', 'jazz'], priority: 3 },

  { id: 'dom7-e', quality: 'dominant7', label: 'Low E7 shape', anchorString: 6, frets: [0, 2, 0, 1, 0, 0], tags: ['open', 'barre'], priority: 1 },
  { id: 'dom7-a', quality: 'dominant7', label: 'A-string 7 shape', anchorString: 5, frets: [-1, 0, 2, 0, 2, 0], tags: ['barre'], priority: 2 },
  { id: 'dom7-d', quality: 'dominant7', label: 'Upper 7 shape', anchorString: 4, frets: [-1, -1, 0, 2, 1, 2], tags: ['compact'], priority: 3 },
  { id: 'dom7-compact', quality: 'dominant7', label: 'Compact 7 shape', anchorString: 5, frets: [-1, 0, 2, 0, 2, -1], tags: ['compact', 'jazz'], priority: 4 },

  { id: 'maj7-e', quality: 'major7', label: 'Low Emaj7 shape', anchorString: 6, frets: [0, 2, 1, 1, 0, 0], tags: ['open', 'barre'], priority: 1 },
  { id: 'maj7-a', quality: 'major7', label: 'A-string maj7 shape', anchorString: 5, frets: [-1, 0, 2, 1, 2, 0], tags: ['barre'], priority: 2 },
  { id: 'maj7-d', quality: 'major7', label: 'Upper maj7 shape', anchorString: 4, frets: [-1, -1, 0, 2, 2, 2], tags: ['compact'], priority: 3 },
  { id: 'maj7-compact', quality: 'major7', label: 'Compact maj7 shape', anchorString: 5, frets: [-1, 0, 2, 1, 2, -1], tags: ['compact', 'jazz'], priority: 4 },

  { id: 'min7-e', quality: 'minor7', label: 'Low Em7 shape', anchorString: 6, frets: [0, 2, 0, 0, 0, 0], tags: ['open', 'barre'], priority: 1 },
  { id: 'min7-a', quality: 'minor7', label: 'A-string m7 shape', anchorString: 5, frets: [-1, 0, 2, 0, 1, 0], tags: ['barre'], priority: 2 },
  { id: 'min7-d', quality: 'minor7', label: 'Upper m7 shape', anchorString: 4, frets: [-1, -1, 0, 2, 1, 1], tags: ['compact'], priority: 3 },
  { id: 'min7-compact', quality: 'minor7', label: 'Compact m7 shape', anchorString: 5, frets: [-1, 0, 2, 0, 1, -1], tags: ['compact', 'jazz'], priority: 4 },

  { id: 'm7b5-6', quality: 'minor7Flat5', label: 'Low-root m7b5', anchorString: 6, frets: [0, 1, 0, 1, -1, -1], tags: ['compact', 'jazz'], priority: 1 },
  { id: 'm7b5-5', quality: 'minor7Flat5', label: 'A-string m7b5', anchorString: 5, frets: [-1, 0, 1, 0, 1, -1], tags: ['compact', 'jazz'], priority: 2 },
  { id: 'm7b5-upper', quality: 'minor7Flat5', label: 'Upper m7b5', anchorString: 4, frets: [-1, -1, 0, 1, 1, 1], tags: ['compact', 'jazz'], priority: 3 },

  { id: 'dim-6', quality: 'dim', label: 'Low diminished triad', anchorString: 6, frets: [0, 1, 2, -1, -1, -1], tags: ['compact', 'jazz'], priority: 1 },
  { id: 'dim-5', quality: 'dim', label: 'A-string diminished triad', anchorString: 5, frets: [-1, 0, 1, 2, -1, -1], tags: ['compact', 'jazz'], priority: 2 },
  { id: 'dim-upper', quality: 'dim', label: 'Upper diminished triad', anchorString: 4, frets: [-1, -1, 0, 1, 0, -1], tags: ['compact', 'jazz'], priority: 3 },

  { id: 'dim7-6', quality: 'diminished7', label: 'Low dim7 shape', anchorString: 6, frets: [0, 1, 2, 0, -1, -1], tags: ['compact', 'jazz'], priority: 1 },
  { id: 'dim7-5', quality: 'diminished7', label: 'A-string dim7 shape', anchorString: 5, frets: [-1, 0, 1, 2, 1, -1], tags: ['compact', 'jazz'], priority: 2 },
  { id: 'dim7-upper', quality: 'diminished7', label: 'Upper dim7 shape', anchorString: 4, frets: [-1, -1, 0, 1, 0, 1], tags: ['compact', 'jazz'], priority: 3 },

  { id: 'dom9-e', quality: 'dominant9', label: 'Low 9 shape', anchorString: 6, frets: [0, 2, 0, 1, 2, 2], tags: ['open', 'barre'], priority: 1 },
  { id: 'dom9-a', quality: 'dominant9', label: 'A-string 9 shape', anchorString: 5, frets: [-1, 0, 2, 0, 2, 2], tags: ['barre'], priority: 2 },
  { id: 'dom9-compact', quality: 'dominant9', label: 'Compact 9 shape', anchorString: 5, frets: [-1, 0, 2, 0, 2, -1], tags: ['compact', 'jazz'], priority: 3 },

  { id: 'dom7sus4-e', quality: 'dominant7Sus4', label: 'Low 7sus4 shape', anchorString: 6, frets: [0, 2, 0, 2, 0, 0], tags: ['open', 'barre'], priority: 1 },
  { id: 'dom7sus4-a', quality: 'dominant7Sus4', label: 'A-string 7sus4 shape', anchorString: 5, frets: [-1, 0, 2, 0, 3, 0], tags: ['barre'], priority: 2 },
  { id: 'dom7sus4-compact', quality: 'dominant7Sus4', label: 'Compact 7sus4 shape', anchorString: 5, frets: [-1, 0, 2, 0, 3, -1], tags: ['compact', 'jazz'], priority: 3 },
]

export {
  CHORD_COMPLEXITY_OPTIONS,
  CHORD_FLAVOR_LIBRARY,
  CHORD_QUALITIES,
  CHORD_VOICING_TEMPLATES,
  PLAYABILITY_OPTIONS,
}
