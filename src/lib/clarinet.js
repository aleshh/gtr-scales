import { getDegreeLabel, getPitchClassLabel } from '../data/scales'

const CLOSED = 'closed'
const OPEN = 'open'

export const CLARINET_ROWS = [
  { id: 'reg', label: 'Reg', type: 'lever', groupEnd: true },
  { id: 'thumb', label: 'T', type: 'hole', holeIndex: 1 },
  { id: 'l1', label: 'L1', type: 'hole', holeIndex: 2 },
  { id: 'l2', label: 'L2', type: 'hole', holeIndex: 3 },
  { id: 'l3', label: 'L3', type: 'hole', holeIndex: 4, groupEnd: true },
  { id: 'g-sharp', label: 'G#', type: 'lever', key: 'G#' },
  { id: 'a', label: 'A', type: 'lever', key: 'A' },
  { id: 'bb', label: 'Bb', type: 'lever', key: 'Bb', groupEnd: true },
  { id: 'r1', label: 'R1', type: 'hole', holeIndex: 5 },
  { id: 'r2', label: 'R2', type: 'hole', holeIndex: 6 },
  { id: 'r3', label: 'R3', type: 'hole', holeIndex: 7, groupEnd: true },
  { id: 'side', label: 'Side', type: 'lever', keyGroup: ['A#/F', 'C#/G#', 'Eb/Bb'] },
  { id: 'left-pinky', label: 'L pinky', type: 'pinky', keyGroup: ['E/B', 'F/C', 'F#/C#'] },
  { id: 'right-pinky', label: 'R pinky', type: 'pinky', keyGroup: ['G#/D#', 'A#/F', 'C#/G#', 'Eb/Bb'] },
]
const CLARINET_LOW_MIDI = 52
const CLARINET_HIGH_MIDI = 84
const NOTE_LABELS = ['C', 'C#/Db', 'D', 'D#/Eb', 'E', 'F', 'F#/Gb', 'G', 'G#/Ab', 'A', 'A#/Bb', 'B']

const BASE_FINGERINGS = {
  52: { holes: [OPEN, CLOSED, CLOSED, CLOSED, CLOSED, CLOSED, CLOSED, CLOSED], keys: ['E/B'] },
  53: { holes: [OPEN, CLOSED, CLOSED, CLOSED, CLOSED, CLOSED, CLOSED, CLOSED], keys: ['F/C'] },
  54: { holes: [OPEN, CLOSED, CLOSED, CLOSED, CLOSED, CLOSED, CLOSED, OPEN], keys: ['F#/C#'] },
  55: { holes: [OPEN, CLOSED, CLOSED, CLOSED, CLOSED, CLOSED, CLOSED, CLOSED], keys: [] },
  56: { holes: [OPEN, CLOSED, CLOSED, CLOSED, CLOSED, CLOSED, OPEN, OPEN], keys: ['G#/D#'] },
  57: { holes: [OPEN, CLOSED, CLOSED, CLOSED, CLOSED, CLOSED, OPEN, OPEN], keys: [] },
  58: { holes: [OPEN, CLOSED, CLOSED, CLOSED, CLOSED, OPEN, CLOSED, CLOSED], keys: ['A#/F'] },
  59: { holes: [OPEN, CLOSED, CLOSED, CLOSED, CLOSED, OPEN, OPEN, OPEN], keys: [] },
  60: { holes: [OPEN, CLOSED, CLOSED, CLOSED, OPEN, OPEN, OPEN, OPEN], keys: [] },
  61: { holes: [OPEN, CLOSED, CLOSED, OPEN, CLOSED, CLOSED, OPEN, OPEN], keys: ['C#/G#'] },
  62: { holes: [OPEN, CLOSED, CLOSED, OPEN, OPEN, OPEN, OPEN, OPEN], keys: [] },
  63: { holes: [OPEN, CLOSED, OPEN, CLOSED, CLOSED, OPEN, OPEN, OPEN], keys: ['Eb/Bb'] },
  64: { holes: [OPEN, CLOSED, OPEN, OPEN, OPEN, OPEN, OPEN, OPEN], keys: [] },
  65: { holes: [OPEN, OPEN, CLOSED, OPEN, OPEN, OPEN, OPEN, OPEN], keys: [] },
  66: { holes: [OPEN, OPEN, CLOSED, OPEN, OPEN, OPEN, OPEN, OPEN], keys: ['Bb'] },
  67: { holes: [OPEN, OPEN, OPEN, OPEN, OPEN, OPEN, OPEN, OPEN], keys: [] },
  68: { holes: [OPEN, OPEN, OPEN, OPEN, OPEN, OPEN, OPEN, OPEN], keys: ['G#'] },
  69: { holes: [OPEN, OPEN, OPEN, OPEN, OPEN, OPEN, OPEN, OPEN], keys: ['A'] },
  70: { holes: [OPEN, OPEN, OPEN, OPEN, OPEN, OPEN, OPEN, OPEN], keys: ['A', 'Bb'] },
  71: { holes: [CLOSED, CLOSED, CLOSED, CLOSED, CLOSED, CLOSED, CLOSED, CLOSED], keys: ['E/B'] },
  72: { holes: [CLOSED, CLOSED, CLOSED, CLOSED, CLOSED, CLOSED, CLOSED, CLOSED], keys: ['F/C'] },
  73: { holes: [CLOSED, CLOSED, CLOSED, CLOSED, CLOSED, CLOSED, CLOSED, OPEN], keys: ['F#/C#'] },
  74: { holes: [CLOSED, CLOSED, CLOSED, CLOSED, CLOSED, CLOSED, CLOSED, CLOSED], keys: [] },
  75: { holes: [CLOSED, CLOSED, CLOSED, CLOSED, CLOSED, CLOSED, OPEN, OPEN], keys: ['G#/D#'] },
  76: { holes: [CLOSED, CLOSED, CLOSED, CLOSED, CLOSED, CLOSED, OPEN, OPEN], keys: [] },
  77: { holes: [CLOSED, CLOSED, CLOSED, CLOSED, CLOSED, OPEN, CLOSED, CLOSED], keys: ['A#/F'] },
  78: { holes: [CLOSED, CLOSED, CLOSED, CLOSED, CLOSED, OPEN, OPEN, OPEN], keys: [] },
  79: { holes: [CLOSED, CLOSED, CLOSED, CLOSED, OPEN, OPEN, OPEN, OPEN], keys: [] },
  80: { holes: [CLOSED, CLOSED, CLOSED, OPEN, CLOSED, CLOSED, OPEN, OPEN], keys: ['C#/G#'] },
  81: { holes: [CLOSED, CLOSED, CLOSED, OPEN, OPEN, OPEN, OPEN, OPEN], keys: [] },
  82: { holes: [CLOSED, CLOSED, OPEN, CLOSED, CLOSED, OPEN, OPEN, OPEN], keys: ['Eb/Bb'] },
  83: { holes: [CLOSED, CLOSED, OPEN, OPEN, OPEN, OPEN, OPEN, OPEN], keys: [] },
  84: { holes: [CLOSED, OPEN, CLOSED, OPEN, OPEN, OPEN, OPEN, OPEN], keys: [] },
}

function getRowState(row, fingering) {
  if (!fingering) return OPEN

  if (row.type === 'hole') {
    return fingering.holes[row.holeIndex] ?? OPEN
  }

  if (row.id === 'reg') {
    return fingering.holes[0] === CLOSED ? CLOSED : OPEN
  }

  if (row.key) {
    return fingering.keys.includes(row.key) ? CLOSED : OPEN
  }

  if (row.keyGroup) {
    return row.keyGroup.some((key) => fingering.keys.includes(key)) ? CLOSED : OPEN
  }

  return OPEN
}

function getMidiPitchClass(midiNote) {
  return midiNote % 12
}

function getOctave(midiNote) {
  return Math.floor(midiNote / 12) - 1
}

function getClarinetNoteLabel(midiNote) {
  return `${NOTE_LABELS[getMidiPitchClass(midiNote)]}${getOctave(midiNote)}`
}

export function buildClarinetFingeringItems({
  rootPitchClass,
  intervals,
  labelsByInterval = {},
}) {
  const activeIntervals = new Set(intervals)
  const items = []

  for (let midiNote = CLARINET_LOW_MIDI; midiNote <= CLARINET_HIGH_MIDI; midiNote += 1) {
    const pitchClass = getMidiPitchClass(midiNote)
    const interval = (pitchClass - rootPitchClass + 12) % 12

    if (!activeIntervals.has(interval)) {
      continue
    }

    const fingering = BASE_FINGERINGS[midiNote]

    items.push({
      midiNote,
      pitchClass,
      noteLabel: fingering ? getClarinetNoteLabel(midiNote) : getPitchClassLabel(pitchClass),
      degree: labelsByInterval[interval] ?? getDegreeLabel(interval),
      interval,
      isRoot: interval === 0,
      pattern: CLARINET_ROWS.map((row) => getRowState(row, fingering)),
      keys: fingering?.keys ?? [],
    })
  }

  return items
}
