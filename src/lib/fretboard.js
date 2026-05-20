import { getDegreeLabel, getPitchClassLabel } from '../data/scales'

export const GUITAR_STRING_SET = [
  { label: 'E', openPitchClass: 4, openMidi: 64 },
  { label: 'B', openPitchClass: 11, openMidi: 59 },
  { label: 'G', openPitchClass: 7, openMidi: 55 },
  { label: 'D', openPitchClass: 2, openMidi: 50 },
  { label: 'A', openPitchClass: 9, openMidi: 45 },
  { label: 'E', openPitchClass: 4, openMidi: 40 },
]

export const CELLO_STRING_SET = [
  { label: 'A', openPitchClass: 9, openMidi: 57 },
  { label: 'D', openPitchClass: 2, openMidi: 50 },
  { label: 'G', openPitchClass: 7, openMidi: 43 },
  { label: 'C', openPitchClass: 0, openMidi: 36 },
]

export const STRING_SET = GUITAR_STRING_SET
export const MAX_FRET = 15
export const CELLO_MAX_POSITION = 12
export const POSITION_SPAN = 5
export const INLAY_FRETS = [3, 5, 7, 9, 12, 15]

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

export function getVisibleFrets(startFret, span = POSITION_SPAN, maxFret = MAX_FRET) {
  const endFret = Math.min(startFret + span - 1, maxFret)
  return Array.from({ length: endFret - startFret + 1 }, (_, index) => startFret + index)
}

export function buildInstrumentRows({
  rootPitchClass,
  intervals,
  labelsByInterval,
  maxFret = MAX_FRET,
  stringSet = GUITAR_STRING_SET,
}) {
  const activeIntervals = new Set(intervals)

  return stringSet.map((string) => {
    const notes = {}

    for (let fret = 0; fret <= maxFret; fret += 1) {
      const pitchClass = (string.openPitchClass + fret) % 12
      const interval = (pitchClass - rootPitchClass + 12) % 12

      if (!activeIntervals.has(interval)) {
        continue
      }

      notes[fret] = {
        degree: labelsByInterval[interval] ?? getDegreeLabel(interval),
        noteLabel: getPitchClassLabel(pitchClass),
        midiNote: string.openMidi + fret,
        pitchClass,
        interval,
        isRoot: interval === 0,
      }
    }

    return {
      label: string.label,
      notes,
    }
  })
}

export function buildFretboardRows(
  rootPitchClass,
  scale,
  maxFret = MAX_FRET,
  stringSet = GUITAR_STRING_SET,
) {
  return buildInstrumentRows({
    rootPitchClass,
    intervals: scale.intervals,
    labelsByInterval: scale.degreeLabels,
    maxFret,
    stringSet,
  })
}

function summarizeWindow(rows, frets) {
  let noteCount = 0
  let stringCoverage = 0

  rows.forEach((row) => {
    const rowHasNote = frets.some((fret) => row.notes[fret])

    if (rowHasNote) {
      stringCoverage += 1
    }

    frets.forEach((fret) => {
      if (row.notes[fret]) {
        noteCount += 1
      }
    })
  })

  return { noteCount, stringCoverage }
}

export function buildPositionWindows(
  rows,
  rootPitchClass,
  maxFret = MAX_FRET,
  span = POSITION_SPAN,
  stringSet = GUITAR_STRING_SET,
) {
  const highestStart = Math.max(0, maxFret - span + 1)
  const candidateStarts = new Set()

  stringSet.forEach((string) => {
    for (let fret = 0; fret <= maxFret; fret += 1) {
      const pitchClass = (string.openPitchClass + fret) % 12

      if (pitchClass !== rootPitchClass) {
        continue
      }

      candidateStarts.add(clamp(fret - 2, 0, highestStart))
    }
  })

  const sortedStarts = [...candidateStarts].sort((left, right) => left - right)
  const collapsedStarts = sortedStarts.reduce((starts, start) => {
    const lastStart = starts.at(-1)

    if (lastStart === undefined || start - lastStart >= 2) {
      starts.push(start)
    }

    return starts
  }, [])

  return collapsedStarts
    .map((start) => {
      const frets = getVisibleFrets(start, span, maxFret)
      const summary = summarizeWindow(rows, frets)

      return {
        start,
        end: frets.at(-1),
        frets,
        ...summary,
      }
    })
    .filter((window) => window.noteCount >= 9 && window.stringCoverage >= 4)
}

export function getInlayType(fret) {
  if (fret === 12) {
    return 'double'
  }

  if (INLAY_FRETS.includes(fret)) {
    return 'single'
  }

  return null
}
