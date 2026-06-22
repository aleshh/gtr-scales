import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown, Gauge, Metronome, Music4, Pause, Play, Plus, Repeat, Shuffle, Square, Trash2, X } from 'lucide-react'
import './App.css'
import SheetMusicChart from './components/SheetMusicChart'
import {
  ROOT_OPTIONS,
  SCALE_LIBRARY,
  getDegreeLabel,
  getScaleFormula,
  getPitchCollectionLabels,
} from './data/scales'
import {
  CHORD_COMPLEXITY_OPTIONS,
  CHORD_FLAVOR_LIBRARY,
  CHORD_QUALITIES,
} from './data/chords'
import {
  ARRANGEMENT_COMPLEXITY_OPTIONS,
} from './data/arrangements'
import {
  CELLO_MAX_POSITION,
  CELLO_STRING_SET,
  GUITAR_STRING_SET,
  MAX_FRET,
  buildInstrumentRows,
  buildFretboardRows,
  buildPositionWindows,
  getInlayType,
  getVisibleFrets,
} from './lib/fretboard'
import {
  ALTO_RECORDER_HOLES,
  buildRecorderFingeringItems,
} from './lib/recorder'
import {
  CLARINET_ROWS,
  buildClarinetFingeringItems,
} from './lib/clarinet'
import { buildChordGroups, getChordName } from './lib/chords'
import { buildArrangement } from './lib/arrangements'
import { formatMusicText } from './lib/display'
import {
  buildChordMusicXml,
  buildScaleMusicXml,
  buildVoicingMusicXml,
  getChordKeyFifths,
  getChordStaffMidiNotes,
  getScaleKeyFifths,
  getScaleRootForKeyFifths,
} from './lib/musicxml'

const DEFAULT_QUERY_STATE = {
  mode: 'harmony',
  root: 'E',
  scale: 'phrygian',
  flavor: 'major',
  complexity: 'sevenths',
  harmonyComplexity: 'simple',
  instrument: 'guitar',
}

const QUERY_SETTING_KEYS = [
  'mode',
  'instrument',
  'root',
  'scale',
  'flavor',
  'complexity',
  'harmonyComplexity',
]

const VALID_MODES = new Set(['scales', 'chords', 'harmony', 'compose'])
const VALID_INSTRUMENTS = new Set(['guitar', 'piano', 'cello', 'alto-recorder', 'clarinet'])
const VALID_ROOTS = new Set(ROOT_OPTIONS.map((option) => option.label))
const VALID_SCALES = new Set(SCALE_LIBRARY.map((item) => item.id))
const VALID_FLAVORS = new Set(CHORD_FLAVOR_LIBRARY.map((item) => item.id))
const VALID_COMPLEXITIES = new Set(CHORD_COMPLEXITY_OPTIONS.map((item) => item.id))
const VALID_HARMONY_COMPLEXITIES = new Set(ARRANGEMENT_COMPLEXITY_OPTIONS.map((item) => item.id))
const LEGACY_HARMONY_COMPLEXITIES = {
  'folk-rock': 'simple',
  'pop-soul': 'sevenths',
  classical: 'sevenths',
  jazz: 'extended',
  impressionist: 'extended',
  'advanced-jazz': 'advanced',
  experimental: 'advanced',
}

function getValidQueryValue(params, key, validValues, fallback) {
  const value = params.get(key)
  return value && validValues.has(value) ? value : fallback
}

function getValidHarmonyComplexity(params) {
  const value = ['harmonyComplexity', 'arrangementComplexity'].map((key) => params.get(key)).find(Boolean)
  const normalizedValue = LEGACY_HARMONY_COMPLEXITIES[value] ?? value

  return normalizedValue && VALID_HARMONY_COMPLEXITIES.has(normalizedValue)
    ? normalizedValue
    : DEFAULT_QUERY_STATE.harmonyComplexity
}

function readQueryState(search = '') {
  const params = new URLSearchParams(search)

  return {
    mode: getValidQueryValue(params, 'mode', VALID_MODES, DEFAULT_QUERY_STATE.mode),
    instrument: getValidQueryValue(params, 'instrument', VALID_INSTRUMENTS, DEFAULT_QUERY_STATE.instrument),
    root: getValidQueryValue(params, 'root', VALID_ROOTS, DEFAULT_QUERY_STATE.root),
    scale: getValidQueryValue(params, 'scale', VALID_SCALES, DEFAULT_QUERY_STATE.scale),
    flavor: getValidQueryValue(params, 'flavor', VALID_FLAVORS, DEFAULT_QUERY_STATE.flavor),
    complexity: getValidQueryValue(params, 'complexity', VALID_COMPLEXITIES, DEFAULT_QUERY_STATE.complexity),
    harmonyComplexity: getValidHarmonyComplexity(params),
  }
}

function getQuerySettingKeys(search = '') {
  const params = new URLSearchParams(search)
  return new Set(QUERY_SETTING_KEYS.filter((key) => params.has(key)))
}

const PIANO_WHITE_KEY_PITCH_CLASSES = [0, 2, 4, 5, 7, 9, 11]
const PIANO_BLACK_KEY_LAYOUT = [
  { pitchClass: 1, afterWhiteIndex: 0 },
  { pitchClass: 3, afterWhiteIndex: 1 },
  { pitchClass: 6, afterWhiteIndex: 3 },
  { pitchClass: 8, afterWhiteIndex: 4 },
  { pitchClass: 10, afterWhiteIndex: 5 },
]
const PIANO_KEY_LABELS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
const PROGRESSION_TICKS_PER_BAR = 8
const BEATS_PER_BAR = 4
const MAX_PROGRESSION_BARS = 500
const DEFAULT_PROGRESSION_TEMPO = 96
const DEFAULT_PROGRESSION_CHORD_VOLUME = 82
const DEFAULT_PROGRESSION_CLICK_VOLUME = 46
const DEFAULT_PLAYBACK_VOICE = 'auto'
const CHORD_PALETTE_SORT_OPTIONS = [
  {
    id: 'root',
    label: 'Root order',
    help: 'Move upward from the selected tonic by chord root, like reading the scale from home base.',
  },
  {
    id: 'inside',
    label: 'Scale tones',
    help: 'Group chords that fit the selected scale before borrowed and outside colors.',
  },
  {
    id: 'fifths',
    label: 'Circle',
    help: 'Order roots by fifth relationships, useful for hearing dominant motion and common progressions.',
  },
  {
    id: 'smooth',
    label: 'Smooth path',
    help: 'Arrange each chord near the previous one, favoring shared tones and small voice-leading moves.',
  },
  {
    id: 'contrast',
    label: 'Contrast path',
    help: 'Arrange each chord far from the previous one, favoring fewer shared tones and bigger harmonic jumps.',
  },
]
const SCALE_FAMILY_ORDER = [
  'Common modes',
  'Harmonic and melodic colors',
  'Bebop scales',
  'Exotic colors',
  'Symmetric scales',
]
const FIFTH_ORDER = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5]
const DISSONANCE_ORDER = {
  Low: 0,
  Medium: 1,
  High: 2,
}
const PROGRESSION_DURATION_OPTIONS = [
  { label: '1/8 bar', ticks: 1 },
  { label: '1/4 bar', ticks: 2 },
  { label: '1/2 bar', ticks: 4 },
  { label: '1 bar', ticks: 8 },
  { label: '2 bars', ticks: 16 },
  { label: '4 bars', ticks: 32 },
  { label: '8 bars', ticks: 64 },
]
const PROGRESSION_CLICK_OPTIONS = [
  { id: 'off', label: 'No click' },
  { id: 'downbeat', label: 'Downbeat' },
  { id: 'beat', label: 'Beats' },
  { id: 'eighth', label: 'Eighths' },
]
const PLAYBACK_VOICE_OPTIONS = [
  { id: 'auto', label: 'Auto' },
  { id: 'guitar', label: 'Guitar' },
  { id: 'cello', label: 'Cello' },
  { id: 'electric-piano', label: 'Electric piano' },
  { id: 'recorder', label: 'Recorder' },
  { id: 'clarinet', label: 'Clarinet' },
  { id: 'sine', label: 'Reference tone' },
]

function getResolvedPlaybackVoice(voice, instrument) {
  if (voice !== 'auto') return voice
  if (instrument === 'guitar') return 'guitar'
  if (instrument === 'cello') return 'cello'
  if (instrument === 'alto-recorder') return 'recorder'
  if (instrument === 'clarinet') return 'clarinet'

  return 'electric-piano'
}

const CUSTOM_CHORD_QUALITY_OPTIONS = [
  'maj',
  'min',
  'dominant7',
  'major7',
  'minor7',
  'dim',
  'augmented',
  'sus4',
  'minor7Flat5',
  'dominant9',
  'dominant7Sus4',
]
const CHROMATIC_TUNER_NOTES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
const TUNER_MIC_CONSTRAINTS = {
  audio: {
    autoGainControl: false,
    echoCancellation: false,
    noiseSuppression: false,
  },
}

function interpolateColor(start, end, t) {
  const amount = Math.max(0, Math.min(1, t))
  const channels = start.map((channel, index) => Math.round(channel + ((end[index] - channel) * amount)))
  return `rgb(${channels.join(', ')})`
}

function getTunerIndicatorStyle(cents) {
  if (!Number.isFinite(cents)) return undefined

  const absoluteCents = Math.abs(cents)
  const yellow = [238, 214, 74]
  const orange = [224, 126, 41]
  const red = [190, 54, 54]

  if (absoluteCents <= 4) {
    return { backgroundColor: `rgb(${yellow.join(', ')})`, color: '#243026' }
  }

  if (absoluteCents <= 28) {
    return {
      backgroundColor: interpolateColor(yellow, orange, (absoluteCents - 4) / 24),
      color: '#243026',
    }
  }

  return {
    backgroundColor: interpolateColor(orange, red, (absoluteCents - 28) / 22),
    color: '#fff8ee',
  }
}

function frequencyToPitch(frequency) {
  const midi = Math.round(69 + 12 * Math.log2(frequency / 440))
  const targetFrequency = 440 * (2 ** ((midi - 69) / 12))
  const cents = 1200 * Math.log2(frequency / targetFrequency)

  return {
    note: `${CHROMATIC_TUNER_NOTES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`,
    midi,
    cents,
    frequency,
  }
}

async function requestTunerStream() {
  try {
    return await navigator.mediaDevices.getUserMedia(TUNER_MIC_CONSTRAINTS)
  } catch (error) {
    if (error?.name === 'OverconstrainedError' || error?.name === 'ConstraintNotSatisfiedError') {
      return navigator.mediaDevices.getUserMedia({ audio: true })
    }

    throw error
  }
}

function getBufferRms(buffer) {
  let rms = 0

  for (let index = 0; index < buffer.length; index += 1) {
    rms += buffer[index] ** 2
  }

  return Math.sqrt(rms / buffer.length)
}

function autoCorrelate(buffer, sampleRate) {
  const rms = getBufferRms(buffer)
  if (rms < 0.01) return null

  let bestOffset = -1
  let bestCorrelation = 0
  const minOffset = Math.floor(sampleRate / 1000)
  const maxOffset = Math.floor(sampleRate / 60)

  for (let offset = minOffset; offset <= maxOffset; offset += 1) {
    let correlation = 0

    for (let index = 0; index < buffer.length - offset; index += 1) {
      correlation += 1 - Math.abs(buffer[index] - buffer[index + offset])
    }

    correlation /= buffer.length - offset

    if (correlation > bestCorrelation) {
      bestCorrelation = correlation
      bestOffset = offset
    }
  }

  return bestCorrelation > 0.82 && bestOffset > 0 ? sampleRate / bestOffset : null
}

function createProgressionEvent(chordId, startTick, durationTicks) {
  return {
    id: `${chordId}-${startTick}-${durationTicks}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    chordId,
    startTick,
    durationTicks,
  }
}

function getProgressionTotalTicks(barCount) {
  return barCount * PROGRESSION_TICKS_PER_BAR
}

function getProgressionTickDuration(tempo) {
  return 60 / tempo / (PROGRESSION_TICKS_PER_BAR / BEATS_PER_BAR)
}

function getEventEndTick(event) {
  return event.startTick + event.durationTicks
}

function getProgressionPlaybackSegments(event) {
  const eventEndTick = getEventEndTick(event)
  const segmentStartTicks = [event.startTick]
  const firstBarStartTick = Math.ceil((event.startTick + 1) / PROGRESSION_TICKS_PER_BAR) * PROGRESSION_TICKS_PER_BAR

  for (let tick = firstBarStartTick; tick < eventEndTick; tick += PROGRESSION_TICKS_PER_BAR) {
    segmentStartTicks.push(tick)
  }

  return segmentStartTicks.map((startTick, index) => {
    const nextStartTick = segmentStartTicks[index + 1] ?? eventEndTick

    return {
      startTick,
      durationTicks: nextStartTick - startTick,
    }
  })
}

function sortProgressionEvents(events) {
  return [...events].sort((left, right) => left.startTick - right.startTick || left.id.localeCompare(right.id))
}

function getProgressionGaps(events, totalTicks) {
  const gaps = []
  let cursor = 0

  sortProgressionEvents(events).forEach((event) => {
    if (event.startTick > cursor) {
      gaps.push({ startTick: cursor, durationTicks: event.startTick - cursor })
    }

    cursor = Math.max(cursor, getEventEndTick(event))
  })

  if (cursor < totalTicks) {
    gaps.push({ startTick: cursor, durationTicks: totalTicks - cursor })
  }

  return gaps
}

function eventFits(events, startTick, durationTicks, totalTicks, ignoredEventId = null) {
  const endTick = startTick + durationTicks

  if (startTick < 0 || durationTicks < 1 || endTick > totalTicks) {
    return false
  }

  return events.every((event) => (
    event.id === ignoredEventId
      || endTick <= event.startTick
      || startTick >= getEventEndTick(event)
  ))
}

function findFirstProgressionGap(events, durationTicks, totalTicks) {
  return getProgressionGaps(events, totalTicks).find((gap) => gap.durationTicks >= durationTicks)
}

function getAvailableProgressionTicks(events, startTick, totalTicks, ignoredEventId = null) {
  if (startTick < 0 || startTick >= totalTicks) return 0

  const blockingEvent = events.find((event) => (
    event.id !== ignoredEventId
      && startTick >= event.startTick
      && startTick < getEventEndTick(event)
  ))

  if (blockingEvent) return 0

  const nextEvent = sortProgressionEvents(events)
    .find((event) => event.id !== ignoredEventId && event.startTick > startTick)

  return (nextEvent?.startTick ?? totalTicks) - startTick
}

function getPlacementDuration(events, startTick, requestedDurationTicks, totalTicks) {
  const availableTicks = getAvailableProgressionTicks(events, startTick, totalTicks)

  return Math.min(requestedDurationTicks, availableTicks)
}

function clampProgressionDuration(durationTicks, startTick, totalTicks) {
  return Math.max(1, Math.min(durationTicks, totalTicks - startTick))
}

function getDurationLabel(ticks) {
  const exact = PROGRESSION_DURATION_OPTIONS.find((option) => option.ticks === ticks)

  if (exact) return exact.label

  return ticks % PROGRESSION_TICKS_PER_BAR === 0
    ? `${ticks / PROGRESSION_TICKS_PER_BAR} bars`
    : `${ticks}/8 bar`
}

function getClampedTempo(value) {
  const nextValue = Number(value)

  if (!Number.isFinite(nextValue)) return DEFAULT_PROGRESSION_TEMPO

  return Math.max(30, Math.min(240, Math.round(nextValue)))
}

function getFrequencyFromMidi(midi) {
  return 440 * (2 ** ((midi - 69) / 12))
}

function getChordPlaybackFrequencies(chord) {
  const quality = CHORD_QUALITIES[chord.qualityId ?? chord.quality]

  if (!quality) return []

  const rootMidi = 48 + chord.rootPitchClass
  const intervals = Object.keys(quality.toneLabels)
    .map(Number)
    .sort((left, right) => {
      const normalizedLeft = left === 2 ? 14 : left
      const normalizedRight = right === 2 ? 14 : right

      return normalizedLeft - normalizedRight
    })

  return intervals.map((interval) => {
    const voicedInterval = interval === 2 ? 14 : interval
    const midi = rootMidi + voicedInterval

    return getFrequencyFromMidi(midi)
  })
}

function getFretboardVoicingFrequencies(rows) {
  return rows
    .flatMap((row) => Object.values(row.notes))
    .filter((note) => Number.isFinite(note.midiNote))
    .sort((left, right) => left.midiNote - right.midiNote)
    .map((note) => getFrequencyFromMidi(note.midiNote))
}

function getTypicalityLabel(value) {
  if (value < 34) return 'Common'
  if (value < 67) return 'Mixed'
  return 'Unusual'
}

function getWeightedChord(chords, typicality) {
  const unusualBias = typicality / 100
  const weighted = chords.map((chord, index) => {
    const dissonanceWeight = chord.dissonance.level === 'High'
      ? 3
      : chord.dissonance.level === 'Medium'
        ? 1.8
        : 1
    const borrowedWeight = chord.tags.includes('borrowed') ? 1.8 : 1
    const priorityWeight = Math.max(0.4, 2.4 - index * 0.18)
    const commonWeight = chord.interval === 0 ? 2.6 : priorityWeight
    const unusualWeight = (index + 1) * borrowedWeight * dissonanceWeight

    return {
      chord,
      weight: commonWeight * (1 - unusualBias) + unusualWeight * unusualBias,
    }
  })
  const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0)
  let target = Math.random() * totalWeight

  for (const item of weighted) {
    target -= item.weight

    if (target <= 0) {
      return item.chord
    }
  }

  return weighted.at(-1)?.chord ?? chords[0]
}

function getChordDissonanceRank(chord) {
  return DISSONANCE_ORDER[chord.dissonance?.level] ?? 1
}

function getChordInsideRank(chord) {
  if (chord.tags?.includes('scale tone') || chord.tags?.includes('inside')) return 0
  if (chord.tags?.includes('borrowed')) return 1
  return 2
}

function getChordRootInterval(chord, tonicPitchClass) {
  if (Number.isFinite(chord.rootPitchClass)) {
    return (chord.rootPitchClass - tonicPitchClass + 12) % 12
  }

  return chord.interval ?? 0
}

function getChordTonePitchClasses(chord) {
  const quality = CHORD_QUALITIES[chord.qualityId ?? chord.quality]

  if (!quality || !Number.isFinite(chord.rootPitchClass)) return []

  return Object.keys(quality.toneLabels)
    .map(Number)
    .map((interval) => (chord.rootPitchClass + interval) % 12)
}

function getPitchClassDistance(left, right) {
  const distance = Math.abs(left - right)

  return Math.min(distance, 12 - distance)
}

function getSharedToneCount(leftTones, rightTones) {
  return leftTones.filter((tone) => rightTones.includes(tone)).length
}

function getNearestToneDistance(tone, tones) {
  if (tones.length === 0) return 6

  return Math.min(...tones.map((candidate) => getPitchClassDistance(tone, candidate)))
}

function getVoiceLeadingDistance(leftTones, rightTones) {
  if (leftTones.length === 0 || rightTones.length === 0) return 12

  const leftDistance = leftTones.reduce((sum, tone) => sum + getNearestToneDistance(tone, rightTones), 0)
  const rightDistance = rightTones.reduce((sum, tone) => sum + getNearestToneDistance(tone, leftTones), 0)

  return (leftDistance + rightDistance) / (leftTones.length + rightTones.length)
}

function getChordPathScore(leftChord, rightChord) {
  const leftTones = getChordTonePitchClasses(leftChord)
  const rightTones = getChordTonePitchClasses(rightChord)
  const sharedTones = getSharedToneCount(leftTones, rightTones)
  const possibleSharedTones = Math.max(leftTones.length, rightTones.length)
  const voiceLeading = getVoiceLeadingDistance(leftTones, rightTones)
  const tensionShift = Math.abs(getChordDissonanceRank(leftChord) - getChordDissonanceRank(rightChord))

  return {
    contrast: voiceLeading + (possibleSharedTones - sharedTones) * 3 + tensionShift * 2,
    smooth: voiceLeading - sharedTones * 3 + tensionShift,
  }
}

function sortChordPalettePath(rows, tonicPitchClass, pathMode) {
  if (rows.length <= 1) return rows

  const remaining = rows.map((row, index) => ({ row, index }))
  const tonicIndex = remaining.findIndex((item) => getChordRootInterval(item.row, tonicPitchClass) === 0)
  const startIndex = tonicIndex === -1 ? 0 : tonicIndex
  const ordered = [remaining.splice(startIndex, 1)[0]]

  while (remaining.length > 0) {
    const current = ordered.at(-1).row
    let bestIndex = 0

    for (let index = 1; index < remaining.length; index += 1) {
      const candidate = remaining[index]
      const best = remaining[bestIndex]
      const candidateScore = getChordPathScore(current, candidate.row)[pathMode]
      const bestScore = getChordPathScore(current, best.row)[pathMode]
      const scoreDelta = pathMode === 'contrast'
        ? bestScore - candidateScore
        : candidateScore - bestScore

      if (
        scoreDelta < 0
        || (scoreDelta === 0
          && (getChordRootInterval(candidate.row, tonicPitchClass) < getChordRootInterval(best.row, tonicPitchClass)
            || (getChordRootInterval(candidate.row, tonicPitchClass) === getChordRootInterval(best.row, tonicPitchClass)
              && candidate.index < best.index)))
      ) {
        bestIndex = index
      }
    }

    ordered.push(remaining.splice(bestIndex, 1)[0])
  }

  return ordered.map((item) => item.row)
}

function sortChordPaletteRows(rows, sortMode, tonicPitchClass) {
  if (sortMode === 'smooth' || sortMode === 'contrast') {
    return sortChordPalettePath(rows, tonicPitchClass, sortMode)
  }

  return rows
    .map((row, index) => ({ row, index }))
    .sort((left, right) => {
      if (sortMode === 'root') {
        return getChordRootInterval(left.row, tonicPitchClass) - getChordRootInterval(right.row, tonicPitchClass)
          || left.index - right.index
      }

      if (sortMode === 'fifths') {
        const leftFifth = FIFTH_ORDER.indexOf(getChordRootInterval(left.row, tonicPitchClass))
        const rightFifth = FIFTH_ORDER.indexOf(getChordRootInterval(right.row, tonicPitchClass))

        return (leftFifth === -1 ? 99 : leftFifth) - (rightFifth === -1 ? 99 : rightFifth)
          || left.index - right.index
      }

      if (sortMode === 'inside') {
        return getChordInsideRank(left.row) - getChordInsideRank(right.row)
          || getChordDissonanceRank(left.row) - getChordDissonanceRank(right.row)
          || left.index - right.index
      }

      return left.index - right.index
    })
    .map((item) => item.row)
}

function getRandomDurationTicks(maxTicks, typicality) {
  const durationPool = typicality < 34
    ? [8, 8, 8, 4, 16]
    : typicality < 67
      ? [8, 4, 4, 16, 2]
      : [1, 2, 4, 4, 8, 16]
  const candidates = durationPool.filter((ticks) => ticks <= maxTicks)

  return candidates.length > 0 ? candidates[Math.floor(Math.random() * candidates.length)] : maxTicks
}

function getDurationOptionsForTicks(currentTicks, totalTicks) {
  const options = PROGRESSION_DURATION_OPTIONS.filter((option) => option.ticks <= totalTicks)

  if (!options.some((option) => option.ticks === currentTicks)) {
    options.push({ label: getDurationLabel(currentTicks), ticks: currentTicks })
  }

  return options.sort((left, right) => left.ticks - right.ticks)
}

function clampProgressionBars(value) {
  const nextValue = Number(value)

  if (!Number.isFinite(nextValue)) return 1

  return Math.max(1, Math.min(MAX_PROGRESSION_BARS, Math.round(nextValue)))
}

function createCustomChord(rootPitchClass, qualityId) {
  const quality = CHORD_QUALITIES[qualityId] ?? CHORD_QUALITIES.maj

  return {
    id: `custom-${rootPitchClass}-${qualityId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    interval: 0,
    numeral: 'Custom',
    quality: quality.id,
    rootPitchClass,
    name: getChordName(rootPitchClass, quality.id),
    formula: quality.formula,
    summary: 'User-added chord for this progression.',
    tags: ['custom'],
    voicings: [],
    dissonance: {
      level: 'Medium',
      description: 'Custom chord. Compare its tones against the primary scale by ear and with the formula.',
    },
    suggestions: [],
    isCustom: true,
  }
}

function musicLabel(value) {
  return formatMusicText(value)
}

function chordLabel(value) {
  return String(value)
}

function fillProgressionGaps(events, chords, barCount, typicality) {
  const totalTicks = getProgressionTotalTicks(barCount)
  const nextEvents = [...events]

  getProgressionGaps(events, totalTicks).forEach((gap) => {
    let cursor = gap.startTick
    let remainingTicks = gap.durationTicks

    while (remainingTicks > 0) {
      const chord = getWeightedChord(chords, typicality)
      const durationTicks = getRandomDurationTicks(remainingTicks, typicality)

      nextEvents.push(createProgressionEvent(chord.id, cursor, durationTicks))
      cursor += durationTicks
      remainingTicks -= durationTicks
    }
  })

  return sortProgressionEvents(nextEvents)
}

function groupItemsByFamily(items) {
  return items.reduce((groups, item) => {
    if (!groups[item.family]) {
      groups[item.family] = []
    }

    groups[item.family].push(item)
    return groups
  }, {})
}

function getHeaderSelectStyle(label, {
  min = 5,
  max = 24,
  characterWidth = 7.4,
  chromeWidth = 44,
} = {}) {
  const minWidth = (min * characterWidth) + chromeWidth
  const maxWidth = (max * characterWidth) + chromeWidth
  const contentWidth = (label.length * characterWidth) + chromeWidth

  return {
    '--select-width': `${Math.max(minWidth, Math.min(maxWidth, contentWidth))}px`,
  }
}

function TonalCenterPicker({ rootLabel, scaleId, instrument, onSelect }) {
  const [isOpen, setIsOpen] = useState(false)
  const [previewRootLabel, setPreviewRootLabel] = useState(rootLabel)
  const [previewScaleId, setPreviewScaleId] = useState(scaleId)
  const [isKeySignatureLocked, setIsKeySignatureLocked] = useState(false)
  const [lockedKeyFifths, setLockedKeyFifths] = useState(null)
  const pickerRef = useRef(null)
  const previewRoot = ROOT_OPTIONS.find((option) => option.label === previewRootLabel) ?? ROOT_OPTIONS[0]
  const selectedScale = SCALE_LIBRARY.find((item) => item.id === previewScaleId) ?? SCALE_LIBRARY[0]
  const previewKeyFifths = getScaleKeyFifths(previewRoot.pitchClass, selectedScale.id)
  const canLockKeySignature = getScaleRootForKeyFifths(previewKeyFifths, selectedScale.id) !== null
  const previewMusicXml = buildScaleMusicXml({
    rootLabel: previewRoot.label,
    rootPitchClass: previewRoot.pitchClass,
    scale: selectedScale,
    instrument,
    keyFifths: previewKeyFifths,
    showLabels: true,
  })
  const scalesByFamily = groupItemsByFamily(SCALE_LIBRARY)
  const scaleFamilyEntries = Object.entries(scalesByFamily)
    .sort(([leftFamily], [rightFamily]) => (
      SCALE_FAMILY_ORDER.indexOf(leftFamily) - SCALE_FAMILY_ORDER.indexOf(rightFamily)
    ))
  const keySignatureLabel = lockedKeyFifths === 0
    ? 'No sharps or flats'
    : `${Math.abs(lockedKeyFifths)} ${lockedKeyFifths > 0 ? 'sharp' : 'flat'}${Math.abs(lockedKeyFifths) === 1 ? '' : 's'}`

  useEffect(() => {
    if (!isOpen) return undefined

    function closeOnOutsidePress(event) {
      if (!pickerRef.current?.contains(event.target)) {
        setIsOpen(false)
      }
    }

    function closeOnEscape(event) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('pointerdown', closeOnOutsidePress)
    document.addEventListener('keydown', closeOnEscape)

    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePress)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isOpen])

  function openPicker() {
    setPreviewRootLabel(rootLabel)
    setPreviewScaleId(scaleId)
    setIsKeySignatureLocked(false)
    setLockedKeyFifths(null)
    setIsOpen(true)
  }

  function toggleKeySignatureLock() {
    if (isKeySignatureLocked) {
      setIsKeySignatureLocked(false)
      setLockedKeyFifths(null)
      return
    }

    setLockedKeyFifths(previewKeyFifths)
    setIsKeySignatureLocked(true)
  }

  function selectScale(nextScaleId) {
    if (isKeySignatureLocked) {
      const nextRootPitchClass = getScaleRootForKeyFifths(lockedKeyFifths, nextScaleId)
      const nextRoot = ROOT_OPTIONS.find((option) => option.pitchClass === nextRootPitchClass)

      if (!nextRoot) return

      setPreviewRootLabel(nextRoot.label)
    }

    setPreviewScaleId(nextScaleId)
  }

  return (
    <div className="tonal-center-picker" ref={pickerRef}>
      <span className="tonal-center-label">Tonal center</span>
      <button
        className="tonal-center-trigger"
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => (isOpen ? setIsOpen(false) : openPicker())}
      >
        <span>{musicLabel(rootLabel)} {selectedScale.name}</span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>

      {isOpen ? (
        <section className="tonal-center-panel" role="dialog" aria-label="Choose tonal center">
          <div className="tonal-center-panel-heading">
            <div>
              <span>Choose a tonic and scale</span>
              <strong>{musicLabel(previewRoot.label)} {selectedScale.name}</strong>
            </div>
            <div className="tonal-center-panel-actions">
              <button
                type="button"
                className="tonal-center-close"
                aria-label="Close tonal center picker"
                onClick={() => setIsOpen(false)}
              >
                <X size={15} />
              </button>
            </div>
          </div>

          <div className="tonal-center-panel-content">
            <div className="tonic-list" role="listbox" aria-label="Tonic">
              {ROOT_OPTIONS.map((option) => (
                <button
                  type="button"
                  key={option.label}
                  role="option"
                  aria-selected={previewRootLabel === option.label}
                  className={previewRootLabel === option.label ? 'is-active' : ''}
                  disabled={isKeySignatureLocked}
                  onClick={() => setPreviewRootLabel(option.label)}
                >
                  {musicLabel(option.label)}
                </button>
              ))}
            </div>

            <div className="tonal-center-right-column">
              <div className="tonal-scale-list">
                {scaleFamilyEntries.map(([family, scales]) => (
                  <section className="tonal-scale-family" key={family}>
                    <h3>{family}</h3>
                    <div>
                      {scales.map((item) => {
                        const isSelected = item.id === previewScaleId
                        const isSupportedByKeySignature = !isKeySignatureLocked
                          || getScaleRootForKeyFifths(lockedKeyFifths, item.id) !== null

                        return (
                          <button
                            type="button"
                            key={item.id}
                            className={isSelected ? 'is-active' : ''}
                            disabled={!isSupportedByKeySignature}
                            onClick={() => selectScale(item.id)}
                          >
                            {item.name}
                          </button>
                        )
                      })}
                    </div>
                  </section>
                ))}
              </div>

              <aside className="tonal-center-preview">
                <div>
                  <span>How it sounds</span>
                  <strong>{musicLabel(previewRoot.label)} {selectedScale.name}</strong>
                  <p>{selectedScale.sound}</p>
                </div>
                <SheetMusicChart musicXml={previewMusicXml} embedded bare />
              </aside>
            </div>
          </div>

          <div className="tonal-center-panel-footer">
            <div className="key-signature-setting">
              <button
                type="button"
                className="key-signature-switch"
                role="switch"
                aria-checked={isKeySignatureLocked}
                disabled={!isKeySignatureLocked && !canLockKeySignature}
                title={!isKeySignatureLocked && !canLockKeySignature ? 'This scale has no conventional key signature to preserve.' : undefined}
                onClick={toggleKeySignatureLock}
              >
                <span className="key-signature-switch-track" aria-hidden="true"><span></span></span>
                <span>Keep key signature</span>
              </button>
              <p>
                {isKeySignatureLocked
                  ? `Tonic shifts with each scale to preserve ${keySignatureLabel}.`
                  : 'Allow the tonic and staff signature to change independently.'}
              </p>
            </div>
            <button
              type="button"
              className="primary-button"
              onClick={() => {
                onSelect(previewRoot.label, selectedScale.id)
                setIsOpen(false)
              }}
            >
              Apply
            </button>
          </div>
        </section>
      ) : null}
    </div>
  )
}

function FretboardChart({
  title,
  subtitle,
  meta = null,
  frets,
  rows,
  compact = false,
  showInlays = true,
  fixedFrets = false,
  onPlayNote = null,
  onPlayVoicing = null,
  notationMusicXml = null,
}) {
  const hasOpenStrings = frets.includes(0)
  const fretColumns = hasOpenStrings ? frets.filter((fret) => fret !== 0) : frets

  return (
    <article className={`chart-card${compact ? ' is-compact' : ''}`}>
      <div className="chart-heading">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
          {meta ? <p className="chart-meta">{meta}</p> : null}
        </div>
        {onPlayVoicing ? (
          <button
            className="inline-play-button"
            type="button"
            aria-label={`Preview ${title}`}
            title={`Preview ${title}`}
            onClick={() => onPlayVoicing(rows)}
          >
            <Play size={14} />
          </button>
        ) : null}
      </div>

      {notationMusicXml ? (
        <SheetMusicChart
          musicXml={notationMusicXml}
          embedded
          onPlayNote={onPlayNote}
        />
      ) : null}

      <div className="chart-scroll">
        <div
          className={`fretboard-grid${hasOpenStrings ? ' has-open' : ''}${fixedFrets ? ' is-fixed-width' : ''}`}
          style={{ '--fret-count': fretColumns.length }}
        >
          <div className="fret-label-row">
            <div className="corner-cell" aria-hidden="true"></div>
            {hasOpenStrings ? <div className="open-fret-number">0</div> : null}
            {fretColumns.map((fret) => (
              <div className="fret-number" key={`fret-${fret}`}>
                {fret}
              </div>
            ))}
          </div>

          {rows.map((row, rowIndex) => (
            <div
              className={`string-row${rowIndex === 0 ? ' is-first' : ''}${rowIndex === rows.length - 1 ? ' is-last' : ''}`}
              key={`${title}-${row.label}-${rowIndex}`}
            >
              <div className="string-label">{row.label}</div>
              {hasOpenStrings ? (
                <div className="open-string-cell" key={`${title}-${rowIndex}-open`}>
                  {row.notes[0] ? (
                    <button
                      type="button"
                      className={`degree-chip${row.notes[0].isRoot ? ' is-root' : ''}`}
                      title={`${musicLabel(row.notes[0].noteLabel)} · degree ${musicLabel(row.notes[0].degree)}`}
                      aria-label={`${musicLabel(row.notes[0].noteLabel)}, degree ${musicLabel(row.notes[0].degree)}`}
                      onClick={() => onPlayNote?.(row.notes[0])}
                    >
                      {musicLabel(row.notes[0].degree)}
                    </button>
                  ) : null}
                </div>
              ) : null}
              {fretColumns.map((fret) => {
                const note = row.notes[fret]

                return (
                  <div
                    className="fret-cell"
                    key={`${title}-${rowIndex}-${fret}`}
                  >
                    {note ? (
                      <button
                        type="button"
                        className={`degree-chip${note.isRoot ? ' is-root' : ''}`}
                        title={`${musicLabel(note.noteLabel)} · degree ${musicLabel(note.degree)}`}
                        aria-label={`${musicLabel(note.noteLabel)}, degree ${musicLabel(note.degree)}`}
                        onClick={() => onPlayNote?.(note)}
                      >
                        {musicLabel(note.degree)}
                      </button>
                    ) : null}
                  </div>
                )
              })}
            </div>
          ))}

          {showInlays ? (
            <div className="inlay-row" aria-hidden="true">
              <div className="corner-cell"></div>
              {hasOpenStrings ? <div className="open-inlay-cell"></div> : null}
              {fretColumns.map((fret) => {
                const markerType = getInlayType(fret)

                return (
                  <div className="inlay-cell" key={`inlay-${fret}`}>
                    {markerType ? (
                      <div className={`inlay-marker is-${markerType}`}>
                        <span></span>
                        {markerType === 'double' ? <span></span> : null}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  )
}

function PianoKeyboardChart({
  title,
  subtitle,
  pitchClasses,
  rootPitchClass,
  labelsByPitchClass = {},
  compact = false,
  onPlayNote = null,
}) {
  const activePitchClasses = new Set(pitchClasses)
  const whiteKeys = Array.from({ length: 14 }, (_, index) => ({
    index,
    pitchClass: PIANO_WHITE_KEY_PITCH_CLASSES[index % PIANO_WHITE_KEY_PITCH_CLASSES.length],
    midiNote: 48
      + Math.floor(index / PIANO_WHITE_KEY_PITCH_CLASSES.length) * 12
      + PIANO_WHITE_KEY_PITCH_CLASSES[index % PIANO_WHITE_KEY_PITCH_CLASSES.length],
  }))
  const blackKeys = Array.from({ length: 2 }, (_, octaveIndex) => (
    PIANO_BLACK_KEY_LAYOUT.map((key) => ({
      ...key,
      index: octaveIndex * PIANO_WHITE_KEY_PITCH_CLASSES.length + key.afterWhiteIndex,
      pitchClass: key.pitchClass,
      midiNote: 48 + octaveIndex * 12 + key.pitchClass,
    }))
  )).flat()

  function renderPianoKey(key, color) {
    const isActive = activePitchClasses.has(key.pitchClass)
    const isRoot = key.pitchClass === rootPitchClass
    const label = labelsByPitchClass[key.pitchClass]
    const noteLabel = PIANO_KEY_LABELS[key.pitchClass]

    return (
      <div
        className={`piano-key-wrap is-${color}`}
        key={`${title}-${color}-${key.index}-${key.pitchClass}`}
        style={{ '--key-index': key.index }}
      >
        <div className="piano-note-label">{musicLabel(noteLabel)}</div>
        <button
          type="button"
          className={`piano-key is-${color}${isActive ? ' is-active' : ''}${isRoot ? ' is-root' : ''}`}
          title={isActive ? `${musicLabel(noteLabel)} · degree ${musicLabel(label)}` : musicLabel(noteLabel)}
          aria-label={isActive ? `${musicLabel(noteLabel)}, degree ${musicLabel(label)}` : musicLabel(noteLabel)}
          onClick={isActive ? () => onPlayNote?.({
            midiNote: key.midiNote,
            pitchClass: key.pitchClass,
            noteLabel,
            degree: label,
          }) : undefined}
          disabled={!isActive}
        >
          {isActive ? <span>{musicLabel(label)}</span> : null}
        </button>
      </div>
    )
  }

  return (
    <article className={`chart-card piano-card${compact ? ' is-compact' : ''}`}>
      <div className="chart-heading">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
      </div>

      <div className="piano-scroll">
        <div className="piano-keyboard" aria-label={title}>
          <div className="piano-white-keys">
            {whiteKeys.map((key) => renderPianoKey(key, 'white'))}
          </div>
          <div className="piano-black-keys">
            {blackKeys.map((key) => renderPianoKey(key, 'black'))}
          </div>
        </div>
      </div>
    </article>
  )
}

function RecorderFingeringChart({
  title,
  subtitle,
  items,
  compact = false,
  onPlayNote = null,
}) {
  function renderHoleGlyph(state, isDoubleHole) {
    if (isDoubleHole) {
      return (
        <span className={`recorder-double-hole is-${state ?? 'open'}`} aria-hidden="true">
          <i></i>
          <i></i>
        </span>
      )
    }

    return <span className={`recorder-hole is-${state ?? 'open'}`} aria-hidden="true"></span>
  }

  return (
    <article className={`chart-card recorder-card${compact ? ' is-compact' : ''}`}>
      <div className="chart-heading">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
      </div>

      <div className="recorder-matrix-scroll">
        <div
          className="recorder-matrix"
          style={{ '--recorder-columns': items.length }}
          aria-label={`${title}: alto recorder fingering matrix`}
        >
          <div className="recorder-matrix-corner">
            <strong>Alto</strong>
            <span>Baroque</span>
          </div>

          {items.map((item) => (
            <button
              type="button"
              className={`recorder-column-label${item.isRoot ? ' is-root' : ''}`}
              key={`${title}-${item.midiNote}-label`}
              onClick={() => onPlayNote?.(item)}
            >
              <strong>{musicLabel(item.noteLabel)}</strong>
              <span>{musicLabel(item.degree)}</span>
            </button>
          ))}

          {ALTO_RECORDER_HOLES.map((hole, holeIndex) => (
            <Fragment key={`${title}-${hole}`}>
              <div
                className={`recorder-row-label${holeIndex === 0 ? ' is-thumb-row is-group-end' : ''}${holeIndex === 3 || holeIndex === 6 ? ' is-group-end' : ''}`}
                key={`${title}-${hole}-label`}
              >
                <span>{hole}</span>
              </div>

              {items.map((item) => (
                <div
                  className={`recorder-matrix-cell${item.isRoot ? ' is-root-column' : ''}${holeIndex === 0 ? ' is-thumb-row is-group-end' : ''}${holeIndex === 3 || holeIndex === 6 ? ' is-group-end' : ''}`}
                  key={`${title}-${item.midiNote}-${hole}`}
                  aria-label={`${musicLabel(item.noteLabel)}, degree ${musicLabel(item.degree)}, hole ${hole}: ${item.pattern[holeIndex] ?? 'open'}`}
                >
                  {renderHoleGlyph(item.pattern[holeIndex], holeIndex >= 6)}
                </div>
              ))}
            </Fragment>
          ))}
        </div>
      </div>

    </article>
  )
}

function ClarinetInstrumentDiagram({ item }) {
  function getControlState(controlId) {
    const rowIndex = CLARINET_ROWS.findIndex((row) => row.id === controlId)

    return item.pattern[rowIndex] ?? 'open'
  }

  function renderToneHole(controlId, className) {
    return (
      <span
        className={`clarinet-diagram-hole ${className} is-${getControlState(controlId)}`}
        aria-hidden="true"
      ></span>
    )
  }

  function renderLever(controlId, className) {
    return (
      <span
        className={`clarinet-diagram-lever ${className} is-${getControlState(controlId)}`}
        aria-hidden="true"
      ></span>
    )
  }

  return (
    <div className="clarinet-glyph" aria-label={`${musicLabel(item.noteLabel)}, degree ${musicLabel(item.degree)}, clarinet fingering`}>
      {renderLever('reg', 'is-register')}
      {renderToneHole('thumb', 'is-thumb')}
      {renderToneHole('l1', 'is-l1')}
      {renderToneHole('l2', 'is-l2')}
      {renderToneHole('l3', 'is-l3')}
      {renderLever('g-sharp', 'is-g-sharp')}
      {renderLever('a', 'is-a-key')}
      {renderLever('bb', 'is-bb-key')}
      {renderToneHole('r1', 'is-r1')}
      {renderToneHole('r2', 'is-r2')}
      {renderToneHole('r3', 'is-r3')}
      {renderLever('side', 'is-side')}
      {renderLever('left-pinky', 'is-left-pinky')}
      {renderLever('right-pinky', 'is-right-pinky')}
    </div>
  )
}

function ClarinetFingeringChart({
  title,
  subtitle,
  items,
  compact = false,
  onPlayNote = null,
}) {
  return (
    <article className={`chart-card clarinet-card${compact ? ' is-compact' : ''}`}>
      <div className="chart-heading">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
      </div>

      <div className="clarinet-diagram-grid">
        {items.map((item) => (
          <button
            type="button"
            className={`clarinet-fingering-card${item.isRoot ? ' is-root' : ''}`}
            key={`${title}-${item.midiNote}`}
            onClick={() => onPlayNote?.(item)}
          >
            <div className="clarinet-note-heading">
              <strong>{musicLabel(item.noteLabel)}</strong>
              <span>{musicLabel(item.degree)}</span>
            </div>

            <ClarinetInstrumentDiagram item={item} />
          </button>
        ))}
      </div>
    </article>
  )
}

function FloatingToolWindow({
  title,
  defaultPosition,
  onClose,
  children,
}) {
  const [position, setPosition] = useState(defaultPosition)
  const dragStateRef = useRef(null)

  const handlePointerMove = useCallback((event) => {
    const dragState = dragStateRef.current
    if (!dragState) return

    setPosition({
      x: Math.max(8, dragState.startX + event.clientX - dragState.pointerX),
      y: Math.max(8, dragState.startY + event.clientY - dragState.pointerY),
    })
  }, [])

  const stopDrag = useCallback(() => {
    dragStateRef.current = null
    window.removeEventListener('pointermove', handlePointerMove)
  }, [handlePointerMove])

  function startDrag(event) {
    if (event.button !== 0) return

    dragStateRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      startX: position.x,
      startY: position.y,
    }
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', stopDrag, { once: true })
  }

  useEffect(() => () => {
    stopDrag()
    window.removeEventListener('pointerup', stopDrag)
  }, [stopDrag])

  return (
    <section
      className="floating-tool-window"
      style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
    >
      <div className="floating-tool-header" onPointerDown={startDrag}>
        <strong>{title}</strong>
        <button type="button" aria-label={`Close ${title}`} onClick={onClose}>
          <X size={15} strokeWidth={2.4} aria-hidden="true" />
        </button>
      </div>
      {children}
    </section>
  )
}

function MetronomeTool() {
  const [tempo, setTempo] = useState(96)
  const [isRunning, setIsRunning] = useState(false)
  const [beat, setBeat] = useState(0)
  const audioContextRef = useRef(null)
  const intervalRef = useRef(null)
  const beatRef = useRef(0)

  const click = useCallback(() => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) return

    const audioContext = audioContextRef.current ?? new AudioContextClass()
    audioContextRef.current = audioContext

    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()
    oscillator.frequency.value = beatRef.current === 0 ? 1200 : 880
    gain.gain.setValueAtTime(0.0001, audioContext.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.24, audioContext.currentTime + 0.004)
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.055)
    oscillator.connect(gain)
    gain.connect(audioContext.destination)
    oscillator.start()
    oscillator.stop(audioContext.currentTime + 0.06)
    beatRef.current = (beatRef.current + 1) % 4
    setBeat(beatRef.current)
  }, [])

  useEffect(() => {
    if (!isRunning) {
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
      return undefined
    }

    intervalRef.current = window.setInterval(click, 60000 / tempo)

    return () => {
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [click, isRunning, tempo])

  useEffect(() => () => {
    window.clearInterval(intervalRef.current)
    audioContextRef.current?.close()
  }, [])

  return (
    <div className="metronome-tool">
      <button
        className={`metronome-beat-light${isRunning ? ' is-running' : ''}`}
        type="button"
        aria-label={isRunning ? 'Stop metronome' : 'Start metronome'}
        onClick={() => setIsRunning((current) => !current)}
      >
        {isRunning ? beat + 1 : 'Start'}
      </button>
      <label className="vertical-control">
        <span>Tempo</span>
        <input
          type="range"
          min="40"
          max="220"
          value={tempo}
          onChange={(event) => setTempo(Number(event.target.value))}
        />
      </label>
      <input
        className="tempo-number"
        type="number"
        min="40"
        max="220"
        value={tempo}
        onChange={(event) => setTempo(Math.max(40, Math.min(220, Number(event.target.value) || 40)))}
      />
      <span className="tool-unit">bpm</span>
    </div>
  )
}

function TunerTool() {
  const [isListening, setIsListening] = useState(false)
  const [pitch, setPitch] = useState(null)
  const [status, setStatus] = useState('Requesting mic')
  const audioRef = useRef(null)
  const animationRef = useRef(null)
  const smoothedPitchRef = useRef(null)
  const missedPitchFramesRef = useRef(0)

  const resetAudio = useCallback(() => {
    window.cancelAnimationFrame(animationRef.current)
    audioRef.current?.stream.getTracks().forEach((track) => track.stop())
    audioRef.current?.audioContext.close()
    audioRef.current = null
    smoothedPitchRef.current = null
    missedPitchFramesRef.current = 0
  }, [])

  const stop = useCallback(() => {
    resetAudio()
    setIsListening(false)
    setPitch(null)
    setStatus('Idle')
  }, [resetAudio])

  const start = useCallback(async () => {
    resetAudio()
    setIsListening(false)
    setPitch(null)

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      setStatus('Requesting mic')

      if (!window.isSecureContext) {
        setStatus('Needs HTTPS')
        return
      }

      if (!AudioContextClass || !navigator.mediaDevices?.getUserMedia) {
        setStatus('Mic unavailable')
        return
      }

      const stream = await requestTunerStream()
      const audioContext = new AudioContextClass()
      await audioContext.resume()
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 8192
      audioContext.createMediaStreamSource(stream).connect(analyser)
      audioRef.current = { audioContext, analyser, stream }
      setIsListening(true)
      setStatus('Listening')
    } catch (error) {
      setIsListening(false)
      if (error?.name === 'NotAllowedError' || error?.name === 'SecurityError') {
        setStatus('Mic blocked')
      } else if (error?.name === 'NotFoundError' || error?.name === 'DevicesNotFoundError') {
        setStatus('No microphone')
      } else if (error?.name === 'NotReadableError' || error?.name === 'TrackStartError') {
        setStatus('Mic in use')
      } else {
        setStatus(error?.name ?? 'Mic error')
      }
    }
  }, [resetAudio])

  useEffect(() => {
    if (!isListening || !audioRef.current) return undefined

    const buffer = new Float32Array(audioRef.current.analyser.fftSize)

    function update() {
      const currentAudio = audioRef.current
      if (!currentAudio) return

      currentAudio.analyser.getFloatTimeDomainData(buffer)
      const level = Math.min(1, getBufferRms(buffer) * 18)
      const frequency = autoCorrelate(buffer, currentAudio.audioContext.sampleRate)
      const detectedPitch = frequency ? frequencyToPitch(frequency) : null
      let nextPitch = null

      if (detectedPitch) {
        const previousPitch = smoothedPitchRef.current
        missedPitchFramesRef.current = 0
        nextPitch = previousPitch?.midi === detectedPitch.midi
          ? {
            ...detectedPitch,
            cents: (previousPitch.cents * 0.78) + (detectedPitch.cents * 0.22),
            frequency: (previousPitch.frequency * 0.72) + (detectedPitch.frequency * 0.28),
          }
          : detectedPitch
        smoothedPitchRef.current = nextPitch
      } else if (smoothedPitchRef.current && missedPitchFramesRef.current < 10) {
        missedPitchFramesRef.current += 1
        nextPitch = smoothedPitchRef.current
      } else {
        smoothedPitchRef.current = null
        missedPitchFramesRef.current = 0
      }

      setPitch(nextPitch)
      setStatus(nextPitch ? 'Listening' : level > 0.04 ? 'Listening' : 'Signal low')
      animationRef.current = window.requestAnimationFrame(update)
    }

    update()
    return () => window.cancelAnimationFrame(animationRef.current)
  }, [isListening])

  useEffect(() => {
    const startTimer = window.setTimeout(start, 0)

    return () => {
      window.clearTimeout(startTimer)
      stop()
    }
  }, [start, stop])

  const cents = pitch ? Math.max(-50, Math.min(50, pitch.cents)) : 0
  const tunerIndicatorStyle = pitch ? getTunerIndicatorStyle(cents) : undefined
  const tunerMeterStyle = tunerIndicatorStyle
    ? {
      '--tuner-meter-color': tunerIndicatorStyle.backgroundColor,
      '--tuner-meter-contrast': tunerIndicatorStyle.color,
    }
    : undefined

  return (
    <div className="tuner-tool">
      <button
        className="tuner-readout"
        type="button"
        onClick={start}
      >
        {pitch ? <strong>{pitch.note}</strong> : <span>{status}</span>}
      </button>
      <div className="tuner-meter" style={tunerMeterStyle} aria-label="Tuning meter">
        <span className="tuner-meter-line"></span>
        <span
          className="tuner-meter-needle"
          style={{ transform: `translateX(-50%) translateY(${-cents * 1.9}px)` }}
        ></span>
      </div>
    </div>
  )
}

function App() {
  const touchedQueryParamsRef = useRef(getQuerySettingKeys(window.location.search))
  const [mode, setMode] = useState(() => readQueryState(window.location.search).mode)
  const [instrument, setInstrument] = useState(() => readQueryState(window.location.search).instrument)
  const [rootLabel, setRootLabel] = useState(() => readQueryState(window.location.search).root)
  const [scaleId, setScaleId] = useState(() => readQueryState(window.location.search).scale)
  const [flavorId, setFlavorId] = useState(() => readQueryState(window.location.search).flavor)
  const [complexityId, setComplexityId] = useState(() => readQueryState(window.location.search).complexity)
  const [arrangementComplexityId, setArrangementComplexityId] = useState(() => readQueryState(window.location.search).harmonyComplexity)
  const [showArrangementFingerings, setShowArrangementFingerings] = useState(false)
  const [openScaleCharts, setOpenScaleCharts] = useState(() => new Set())
  const [selectedArrangementChordId, setSelectedArrangementChordId] = useState(null)
  const [progressionBars, setProgressionBars] = useState(8)
  const [progressionEvents, setProgressionEvents] = useState([])
  const [selectedProgressionEventId, setSelectedProgressionEventId] = useState(null)
  const [defaultProgressionDurationTicks, setDefaultProgressionDurationTicks] = useState(PROGRESSION_TICKS_PER_BAR)
  const [progressionTypicality, setProgressionTypicality] = useState(45)
  const [draggingChordId, setDraggingChordId] = useState(null)
  const [progressionPreview, setProgressionPreview] = useState(null)
  const [customChords, setCustomChords] = useState([])
  const [customChordRootLabel, setCustomChordRootLabel] = useState(() => readQueryState(window.location.search).root)
  const [customChordQualityId, setCustomChordQualityId] = useState('maj')
  const [chordPaletteSort, setChordPaletteSort] = useState('root')
  const [openTools, setOpenTools] = useState({ metronome: false, tuner: false })
  const [progressionTempo, setProgressionTempo] = useState(DEFAULT_PROGRESSION_TEMPO)
  const [progressionClickMode, setProgressionClickMode] = useState('beat')
  const [playbackVoice, setPlaybackVoice] = useState(DEFAULT_PLAYBACK_VOICE)
  const [progressionChordVolume, setProgressionChordVolume] = useState(DEFAULT_PROGRESSION_CHORD_VOLUME)
  const [progressionClickVolume, setProgressionClickVolume] = useState(DEFAULT_PROGRESSION_CLICK_VOLUME)
  const [isProgressionLooping, setIsProgressionLooping] = useState(false)
  const [isProgressionPlaying, setIsProgressionPlaying] = useState(false)
  const [playheadTick, setPlayheadTick] = useState(null)
  const controlPanelRef = useRef(null)
  const progressionPlaybackRef = useRef({
    audioContext: null,
    animationFrame: null,
    loopTimeout: null,
    scheduledNodes: [],
    startedAt: 0,
    tickDuration: 0,
    totalTicks: 0,
  })

  const groupedFlavors = groupItemsByFamily(CHORD_FLAVOR_LIBRARY)
  const root = ROOT_OPTIONS.find((option) => option.label === rootLabel) ?? ROOT_OPTIONS[0]
  const scale = SCALE_LIBRARY.find((item) => item.id === scaleId) ?? SCALE_LIBRARY[0]
  const flavor = CHORD_FLAVOR_LIBRARY.find((item) => item.id === flavorId) ?? CHORD_FLAVOR_LIBRARY[0]
  const complexity = CHORD_COMPLEXITY_OPTIONS.find((item) => item.id === complexityId) ?? CHORD_COMPLEXITY_OPTIONS[1]
  const arrangement = buildArrangement(root.pitchClass, scale, arrangementComplexityId, root.label)
  const harmonyChordPaletteLabel = arrangement.complexity.id === 'sevenths'
    ? '7th chords'
    : `${arrangement.complexity.label} chords`
  const instrumentLabel = {
    guitar: 'Guitar',
    piano: 'Piano',
    cello: 'Cello',
    'alto-recorder': 'Alto recorder',
    clarinet: 'Clarinet',
  }[instrument] ?? 'Guitar'
  const activePlaybackVoice = getResolvedPlaybackVoice(playbackVoice, instrument)
  const isCello = instrument === 'cello'
  const isRecorder = instrument === 'alto-recorder'
  const isClarinet = instrument === 'clarinet'
  const isFingerboardInstrument = instrument === 'guitar' || isCello
  const currentStringSet = isCello ? CELLO_STRING_SET : GUITAR_STRING_SET
  const currentMaxFret = isCello ? CELLO_MAX_POSITION : MAX_FRET
  const scalePitchClasses = scale.intervals.map((interval) => (root.pitchClass + interval) % 12)
  const scaleLabelsByPitchClass = Object.fromEntries(
    scale.intervals.map((interval) => [(root.pitchClass + interval) % 12, getDegreeLabel(interval, scale)]),
  )
  const recorderScaleItems = buildRecorderFingeringItems({
    rootPitchClass: root.pitchClass,
    intervals: scale.intervals,
    labelsByInterval: scale.degreeLabels,
  })
  const clarinetScaleItems = buildClarinetFingeringItems({
    rootPitchClass: root.pitchClass,
    intervals: scale.intervals,
    labelsByInterval: scale.degreeLabels,
  })
  const rows = buildFretboardRows(root.pitchClass, scale, currentMaxFret, currentStringSet)
  const fullNeckFrets = getVisibleFrets(0, currentMaxFret + 1, currentMaxFret)
  const positionWindows = buildPositionWindows(rows, root.pitchClass, currentMaxFret, 5, currentStringSet)
  const scaleFormula = getScaleFormula(scale)
  const pitchCollection = getPitchCollectionLabels(root.pitchClass, scale.intervals)
  const chordGroups = buildChordGroups(root.pitchClass, flavor, complexity.id, root.label)
  const chordKeyFifths = getChordKeyFifths(root.pitchClass, flavor.id)
  const scaleKeyFifths = getScaleKeyFifths(root.pitchClass, scale.id)
  const composeChordPalette = [...arrangement.rows, ...customChords]
  const activeChordPalette = mode === 'compose' ? composeChordPalette : arrangement.rows
  const selectedArrangementChord = activeChordPalette.find((row) => row.id === selectedArrangementChordId) ?? activeChordPalette[0]
  const selectedAlternativeScaleSuggestions = selectedArrangementChord?.suggestions.filter((suggestion) => !suggestion.isRootScale) ?? []
  const totalProgressionTicks = getProgressionTotalTicks(progressionBars)
  const sortedProgressionEvents = sortProgressionEvents(progressionEvents)
  const selectedProgressionEvent = progressionEvents.find((event) => event.id === selectedProgressionEventId) ?? null
  const selectedProgressionChord = composeChordPalette.find((row) => row.id === selectedProgressionEvent?.chordId) ?? null
  const selectedProgressionAlternativeScales = selectedProgressionChord?.suggestions.filter((suggestion) => !suggestion.isRootScale) ?? []
  const previewChord = composeChordPalette.find((row) => row.id === progressionPreview?.chordId) ?? null
  const emptyProgressionTicks = getProgressionGaps(progressionEvents, totalProgressionTicks)
    .reduce((sum, gap) => sum + gap.durationTicks, 0)
  const primaryArrangementScaleId = `primary-${root.label}-${scale.id}`
  const selectedTheoryItem = mode === 'scales'
    ? scale
    : mode === 'chords'
      ? flavor
      : arrangement.complexity
  const heroTitle = mode === 'scales'
    ? `${root.label} ${scale.name}`
    : mode === 'chords'
      ? `${root.label} ${flavor.name} chords`
      : mode === 'compose'
        ? `${root.label} ${scale.name} compose`
        : `${root.label} ${scale.name} harmony`

  function updateSettings(keys, action) {
    const nextKeys = Array.isArray(keys) ? keys : [keys]
    nextKeys.forEach((key) => touchedQueryParamsRef.current.add(key))
    action()
  }

  useEffect(() => {
    const controlPanel = controlPanelRef.current

    if (!controlPanel) return undefined

    function updateControlPanelHeight() {
      document.documentElement.style.setProperty('--control-panel-height', `${controlPanel.offsetHeight}px`)
    }

    updateControlPanelHeight()

    const observer = new ResizeObserver(updateControlPanelHeight)
    observer.observe(controlPanel)
    window.addEventListener('resize', updateControlPanelHeight)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateControlPanelHeight)
    }
  }, [])

  useEffect(() => {
    const touchedQueryParams = touchedQueryParamsRef.current

    if (touchedQueryParams.size === 0) {
      return
    }

    const params = new URLSearchParams(window.location.search)
    const settingValues = {
      mode,
      instrument,
      root: rootLabel,
      scale: scaleId,
      flavor: flavorId,
      complexity: complexityId,
      harmonyComplexity: arrangementComplexityId,
    }

    QUERY_SETTING_KEYS.forEach((key) => {
      if (touchedQueryParams.has(key)) {
        params.set(key, settingValues[key])
      } else {
        params.delete(key)
      }
    })
    params.delete('chordDisplay')
    params.delete('scaleDisplay')

    const nextSearch = params.toString()
    const currentSearch = window.location.search.startsWith('?')
      ? window.location.search.slice(1)
      : window.location.search

    if (nextSearch === currentSearch) {
      return
    }

    const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash}`
    window.history.pushState(null, '', nextUrl)
  }, [mode, instrument, rootLabel, scaleId, flavorId, complexityId, arrangementComplexityId])

  useEffect(() => {
    function syncFromUrl() {
      const nextState = readQueryState(window.location.search)

      touchedQueryParamsRef.current = getQuerySettingKeys(window.location.search)
      setMode(nextState.mode)
      setInstrument(nextState.instrument)
      setRootLabel(nextState.root)
      setScaleId(nextState.scale)
      setFlavorId(nextState.flavor)
      setComplexityId(nextState.complexity)
      setArrangementComplexityId(nextState.harmonyComplexity)
    }

    window.addEventListener('popstate', syncFromUrl)

    return () => {
      window.removeEventListener('popstate', syncFromUrl)
    }
  }, [])

  useEffect(() => () => {
    const playback = progressionPlaybackRef.current

    if (playback.animationFrame) {
      cancelAnimationFrame(playback.animationFrame)
    }

    if (playback.loopTimeout) {
      clearTimeout(playback.loopTimeout)
    }

    playback.scheduledNodes.forEach((node) => {
      try {
        node.stop?.()
        node.disconnect?.()
      } catch {
        // Already stopped nodes can be ignored when tearing down audio.
      }
    })
    playback.audioContext?.close()
    playback.audioContext = null
  }, [])

  function clearScheduledProgressionAudio() {
    const playback = progressionPlaybackRef.current

    if (playback.animationFrame) {
      cancelAnimationFrame(playback.animationFrame)
    }

    if (playback.loopTimeout) {
      clearTimeout(playback.loopTimeout)
    }

    playback.scheduledNodes.forEach((node) => {
      try {
        node.stop?.()
        node.disconnect?.()
      } catch {
        // Already stopped nodes can be ignored when cancelling playback.
      }
    })

    playback.animationFrame = null
    playback.loopTimeout = null
    playback.scheduledNodes = []
  }

  function stopProgressionPlayback() {
    clearScheduledProgressionAudio()
    setIsProgressionPlaying(false)
    setPlayheadTick(null)
  }

  function scheduleProgressionClick(audioContext, destination, startTime, isDownbeat, volume) {
    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()
    const clickGain = (volume / 100) * (isDownbeat ? 0.32 : 0.2)

    oscillator.type = 'square'
    oscillator.frequency.setValueAtTime(isDownbeat ? 1380 : 980, startTime)
    gain.gain.setValueAtTime(0.0001, startTime)
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, clickGain), startTime + 0.004)
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.045)
    oscillator.connect(gain)
    gain.connect(destination)
    oscillator.start(startTime)
    oscillator.stop(startTime + 0.055)
    progressionPlaybackRef.current.scheduledNodes.push(oscillator)
  }

  function getVoicePartials(voice) {
    if (voice === 'sine') {
      return [{ type: 'sine', ratio: 1, gain: 1 }]
    }

    if (voice === 'guitar' || voice === 'pluck') {
      return [
        { type: 'triangle', ratio: 1, gain: 0.86 },
        { type: 'sine', ratio: 2.01, gain: 0.2 },
        { type: 'square', ratio: 3, gain: 0.028 },
      ]
    }

    if (voice === 'cello' || voice === 'bass') {
      return [
        { type: 'sawtooth', ratio: 1, gain: 0.12 },
        { type: 'triangle', ratio: 1, gain: 0.62 },
        { type: 'sine', ratio: 2, gain: 0.2 },
        { type: 'sine', ratio: 3, gain: 0.06 },
      ]
    }

    if (voice === 'recorder') {
      return [
        { type: 'sine', ratio: 1, gain: 0.78 },
        { type: 'triangle', ratio: 2, gain: 0.12 },
        { type: 'sine', ratio: 3, gain: 0.06 },
      ]
    }

    if (voice === 'clarinet') {
      return [
        { type: 'triangle', ratio: 1, gain: 0.52 },
        { type: 'sine', ratio: 3, gain: 0.24 },
        { type: 'sine', ratio: 5, gain: 0.1 },
      ]
    }

    return [
      { type: 'sine', ratio: 1, gain: 0.74 },
      { type: 'triangle', ratio: 2, gain: 0.24 },
      { type: 'sine', ratio: 3.01, gain: 0.11 },
    ]
  }

  function getVoiceEnvelope(voice, startTime, duration, velocity) {
    const endTime = Math.max(startTime + 0.08, startTime + duration)

    if (voice === 'guitar' || voice === 'pluck') {
      const endTime = startTime + Math.max(duration, 1.8)
      const decayTime = Math.min(endTime - 0.02, startTime + 0.48)
      const ringTime = Math.min(endTime - 0.01, Math.max(decayTime + 0.001, startTime + 1.15))

      return {
        endTime,
        points: [
          ['linearRampToValueAtTime', velocity, startTime + 0.006],
          ['exponentialRampToValueAtTime', Math.max(0.012, velocity * 0.3), decayTime],
          ['exponentialRampToValueAtTime', Math.max(0.005, velocity * 0.12), ringTime],
          ['exponentialRampToValueAtTime', 0.0001, endTime],
        ],
      }
    }

    if (voice === 'cello' || voice === 'bass') {
      const attackTime = Math.max(startTime + 0.001, Math.min(startTime + 0.09, endTime - 0.02))
      const sustainTime = Math.min(Math.max(attackTime + 0.001, endTime - 0.18), endTime - 0.001)

      return {
        endTime,
        points: [
          ['linearRampToValueAtTime', velocity * 0.78, attackTime],
          ['setValueAtTime', velocity * 0.72, sustainTime],
          ['linearRampToValueAtTime', 0.0001, endTime],
        ],
      }
    }

    if (voice === 'recorder') {
      const attackTime = Math.max(startTime + 0.001, Math.min(startTime + 0.035, endTime - 0.02))
      const sustainTime = Math.min(Math.max(attackTime + 0.001, endTime - 0.1), endTime - 0.001)

      return {
        endTime,
        points: [
          ['linearRampToValueAtTime', velocity * 0.62, attackTime],
          ['setValueAtTime', velocity * 0.56, sustainTime],
          ['linearRampToValueAtTime', 0.0001, endTime],
        ],
      }
    }

    if (voice === 'clarinet') {
      const attackTime = Math.max(startTime + 0.001, Math.min(startTime + 0.055, endTime - 0.02))
      const sustainTime = Math.min(Math.max(attackTime + 0.001, endTime - 0.12), endTime - 0.001)

      return {
        endTime,
        points: [
          ['linearRampToValueAtTime', velocity * 0.68, attackTime],
          ['setValueAtTime', velocity * 0.64, sustainTime],
          ['linearRampToValueAtTime', 0.0001, endTime],
        ],
      }
    }

    if (voice === 'sine') {
      return {
        endTime,
        points: [
          ['linearRampToValueAtTime', velocity * 0.7, startTime + 0.018],
          ['setValueAtTime', velocity * 0.58, Math.max(startTime + 0.02, endTime - 0.1)],
          ['exponentialRampToValueAtTime', 0.0001, endTime],
        ],
      }
    }

    const sustainStart = Math.min(startTime + 0.24, endTime - 0.04)

    return {
      endTime,
      points: [
        ['linearRampToValueAtTime', velocity, startTime + 0.012],
        ['exponentialRampToValueAtTime', Math.max(0.015, velocity * 0.42), sustainStart],
        ['setValueAtTime', Math.max(0.012, velocity * 0.34), Math.max(sustainStart, endTime - 0.1)],
        ['exponentialRampToValueAtTime', 0.0001, endTime],
      ],
    }
  }

  function scheduleSynthNote(audioContext, destination, frequency, startTime, duration, velocity, voice) {
    const noteGain = audioContext.createGain()
    const partials = getVoicePartials(voice)
    const envelope = getVoiceEnvelope(voice, startTime, duration, velocity)

    noteGain.gain.setValueAtTime(0.0001, startTime)
    envelope.points.forEach(([method, value, time]) => {
      noteGain.gain[method](value, time)
    })
    noteGain.connect(destination)

    partials.forEach((partial) => {
      const oscillator = audioContext.createOscillator()
      const partialGain = audioContext.createGain()

      oscillator.type = partial.type
      oscillator.frequency.setValueAtTime(frequency * partial.ratio, startTime)
      partialGain.gain.setValueAtTime(partial.gain, startTime)
      oscillator.connect(partialGain)
      partialGain.connect(noteGain)
      oscillator.start(startTime)
      oscillator.stop(envelope.endTime + 0.02)
      progressionPlaybackRef.current.scheduledNodes.push(oscillator)
    })
  }

  function scheduleFrequencies(audioContext, destination, frequencies, startTime, duration, volume, voice = activePlaybackVoice) {
    const noteVelocity = (volume / 100) * Math.min(0.22, 0.6 / Math.max(1, frequencies.length))

    frequencies.forEach((frequency) => {
      scheduleSynthNote(audioContext, destination, frequency, startTime, duration, noteVelocity, voice)
    })
  }

  function scheduleProgressionChord(audioContext, destination, chord, startTime, duration, volume) {
    const frequencies = instrument === 'guitar' && chord.voicings?.[0]
      ? getFretboardVoicingFrequencies(chord.voicings[0].rows)
      : getChordPlaybackFrequencies(chord)

    scheduleFrequencies(audioContext, destination, frequencies, startTime, duration, volume)
  }

  async function getPreviewAudioContext() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext

    if (!AudioContextClass) return null

    const audioContext = progressionPlaybackRef.current.audioContext ?? new AudioContextClass()
    progressionPlaybackRef.current.audioContext = audioContext
    await audioContext.resume()

    return audioContext
  }

  async function playNotePreview(note) {
    const audioContext = await getPreviewAudioContext()

    if (!audioContext) return

    const midi = note.midiNote ?? 60 + (note.pitchClass ?? 0)
    const frequency = getFrequencyFromMidi(midi)
    const startTime = audioContext.currentTime + 0.01
    const previewGain = audioContext.createGain()

    previewGain.gain.setValueAtTime(0.92, startTime)
    previewGain.connect(audioContext.destination)
    progressionPlaybackRef.current.scheduledNodes.push(previewGain)
    scheduleSynthNote(audioContext, previewGain, frequency, startTime, 0.72, 0.28, activePlaybackVoice)
  }

  async function playVoicingPreview(rows) {
    const audioContext = await getPreviewAudioContext()

    if (!audioContext) return

    const frequencies = getFretboardVoicingFrequencies(rows)

    if (frequencies.length < 1) return

    const startTime = audioContext.currentTime + 0.01
    const previewGain = audioContext.createGain()

    previewGain.gain.setValueAtTime(0.95, startTime)
    previewGain.connect(audioContext.destination)
    progressionPlaybackRef.current.scheduledNodes.push(previewGain)
    scheduleFrequencies(audioContext, previewGain, frequencies, startTime, 1.35, progressionChordVolume)
  }

  async function playChordPreview(chord) {
    const audioContext = await getPreviewAudioContext()

    if (!audioContext) return

    const startTime = audioContext.currentTime + 0.01
    const previewGain = audioContext.createGain()
    const staffNotes = getChordStaffMidiNotes(chord, instrument)
    const frequencies = staffNotes.length > 0
      ? staffNotes.map((note) => getFrequencyFromMidi(note.midi))
      : getChordPlaybackFrequencies(chord)

    previewGain.gain.setValueAtTime(0.95, startTime)
    previewGain.connect(audioContext.destination)
    progressionPlaybackRef.current.scheduledNodes.push(previewGain)
    scheduleFrequencies(audioContext, previewGain, frequencies, startTime, 1.35, progressionChordVolume)
  }

  function animateProgressionPlayback(audioContext, startedAt, tickDuration, totalTicks) {
    const elapsed = audioContext.currentTime - startedAt
    const nextTick = Math.max(0, Math.min(totalTicks, Math.floor(elapsed / tickDuration)))

    setPlayheadTick(nextTick >= totalTicks ? null : nextTick)

    if (nextTick < totalTicks) {
      progressionPlaybackRef.current.animationFrame = requestAnimationFrame(() => {
        animateProgressionPlayback(audioContext, startedAt, tickDuration, totalTicks)
      })
    }
  }

  async function startProgressionPlayback() {
    if (sortedProgressionEvents.length < 1) return

    const AudioContextClass = window.AudioContext || window.webkitAudioContext

    if (!AudioContextClass) return

    clearScheduledProgressionAudio()

    const audioContext = progressionPlaybackRef.current.audioContext ?? new AudioContextClass()
    const masterGain = audioContext.createGain()
    const tickDuration = getProgressionTickDuration(progressionTempo)
    const startedAt = audioContext.currentTime + 0.08
    const totalDuration = totalProgressionTicks * tickDuration
    const chordById = Object.fromEntries(composeChordPalette.map((chord) => [chord.id, chord]))

    progressionPlaybackRef.current.audioContext = audioContext
    progressionPlaybackRef.current.startedAt = startedAt
    progressionPlaybackRef.current.tickDuration = tickDuration
    progressionPlaybackRef.current.totalTicks = totalProgressionTicks

    masterGain.gain.setValueAtTime(0.82, startedAt)
    masterGain.connect(audioContext.destination)
    progressionPlaybackRef.current.scheduledNodes.push(masterGain)

    await audioContext.resume()

    sortedProgressionEvents.forEach((event) => {
      const chord = chordById[event.chordId]

      if (!chord) return

      getProgressionPlaybackSegments(event).forEach((segment) => {
        scheduleProgressionChord(
          audioContext,
          masterGain,
          chord,
          startedAt + segment.startTick * tickDuration,
          segment.durationTicks * tickDuration,
          progressionChordVolume,
        )
      })
    })

    if (progressionClickMode !== 'off') {
      for (let tick = 0; tick < totalProgressionTicks; tick += 1) {
        const isDownbeat = tick % PROGRESSION_TICKS_PER_BAR === 0
        const isBeat = tick % (PROGRESSION_TICKS_PER_BAR / BEATS_PER_BAR) === 0
        const shouldClick = progressionClickMode === 'eighth'
          || (progressionClickMode === 'beat' && isBeat)
          || (progressionClickMode === 'downbeat' && isDownbeat)

        if (shouldClick) {
          scheduleProgressionClick(
            audioContext,
            masterGain,
            startedAt + tick * tickDuration,
            isDownbeat,
            progressionClickVolume,
          )
        }
      }
    }

    setIsProgressionPlaying(true)
    setPlayheadTick(0)
    animateProgressionPlayback(audioContext, startedAt, tickDuration, totalProgressionTicks)

    progressionPlaybackRef.current.loopTimeout = window.setTimeout(() => {
      clearScheduledProgressionAudio()

      if (isProgressionLooping) {
        startProgressionPlayback()
      } else {
        setIsProgressionPlaying(false)
        setPlayheadTick(null)
      }
    }, (totalDuration + 0.18) * 1000)
  }

  function clearProgression() {
    stopProgressionPlayback()
    setProgressionEvents([])
    setSelectedProgressionEventId(null)
    setProgressionPreview(null)
  }

  function changeProgressionBars(nextBarCount) {
    const nextBars = clampProgressionBars(nextBarCount)
    const nextTotalTicks = getProgressionTotalTicks(nextBars)
    const removesChords = progressionEvents.some((event) => event.startTick >= nextTotalTicks || getEventEndTick(event) > nextTotalTicks)

    if (nextBars < progressionBars && removesChords && !window.confirm('Shortening the progression will remove or trim chords beyond the new length. Continue?')) {
      return
    }

    setProgressionBars(nextBars)
    setProgressionEvents((current) => current
      .filter((event) => event.startTick < nextTotalTicks)
      .map((event) => ({
        ...event,
        durationTicks: clampProgressionDuration(event.durationTicks, event.startTick, nextTotalTicks),
      })))
    setSelectedProgressionEventId(null)
  }

  function addChordToProgression(chordId, requestedStartTick = null, requestedDurationTicks = defaultProgressionDurationTicks) {
    const durationTicks = Math.min(requestedDurationTicks, totalProgressionTicks)
    const startTick = requestedStartTick ?? findFirstProgressionGap(progressionEvents, durationTicks, totalProgressionTicks)?.startTick

    if (startTick === undefined || startTick === null) {
      return
    }

    const adjustedDurationTicks = requestedStartTick === null
      ? clampProgressionDuration(durationTicks, startTick, totalProgressionTicks)
      : getPlacementDuration(progressionEvents, startTick, durationTicks, totalProgressionTicks)

    if (!eventFits(progressionEvents, startTick, adjustedDurationTicks, totalProgressionTicks)) {
      return
    }

    const nextEvent = createProgressionEvent(chordId, startTick, adjustedDurationTicks)

    setProgressionEvents((current) => sortProgressionEvents([...current, nextEvent]))
    setSelectedProgressionEventId(nextEvent.id)
    setProgressionPreview(null)
  }

  function previewChordPlacement(chordId, startTick) {
    const durationTicks = getPlacementDuration(
      progressionEvents,
      startTick,
      defaultProgressionDurationTicks,
      totalProgressionTicks,
    )

    setProgressionPreview(durationTicks > 0
      ? { chordId, startTick, durationTicks, mode: 'place' }
      : null)
  }

  function previewResize(eventId, edge, startTick) {
    const event = progressionEvents.find((candidate) => candidate.id === eventId)

    if (!event) {
      setProgressionPreview(null)
      return
    }

    const nextStartTick = edge === 'start'
      ? Math.min(startTick, getEventEndTick(event) - 1)
      : event.startTick
    const nextEndTick = edge === 'end'
      ? Math.max(startTick + 1, event.startTick + 1)
      : getEventEndTick(event)
    const durationTicks = nextEndTick - nextStartTick

    setProgressionPreview(eventFits(progressionEvents, nextStartTick, durationTicks, totalProgressionTicks, eventId)
      ? { chordId: event.chordId, startTick: nextStartTick, durationTicks, mode: 'resize', eventId }
      : null)
  }

  function resizeProgressionEvent(eventId, edge, startTick) {
    const event = progressionEvents.find((candidate) => candidate.id === eventId)

    if (!event) return

    const nextStartTick = edge === 'start'
      ? Math.min(startTick, getEventEndTick(event) - 1)
      : event.startTick
    const nextEndTick = edge === 'end'
      ? Math.max(startTick + 1, event.startTick + 1)
      : getEventEndTick(event)

    updateProgressionEvent(eventId, {
      startTick: nextStartTick,
      durationTicks: nextEndTick - nextStartTick,
    })
    setProgressionPreview(null)
  }

  function updateProgressionEvent(eventId, updates) {
    setProgressionEvents((current) => {
      const event = current.find((candidate) => candidate.id === eventId)

      if (!event) return current

      const nextEvent = { ...event, ...updates }
      const nextStartTick = Math.max(0, Math.min(nextEvent.startTick, totalProgressionTicks - 1))
      const nextDurationTicks = clampProgressionDuration(nextEvent.durationTicks, nextStartTick, totalProgressionTicks)

      if (!eventFits(current, nextStartTick, nextDurationTicks, totalProgressionTicks, eventId)) {
        return current
      }

      return sortProgressionEvents(current.map((candidate) => (
        candidate.id === eventId
          ? { ...nextEvent, startTick: nextStartTick, durationTicks: nextDurationTicks }
          : candidate
      )))
    })
  }

  function duplicateProgressionEvent(event) {
    const gap = findFirstProgressionGap(progressionEvents, event.durationTicks, totalProgressionTicks)

    if (!gap) return

    const nextEvent = createProgressionEvent(event.chordId, gap.startTick, event.durationTicks)

    setProgressionEvents((current) => sortProgressionEvents([...current, nextEvent]))
    setSelectedProgressionEventId(nextEvent.id)
  }

  function deleteProgressionEvent(eventId) {
    setProgressionEvents((current) => current.filter((event) => event.id !== eventId))
    setSelectedProgressionEventId(null)
  }

  function fillRemainingProgressionSpace() {
    if (emptyProgressionTicks < 1 || composeChordPalette.length < 1) {
      return
    }

    setProgressionEvents((current) => fillProgressionGaps(current, composeChordPalette, progressionBars, progressionTypicality))
  }

  function addCustomChord() {
    const customRoot = ROOT_OPTIONS.find((option) => option.label === customChordRootLabel) ?? root
    const nextChord = createCustomChord(customRoot.pitchClass, customChordQualityId)

    setCustomChords((current) => [...current, nextChord])
    setSelectedArrangementChordId(nextChord.id)
  }

  function deleteCustomChord(chordId) {
    setCustomChords((current) => current.filter((chord) => chord.id !== chordId))
    setProgressionEvents((current) => current.filter((event) => event.chordId !== chordId))
    setSelectedArrangementChordId((currentId) => (currentId === chordId ? null : currentId))
  }

  function getProgressionTickFromPointer(event, barStartTick) {
    const rect = event.currentTarget.getBoundingClientRect()
    const tickIndex = Math.max(0, Math.min(
      PROGRESSION_TICKS_PER_BAR - 1,
      Math.floor(((event.clientX - rect.left) / rect.width) * PROGRESSION_TICKS_PER_BAR),
    ))

    return barStartTick + tickIndex
  }

  function handleProgressionDragOver(event, barStartTick) {
    event.preventDefault()

    const startTick = getProgressionTickFromPointer(event, barStartTick)
    const resizePayload = event.dataTransfer.getData('application/x-progression-resize')

    if (resizePayload) {
      const resize = JSON.parse(resizePayload)

      event.dataTransfer.dropEffect = 'move'
      previewResize(resize.eventId, resize.edge, startTick)
      return
    }

    const chordId = draggingChordId || event.dataTransfer.getData('text/plain')

    event.dataTransfer.dropEffect = chordId ? 'copy' : 'none'

    if (chordId) {
      previewChordPlacement(chordId, startTick)
    }
  }

  function handleProgressionDrop(event, barStartTick) {
    event.preventDefault()

    const startTick = getProgressionTickFromPointer(event, barStartTick)
    const resizePayload = event.dataTransfer.getData('application/x-progression-resize')

    if (resizePayload) {
      const resize = JSON.parse(resizePayload)

      resizeProgressionEvent(resize.eventId, resize.edge, startTick)
      return
    }

    const chordId = event.dataTransfer.getData('text/plain')

    if (chordId) {
      addChordToProgression(chordId, startTick)
    }
  }

  function getChordToneRows(chord) {
    const qualityId = chord.qualityId ?? chord.quality
    const quality = CHORD_QUALITIES[qualityId] ?? CHORD_QUALITIES.maj
    const intervals = Object.keys(quality.toneLabels).map(Number)

    return buildInstrumentRows({
      rootPitchClass: chord.rootPitchClass,
      intervals,
      labelsByInterval: quality.toneLabels,
      maxFret: currentMaxFret,
      stringSet: currentStringSet,
    })
  }

  function getChordToneRecorderItems(chord) {
    const qualityId = chord.qualityId ?? chord.quality
    const quality = CHORD_QUALITIES[qualityId] ?? CHORD_QUALITIES.maj
    const intervals = Object.keys(quality.toneLabels).map(Number)

    return buildRecorderFingeringItems({
      rootPitchClass: chord.rootPitchClass,
      intervals,
      labelsByInterval: quality.toneLabels,
    })
  }

  function getChordToneClarinetItems(chord) {
    const qualityId = chord.qualityId ?? chord.quality
    const quality = CHORD_QUALITIES[qualityId] ?? CHORD_QUALITIES.maj
    const intervals = Object.keys(quality.toneLabels).map(Number)

    return buildClarinetFingeringItems({
      rootPitchClass: chord.rootPitchClass,
      intervals,
      labelsByInterval: quality.toneLabels,
    })
  }

  function renderPrimaryScaleReference() {
    return (
      <article className="scale-suggestion arrangement-primary-scale">
        <div className="scale-suggestion-heading">
          <button
            className="disclosure-icon-button"
            type="button"
            aria-label={openScaleCharts.has(primaryArrangementScaleId) ? `Hide ${root.label} ${scale.name} chart` : `Show ${root.label} ${scale.name} chart`}
            aria-expanded={openScaleCharts.has(primaryArrangementScaleId)}
            onClick={() => {
              setOpenScaleCharts((current) => {
                const next = new Set(current)

                if (next.has(primaryArrangementScaleId)) {
                  next.delete(primaryArrangementScaleId)
                } else {
                  next.add(primaryArrangementScaleId)
                }

                return next
              })
            }}
          >
            <span></span>
          </button>

          <div>
            <p className="info-label">Primary scale</p>
            <h4>{root.label} {scale.name}</h4>
            <p>Root-scale reference for this harmony map. {scale.sound}</p>
          </div>

          <button
            className="text-action-button"
            type="button"
            onClick={() => updateSettings('mode', () => setMode('scales'))}
          >
            Open scale
          </button>
        </div>

        {openScaleCharts.has(primaryArrangementScaleId) ? (
          isFingerboardInstrument ? (
            <FretboardChart
              title={isCello ? 'Cello fingerings' : 'Full neck'}
              subtitle={isCello ? 'Primary scale tones with practical finger labels.' : 'Primary scale tones through the 15th fret.'}
              frets={getVisibleFrets(0, currentMaxFret + 1, currentMaxFret)}
              rows={buildFretboardRows(root.pitchClass, scale, currentMaxFret, currentStringSet)}
              compact
              onPlayNote={playNotePreview}
            />
          ) : isRecorder ? (
            <RecorderFingeringChart
              title="Alto recorder fingerings"
              subtitle="Primary scale tones across the practical alto recorder range."
              items={recorderScaleItems}
              compact
              onPlayNote={playNotePreview}
            />
          ) : isClarinet ? (
            <ClarinetFingeringChart
              title="Clarinet fingerings"
              subtitle="Primary scale tones across the written Bb clarinet range."
              items={clarinetScaleItems}
              compact
              onPlayNote={playNotePreview}
            />
          ) : (
            <PianoKeyboardChart
              title="Keyboard map"
              subtitle="Primary scale tones across two octaves."
              pitchClasses={scalePitchClasses}
              rootPitchClass={root.pitchClass}
              labelsByPitchClass={scaleLabelsByPitchClass}
              compact
              onPlayNote={playNotePreview}
            />
          )
        ) : null}
      </article>
    )
  }

  function renderChordPalette({ allowCustomChords = false } = {}) {
    const paletteRows = sortChordPaletteRows(
      allowCustomChords ? composeChordPalette : arrangement.rows,
      chordPaletteSort,
      root.pitchClass,
    )

    return (
      <div
        className={`arrangement-tabs${allowCustomChords ? ' is-compose-palette' : ''}`}
        role="tablist"
        aria-label="Chord palette"
      >
        {paletteRows.map((row) => (
          <div className="palette-chord-item" key={row.id}>
            <button
              className={`palette-chord-button${selectedArrangementChord?.id === row.id ? ' is-active' : ''}`}
              type="button"
              role="tab"
              aria-selected={selectedArrangementChord?.id === row.id}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData('text/plain', row.id)
                event.dataTransfer.effectAllowed = 'copy'
                setDraggingChordId(row.id)
                setSelectedArrangementChordId(row.id)
              }}
              onDragEnd={() => {
                setDraggingChordId(null)
                setProgressionPreview(null)
              }}
              onClick={() => setSelectedArrangementChordId(row.id)}
            >
              <strong>{chordLabel(row.name)}</strong>
              <small>{musicLabel(row.numeral)}</small>
            </button>

            <button
              className="palette-play-button"
              type="button"
              aria-label={`Preview ${chordLabel(row.name)}`}
              title={`Preview ${chordLabel(row.name)}`}
              onClick={() => playChordPreview(row)}
            >
              <Play size={12} />
            </button>

            {row.isCustom ? (
              <button
                className="palette-remove-button"
                type="button"
                aria-label={`Remove ${chordLabel(row.name)} from palette`}
                onClick={() => deleteCustomChord(row.id)}
              >
                <X size={12} strokeWidth={2.6} aria-hidden="true" />
              </button>
            ) : null}
          </div>
        ))}

        {allowCustomChords ? (
          <div className="palette-add-chord">
            <span className="palette-add-label">Add chord</span>
            <button
              className="palette-add-button"
              type="button"
              aria-label="Add chord"
              title="Add chord"
              onClick={addCustomChord}
            >
              <Plus size={20} strokeWidth={2.6} aria-hidden="true" />
            </button>
            <div className="palette-add-fields">
              <select
                aria-label="Custom chord root"
                value={customChordRootLabel}
                onChange={(event) => setCustomChordRootLabel(event.target.value)}
              >
                {ROOT_OPTIONS.map((option) => (
                  <option key={option.label} value={option.label}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                aria-label="Custom chord quality"
                value={customChordQualityId}
                onChange={(event) => setCustomChordQualityId(event.target.value)}
              >
                {CUSTOM_CHORD_QUALITY_OPTIONS.map((qualityId) => (
                  <option key={qualityId} value={qualityId}>
                    {CHORD_QUALITIES[qualityId]?.suffix || 'major'}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : null}
      </div>
    )
  }

  function renderPaletteSortControl() {
    return (
      <div className="palette-sort-control">
        <span id="palette-sort-label">Sort</span>
        <div className="palette-sort-tabs" role="tablist" aria-labelledby="palette-sort-label">
          {CHORD_PALETTE_SORT_OPTIONS.map((option) => (
            <button
              className={chordPaletteSort === option.id ? 'is-active' : ''}
              key={option.id}
              type="button"
              role="tab"
              aria-selected={chordPaletteSort === option.id}
              onClick={() => setChordPaletteSort(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    )
  }

  function renderPaletteSortHelp() {
    const sortOption = CHORD_PALETTE_SORT_OPTIONS.find((option) => option.id === chordPaletteSort)

    return <p className="palette-sort-help">{sortOption?.help}</p>
  }

  return (
    <main className="app-shell">
      {openTools.metronome ? (
        <FloatingToolWindow
          title="Metronome"
          defaultPosition={{ x: window.innerWidth - 180, y: 74 }}
          onClose={() => setOpenTools((current) => ({ ...current, metronome: false }))}
        >
          <MetronomeTool />
        </FloatingToolWindow>
      ) : null}

      {openTools.tuner ? (
        <FloatingToolWindow
          title="Tuner"
          defaultPosition={{ x: window.innerWidth - 180, y: 274 }}
          onClose={() => setOpenTools((current) => ({ ...current, tuner: false }))}
        >
          <TunerTool />
        </FloatingToolWindow>
      ) : null}

      <header className="control-panel" ref={controlPanelRef}>
        <div className="control-toolbar">
          <div className="nav-brand" aria-label="IntervalKit">
            <Music4 size={20} strokeWidth={2.3} aria-hidden="true" />
            <strong>IntervalKit</strong>
          </div>

          <div className="mode-instrument-group">
            <div className="mode-field">
              <span id="mode-picker-label">Mode</span>
              <div className="mode-toggle" role="tablist" aria-labelledby="mode-picker-label">
                <button
                  className={mode === 'harmony' ? 'is-active' : ''}
                  type="button"
                  onClick={() => updateSettings('mode', () => setMode('harmony'))}
                >
                  Harmony
                </button>
                <button
                  className={mode === 'scales' ? 'is-active' : ''}
                  type="button"
                  onClick={() => updateSettings('mode', () => setMode('scales'))}
                >
                  Scales
                </button>
                <button
                  className={mode === 'chords' ? 'is-active' : ''}
                  type="button"
                  onClick={() => updateSettings('mode', () => setMode('chords'))}
                >
                  Chords
                </button>
                <button
                  className={mode === 'compose' ? 'is-active' : ''}
                  type="button"
                  onClick={() => updateSettings('mode', () => setMode('compose'))}
                >
                  Compose
                </button>
              </div>
            </div>

            <label className="control-field instrument-field">
              <span>Instrument</span>
              <select
                value={instrument}
                style={getHeaderSelectStyle(instrumentLabel, { min: 7, max: 15 })}
                onChange={(event) => updateSettings('instrument', () => setInstrument(event.target.value))}
              >
                <option value="guitar">Guitar</option>
                <option value="piano">Piano</option>
                <option value="cello">Cello</option>
                <option value="alto-recorder">Alto recorder</option>
              </select>
            </label>
          </div>

          <div className="control-selectors">
            {mode === 'scales' || mode === 'harmony' || mode === 'compose' ? (
              <TonalCenterPicker
                rootLabel={root.label}
                scaleId={scale.id}
                instrument={instrument}
                onSelect={(nextRootLabel, nextScaleId) => {
                  updateSettings(['root', 'scale'], () => {
                    setRootLabel(nextRootLabel)
                    setScaleId(nextScaleId)
                    setCustomChordRootLabel(nextRootLabel)
                    clearProgression()
                  })
                }}
              />
            ) : null}

            {mode === 'chords' ? (
              <>
                <label className="control-field root-field">
                  <span>Root note</span>
                  <select
                    value={root.label}
                    style={getHeaderSelectStyle(root.label, {
                      min: 1,
                      max: 2,
                      characterWidth: 10,
                      chromeWidth: 48,
                    })}
                    onChange={(event) => {
                      updateSettings('root', () => {
                        setRootLabel(event.target.value)
                        setCustomChordRootLabel(event.target.value)
                        clearProgression()
                      })
                    }}
                  >
                    {ROOT_OPTIONS.map((option) => (
                      <option key={option.label} value={option.label}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="control-field flavor-field">
                  <span>Flavor</span>
                  <select
                    value={flavor.id}
                    style={getHeaderSelectStyle(flavor.name, { min: 9, max: 24 })}
                    onChange={(event) => updateSettings('flavor', () => setFlavorId(event.target.value))}
                  >
                    {Object.entries(groupedFlavors).map(([family, familyFlavors]) => (
                      <optgroup key={family} label={family}>
                        {familyFlavors.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </label>

                <label className="control-field complexity-field">
                  <span>Complexity</span>
                  <select
                    value={complexity.id}
                    style={getHeaderSelectStyle(complexity.label, { min: 10, max: 20 })}
                    onChange={(event) => updateSettings('complexity', () => setComplexityId(event.target.value))}
                  >
                    {CHORD_COMPLEXITY_OPTIONS.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            ) : null}

            {mode === 'harmony' || mode === 'compose' ? (
              <label className="control-field complexity-field">
                <span>Complexity</span>
                <select
                  value={arrangement.complexity.id}
                  style={getHeaderSelectStyle(arrangement.complexity.label, { min: 10, max: 20 })}
                  onChange={(event) => {
                    updateSettings('harmonyComplexity', () => {
                      setArrangementComplexityId(event.target.value)
                      clearProgression()
                    })
                  }}
                >
                  {ARRANGEMENT_COMPLEXITY_OPTIONS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>

          <div className="tool-launcher" aria-label="Practice tools">
            <span>Tools</span>
            <div className="tool-button-row">
              <button
                className="tool-icon-button is-metronome"
                type="button"
                aria-label="Open metronome"
                aria-pressed={openTools.metronome}
                title="Metronome"
                onClick={() => setOpenTools((current) => ({ ...current, metronome: !current.metronome }))}
              >
                <Metronome size={19} strokeWidth={2.2} aria-hidden="true" />
              </button>
              <button
                className="tool-icon-button is-tuner"
                type="button"
                aria-label="Open tuner"
                aria-pressed={openTools.tuner}
                title="Tuner"
                onClick={() => setOpenTools((current) => ({ ...current, tuner: !current.tuner }))}
              >
                <Gauge size={19} strokeWidth={2.2} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <section className="hero-panel">
        <div className="hero-copy">
          <h1>{chordLabel(heroTitle)}</h1>
          <div className="hero-meta">
            <div className="hero-meta-block">
              <p className="info-label">How it sounds</p>
              <p className="info-value">{selectedTheoryItem.sound}</p>
            </div>

            <div className="hero-meta-block">
              <p className="info-label">How to use it</p>
              <p className="info-value">{selectedTheoryItem.usage}</p>
            </div>
          </div>
        </div>

        <div className="hero-summary">
          {mode === 'harmony' || mode === 'scales' ? (
            <div className="summary-chip scale-staff-summary">
              <SheetMusicChart
                musicXml={buildScaleMusicXml({
                  rootLabel: root.label,
                  rootPitchClass: root.pitchClass,
                  scale,
                  instrument,
                  keyFifths: scaleKeyFifths,
                  showLabels: true,
                })}
                embedded
                bare
                onPlayNote={playNotePreview}
              />
            </div>
          ) : mode !== 'chords' ? (
            <div className="summary-chip summary-chip-group">
              <div>
                <span>Formula</span>
                <strong>{scaleFormula}</strong>
              </div>
              <div>
                <span>Pitch collection</span>
                <strong>{pitchCollection.map(musicLabel).join('  ')}</strong>
              </div>
              {mode === 'harmony' || mode === 'compose' ? (
                <div>
                  <span>Palette</span>
                  <strong>{arrangement.complexity.label}</strong>
                </div>
              ) : null}
            </div>
          ) : null}

        </div>
      </section>

      {mode === 'scales' ? (
        <>
          <section className="chart-section">
            {isFingerboardInstrument ? (
              <FretboardChart
                title={isCello ? 'Cello fingering map' : 'Complete neck map'}
                subtitle={isCello ? 'Scale tones across cello strings with position finger labels.' : 'All scale tones through the 15th fret.'}
                frets={fullNeckFrets}
                rows={rows}
                onPlayNote={playNotePreview}
              />
            ) : isRecorder ? (
              <RecorderFingeringChart
                title="Alto recorder fingering map"
                subtitle="Scale tones across the practical alto recorder range."
                items={recorderScaleItems}
                onPlayNote={playNotePreview}
              />
            ) : isClarinet ? (
              <ClarinetFingeringChart
                title="Clarinet fingering map"
                subtitle="Scale tones across the written Bb clarinet range."
                items={clarinetScaleItems}
                onPlayNote={playNotePreview}
              />
            ) : (
              <PianoKeyboardChart
                title="Keyboard map"
                subtitle="Scale tones across two octaves."
                pitchClasses={scalePitchClasses}
                rootPitchClass={root.pitchClass}
                labelsByPitchClass={scaleLabelsByPitchClass}
                onPlayNote={playNotePreview}
              />
            )}
          </section>

          {isFingerboardInstrument ? (
            <section className="positions-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Practice positions</p>
                <h2>{isCello ? 'Cello position windows' : 'Root-centered windows'}</h2>
              </div>
              <p>
                These windows are generated from root locations across the neck, then filtered
                for useful coverage.
              </p>
            </div>

            <div className="positions-grid">
              {positionWindows.length > 0 ? (
                positionWindows.map((window, index) => (
                  <FretboardChart
                    key={`${window.start}-${window.end}`}
                    title={`Position ${index + 1}`}
                    subtitle={window.start === 0 ? (isCello ? 'Open and first-position area.' : 'Open position through fret 4.') : `${isCello ? 'Positions' : 'Frets'} ${window.start} to ${window.end}.`}
                    frets={window.frets}
                    rows={rows}
                    compact
                    onPlayNote={playNotePreview}
                  />
                ))
              ) : (
                <article className="info-card">
                  <p className="info-label">No compact windows</p>
                  <p className="info-value">
                    This scale is dense enough on the full-neck chart, but the current filters did
                    not produce a clean set of smaller position windows.
                  </p>
                </article>
              )}
            </div>
          </section>
          ) : null}
        </>
      ) : mode === 'chords' ? (
        <section className="chord-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Chord mode</p>
              <h2>Functional voicing set</h2>
            </div>
            <p>
              Rows move from center to motion and color, with several playable grips for each chord.
            </p>
          </div>

          <div className="chord-groups">
            {chordGroups.map((group) => (
              <section className="chord-group" key={group.id}>
                <div className="chord-group-heading">
                  <p className="eyebrow">{group.label}</p>
                  <p>{group.description}</p>
                </div>

                <div className="chord-row-list">
                  {group.rows.map((row) => (
                    <article className="chord-row" key={row.id}>
                      <div className="chord-row-copy">
                        <div className="chord-row-title">
                          <div className="chord-title-line">
                            <h3>{chordLabel(row.name)}</h3>
                            <button
                              className="inline-play-button"
                              type="button"
                              aria-label={`Preview ${chordLabel(row.name)}`}
                              title={`Preview ${chordLabel(row.name)}`}
                              onClick={() => playChordPreview(row)}
                            >
                              <Play size={14} />
                            </button>
                          </div>
                          <p>{musicLabel(row.numeral)} · {row.summary}</p>
                        </div>

                        <div className="chord-row-tags">
                          <span className="mini-tag">Formula {musicLabel(row.formula)}</span>
                          {row.tags.map((tag) => (
                            <span className="mini-tag" key={`${row.id}-${tag}`}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      <SheetMusicChart
                        musicXml={buildChordMusicXml({
                          chord: row,
                          instrument,
                          keyFifths: chordKeyFifths,
                        })}
                        compact
                        onPlayNote={playNotePreview}
                      />

                      {instrument === 'guitar' ? (
                        <div className="voicing-grid">
                          {row.voicings.length > 0 ? (
                          row.voicings.map((voicing) => (
                            <FretboardChart
                              key={voicing.id}
                              title={voicing.title}
                              subtitle={voicing.subtitle}
                              meta={voicing.meta}
                              frets={voicing.frets}
                              rows={voicing.rows}
                              compact
                              showInlays={false}
                              fixedFrets
                              onPlayNote={playNotePreview}
                              onPlayVoicing={playVoicingPreview}
                              notationMusicXml={buildVoicingMusicXml({
                                chordName: row.name,
                                rows: voicing.rows,
                                keyFifths: chordKeyFifths,
                              })}
                            />
                          ))
                        ) : (
                          <article className="chart-card is-compact empty-voicing-card">
                            <div className="chart-heading">
                              <div>
                                <h3>No guitar voicings yet</h3>
                                <p>
                                  This chord does not have a matching guitar shape in the current
                                  voicing library.
                                </p>
                              </div>
                            </div>
                          </article>
                        )}
                        </div>
                      ) : isCello ? (
                        <FretboardChart
                          title={`${chordLabel(row.name)} cello fingerings`}
                          subtitle={musicLabel(row.formula)}
                          frets={fullNeckFrets}
                          rows={getChordToneRows(row)}
                          compact
                          onPlayNote={playNotePreview}
                        />
                      ) : isRecorder ? (
                        <RecorderFingeringChart
                          title={`${chordLabel(row.name)} alto recorder fingerings`}
                          subtitle={musicLabel(row.formula)}
                          items={getChordToneRecorderItems(row)}
                          compact
                          onPlayNote={playNotePreview}
                        />
                      ) : isClarinet ? (
                        <ClarinetFingeringChart
                          title={`${chordLabel(row.name)} clarinet fingerings`}
                          subtitle={musicLabel(row.formula)}
                          items={getChordToneClarinetItems(row)}
                          compact
                          onPlayNote={playNotePreview}
                        />
                      ) : (
                        <PianoKeyboardChart
                          title={`${chordLabel(row.name)} keyboard tones`}
                          subtitle={musicLabel(row.formula)}
                          pitchClasses={Object.keys(CHORD_QUALITIES[row.qualityId]?.toneLabels ?? {}).map((interval) => (row.rootPitchClass + Number(interval)) % 12)}
                          rootPitchClass={row.rootPitchClass}
                          labelsByPitchClass={Object.fromEntries(Object.entries(CHORD_QUALITIES[row.qualityId]?.toneLabels ?? {}).map(([interval, label]) => [(row.rootPitchClass + Number(interval)) % 12, label]))}
                          compact
                          onPlayNote={playNotePreview}
                        />
                      )}
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </section>
      ) : (
        <section className="arrangement-section">
          {mode === 'harmony' ? (
            <>
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Harmony mode</p>
                  <h2>Primary scale</h2>
                </div>
                <p>
                  Start from the selected root and scale, then compare the chord palette against
                  this reference collection.
                </p>
              </div>

              {renderPrimaryScaleReference()}

              <div className="palette-heading">
                <div className="palette-heading-row">
                  <h2>{harmonyChordPaletteLabel} in the {scale.name} scale</h2>
                  {renderPaletteSortControl()}
                </div>
                {renderPaletteSortHelp()}
              </div>
              {renderChordPalette()}
            </>
          ) : null}

          {mode === 'compose' ? (
          <section className="progression-builder">
            <div className="compose-sticky-tools">
              <div className="compose-playback-panel" aria-label="Progression playback controls">
                <div className="compose-transport">
                  <button
                    className="compose-transport-button"
                    type="button"
                    onClick={() => {
                      if (isProgressionPlaying) {
                        stopProgressionPlayback()
                      } else {
                        startProgressionPlayback()
                      }
                    }}
                    disabled={sortedProgressionEvents.length < 1}
                    aria-label={isProgressionPlaying ? 'Stop progression playback' : 'Play progression'}
                    title={isProgressionPlaying ? 'Stop progression playback' : 'Play progression'}
                  >
                    {isProgressionPlaying ? <Pause size={18} /> : <Play size={18} />}
                  </button>
                  <button
                    className="compose-transport-button"
                    type="button"
                    onClick={stopProgressionPlayback}
                    disabled={!isProgressionPlaying}
                    aria-label="Stop progression"
                    title="Stop progression"
                  >
                    <Square size={17} />
                  </button>
                  <label className="inline-select compose-length-field">
                    <span>Length</span>
                    <input
                      type="number"
                      min="1"
                      max={MAX_PROGRESSION_BARS}
                      value={progressionBars}
                      onChange={(event) => changeProgressionBars(Number(event.target.value))}
                    />
                  </label>
                  <label className="inline-select compose-tempo-field">
                    <span>Tempo</span>
                    <input
                      type="number"
                      min="30"
                      max="240"
                      value={progressionTempo}
                      onChange={(event) => {
                        stopProgressionPlayback()
                        setProgressionTempo(getClampedTempo(event.target.value))
                      }}
                    />
                  </label>
                  <label className="inline-select">
                    <span>Click</span>
                    <select
                      value={progressionClickMode}
                      onChange={(event) => {
                        stopProgressionPlayback()
                        setProgressionClickMode(event.target.value)
                      }}
                    >
                      {PROGRESSION_CLICK_OPTIONS.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="inline-select compose-sound-field">
                    <span>Sound</span>
                    <select
                      value={playbackVoice}
                      onChange={(event) => {
                        stopProgressionPlayback()
                        setPlaybackVoice(event.target.value)
                      }}
                    >
                      {PLAYBACK_VOICE_OPTIONS.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="compose-volume-control">
                    <span>Chords</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={progressionChordVolume}
                      onChange={(event) => {
                        setProgressionChordVolume(Number(event.target.value))
                      }}
                    />
                  </label>
                  <label className="compose-volume-control">
                    <span>Click</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={progressionClickVolume}
                      onChange={(event) => {
                        setProgressionClickVolume(Number(event.target.value))
                      }}
                    />
                  </label>
                  <button
                    className={`compose-action-button toggle-button${isProgressionLooping ? ' is-active' : ''}`}
                    type="button"
                    aria-pressed={isProgressionLooping}
                    onClick={() => setIsProgressionLooping((current) => !current)}
                  >
                    <Repeat size={16} aria-hidden="true" />
                    Loop
                  </button>
                </div>
              </div>

              <div className="compose-chord-panel">
                <div className="compose-palette-header">
                  <div className="palette-heading-row">
                    {renderPaletteSortControl()}
                  </div>
                  {renderPaletteSortHelp()}
                </div>
                {renderChordPalette({ allowCustomChords: true })}

                <div className="compose-add-section">
                  <button
                    className="compose-action-button primary-action-button"
                    type="button"
                    onClick={() => addChordToProgression(selectedArrangementChord.id)}
                    disabled={!selectedArrangementChord || emptyProgressionTicks < 1}
                  >
                    <Plus size={17} aria-hidden="true" />
                    Add selected chord
                  </button>
                  <label className="inline-select">
                    <span>New chord length</span>
                    <select
                      value={defaultProgressionDurationTicks}
                      onChange={(event) => setDefaultProgressionDurationTicks(Number(event.target.value))}
                    >
                      {PROGRESSION_DURATION_OPTIONS.map((option) => (
                        <option key={option.ticks} value={option.ticks}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="typicality-control">
                    <span>Typicality</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={progressionTypicality}
                      onChange={(event) => setProgressionTypicality(Number(event.target.value))}
                    />
                    <strong>{getTypicalityLabel(progressionTypicality)}</strong>
                  </label>
                  <button
                    className="compose-action-button"
                    type="button"
                    onClick={fillRemainingProgressionSpace}
                    disabled={emptyProgressionTicks < 1}
                  >
                    <Shuffle size={16} aria-hidden="true" />
                    Random fill empty space
                  </button>
                  <button
                    className="compose-action-button"
                    type="button"
                    onClick={clearProgression}
                    disabled={progressionEvents.length < 1}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                    Clear
                  </button>
                </div>
              </div>

              <div className="progression-status">
                <span>{sortedProgressionEvents.length} chords</span>
                <span>{emptyProgressionTicks / PROGRESSION_TICKS_PER_BAR} empty bars</span>
                <span>{getTypicalityLabel(progressionTypicality).toLowerCase()} generation</span>
              </div>
            </div>

            <div className="progression-grid" aria-label="Progression grid">
              {Array.from({ length: progressionBars }, (_, barIndex) => {
                const barStartTick = barIndex * PROGRESSION_TICKS_PER_BAR
                const barEndTick = barStartTick + PROGRESSION_TICKS_PER_BAR
                const eventsInBar = sortedProgressionEvents.filter((event) => (
                  event.startTick < barEndTick && getEventEndTick(event) > barStartTick
                ))
                const previewInBar = progressionPreview
                  && progressionPreview.startTick < barEndTick
                  && progressionPreview.startTick + progressionPreview.durationTicks > barStartTick
                  ? progressionPreview
                  : null
                const playheadInBar = playheadTick !== null && playheadTick >= barStartTick && playheadTick < barEndTick
                  ? playheadTick
                  : null

                return (
                  <div className="progression-bar" key={`bar-${barIndex + 1}`}>
                    <div className="progression-bar-label">Bar {barIndex + 1}</div>
                    <div
                      className="progression-bar-grid"
                      onDragOver={(event) => handleProgressionDragOver(event, barStartTick)}
                      onDrop={(event) => handleProgressionDrop(event, barStartTick)}
                      onDragLeave={(event) => {
                        if (!event.currentTarget.contains(event.relatedTarget)) {
                          setProgressionPreview(null)
                        }
                      }}
                    >
                      {Array.from({ length: PROGRESSION_TICKS_PER_BAR }, (_, tickIndex) => {
                        const startTick = barStartTick + tickIndex
                        const isOccupied = sortedProgressionEvents.some((event) => (
                          startTick >= event.startTick && startTick < getEventEndTick(event)
                        ))

                        return (
                          <button
                            className={`progression-tick${isOccupied ? ' is-occupied' : ''}`}
                            type="button"
                            key={`bar-${barIndex + 1}-tick-${tickIndex + 1}`}
                            aria-label={`Bar ${barIndex + 1}, eighth ${tickIndex + 1}`}
                            style={{ gridColumn: tickIndex + 1 }}
                            onClick={() => {
                              if (!isOccupied && selectedArrangementChord) {
                                addChordToProgression(selectedArrangementChord.id, startTick)
                              }
                            }}
                          ></button>
                        )
                      })}

                      {playheadInBar !== null ? (
                        <div
                          className="progression-playhead"
                          style={{
                            gridColumn: `${playheadInBar - barStartTick + 1} / ${playheadInBar - barStartTick + 2}`,
                          }}
                        ></div>
                      ) : null}

                      {previewInBar && previewChord ? (() => {
                        const previewStartTick = Math.max(previewInBar.startTick, barStartTick)
                        const previewEndTick = Math.min(previewInBar.startTick + previewInBar.durationTicks, barEndTick)

                        return (
                          <div
                            className={`progression-preview is-${previewInBar.mode}`}
                            style={{
                              gridColumn: `${previewStartTick - barStartTick + 1} / ${previewEndTick - barStartTick + 1}`,
                            }}
                          >
                            <strong>{chordLabel(previewChord.name)}</strong>
                            <span>{getDurationLabel(previewInBar.durationTicks)}</span>
                          </div>
                        )
                      })() : null}

                      {eventsInBar.map((event) => {
                        const chord = composeChordPalette.find((row) => row.id === event.chordId)
                        const segmentStartTick = Math.max(event.startTick, barStartTick)
                        const segmentEndTick = Math.min(getEventEndTick(event), barEndTick)
                        const gridColumnStart = segmentStartTick - barStartTick + 1
                        const gridColumnEnd = segmentEndTick - barStartTick + 1
                        const isFirstSegment = segmentStartTick === event.startTick
                        const isLastSegment = segmentEndTick === getEventEndTick(event)

                        if (!chord) return null

                        return (
                          <div
                            className={`progression-event${selectedProgressionEventId === event.id ? ' is-selected' : ''}`}
                            role="button"
                            tabIndex="0"
                            aria-label={`Select ${chordLabel(chord.name)} from bar ${Math.floor(event.startTick / PROGRESSION_TICKS_PER_BAR) + 1}`}
                            key={`${event.id}-bar-${barIndex + 1}`}
                            style={{
                              gridColumn: `${gridColumnStart} / ${gridColumnEnd}`,
                            }}
                            onClick={() => {
                              setSelectedProgressionEventId(event.id)
                              setSelectedArrangementChordId(chord.id)
                            }}
                            onKeyDown={(keyboardEvent) => {
                              if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
                                keyboardEvent.preventDefault()
                                setSelectedProgressionEventId(event.id)
                                setSelectedArrangementChordId(chord.id)
                              }
                            }}
                          >
                            {isFirstSegment ? (
                              <button
                                className="progression-remove-button"
                                type="button"
                                aria-label={`Remove ${chordLabel(chord.name)} from bar ${Math.floor(event.startTick / PROGRESSION_TICKS_PER_BAR) + 1}`}
                                onClick={(clickEvent) => {
                                  clickEvent.stopPropagation()
                                  deleteProgressionEvent(event.id)
                                }}
                              >
                                <X size={12} strokeWidth={2.6} aria-hidden="true" />
                              </button>
                            ) : null}

                            {isFirstSegment ? (
                              <span
                                className="progression-resize-handle is-start"
                                draggable
                                role="separator"
                                aria-label={`Resize start of ${chordLabel(chord.name)}`}
                                onDragStart={(dragEvent) => {
                                  dragEvent.stopPropagation()
                                  dragEvent.dataTransfer.setData('application/x-progression-resize', JSON.stringify({
                                    eventId: event.id,
                                    edge: 'start',
                                  }))
                                  dragEvent.dataTransfer.effectAllowed = 'move'
                                }}
                                onDragEnd={() => setProgressionPreview(null)}
                              ></span>
                            ) : null}

                            <div className="progression-event-copy">
                              <strong>{chordLabel(chord.name)}</strong>
                              <span>{chord.numeral}</span>
                            </div>

                            {isLastSegment ? (
                              <span
                                className="progression-resize-handle is-end"
                                draggable
                                role="separator"
                                aria-label={`Resize end of ${chordLabel(chord.name)}`}
                                onDragStart={(dragEvent) => {
                                  dragEvent.stopPropagation()
                                  dragEvent.dataTransfer.setData('application/x-progression-resize', JSON.stringify({
                                    eventId: event.id,
                                    edge: 'end',
                                  }))
                                  dragEvent.dataTransfer.effectAllowed = 'move'
                                }}
                                onDragEnd={() => setProgressionPreview(null)}
                              ></span>
                            ) : null}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            {selectedProgressionEvent && selectedProgressionChord ? (
              <article className="progression-event-editor">
                <div className="chord-row-copy">
                  <div className="chord-row-title">
                    <h3>{chordLabel(selectedProgressionChord.name)}</h3>
                    <p>
                      Starts at bar {Math.floor(selectedProgressionEvent.startTick / PROGRESSION_TICKS_PER_BAR) + 1},
                      eighth {(selectedProgressionEvent.startTick % PROGRESSION_TICKS_PER_BAR) + 1} · {getDurationLabel(selectedProgressionEvent.durationTicks)}
                    </p>
                  </div>

                  <div className="chord-row-tags">
                    <span className="mini-tag">{selectedProgressionChord.numeral}</span>
                    <span className={`mini-tag dissonance-tag is-${selectedProgressionChord.dissonance.level.toLowerCase()}`}>
                      {selectedProgressionChord.dissonance.level} dissonance
                    </span>
                    {selectedProgressionChord.tags.slice(0, 3).map((tag) => (
                      <span className="mini-tag" key={`progression-${selectedProgressionEvent.id}-${tag}`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="progression-edit-controls">
                  <label className="inline-select">
                    <span>Duration</span>
                    <select
                      value={selectedProgressionEvent.durationTicks}
                      onChange={(event) => updateProgressionEvent(selectedProgressionEvent.id, {
                        durationTicks: Number(event.target.value),
                      })}
                    >
                      {getDurationOptionsForTicks(selectedProgressionEvent.durationTicks, totalProgressionTicks)
                        .map((option) => (
                          <option key={option.ticks} value={option.ticks}>
                            {option.label}
                          </option>
                        ))}
                    </select>
                  </label>

                  <div className="button-row">
                    <button
                      type="button"
                      onClick={() => updateProgressionEvent(selectedProgressionEvent.id, {
                        startTick: selectedProgressionEvent.startTick - 1,
                      })}
                    >
                      Move left
                    </button>
                    <button
                      type="button"
                      onClick={() => updateProgressionEvent(selectedProgressionEvent.id, {
                        startTick: selectedProgressionEvent.startTick + 1,
                      })}
                    >
                      Move right
                    </button>
                    <button type="button" onClick={() => duplicateProgressionEvent(selectedProgressionEvent)}>
                      Duplicate
                    </button>
                    <button type="button" onClick={() => deleteProgressionEvent(selectedProgressionEvent.id)}>
                      Delete
                    </button>
                  </div>
                </div>

                <div className="scale-suggestions progression-scale-suggestions">
                  <p className="info-label">Scales for this chord</p>
                  <div className="scale-suggestion-list">
                    <article className="scale-suggestion">
                      <div>
                        <h4>{root.label} {scale.name}</h4>
                        <p>{selectedProgressionChord.dissonance.description}</p>
                      </div>
                    </article>

                    {selectedProgressionAlternativeScales.map((suggestion) => (
                      <article className="scale-suggestion" key={`progression-${selectedProgressionEvent.id}-${suggestion.id}`}>
                        <div>
                          <h4>{chordLabel(suggestion.name)}</h4>
                          <p>{suggestion.usage}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </article>
            ) : null}
          </section>
          ) : null}

          {mode === 'compose' ? (
            <div className="compose-primary-scale">
              {renderPrimaryScaleReference()}
            </div>
          ) : null}

          {mode === 'harmony' && selectedArrangementChord ? (
            <article className="arrangement-detail">
              <div className="chord-row-copy">
                <div className="chord-row-title">
                  <div className="chord-title-line">
                    <h2>{chordLabel(selectedArrangementChord.name)}</h2>
                    <button
                      className="inline-play-button"
                      type="button"
                      aria-label={`Preview ${chordLabel(selectedArrangementChord.name)}`}
                      title={`Preview ${chordLabel(selectedArrangementChord.name)}`}
                      onClick={() => playChordPreview(selectedArrangementChord)}
                    >
                      <Play size={14} />
                    </button>
                  </div>
                  <p>{musicLabel(selectedArrangementChord.numeral)} · {selectedArrangementChord.summary}</p>
                </div>

                <div className="chord-row-tags">
                  <span className="mini-tag">Formula {musicLabel(selectedArrangementChord.formula)}</span>
                  <span className={`mini-tag dissonance-tag is-${selectedArrangementChord.dissonance.level.toLowerCase()}`}>
                    {selectedArrangementChord.dissonance.level} dissonance
                  </span>
                  {selectedArrangementChord.tags.map((tag) => (
                    <span className="mini-tag" key={`${selectedArrangementChord.id}-${tag}`}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <p className="arrangement-note">{selectedArrangementChord.dissonance.description}</p>

              <SheetMusicChart
                musicXml={buildChordMusicXml({
                  chord: selectedArrangementChord,
                  instrument,
                  keyFifths: scaleKeyFifths,
                })}
                compact
                onPlayNote={playNotePreview}
              />

              <article className="arrangement-fingerings">
                <div className="inline-disclosure">
                  <button
                    className="disclosure-icon-button"
                    type="button"
                    aria-label={showArrangementFingerings ? 'Hide chord fingerings' : 'Show chord fingerings'}
                    aria-expanded={showArrangementFingerings}
                    onClick={() => setShowArrangementFingerings((current) => !current)}
                  >
                    <span></span>
                  </button>
                  <p className="info-label">Fingerings</p>
                </div>

                {showArrangementFingerings ? (
                  <div className="voicing-grid">
                    {instrument === 'guitar' ? (
                      selectedArrangementChord.voicings.map((voicing) => (
                        <FretboardChart
                          key={voicing.id}
                          title={voicing.title}
                          subtitle={voicing.subtitle}
                          meta={voicing.meta}
                          frets={voicing.frets}
                          rows={voicing.rows}
                          compact
                          showInlays={false}
                          fixedFrets
                          onPlayNote={playNotePreview}
                          onPlayVoicing={playVoicingPreview}
                          notationMusicXml={buildVoicingMusicXml({
                            chordName: selectedArrangementChord.name,
                            rows: voicing.rows,
                            keyFifths: scaleKeyFifths,
                          })}
                        />
                      ))
                    ) : isCello ? (
                      <FretboardChart
                        title={`${chordLabel(selectedArrangementChord.name)} cello fingerings`}
                        subtitle={musicLabel(selectedArrangementChord.formula)}
                        frets={fullNeckFrets}
                        rows={getChordToneRows(selectedArrangementChord)}
                        compact
                        onPlayNote={playNotePreview}
                      />
                    ) : isRecorder ? (
                      <RecorderFingeringChart
                        title={`${chordLabel(selectedArrangementChord.name)} alto recorder fingerings`}
                        subtitle={musicLabel(selectedArrangementChord.formula)}
                        items={getChordToneRecorderItems(selectedArrangementChord)}
                        compact
                        onPlayNote={playNotePreview}
                      />
                    ) : isClarinet ? (
                      <ClarinetFingeringChart
                        title={`${chordLabel(selectedArrangementChord.name)} clarinet fingerings`}
                        subtitle={musicLabel(selectedArrangementChord.formula)}
                        items={getChordToneClarinetItems(selectedArrangementChord)}
                        compact
                        onPlayNote={playNotePreview}
                      />
                    ) : (
                      <PianoKeyboardChart
                        title={`${chordLabel(selectedArrangementChord.name)} keyboard tones`}
                        subtitle={musicLabel(selectedArrangementChord.formula)}
                        pitchClasses={Object.keys(CHORD_QUALITIES[selectedArrangementChord.quality]?.toneLabels ?? {}).map((interval) => (selectedArrangementChord.rootPitchClass + Number(interval)) % 12)}
                        rootPitchClass={selectedArrangementChord.rootPitchClass}
                        labelsByPitchClass={Object.fromEntries(Object.entries(CHORD_QUALITIES[selectedArrangementChord.quality]?.toneLabels ?? {}).map(([interval, label]) => [(selectedArrangementChord.rootPitchClass + Number(interval)) % 12, label]))}
                        compact
                        onPlayNote={playNotePreview}
                      />
                    )}
                  </div>
                ) : null}
              </article>

              {selectedAlternativeScaleSuggestions.length > 0 ? (
              <div className="scale-suggestions">
                <h2>Alternative scales for {chordLabel(selectedArrangementChord.name)}</h2>

                <div className="scale-suggestion-list">
                  {selectedAlternativeScaleSuggestions.map((suggestion) => (
                    <article className="scale-suggestion" key={suggestion.id}>
                      <div className="scale-suggestion-heading">
                        <button
                          className="disclosure-icon-button"
                          type="button"
                          aria-label={openScaleCharts.has(suggestion.id) ? `Hide ${chordLabel(suggestion.name)} chart` : `Show ${chordLabel(suggestion.name)} chart`}
                          aria-expanded={openScaleCharts.has(suggestion.id)}
                          onClick={() => {
                            setOpenScaleCharts((current) => {
                              const next = new Set(current)

                              if (next.has(suggestion.id)) {
                                next.delete(suggestion.id)
                              } else {
                                next.add(suggestion.id)
                              }

                              return next
                            })
                          }}
                        >
                          <span></span>
                        </button>

                        <div>
                          <h4>{chordLabel(suggestion.name)}</h4>
                          <p>{suggestion.isRootScale ? `${suggestion.usage} ${suggestion.sound}` : suggestion.usage}</p>
                        </div>

                        <button
                          className="text-action-button"
                          type="button"
                          onClick={() => {
                            updateSettings(['root', 'scale', 'mode'], () => {
                              setRootLabel(suggestion.rootLabel)
                              setScaleId(suggestion.scaleId)
                              setMode('scales')
                            })
                          }}
                        >
                          Open scale
                        </button>
                      </div>

                      {openScaleCharts.has(suggestion.id) ? (
                        isFingerboardInstrument ? (
                          <FretboardChart
                            title={isCello ? 'Cello fingerings' : 'Full neck'}
                            subtitle={isCello ? 'Suggested scale tones with practical finger labels.' : 'Suggested scale tones through fret 12.'}
                            frets={fullNeckFrets}
                            rows={buildFretboardRows(
                              suggestion.rootPitchClass,
                              SCALE_LIBRARY.find((item) => item.id === suggestion.scaleId) ?? scale,
                              currentMaxFret,
                              currentStringSet,
                            )}
                            compact
                            onPlayNote={playNotePreview}
                          />
                        ) : isRecorder ? (
                          <RecorderFingeringChart
                            title="Alto recorder fingerings"
                            subtitle="Suggested scale tones across the practical alto recorder range."
                            items={buildRecorderFingeringItems({
                              rootPitchClass: suggestion.rootPitchClass,
                              intervals: (SCALE_LIBRARY.find((item) => item.id === suggestion.scaleId) ?? scale).intervals,
                              labelsByInterval: (SCALE_LIBRARY.find((item) => item.id === suggestion.scaleId) ?? scale).degreeLabels,
                            })}
                            compact
                            onPlayNote={playNotePreview}
                          />
                        ) : isClarinet ? (
                          <ClarinetFingeringChart
                            title="Clarinet fingerings"
                            subtitle="Suggested scale tones across the written Bb clarinet range."
                            items={buildClarinetFingeringItems({
                              rootPitchClass: suggestion.rootPitchClass,
                              intervals: (SCALE_LIBRARY.find((item) => item.id === suggestion.scaleId) ?? scale).intervals,
                              labelsByInterval: (SCALE_LIBRARY.find((item) => item.id === suggestion.scaleId) ?? scale).degreeLabels,
                            })}
                            compact
                            onPlayNote={playNotePreview}
                          />
                        ) : (
                          <PianoKeyboardChart
                            title="Keyboard map"
                            subtitle="Suggested scale tones across two octaves."
                            pitchClasses={suggestion.pitchClasses}
                            rootPitchClass={suggestion.rootPitchClass}
                            labelsByPitchClass={suggestion.labelsByPitchClass}
                            compact
                            onPlayNote={playNotePreview}
                          />
                        )
                      ) : null}
                    </article>
                  ))}
                </div>
              </div>
              ) : null}
            </article>
          ) : null}
        </section>
      )}

      <footer className="app-footer">
        Made with 🍕 by <a href="https://alesh.com/">Alesh</a>.{' '}
        <a href="https://github.com/aleshh/gtr-scales">GitHub</a>.
      </footer>
    </main>
  )
}

export default App
