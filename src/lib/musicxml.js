import { CHORD_QUALITIES } from '../data/chords'

const STEP_PITCH_CLASSES = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
}
const STEPS = Object.keys(STEP_PITCH_CLASSES)
const FLAT_PITCH_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
const SHARP_PITCH_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const MAJOR_KEY_FIFTHS_BY_PITCH_CLASS = [0, -5, 2, -3, 4, -1, 6, 1, -4, 3, -2, 5]
const MINOR_KEY_FIFTHS_BY_PITCH_CLASS = [-3, 4, -1, -6, 1, -4, 3, -2, 5, 0, -5, 2]
const MINOR_CHORD_FLAVORS = new Set(['natural-minor', 'harmonic-minor', 'jazz-minor'])
const MODAL_PARENT_MAJOR_OFFSETS = {
  dorian: 10,
  mixolydian: 5,
  lydian: 7,
}
const SCALE_KEY_CONTEXTS = {
  ionian: ['major', 0],
  dorian: ['major', 10],
  phrygian: ['major', 8],
  lydian: ['major', 7],
  mixolydian: ['major', 5],
  aeolian: ['major', 3],
  locrian: ['major', 1],
  'harmonic-minor': ['minor', 0],
  'melodic-minor': ['minor', 0],
  'harmonic-major': ['major', 0],
  'phrygian-dominant': ['minor', 5],
  'lydian-dominant': ['minor', 7],
  altered: ['minor', 1],
  'major-bebop': ['major', 0],
  'dominant-bebop': ['major', 5],
  'minor-bebop': ['minor', 0],
  'double-harmonic': ['major', 0],
  'hungarian-minor': ['minor', 0],
}

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function normalizeAlter(value) {
  if (value > 6) return value - 12
  if (value < -6) return value + 12
  return value
}

function getPitchFromLabel(label, midi) {
  const step = label[0]
  const alter = label.includes('b') ? -1 : label.includes('#') ? 1 : 0

  return {
    step,
    alter,
    octave: Math.floor(midi / 12) - 1,
  }
}

function getScalePitch(rootLabel, rootPitchClass, interval, formulaLabel, midi) {
  const degree = Number(formulaLabel.match(/\d+/)?.[0])
  const rootStepIndex = STEPS.indexOf(rootLabel[0])

  if (!degree || rootStepIndex < 0) {
    const fallback = rootLabel.includes('b')
      ? FLAT_PITCH_NAMES[(rootPitchClass + interval) % 12]
      : SHARP_PITCH_NAMES[(rootPitchClass + interval) % 12]

    return getPitchFromLabel(fallback, midi)
  }

  const step = STEPS[(rootStepIndex + degree - 1) % STEPS.length]
  const pitchClass = (rootPitchClass + interval) % 12
  const alter = normalizeAlter(pitchClass - STEP_PITCH_CLASSES[step])

  return {
    step,
    alter,
    octave: Math.floor(midi / 12) - 1,
  }
}

function getClef(instrument) {
  if (instrument === 'cello') {
    return '<clef><sign>F</sign><line>4</line></clef>'
  }

  if (instrument === 'guitar') {
    return '<clef><sign>G</sign><line>2</line><clef-octave-change>-1</clef-octave-change></clef>'
  }

  return '<clef><sign>G</sign><line>2</line></clef>'
}

function getWrittenMidi(midi) {
  return midi
}

function getOptimizedScaleBaseMidi({
  rootPitchClass,
  intervals,
  lowestMidi,
  highestMidi,
  notationOffset = 0,
  staffMinimumMidi,
  staffMaximumMidi,
}) {
  const highestInterval = Math.max(...intervals, 12)
  const candidates = []

  for (let midi = lowestMidi; midi + highestInterval <= highestMidi; midi += 1) {
    if (midi % 12 === rootPitchClass) {
      candidates.push(midi)
    }
  }

  return candidates.reduce((bestMidi, midi) => {
    const writtenNotes = [...intervals, 12].map((interval) => midi + interval + notationOffset)
    const ledgerPenalty = writtenNotes.reduce((total, noteMidi) => {
      if (noteMidi < staffMinimumMidi) return total + (staffMinimumMidi - noteMidi) ** 2
      if (noteMidi > staffMaximumMidi) return total + (noteMidi - staffMaximumMidi) ** 2
      return total
    }, 0)
    const centerPenalty = Math.abs(
      writtenNotes.reduce((total, noteMidi) => total + noteMidi, 0) / writtenNotes.length
        - ((staffMinimumMidi + staffMaximumMidi) / 2),
    )
    const score = ledgerPenalty * 100 + centerPenalty

    return !bestMidi || score < bestMidi.score ? { midi, score } : bestMidi
  }, null)?.midi ?? lowestMidi
}

function getScaleBaseMidi(rootPitchClass, instrument, intervals) {
  if (instrument === 'guitar') {
    return getOptimizedScaleBaseMidi({
      rootPitchClass,
      intervals,
      lowestMidi: 40,
      highestMidi: 79,
      notationOffset: 12,
      staffMinimumMidi: 60,
      staffMaximumMidi: 81,
    })
  }

  if (instrument === 'cello') {
    return getOptimizedScaleBaseMidi({
      rootPitchClass,
      intervals,
      lowestMidi: 36,
      highestMidi: 69,
      staffMinimumMidi: 43,
      staffMaximumMidi: 57,
    })
  }

  const minimumMidi = {
    'alto-recorder': 65,
    clarinet: 58,
    piano: 60,
  }[instrument] ?? 60
  let midi = minimumMidi

  while (midi % 12 !== rootPitchClass) {
    midi += 1
  }

  return midi
}

function getChordBaseMidi(rootPitchClass, instrument) {
  const minimumMidi = instrument === 'cello' ? 43 : instrument === 'guitar' ? 40 : 55
  let midi = minimumMidi

  while (midi % 12 !== rootPitchClass) {
    midi += 1
  }

  return midi
}

function getChordRootLabel(chord) {
  return chord.name.match(/^[A-G](?:b|#)?/)?.[0] ?? FLAT_PITCH_NAMES[chord.rootPitchClass]
}

function pitchXml({ step, alter, octave }) {
  return `<pitch><step>${step}</step>${alter ? `<alter>${alter}</alter>` : ''}<octave>${octave}</octave></pitch>`
}

function noteXml(pitch, {
  chord = false,
  duration = 1,
  type = 'quarter',
  labels = [],
} = {}) {
  const lyrics = labels
    .map((label, index) => `<lyric number="${index + 1}"><text>${escapeXml(label)}</text></lyric>`)
    .join('')

  return `<note>${chord ? '<chord/>' : ''}${pitchXml(pitch)}<duration>${duration}</duration><type>${type}</type>${lyrics}</note>`
}

function restXml(duration = 1, type = 'quarter') {
  return `<note><rest/><duration>${duration}</duration><type>${type}</type></note>`
}

function scoreXml({
  title,
  instrumentId,
  partName,
  measures,
  keyFifths = null,
  divisions = 1,
}) {
  const keySignature = Number.isFinite(keyFifths)
    ? `<key><fifths>${keyFifths}</fifths></key>`
    : ''

  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<score-partwise version="3.1">
  <work><work-title>${escapeXml(title)}</work-title></work>
  <part-list>
    <score-part id="P1"><part-name>${escapeXml(partName)}</part-name></score-part>
  </part-list>
  <part id="P1">
    ${measures.map((measure, index) => `
    <measure number="${index + 1}">
      ${index === 0 ? `<attributes><divisions>${divisions}</divisions>${keySignature}<time><beats>4</beats><beat-type>4</beat-type></time>${getClef(instrumentId)}</attributes>` : ''}
      ${measure.join('')}
    </measure>`).join('')}
  </part>
</score-partwise>`
}

function getInstrumentName(instrument) {
  return {
    guitar: 'Guitar',
    cello: 'Cello',
    'alto-recorder': 'Alto recorder',
    clarinet: 'Clarinet',
    piano: 'Piano',
  }[instrument] ?? 'Instrument'
}

export function getChordKeyFifths(rootPitchClass, flavorId) {
  if (MINOR_CHORD_FLAVORS.has(flavorId)) {
    return MINOR_KEY_FIFTHS_BY_PITCH_CLASS[rootPitchClass]
  }

  const parentMajorOffset = MODAL_PARENT_MAJOR_OFFSETS[flavorId]
  const keyPitchClass = Number.isFinite(parentMajorOffset)
    ? (rootPitchClass + parentMajorOffset) % 12
    : rootPitchClass

  return MAJOR_KEY_FIFTHS_BY_PITCH_CLASS[keyPitchClass]
}

export function getScaleKeyFifths(rootPitchClass, scaleId) {
  const [keyType, offset] = SCALE_KEY_CONTEXTS[scaleId] ?? []

  if (!keyType) return 0

  const keyPitchClass = (rootPitchClass + offset) % 12

  return keyType === 'minor'
    ? MINOR_KEY_FIFTHS_BY_PITCH_CLASS[keyPitchClass]
    : MAJOR_KEY_FIFTHS_BY_PITCH_CLASS[keyPitchClass]
}

function getPitchLabel({ step, alter }) {
  if (alter > 0) return `${step}${'#'.repeat(alter)}`
  if (alter < 0) return `${step}${'b'.repeat(Math.abs(alter))}`
  return step
}

export function buildScaleMusicXml({
  rootLabel,
  rootPitchClass,
  scale,
  instrument,
  keyFifths = null,
  showLabels = false,
}) {
  const baseMidi = getScaleBaseMidi(rootPitchClass, instrument, scale.intervals)
  const scaleNotes = [
    ...scale.intervals.map((interval, index) => ({
      interval,
      formulaLabel: scale.formulaLabels[index],
    })),
    { interval: 12, formulaLabel: '1' },
  ]
  const notes = scaleNotes.map(({ interval, formulaLabel }) => {
    const writtenMidi = getWrittenMidi(baseMidi + interval, instrument)
    const pitch = getScalePitch(
      rootLabel,
      rootPitchClass,
      interval % 12,
      formulaLabel,
      writtenMidi,
    )

    return noteXml(pitch, showLabels ? {
      duration: 1,
      type: 'eighth',
      labels: [getPitchLabel(pitch), formulaLabel],
    } : undefined)
  })
  const measures = showLabels ? [notes] : []

  if (!showLabels) {
    for (let index = 0; index < notes.length; index += 4) {
      const measure = notes.slice(index, index + 4)

      while (measure.length < 4) {
        measure.push(restXml())
      }

      measures.push(measure)
    }
  }

  return scoreXml({
    title: `${rootLabel} ${scale.name}`,
    instrumentId: instrument,
    partName: getInstrumentName(instrument),
    measures,
    keyFifths,
    divisions: showLabels ? 2 : 1,
  })
}

function getVoicingNotes(rows) {
  return rows
    .flatMap((row) => Object.values(row.notes))
    .filter((note) => Number.isFinite(note.midiNote))
    .sort((left, right) => left.midiNote - right.midiNote)
}

export function buildChordMusicXml({
  chord,
  instrument,
  keyFifths = null,
}) {
  const qualityId = chord.qualityId ?? chord.quality
  const quality = CHORD_QUALITIES[qualityId] ?? CHORD_QUALITIES.maj
  const baseMidi = getChordBaseMidi(chord.rootPitchClass, instrument)
  const rootLabel = getChordRootLabel(chord)
  const intervals = Object.keys(quality.toneLabels).map(Number).sort((left, right) => left - right)
  const firstInversionIntervals = [...intervals.slice(1), intervals[0] + 12]
  const notes = firstInversionIntervals.map((interval, index) => {
    const midi = baseMidi + interval
    const writtenMidi = getWrittenMidi(midi, instrument)

    return noteXml(getScalePitch(
      rootLabel,
      chord.rootPitchClass,
      interval % 12,
      quality.toneLabels[interval % 12] ?? '1',
      writtenMidi,
    ), {
      chord: index > 0,
      duration: 4,
      type: 'whole',
    })
  })

  return scoreXml({
    title: chord.name,
    instrumentId: instrument,
    partName: getInstrumentName(instrument),
    measures: [notes],
    keyFifths,
  })
}

export function buildVoicingMusicXml({
  chordName,
  rows,
  keyFifths = null,
}) {
  const voicingNotes = getVoicingNotes(rows)
  const rootNote = voicingNotes.find((note) => note.interval === 0)
  const rootPitchClass = rootNote?.pitchClass
    ?? (voicingNotes[0] ? (voicingNotes[0].pitchClass - voicingNotes[0].interval + 12) % 12 : 0)
  const rootLabel = chordName.match(/^[A-G](?:b|#)?/)?.[0] ?? FLAT_PITCH_NAMES[rootPitchClass]
  const notes = voicingNotes.map((note, index) => {
    const writtenMidi = getWrittenMidi(note.midiNote, 'guitar')

    return noteXml(getScalePitch(
      rootLabel,
      rootPitchClass,
      note.interval,
      note.degree,
      writtenMidi,
    ), {
      chord: index > 0,
      duration: 4,
      type: 'whole',
    })
  })

  return scoreXml({
    title: chordName,
    instrumentId: 'guitar',
    partName: 'Guitar',
    measures: [notes],
    keyFifths,
  })
}
