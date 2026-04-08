import { ROOT_OPTIONS } from '../data/scales'
import {
  CHORD_QUALITIES,
  CHORD_VOICING_TEMPLATES,
} from '../data/chords'

const LOW_TO_HIGH_STRINGS = [
  { label: 'E', openPitchClass: 4 },
  { label: 'A', openPitchClass: 9 },
  { label: 'D', openPitchClass: 2 },
  { label: 'G', openPitchClass: 7 },
  { label: 'B', openPitchClass: 11 },
  { label: 'E', openPitchClass: 4 },
]

const HIGH_TO_LOW_STRINGS = [...LOW_TO_HIGH_STRINGS].reverse()
const COMPLEXITY_ORDER = ['triads', 'sevenths', 'extended', 'advanced']
const PLAYABILITY_LIMITS = {
  easy: { maxStart: 5, maxStretch: 3, maxMuted: 2, allowCompactOnly: false, preferJazz: false, limit: 3 },
  intermediate: { maxStart: 8, maxStretch: 4, maxMuted: 3, allowCompactOnly: false, preferJazz: false, limit: 3 },
  full: { maxStart: 12, maxStretch: 5, maxMuted: 5, allowCompactOnly: false, preferJazz: false, limit: 4 },
  jazz: { maxStart: 12, maxStretch: 4, maxMuted: 5, allowCompactOnly: true, preferJazz: true, limit: 3 },
}

function getRootLabelForPitchClass(pitchClass) {
  return ROOT_OPTIONS.find((option) => option.pitchClass === pitchClass)?.label ?? 'C'
}

function getChordName(rootPitchClass, qualityId) {
  const quality = CHORD_QUALITIES[qualityId] ?? CHORD_QUALITIES.min
  return `${getRootLabelForPitchClass(rootPitchClass)}${quality.suffix}`
}

function resolveQualityId(chord, complexityId) {
  const complexityIndex = COMPLEXITY_ORDER.indexOf(complexityId)

  for (let index = complexityIndex; index >= 0; index -= 1) {
    const qualityId = chord.qualities[COMPLEXITY_ORDER[index]]

    if (qualityId) {
      return qualityId
    }
  }

  return chord.qualities.triads
}

function getStringIndex(anchorString) {
  return 6 - anchorString
}

function getRootFrets(anchorString, rootPitchClass, maxFret = 12) {
  const string = LOW_TO_HIGH_STRINGS[getStringIndex(anchorString)]
  const frets = []

  for (let fret = 0; fret <= maxFret; fret += 1) {
    if ((string.openPitchClass + fret) % 12 === rootPitchClass) {
      frets.push(fret)
    }
  }

  return frets
}

function buildAbsoluteFrets(template, rootFret) {
  return template.frets.map((relativeFret) => {
    if (relativeFret < 0) {
      return -1
    }

    return rootFret + relativeFret
  })
}

function getFrettedRange(frets) {
  const fretted = frets.filter((fret) => fret > 0)

  if (fretted.length === 0) {
    return { min: 0, max: 0 }
  }

  return {
    min: Math.min(...fretted),
    max: Math.max(...fretted),
  }
}

function compareFretPositions(leftFrets, rightFrets) {
  const leftRange = getFrettedRange(leftFrets)
  const rightRange = getFrettedRange(rightFrets)

  if (leftRange.min !== rightRange.min) {
    return leftRange.min - rightRange.min
  }

  if (leftRange.max !== rightRange.max) {
    return leftRange.max - rightRange.max
  }

  return leftFrets.join(',').localeCompare(rightFrets.join(','))
}

function isAllowedByPlayability(template, frets, playabilityId) {
  const settings = PLAYABILITY_LIMITS[playabilityId]
  const { min, max } = getFrettedRange(frets)
  const stretch = max - min
  const mutedCount = frets.filter((fret) => fret < 0).length
  const isCompact = template.tags.includes('compact') || frets.filter((fret) => fret >= 0).length <= 4
  const exceedsSpan = max > 12 || (min > 0 && max - min > 3)

  if (exceedsSpan || stretch > settings.maxStretch || mutedCount > settings.maxMuted) {
    return false
  }

  if (min > settings.maxStart) {
    return false
  }

  if (settings.allowCompactOnly && !isCompact) {
    return false
  }

  if (!settings.preferJazz && template.tags.includes('jazz') && playabilityId !== 'full') {
    return false
  }

  return true
}

function getVoicingRank(template, frets, playabilityId) {
  const { min, max } = getFrettedRange(frets)
  const stretch = max - min
  const mutedCount = frets.filter((fret) => fret < 0).length
  const hasOpenStrings = frets.some((fret) => fret === 0)
  const compactBonus = template.tags.includes('compact') ? -6 : 0
  const openBonus = hasOpenStrings ? -4 : 0
  const jazzBonus = playabilityId === 'jazz' && template.tags.includes('jazz') ? -12 : 0

  return template.priority * 10 + min * 2 + stretch * 4 + mutedCount * 3 + compactBonus + openBonus + jazzBonus
}

function getVisibleFretsForVoicing(frets) {
  const positiveFrets = frets.filter((fret) => fret > 0)
  const hasOpenStrings = frets.some((fret) => fret === 0)

  if (positiveFrets.length === 0) {
    return [0, 1, 2, 3, 4]
  }

  const minFret = Math.min(...positiveFrets)

  if (hasOpenStrings || minFret <= 1) {
    return [0, 1, 2, 3, 4]
  }

  return [minFret, minFret + 1, minFret + 2, minFret + 3]
}

function buildVoicingRows(rootPitchClass, quality, frets) {
  return HIGH_TO_LOW_STRINGS.map((string) => {
    const lowToHighIndex = LOW_TO_HIGH_STRINGS.findIndex((candidate) => candidate === string)
    const fret = frets[lowToHighIndex]
    const notes = {}

    if (fret >= 0) {
      const pitchClass = (string.openPitchClass + fret) % 12
      const interval = (pitchClass - rootPitchClass + 12) % 12
      const degree = quality.toneLabels[interval]

      if (degree) {
        notes[fret] = {
          degree,
          noteLabel: getRootLabelForPitchClass(pitchClass),
          interval,
          isRoot: interval === 0,
        }
      }
    }

    return {
      label: string.label,
      notes,
    }
  })
}

function describeVoicing(template, frets) {
  const usedFrets = frets.filter((fret) => fret >= 0)
  const positiveFrets = frets.filter((fret) => fret > 0)
  const hasOpenStrings = frets.some((fret) => fret === 0)
  const pattern = frets.map((fret) => (fret < 0 ? 'x' : fret)).join(' ')
  const minFret = positiveFrets.length > 0 ? Math.min(...positiveFrets) : 0
  const maxFret = positiveFrets.length > 0 ? Math.max(...positiveFrets) : 0
  const positionLabel = minFret <= 1 ? 'Open / low position' : `Around fret ${minFret}`
  const rangeLabel = positiveFrets.length > 0 ? `frets ${minFret}-${maxFret}` : 'open strings'
  const compactLabel = usedFrets.length <= 4 || template.tags.includes('compact') ? 'compact grip' : 'full grip'
  const openLabel = hasOpenStrings ? 'open strings' : 'fretted'

  return {
    subtitle: `${pattern} · ${positionLabel}`,
    meta: `${rangeLabel} · ${compactLabel} · ${openLabel}`,
  }
}

function buildVoicing(rootPitchClass, qualityId, template, frets) {
  const quality = CHORD_QUALITIES[qualityId]
  const description = describeVoicing(template, frets)

  return {
    id: `${template.id}-${frets.join('-')}`,
    title: template.label,
    subtitle: description.subtitle,
    meta: description.meta,
    frets: getVisibleFretsForVoicing(frets),
    rows: buildVoicingRows(rootPitchClass, quality, frets),
  }
}

function generateVoicings(rootPitchClass, qualityId, playabilityId) {
  const templates = CHORD_VOICING_TEMPLATES.filter((template) => template.quality === qualityId)
  const settings = PLAYABILITY_LIMITS[playabilityId]
  const candidates = []

  templates.forEach((template) => {
    const rootFrets = getRootFrets(template.anchorString, rootPitchClass)

    rootFrets.forEach((rootFret) => {
      const frets = buildAbsoluteFrets(template, rootFret)

      if (!isAllowedByPlayability(template, frets, playabilityId)) {
        return
      }

      candidates.push({
        template,
        frets,
        rank: getVoicingRank(template, frets, playabilityId),
      })
    })
  })

  const seen = new Set()

  return candidates
    .sort((left, right) => left.rank - right.rank)
    .filter((candidate) => {
      const signature = candidate.frets.join(',')

      if (seen.has(signature)) {
        return false
      }

      seen.add(signature)
      return true
    })
    .slice(0, settings.limit)
    .sort((left, right) => compareFretPositions(left.frets, right.frets))
    .map((candidate) => buildVoicing(rootPitchClass, qualityId, candidate.template, candidate.frets))
}

export function buildChordGroups(rootPitchClass, flavor, complexityId, playabilityId) {
  return flavor.groups.map((group) => ({
    ...group,
    rows: group.chords.map((chord) => {
      const qualityId = resolveQualityId(chord, complexityId)
      const chordRootPitchClass = (rootPitchClass + chord.interval) % 12
      const quality = CHORD_QUALITIES[qualityId] ?? CHORD_QUALITIES.min

      return {
        id: `${group.id}-${chord.numeral}`,
        name: getChordName(chordRootPitchClass, qualityId),
        numeral: chord.numeral,
        summary: chord.summary,
        formula: quality.formula,
        tags: chord.tags,
        voicings: generateVoicings(chordRootPitchClass, qualityId, playabilityId),
      }
    }),
  }))
}
