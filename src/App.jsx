import { useEffect, useState } from 'react'
import './App.css'
import {
  ROOT_OPTIONS,
  SCALE_LIBRARY,
  getScaleFormula,
  getPitchCollectionLabels,
} from './data/scales'
import {
  CHORD_COMPLEXITY_OPTIONS,
  CHORD_FLAVOR_LIBRARY,
} from './data/chords'
import {
  MAX_FRET,
  buildFretboardRows,
  buildPositionWindows,
  getInlayType,
  getVisibleFrets,
} from './lib/fretboard'
import { buildChordGroups } from './lib/chords'

const DEFAULT_QUERY_STATE = {
  mode: 'scales',
  root: 'E',
  scale: 'phrygian',
  flavor: 'major',
  complexity: 'sevenths',
}

const VALID_MODES = new Set(['scales', 'chords'])
const VALID_ROOTS = new Set(ROOT_OPTIONS.map((option) => option.label))
const VALID_SCALES = new Set(SCALE_LIBRARY.map((item) => item.id))
const VALID_FLAVORS = new Set(CHORD_FLAVOR_LIBRARY.map((item) => item.id))
const VALID_COMPLEXITIES = new Set(CHORD_COMPLEXITY_OPTIONS.map((item) => item.id))

function getValidQueryValue(params, key, validValues, fallback) {
  const value = params.get(key)
  return value && validValues.has(value) ? value : fallback
}

function readQueryState(search = '') {
  const params = new URLSearchParams(search)

  return {
    mode: getValidQueryValue(params, 'mode', VALID_MODES, DEFAULT_QUERY_STATE.mode),
    root: getValidQueryValue(params, 'root', VALID_ROOTS, DEFAULT_QUERY_STATE.root),
    scale: getValidQueryValue(params, 'scale', VALID_SCALES, DEFAULT_QUERY_STATE.scale),
    flavor: getValidQueryValue(params, 'flavor', VALID_FLAVORS, DEFAULT_QUERY_STATE.flavor),
    complexity: getValidQueryValue(params, 'complexity', VALID_COMPLEXITIES, DEFAULT_QUERY_STATE.complexity),
  }
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

function FretboardChart({
  title,
  subtitle,
  meta = null,
  frets,
  rows,
  compact = false,
  showInlays = true,
  fixedFrets = false,
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
      </div>

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
                    <div
                      className={`degree-chip${row.notes[0].isRoot ? ' is-root' : ''}`}
                      title={`${row.notes[0].noteLabel} · degree ${row.notes[0].degree}`}
                      aria-label={`${row.notes[0].noteLabel}, degree ${row.notes[0].degree}`}
                    >
                      {row.notes[0].degree}
                    </div>
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
                      <div
                        className={`degree-chip${note.isRoot ? ' is-root' : ''}`}
                        title={`${note.noteLabel} · degree ${note.degree}`}
                        aria-label={`${note.noteLabel}, degree ${note.degree}`}
                      >
                        {note.degree}
                      </div>
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

function App() {
  const [mode, setMode] = useState(() => readQueryState(window.location.search).mode)
  const [rootLabel, setRootLabel] = useState(() => readQueryState(window.location.search).root)
  const [scaleId, setScaleId] = useState(() => readQueryState(window.location.search).scale)
  const [flavorId, setFlavorId] = useState(() => readQueryState(window.location.search).flavor)
  const [complexityId, setComplexityId] = useState(() => readQueryState(window.location.search).complexity)

  const groupedScales = groupItemsByFamily(SCALE_LIBRARY)
  const groupedFlavors = groupItemsByFamily(CHORD_FLAVOR_LIBRARY)
  const root = ROOT_OPTIONS.find((option) => option.label === rootLabel) ?? ROOT_OPTIONS[0]
  const scale = SCALE_LIBRARY.find((item) => item.id === scaleId) ?? SCALE_LIBRARY[0]
  const flavor = CHORD_FLAVOR_LIBRARY.find((item) => item.id === flavorId) ?? CHORD_FLAVOR_LIBRARY[0]
  const complexity = CHORD_COMPLEXITY_OPTIONS.find((item) => item.id === complexityId) ?? CHORD_COMPLEXITY_OPTIONS[1]
  const rows = buildFretboardRows(root.pitchClass, scale, MAX_FRET)
  const fullNeckFrets = getVisibleFrets(0, MAX_FRET + 1, MAX_FRET)
  const positionWindows = buildPositionWindows(rows, root.pitchClass)
  const scaleFormula = getScaleFormula(scale)
  const pitchCollection = getPitchCollectionLabels(root.pitchClass, scale.intervals)
  const chordGroups = buildChordGroups(root.pitchClass, flavor, complexity.id, 'full')
  const selectedTheoryItem = mode === 'scales' ? scale : flavor
  const heroTitle = mode === 'scales' ? `${root.label} ${scale.name}` : `${root.label} ${flavor.name} chords`
  const controlIntro = mode === 'scales'
    ? 'Generate degree-labeled fretboard charts and practice positions for common modes, bebop scales, symmetric sounds, and more unusual harmonic colors. Built for practical fretboard reference, not perfectly key-spelled notation.'
    : 'Generate practical chord worlds by root and harmonic flavor, ordered for real playing and writing rather than exhaustive theory coverage. Built for musical usefulness first, not strict completeness.'

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)

    params.set('mode', mode)
    params.set('root', rootLabel)
    params.set('scale', scaleId)
    params.set('flavor', flavorId)
    params.set('complexity', complexityId)

    const nextSearch = params.toString()
    const currentSearch = window.location.search.startsWith('?')
      ? window.location.search.slice(1)
      : window.location.search

    if (nextSearch === currentSearch) {
      return
    }

    const nextUrl = `${window.location.pathname}?${nextSearch}${window.location.hash}`
    window.history.replaceState(null, '', nextUrl)
  }, [mode, rootLabel, scaleId, flavorId, complexityId])

  useEffect(() => {
    function syncFromUrl() {
      const nextState = readQueryState(window.location.search)

      setMode(nextState.mode)
      setRootLabel(nextState.root)
      setScaleId(nextState.scale)
      setFlavorId(nextState.flavor)
      setComplexityId(nextState.complexity)
    }

    window.addEventListener('popstate', syncFromUrl)

    return () => {
      window.removeEventListener('popstate', syncFromUrl)
    }
  }, [])

  return (
    <main className="app-shell">
      <section className="control-panel">
        <p className="eyebrow control-eyebrow">Guitar scale and chord fingering chart generator</p>
        <p className="control-intro">{controlIntro}</p>

        <div className="mode-toggle" role="tablist" aria-label="View mode">
          <button
            className={mode === 'scales' ? 'is-active' : ''}
            type="button"
            onClick={() => setMode('scales')}
          >
            Scales
          </button>
          <button
            className={mode === 'chords' ? 'is-active' : ''}
            type="button"
            onClick={() => setMode('chords')}
          >
            Chords
          </button>
        </div>

        <label className="control-field">
          <span>Root note</span>
          <select value={root.label} onChange={(event) => setRootLabel(event.target.value)}>
            {ROOT_OPTIONS.map((option) => (
              <option key={option.label} value={option.label}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {mode === 'scales' ? (
          <label className="control-field">
            <span>Mode / scale</span>
            <select value={scale.id} onChange={(event) => setScaleId(event.target.value)}>
              {Object.entries(groupedScales).map(([family, familyScales]) => (
                <optgroup key={family} label={family}>
                  {familyScales.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
        ) : (
          <>
            <label className="control-field">
              <span>Flavor</span>
              <select value={flavor.id} onChange={(event) => setFlavorId(event.target.value)}>
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

            <label className="control-field">
              <span>Complexity</span>
              <select value={complexity.id} onChange={(event) => setComplexityId(event.target.value)}>
                {CHORD_COMPLEXITY_OPTIONS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
      </section>

      <section className="hero-panel">
        <div className="hero-copy">
          <h1>{heroTitle}</h1>
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
          {mode === 'scales' ? (
            <>
              <div className="summary-chip">
                <span>Formula</span>
                <strong>{scaleFormula}</strong>
              </div>
              <div className="summary-chip">
                <span>Pitch collection</span>
                <strong>{pitchCollection.join('  ')}</strong>
              </div>
            </>
          ) : null}
        </div>
      </section>

      {mode === 'scales' ? (
        <>
          <section className="chart-section">
            <FretboardChart
              title="Complete neck map"
              subtitle="All scale tones through the 15th fret."
              frets={fullNeckFrets}
              rows={rows}
            />
          </section>

          <section className="positions-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Practice positions</p>
                <h2>Root-centered windows</h2>
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
                    subtitle={window.start === 0 ? 'Open position through fret 4.' : `Frets ${window.start} to ${window.end}.`}
                    frets={window.frets}
                    rows={rows}
                    compact
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
        </>
      ) : (
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
                          <h3>{row.name}</h3>
                          <p>{row.numeral} · {row.summary}</p>
                        </div>

                        <div className="chord-row-tags">
                          <span className="mini-tag">Formula {row.formula}</span>
                          {row.tags.map((tag) => (
                            <span className="mini-tag" key={`${row.id}-${tag}`}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>

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
                            />
                          ))
                        ) : (
                          <article className="chart-card is-compact empty-voicing-card">
                            <div className="chart-heading">
                              <div>
                                <h3>No clean grips</h3>
                                <p>
                                  This filter combination is intentionally strict. Try a looser
                                  playability setting for more options.
                                </p>
                              </div>
                            </div>
                          </article>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
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
