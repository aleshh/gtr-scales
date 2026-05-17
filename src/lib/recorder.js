import { getDegreeLabel, getPitchClassLabel } from '../data/scales'

const CLOSED = 'closed'
const OPEN = 'open'
const HALF = 'half'

export const ALTO_RECORDER_HOLES = ['T', '1', '2', '3', '4', '5', '6', '7']
const ALTO_RECORDER_LOW_MIDI = 65
const ALTO_RECORDER_HIGH_MIDI = 91

const NOTE_LABELS = ['C', 'C#/Db', 'D', 'D#/Eb', 'E', 'F', 'F#/Gb', 'G', 'G#/Ab', 'A', 'A#/Bb', 'B']

export const ALTO_RECORDER_FINGERINGS = {
  65: {
    pattern: [CLOSED, CLOSED, CLOSED, CLOSED, CLOSED, CLOSED, CLOSED, CLOSED],
  },
  66: {
    pattern: [CLOSED, CLOSED, CLOSED, CLOSED, CLOSED, CLOSED, CLOSED, HALF],
  },
  67: {
    pattern: [CLOSED, CLOSED, CLOSED, CLOSED, CLOSED, CLOSED, CLOSED, OPEN],
  },
  68: {
    pattern: [CLOSED, CLOSED, CLOSED, CLOSED, CLOSED, CLOSED, HALF, OPEN],
  },
  69: {
    pattern: [CLOSED, CLOSED, CLOSED, CLOSED, CLOSED, CLOSED, OPEN, OPEN],
  },
  70: {
    pattern: [CLOSED, CLOSED, CLOSED, CLOSED, CLOSED, OPEN, CLOSED, CLOSED],
  },
  71: {
    pattern: [CLOSED, CLOSED, CLOSED, CLOSED, OPEN, CLOSED, CLOSED, OPEN],
  },
  72: {
    pattern: [CLOSED, CLOSED, CLOSED, CLOSED, OPEN, OPEN, OPEN, OPEN],
  },
  73: {
    pattern: [CLOSED, CLOSED, CLOSED, OPEN, CLOSED, CLOSED, HALF, OPEN],
  },
  74: {
    pattern: [CLOSED, CLOSED, CLOSED, OPEN, OPEN, OPEN, OPEN, OPEN],
  },
  75: {
    pattern: [CLOSED, CLOSED, OPEN, CLOSED, CLOSED, OPEN, OPEN, OPEN],
  },
  76: {
    pattern: [CLOSED, CLOSED, OPEN, OPEN, OPEN, OPEN, OPEN, OPEN],
  },
  77: {
    pattern: [HALF, CLOSED, CLOSED, CLOSED, CLOSED, CLOSED, CLOSED, CLOSED],
  },
  78: {
    pattern: [HALF, CLOSED, CLOSED, CLOSED, CLOSED, CLOSED, CLOSED, HALF],
  },
  79: {
    pattern: [HALF, CLOSED, CLOSED, CLOSED, CLOSED, CLOSED, CLOSED, OPEN],
  },
  80: {
    pattern: [HALF, CLOSED, CLOSED, CLOSED, CLOSED, CLOSED, HALF, OPEN],
  },
  81: {
    pattern: [HALF, CLOSED, CLOSED, CLOSED, CLOSED, CLOSED, OPEN, OPEN],
  },
  82: {
    pattern: [HALF, CLOSED, CLOSED, CLOSED, CLOSED, OPEN, CLOSED, CLOSED],
  },
  83: {
    pattern: [HALF, CLOSED, CLOSED, CLOSED, OPEN, CLOSED, CLOSED, OPEN],
  },
  84: {
    pattern: [HALF, CLOSED, CLOSED, CLOSED, OPEN, OPEN, OPEN, OPEN],
  },
  85: {
    pattern: [HALF, CLOSED, CLOSED, OPEN, CLOSED, CLOSED, HALF, OPEN],
  },
  86: {
    pattern: [HALF, CLOSED, CLOSED, OPEN, OPEN, OPEN, OPEN, OPEN],
  },
  87: {
    pattern: [HALF, CLOSED, OPEN, CLOSED, CLOSED, OPEN, OPEN, OPEN],
  },
  88: {
    pattern: [HALF, CLOSED, OPEN, OPEN, OPEN, OPEN, OPEN, OPEN],
  },
  89: {
    pattern: [HALF, OPEN, CLOSED, CLOSED, CLOSED, OPEN, OPEN, OPEN],
  },
  90: {
    pattern: [HALF, OPEN, CLOSED, CLOSED, OPEN, CLOSED, CLOSED, OPEN],
  },
  91: {
    pattern: [HALF, OPEN, CLOSED, CLOSED, OPEN, OPEN, CLOSED, OPEN],
  },
}

function getMidiPitchClass(midiNote) {
  return midiNote % 12
}

function getOctave(midiNote) {
  return Math.floor(midiNote / 12) - 1
}

function getRecorderNoteLabel(midiNote) {
  return `${NOTE_LABELS[getMidiPitchClass(midiNote)]}${getOctave(midiNote)}`
}

export function buildRecorderFingeringItems({
  rootPitchClass,
  intervals,
  labelsByInterval = {},
}) {
  const activeIntervals = new Set(intervals)
  const items = []

  for (let midiNote = ALTO_RECORDER_LOW_MIDI; midiNote <= ALTO_RECORDER_HIGH_MIDI; midiNote += 1) {
    const pitchClass = getMidiPitchClass(midiNote)
    const interval = (pitchClass - rootPitchClass + 12) % 12

    if (!activeIntervals.has(interval)) {
      continue
    }

    const fingering = ALTO_RECORDER_FINGERINGS[midiNote]

    items.push({
      midiNote,
      pitchClass,
      noteLabel: fingering ? getRecorderNoteLabel(midiNote) : getPitchClassLabel(pitchClass),
      degree: labelsByInterval[interval] ?? getDegreeLabel(interval),
      interval,
      isRoot: interval === 0,
      pattern: fingering?.pattern ?? [],
    })
  }

  return items
}
