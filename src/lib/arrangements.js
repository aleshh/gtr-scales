import { ARRANGEMENT_COMPLEXITY_OPTIONS } from '../data/arrangements'
import { CHORD_QUALITIES } from '../data/chords'
import { ROOT_OPTIONS, SCALE_LIBRARY, getPitchClassLabel } from '../data/scales'
import { buildFretboardRows, buildPositionWindows, getVisibleFrets } from './fretboard'
import { generateVoicings, getChordName } from './chords'

const SCALE_BY_ID = Object.fromEntries(SCALE_LIBRARY.map((scale) => [scale.id, scale]))
const MAJOR_IDS = new Set(['ionian', 'lydian', 'mixolydian', 'harmonic-major', 'major-bebop'])
const MINOR_IDS = new Set(['aeolian', 'dorian', 'phrygian', 'harmonic-minor', 'melodic-minor', 'minor-bebop', 'hungarian-minor'])
const DOMINANT_IDS = new Set(['mixolydian', 'lydian-dominant', 'dominant-bebop', 'phrygian-dominant'])
const DIATONIC_PARENT_SCALE_IDS = {
  'major-bebop': 'ionian',
  'dominant-bebop': 'mixolydian',
  'minor-bebop': 'dorian',
}

const TRIAD_QUALITIES = {
  '0,4,7': 'maj',
  '0,4,6': 'majorFlat5',
  '0,4,8': 'augmented',
  '0,3,7': 'min',
  '0,3,6': 'dim',
}

const SEVENTH_QUALITIES = {
  '0,4,7,11': 'major7',
  '0,4,7,10': 'dominant7',
  '0,4,6,10': 'dominant7Flat5',
  '0,4,8,10': 'dominant7Sharp5',
  '0,3,7,10': 'minor7',
  '0,3,7,11': 'minorMajor7',
  '0,3,6,10': 'minor7Flat5',
  '0,3,6,9': 'diminished7',
}

const DEGREE_NUMERALS = {
  maj: ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'],
  majorFlat5: ['Ib5', 'IIb5', 'IIIb5', 'IVb5', 'Vb5', 'VIb5', 'VIIb5'],
  augmented: ['I+', 'II+', 'III+', 'IV+', 'V+', 'VI+', 'VII+'],
  min: ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii'],
  dim: ['iio', 'iiio', 'ivo', 'vo', 'vio', 'viio', 'io'],
}

const FALLBACK_NUMERALS = ['I', 'bII', 'II', 'bIII', 'III', 'IV', '#IV', 'V', 'bVI', 'VI', 'bVII', 'VII']
const INSIDE_CHORD_PREFERENCES = {
  altered: ['dominant7Sharp5', 'dominant7Flat5', 'augmented', 'majorFlat5', 'dim'],
  'whole-tone': ['dominant7Sharp5', 'augmented'],
  'diminished-half-whole': ['dominant7', 'dominant7Flat5', 'diminished7', 'dim'],
  'diminished-whole-half': ['diminished7', 'dim'],
}
const DEFAULT_INSIDE_CHORD_PREFERENCE = [
  'major7',
  'dominant7',
  'minor7',
  'minorMajor7',
  'minor7Flat5',
  'diminished7',
  'dominant7Sharp5',
  'dominant7Flat5',
  'maj',
  'min',
  'dim',
  'augmented',
  'majorFlat5',
  'six',
  'min6',
  'dominant7Sus4',
  'sus4',
]

const EXTRA_CHORDS = {
  'folk-rock': [
    { interval: 10, numeral: 'bVII', quality: 'maj', summary: 'Loose modal color that shows up constantly in rock writing.', tags: ['modal', 'anthemic'] },
    { interval: 5, numeral: 'iv', quality: 'min', summary: 'Borrowed minor support for a wistful turn.', tags: ['borrowed', 'melancholy'] },
  ],
  'pop-soul': [
    { interval: 5, numeral: 'IVmaj7', quality: 'major7', summary: 'Glossy lift that keeps the chorus broad.', tags: ['open', 'warm'] },
    { interval: 9, numeral: 'vi7', quality: 'minor7', summary: 'Smooth relative-minor color for loops and pre-choruses.', tags: ['soft', 'connected'] },
    { interval: 10, numeral: 'bVII7sus', quality: 'dominant7Sus4', summary: 'Suspended dominant color without a hard classical cadence.', tags: ['suspended', 'pop'] },
  ],
  jazz: [
    { interval: 2, numeral: 'ii7', quality: 'minor7', summary: 'The standard setup chord for dominant movement.', tags: ['pre-dominant', 'swing'] },
    { interval: 7, numeral: 'V9', quality: 'dominant9', summary: 'Main dominant color with enough extension for jazz lines.', tags: ['dominant', 'motion'] },
    { interval: 9, numeral: 'VI7', quality: 'dominant9', summary: 'Turnaround dominant that points back into ii.', tags: ['secondary dominant', 'turnaround'] },
  ],
  'advanced-jazz': [
    { interval: 1, numeral: 'bIImaj7', quality: 'major7', summary: 'A tritone-side or Neapolitan color for dramatic displacement.', tags: ['outside', 'chromatic'] },
    { interval: 3, numeral: 'bIII7', quality: 'dominant9', summary: 'Backdoor or side-slip dominant color.', tags: ['substitution', 'dominant'] },
    { interval: 6, numeral: '#IVdim7', quality: 'diminished7', summary: 'Symmetric passing tension that can point in several directions.', tags: ['symmetric', 'passing'] },
  ],
  classical: [
    { interval: 2, numeral: 'iiø7', quality: 'minor7Flat5', summary: 'Predominant tension, especially persuasive in minor contexts.', tags: ['predominant', 'voice-led'] },
    { interval: 7, numeral: 'V7', quality: 'dominant7', summary: 'The strongest cadence builder back to the tonic.', tags: ['dominant', 'cadential'] },
    { interval: 1, numeral: 'bII', quality: 'maj', summary: 'Neapolitan color for formal dramatic pressure.', tags: ['neapolitan', 'dramatic'] },
  ],
  impressionist: [
    { interval: 2, numeral: 'II9', quality: 'dominant9', summary: 'Planing-friendly brightness, especially from a Lydian viewpoint.', tags: ['planing', 'bright'] },
    { interval: 6, numeral: '#IVo7', quality: 'diminished7', summary: 'Symmetric color that can avoid a normal tonal answer.', tags: ['symmetric', 'floating'] },
    { interval: 10, numeral: 'bVII7sus', quality: 'dominant7Sus4', summary: 'Open dominant color that can hang without resolving.', tags: ['suspended', 'modal'] },
  ],
  experimental: [
    { interval: 1, numeral: 'bIImaj7', quality: 'major7', summary: 'Hard chromatic side-light against the tonal center.', tags: ['chromatic', 'dissonant'] },
    { interval: 4, numeral: 'III7', quality: 'dominant9', summary: 'Chromatic mediant dominant for abrupt color change.', tags: ['mediant', 'unstable'] },
    { interval: 6, numeral: 'tritone dim7', quality: 'diminished7', summary: 'Diminished material for axis harmony and nonfunctional tension.', tags: ['axis', 'symmetric'] },
    { interval: 8, numeral: 'bVImaj7', quality: 'major7', summary: 'Remote but cinematic major color.', tags: ['mediant', 'color'] },
  ],
}

function getScaleMood(scale) {
  if (MAJOR_IDS.has(scale.id)) return 'major'
  if (MINOR_IDS.has(scale.id)) return 'minor'
  if (DOMINANT_IDS.has(scale.id)) return 'dominant'
  return 'color'
}

function getDefaultPriority(scale) {
  if (scale.id === 'whole-tone') return [0, 2, 4, 6, 8, 10, 7, 5, 1, 3, 9, 11]
  if (scale.id === 'diminished-half-whole') return [0, 3, 6, 9, 1, 4, 7, 10, 2, 5, 8, 11]
  if (scale.id === 'diminished-whole-half') return [0, 3, 6, 9, 2, 5, 8, 11, 1, 4, 7, 10]
  if (scale.id === 'altered') return [0, 6, 8, 4, 10, 1, 3, 2, 5, 7, 9, 11]
  if (MAJOR_IDS.has(scale.id)) return [0, 5, 7, 9, 2, 4, 11, 10, 8, 1, 6, 3]
  if (MINOR_IDS.has(scale.id)) return [0, 3, 8, 5, 10, 7, 2, 1, 11, 6, 4, 9]
  if (DOMINANT_IDS.has(scale.id)) return [0, 5, 10, 7, 2, 3, 9, 1, 6, 8, 4, 11]
  return [0, 7, 5, 2, 10, 3, 8, 1, 6, 4, 9, 11]
}

function normalizeIntervals(intervals) {
  return intervals.map((interval) => (interval + 12) % 12).sort((left, right) => left - right).join(',')
}

function chordFitsScale(scaleIntervals, rootInterval, qualityId) {
  const chordIntervals = Object.keys(CHORD_QUALITIES[qualityId]?.toneLabels ?? {}).map(Number)

  return chordIntervals.every((interval) => scaleIntervals.has((rootInterval + interval) % 12))
}

function getBestInsideChord(scale, rootInterval) {
  const scaleIntervals = new Set(scale.intervals)
  const preferences = INSIDE_CHORD_PREFERENCES[scale.id] ?? DEFAULT_INSIDE_CHORD_PREFERENCE

  return preferences.find((qualityId) => chordFitsScale(scaleIntervals, rootInterval, qualityId)) ?? null
}

function getDiatonicSourceScale(scale) {
  const parentId = DIATONIC_PARENT_SCALE_IDS[scale.id]

  return parentId ? SCALE_BY_ID[parentId] : scale
}

function getNumeral(rootInterval, quality, degreeIndex, triadQuality) {
  if (!quality) return FALLBACK_NUMERALS[rootInterval] ?? `${degreeIndex + 1}`

  const base = FALLBACK_NUMERALS[rootInterval] ?? `${degreeIndex + 1}`

  if (quality === 'dominant7Sharp5') return `${base}7#5`
  if (quality === 'dominant7Flat5') return `${base}7b5`
  if (quality === 'minorMajor7') return `${base}mMaj7`

  if (DEGREE_NUMERALS[triadQuality]?.[degreeIndex]) {
    return quality === triadQuality
      ? DEGREE_NUMERALS[triadQuality][degreeIndex]
      : `${DEGREE_NUMERALS[triadQuality][degreeIndex]}7`
  }

  if (quality === 'augmented') return `${base}+`
  if (quality === 'majorFlat5') return `${base}b5`
  if (quality === 'diminished7') return `${base}o7`
  if (quality === 'minor7Flat5') return `${base}o7`
  if (quality.endsWith('7')) return `${base}7`

  return base
}

function getDiatonicChord(scale, degreeIndex) {
  const sourceScale = getDiatonicSourceScale(scale)
  const degreeCount = sourceScale.intervals.length
  const rootInterval = sourceScale.intervals[degreeIndex]
  const third = (sourceScale.intervals[(degreeIndex + 2) % degreeCount] - rootInterval + 12) % 12
  const fifth = (sourceScale.intervals[(degreeIndex + 4) % degreeCount] - rootInterval + 12) % 12
  const seventh = (sourceScale.intervals[(degreeIndex + 6) % degreeCount] - rootInterval + 12) % 12
  const seventhQuality = SEVENTH_QUALITIES[normalizeIntervals([0, third, fifth, seventh])]
  const triadQuality = TRIAD_QUALITIES[normalizeIntervals([0, third, fifth])]
  const stackedQuality = seventhQuality ?? triadQuality
  const insideQuality = getBestInsideChord(scale, rootInterval)
  const shouldUseStackedQuality = sourceScale.intervals.length === 7
    && stackedQuality
    && chordFitsScale(new Set(scale.intervals), rootInterval, stackedQuality)
  const quality = shouldUseStackedQuality
    ? stackedQuality
    : insideQuality ?? stackedQuality

  return {
    interval: rootInterval,
    numeral: getNumeral(rootInterval, quality, degreeIndex, triadQuality),
    quality,
    summary: getDiatonicSummary(rootInterval, scale),
    tags: ['inside', getScaleMood(scale)],
  }
}

function getDiatonicSummary(interval, scale) {
  if (interval === 0) return `The root chord for ${scale.name}; the main point of reference.`
  if ([5, 7].includes(interval)) return 'One of the primary support chords for motion away from and back to the root.'
  if ([2, 9].includes(interval)) return 'A common secondary color that connects smoothly inside the collection.'
  if ([1, 6, 10].includes(interval)) return 'A modal color that can strongly identify this scale world.'
  return 'A less common inside color for passing movement or contrast.'
}

function getQualityForComplexity(baseQuality, complexity) {
  if (complexity.chordComplexity === 'triads') {
    if (baseQuality === 'major7' || baseQuality === 'dominant7' || baseQuality === 'dominant9') return 'maj'
    if (baseQuality === 'dominant7Sharp5') return 'augmented'
    if (baseQuality === 'dominant7Flat5') return 'majorFlat5'
    if (baseQuality === 'minor7') return 'min'
    if (baseQuality === 'minor7Flat5') return 'dim'
    if (baseQuality === 'minorMajor7') return 'min'
    if (baseQuality === 'diminished7') return 'dim'
  }

  if (complexity.chordComplexity === 'extended') {
    if (baseQuality === 'dominant7') return 'dominant9'
  }

  return baseQuality
}

function getScaleSuggestionIds(qualityId, complexityId, rootScaleId) {
  const base = [rootScaleId]

  if (qualityId === 'maj') base.push('ionian', 'major-bebop')
  if (qualityId === 'majorFlat5') base.push('lydian', 'altered')
  if (qualityId === 'augmented') base.push('whole-tone', 'lydian-dominant')
  if (qualityId === 'major7' || qualityId === 'six') base.push('ionian', 'lydian', 'major-bebop')
  if (qualityId === 'min' || qualityId === 'minor7') base.push('dorian', 'aeolian', 'minor-bebop')
  if (qualityId === 'minorMajor7') base.push('melodic-minor', 'harmonic-minor')
  if (qualityId === 'min6') base.push('melodic-minor', 'dorian')
  if (qualityId === 'dominant7' || qualityId === 'dominant9' || qualityId === 'dominant7Sus4') base.push('mixolydian', 'dominant-bebop')
  if (qualityId === 'dominant7Sharp5') base.push('whole-tone', 'altered')
  if (qualityId === 'dominant7Flat5') base.push('lydian-dominant', 'altered')
  if (qualityId === 'minor7Flat5') base.push('locrian', 'diminished-whole-half')
  if (qualityId === 'dim' || qualityId === 'diminished7') base.push('diminished-whole-half')

  if (complexityId === 'advanced-jazz') base.push('altered', 'diminished-half-whole', 'lydian-dominant')
  if (complexityId === 'impressionist') base.push('lydian', 'whole-tone')
  if (complexityId === 'experimental') base.push('whole-tone', 'diminished-half-whole', 'hungarian-minor')

  return [...new Set(base)].filter((id) => SCALE_BY_ID[id]).slice(0, 4)
}

function getDissonance(rootScale, chordRootInterval, qualityId) {
  const rootScaleIntervals = new Set(rootScale.intervals)
  const chordIntervals = Object.keys(CHORD_QUALITIES[qualityId]?.toneLabels ?? {}).map(Number)
  const missingToneCount = chordIntervals.filter((interval) => {
    const rootRelativeInterval = (chordRootInterval + interval) % 12
    return !rootScaleIntervals.has(rootRelativeInterval)
  }).length

  if (missingToneCount === 0) {
    return {
      level: 'Low',
      description: `The ${rootScale.name} collection contains the important chord tones.`,
    }
  }

  if (missingToneCount === 1) {
    return {
      level: 'Medium',
      description: `One important chord tone sits outside ${rootScale.name}; treat it as color or resolve it.`,
    }
  }

  return {
    level: 'High',
    description: `Several chord tones rub against ${rootScale.name}; use this as deliberate outside tension.`,
  }
}

function buildSuggestions(rootPitchClass, rootScale, chord, complexityId) {
  return getScaleSuggestionIds(chord.quality, complexityId, rootScale.id).map((scaleId) => {
    const scale = SCALE_BY_ID[scaleId]
    const scaleRootPitchClass = scaleId === rootScale.id
      ? rootPitchClass
      : (rootPitchClass + chord.interval) % 12
    const scaleRootLabel = ROOT_OPTIONS.find((option) => option.pitchClass === scaleRootPitchClass)?.label ?? 'C'
    const rows = buildFretboardRows(scaleRootPitchClass, scale, 12)
    const windows = buildPositionWindows(rows, scaleRootPitchClass, 12)
    const firstWindow = windows[0]
    const pitchClasses = scale.intervals.map((interval) => (scaleRootPitchClass + interval) % 12)
    const labelsByPitchClass = Object.fromEntries(
      scale.intervals.map((interval) => [(scaleRootPitchClass + interval) % 12, scale.degreeLabels[interval]]),
    )

    return {
      id: `${chord.id}-${scale.id}`,
      scaleId,
      rootLabel: scaleRootLabel,
      name: `${getPitchClassLabel(scaleRootPitchClass)} ${scale.name}`,
      sound: scale.sound,
      usage: scaleId === rootScale.id ? 'Root-scale reference over this chord.' : scale.usage,
      isRootScale: scaleId === rootScale.id,
      rootPitchClass: scaleRootPitchClass,
      pitchClasses,
      labelsByPitchClass,
      fullFrets: getVisibleFrets(0, 13, 12),
      fullRows: rows,
      positionFrets: firstWindow?.frets ?? getVisibleFrets(0, 5, 12),
      positionRows: rows,
    }
  })
}

export function buildArrangement(rootPitchClass, scale, complexityId) {
  const complexity = ARRANGEMENT_COMPLEXITY_OPTIONS.find((item) => item.id === complexityId) ?? ARRANGEMENT_COMPLEXITY_OPTIONS[0]
  const priority = getDefaultPriority(scale)
  const scaleIntervals = new Set(scale.intervals)
  const sourceScale = getDiatonicSourceScale(scale)
  const diatonicChords = sourceScale.intervals
    .map((_, index) => getDiatonicChord(scale, index))
    .filter((chord) => chord.quality)
  const extraChords = EXTRA_CHORDS[complexity.id] ?? []
  const allChords = [...diatonicChords, ...extraChords]
  const seen = new Set()

  const rows = allChords
    .map((chord) => {
      const key = `${chord.interval}-${chord.quality}-${chord.numeral}`
      const isInside = scaleIntervals.has(chord.interval)
      const priorityIndex = priority.indexOf(chord.interval)
      let quality = getQualityForComplexity(chord.quality, complexity)

      if (chord.tags?.includes('inside') && !chordFitsScale(scaleIntervals, chord.interval, quality)) {
        quality = chordFitsScale(scaleIntervals, chord.interval, chord.quality)
          ? chord.quality
          : getBestInsideChord(scale, chord.interval) ?? quality
      }

      const insideChord = chordFitsScale(scaleIntervals, chord.interval, quality)
      const chordRootPitchClass = (rootPitchClass + chord.interval) % 12
      const voicings = generateVoicings(chordRootPitchClass, quality, complexity.playability)

      return {
        ...chord,
        id: key,
        quality,
        rootPitchClass: chordRootPitchClass,
        name: getChordName(chordRootPitchClass, quality),
        formula: CHORD_QUALITIES[quality]?.formula ?? '',
        tags: [...new Set([...(chord.tags ?? []), isInside && insideChord ? 'scale tone' : 'borrowed'])],
        voicings,
        dissonance: getDissonance(scale, chord.interval, quality),
        priority: (priorityIndex === -1 ? 99 : priorityIndex) + (isInside && insideChord ? 0 : 20),
      }
    })
    .filter((chord) => {
      const key = `${chord.interval}-${chord.quality}`

      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((left, right) => left.priority - right.priority)
    .slice(0, complexity.id === 'folk-rock' ? 7 : 10)
    .map((chord) => ({
      ...chord,
      suggestions: buildSuggestions(rootPitchClass, scale, chord, complexity.id),
    }))

  return {
    complexity,
    rows,
  }
}
