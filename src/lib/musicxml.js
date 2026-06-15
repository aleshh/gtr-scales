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

function getWrittenMidi(midi, instrument) {
  return instrument === 'guitar' ? midi + 12 : midi
}

function getScaleBaseMidi(rootPitchClass, instrument) {
  const minimumMidi = {
    guitar: 52,
    cello: 48,
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
} = {}) {
  return `<note>${chord ? '<chord/>' : ''}${pitchXml(pitch)}<duration>${duration}</duration><type>${type}</type></note>`
}

function restXml(duration = 1, type = 'quarter') {
  return `<note><rest/><duration>${duration}</duration><type>${type}</type></note>`
}

function scoreXml({
  title,
  instrumentId,
  partName,
  measures,
}) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<score-partwise version="3.1">
  <work><work-title>${escapeXml(title)}</work-title></work>
  <part-list>
    <score-part id="P1"><part-name>${escapeXml(partName)}</part-name></score-part>
  </part-list>
  <part id="P1">
    ${measures.map((measure, index) => `
    <measure number="${index + 1}">
      ${index === 0 ? `<attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time>${getClef(instrumentId)}</attributes>` : ''}
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

export function buildScaleMusicXml({
  rootLabel,
  rootPitchClass,
  scale,
  instrument,
}) {
  const baseMidi = getScaleBaseMidi(rootPitchClass, instrument)
  const scaleNotes = [
    ...scale.intervals.map((interval, index) => ({
      interval,
      formulaLabel: scale.formulaLabels[index],
    })),
    { interval: 12, formulaLabel: '1' },
  ]
  const notes = scaleNotes.map(({ interval, formulaLabel }) => {
    const writtenMidi = getWrittenMidi(baseMidi + interval, instrument)
    return noteXml(getScalePitch(
      rootLabel,
      rootPitchClass,
      interval % 12,
      formulaLabel,
      writtenMidi,
    ))
  })
  const measures = []

  for (let index = 0; index < notes.length; index += 4) {
    const measure = notes.slice(index, index + 4)

    while (measure.length < 4) {
      measure.push(restXml())
    }

    measures.push(measure)
  }

  return scoreXml({
    title: `${rootLabel} ${scale.name}`,
    instrumentId: instrument,
    partName: getInstrumentName(instrument),
    measures,
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
  })
}

export function buildVoicingMusicXml({
  chordName,
  rows,
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
  })
}
