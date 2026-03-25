export const ROOT_OPTIONS = [
  { label: 'C', pitchClass: 0 },
  { label: 'Db', pitchClass: 1 },
  { label: 'D', pitchClass: 2 },
  { label: 'Eb', pitchClass: 3 },
  { label: 'E', pitchClass: 4 },
  { label: 'F', pitchClass: 5 },
  { label: 'F#', pitchClass: 6 },
  { label: 'G', pitchClass: 7 },
  { label: 'Ab', pitchClass: 8 },
  { label: 'A', pitchClass: 9 },
  { label: 'Bb', pitchClass: 10 },
  { label: 'B', pitchClass: 11 },
]

const PITCH_CLASS_LABELS = ['C', 'C#/Db', 'D', 'D#/Eb', 'E', 'F', 'F#/Gb', 'G', 'G#/Ab', 'A', 'A#/Bb', 'B']

const DEGREE_LABELS = {
  0: '1',
  1: 'b2',
  2: '2',
  3: 'b3',
  4: '3',
  5: '4',
  6: '#4',
  7: '5',
  8: 'b6',
  9: '6',
  10: 'b7',
  11: '7',
}

function defineScale(id, name, family, intervals, sound, usage) {
  return {
    id,
    name,
    family,
    intervals,
    sound,
    usage,
  }
}

export const SCALE_LIBRARY = [
  defineScale(
    'ionian',
    'Ionian (Major)',
    'Common modes',
    [0, 2, 4, 5, 7, 9, 11],
    'Balanced, bright, and fully resolved.',
    'The default major-key sound for melody, chord-scale work, and functional harmony.',
  ),
  defineScale(
    'dorian',
    'Dorian',
    'Common modes',
    [0, 2, 3, 5, 7, 9, 10],
    'Minor with lift from the natural 6.',
    'Works well over minor 7 chords, modal vamping, funk, and modern jazz lines.',
  ),
  defineScale(
    'phrygian',
    'Phrygian',
    'Common modes',
    [0, 1, 3, 5, 7, 8, 10],
    'Dark and tense because of the flat 2.',
    'Useful for Spanish colors, heavier riffs, and suspended minor tonal centers.',
  ),
  defineScale(
    'lydian',
    'Lydian',
    'Common modes',
    [0, 2, 4, 6, 7, 9, 11],
    'Open and floating with the raised 4.',
    'Strong over major 7 chords when you want a brighter, more cinematic major color.',
  ),
  defineScale(
    'mixolydian',
    'Mixolydian',
    'Common modes',
    [0, 2, 4, 5, 7, 9, 10],
    'Major with bluesy looseness from the flat 7.',
    'A staple over dominant chords, blues, classic rock, and jam-band harmony.',
  ),
  defineScale(
    'aeolian',
    'Aeolian (Natural Minor)',
    'Common modes',
    [0, 2, 3, 5, 7, 8, 10],
    'Straight-ahead minor: moody, stable, and familiar.',
    'Use it for natural minor harmony, pop progressions, and rock ballad phrasing.',
  ),
  defineScale(
    'locrian',
    'Locrian',
    'Common modes',
    [0, 1, 3, 5, 6, 8, 10],
    'Unstable and compressed from the flat 2 and flat 5.',
    'Fits half-diminished harmony and tense modal color, usually in short doses.',
  ),
  defineScale(
    'harmonic-minor',
    'Harmonic Minor',
    'Harmonic and melodic colors',
    [0, 2, 3, 5, 7, 8, 11],
    'Dramatic minor with a strong pull from the major 7.',
    'Great for minor key cadences, neoclassical lines, and V7 to i movement.',
  ),
  defineScale(
    'melodic-minor',
    'Melodic Minor',
    'Harmonic and melodic colors',
    [0, 2, 3, 5, 7, 9, 11],
    'Smooth, modern, and slightly bittersweet.',
    'Core jazz language over minor-major harmony and the parent scale for several altered modes.',
  ),
  defineScale(
    'harmonic-major',
    'Harmonic Major',
    'Harmonic and melodic colors',
    [0, 2, 4, 5, 7, 8, 11],
    'Major with an exotic shadow from the flat 6.',
    'Good for unusual tonic-major colors, fusion writing, and unexpected dominant resolution sounds.',
  ),
  defineScale(
    'phrygian-dominant',
    'Phrygian Dominant',
    'Harmonic and melodic colors',
    [0, 1, 4, 5, 7, 8, 10],
    'Bold and exotic with major 3 against flat 2.',
    'Often used over V7 in harmonic minor, flamenco grooves, and Middle Eastern-inspired phrasing.',
  ),
  defineScale(
    'lydian-dominant',
    'Lydian Dominant',
    'Harmonic and melodic colors',
    [0, 2, 4, 6, 7, 9, 10],
    'Dominant but airy because of the raised 4.',
    'Fits dominant chords that do not want a plain Mixolydian color, especially in fusion and modern jazz.',
  ),
  defineScale(
    'altered',
    'Altered',
    'Harmonic and melodic colors',
    [0, 1, 3, 4, 6, 8, 10],
    'High tension with altered upper extensions everywhere.',
    'Use it over altered dominant chords before a resolution, especially in jazz harmony.',
  ),
  defineScale(
    'whole-tone',
    'Whole Tone',
    'Symmetric scales',
    [0, 2, 4, 6, 8, 10],
    'Dreamy and ambiguous because everything moves in whole steps.',
    'Strong over augmented harmony, dominant sharp-5 colors, and impressionistic lines.',
  ),
  defineScale(
    'diminished-half-whole',
    'Diminished (Half-Whole)',
    'Symmetric scales',
    [0, 1, 3, 4, 6, 7, 9, 10],
    'Crunchy and symmetrical with dense dominant tension.',
    'A classic choice over dominant 7 flat 9 chords and outside-sounding lines.',
  ),
  defineScale(
    'diminished-whole-half',
    'Diminished (Whole-Half)',
    'Symmetric scales',
    [0, 2, 3, 5, 6, 8, 9, 11],
    'Tight and angular with diminished symmetry.',
    'Useful over fully diminished chords and repeating minor-third structures.',
  ),
  defineScale(
    'major-bebop',
    'Major Bebop',
    'Bebop scales',
    [0, 2, 4, 5, 7, 8, 9, 11],
    'Major language with a built-in passing tone.',
    'Helps eighth-note lines land chord tones on strong beats in swing phrasing.',
  ),
  defineScale(
    'dominant-bebop',
    'Dominant Bebop',
    'Bebop scales',
    [0, 2, 4, 5, 7, 9, 10, 11],
    'Mixolydian plus an extra passing tone for forward motion.',
    'A jazz standard over dominant chords when you want lines to sit naturally in swing time.',
  ),
  defineScale(
    'minor-bebop',
    'Minor Bebop',
    'Bebop scales',
    [0, 2, 3, 5, 7, 8, 9, 10],
    'Minor with extra connective tissue for flowing single-note lines.',
    'Works over minor chords when you want a bebop contour without leaving the key center.',
  ),
  defineScale(
    'double-harmonic',
    'Double Harmonic',
    'Exotic colors',
    [0, 1, 4, 5, 7, 8, 11],
    'Highly dramatic and immediately exotic.',
    'Useful for cinematic writing, metal riffs, and strong non-Western tonal colors.',
  ),
  defineScale(
    'hungarian-minor',
    'Hungarian Minor',
    'Exotic colors',
    [0, 2, 3, 6, 7, 8, 11],
    'Minor with a sharp 4 and major 7 for a tense, ornate sound.',
    'Great for virtuosic lead playing, soundtrack moods, and neoclassical phrasing.',
  ),
]

export function getPitchClassLabel(pitchClass) {
  return PITCH_CLASS_LABELS[pitchClass]
}

export function getDegreeLabel(interval) {
  return DEGREE_LABELS[interval]
}

export function getScaleFormula(intervals) {
  return intervals.map((interval) => getDegreeLabel(interval)).join('  ')
}

export function getScaleSpellings(rootPitchClass, intervals) {
  return intervals.map((interval) => getPitchClassLabel((rootPitchClass + interval) % 12))
}
