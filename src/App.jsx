import { useState } from 'react'
import './App.css'
import {
  ROOT_OPTIONS,
  SCALE_LIBRARY,
  getScaleFormula,
  getScaleSpellings,
} from './data/scales'
import {
  MAX_FRET,
  buildFretboardRows,
  buildPositionWindows,
  getInlayType,
  getVisibleFrets,
} from './lib/fretboard'

function groupScalesByFamily() {
  return SCALE_LIBRARY.reduce((groups, scale) => {
    if (!groups[scale.family]) {
      groups[scale.family] = []
    }

    groups[scale.family].push(scale)
    return groups
  }, {})
}

function FretboardChart({ title, subtitle, frets, rows, compact = false }) {
  return (
    <article className={`chart-card${compact ? ' is-compact' : ''}`}>
      <div className="chart-heading">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
      </div>

      <div className="chart-scroll">
        <div className="fretboard-grid" style={{ '--fret-count': frets.length }}>
          <div className="fret-label-row">
            <div className="corner-cell" aria-hidden="true"></div>
            {frets.map((fret) => (
              <div className="fret-number" key={`fret-${fret}`}>
                {fret}
              </div>
            ))}
          </div>

          {rows.map((row, rowIndex) => (
            <div className="string-row" key={`${title}-${row.label}-${rowIndex}`}>
              <div className="string-label">{row.label}</div>
              {frets.map((fret) => {
                const note = row.notes[fret]

                return (
                  <div
                    className={`fret-cell${fret === 0 ? ' is-nut' : ''}`}
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

          <div className="inlay-row" aria-hidden="true">
            <div className="corner-cell"></div>
            {frets.map((fret) => {
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
        </div>
      </div>
    </article>
  )
}

function App() {
  const [rootLabel, setRootLabel] = useState('D')
  const [scaleId, setScaleId] = useState('harmonic-minor')

  const groupedScales = groupScalesByFamily()
  const root = ROOT_OPTIONS.find((option) => option.label === rootLabel) ?? ROOT_OPTIONS[0]
  const scale = SCALE_LIBRARY.find((item) => item.id === scaleId) ?? SCALE_LIBRARY[0]
  const rows = buildFretboardRows(root.pitchClass, scale.intervals, MAX_FRET)
  const fullNeckFrets = getVisibleFrets(0, MAX_FRET + 1, MAX_FRET)
  const positionWindows = buildPositionWindows(rows, root.pitchClass)
  const scaleFormula = getScaleFormula(scale.intervals)
  const spelledNotes = getScaleSpellings(root.pitchClass, scale.intervals)

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Guitar scale generator</p>
          <h1>{root.label} {scale.name}</h1>
          <p className="hero-text">
            Generate degree-labeled fretboard charts and practice positions for common
            modes, bebop scales, symmetric sounds, and more unusual harmonic colors.
          </p>
        </div>

        <div className="hero-summary">
          <div className="summary-chip">
            <span>Formula</span>
            <strong>{scaleFormula}</strong>
          </div>
          <div className="summary-chip">
            <span>Pitch collection</span>
            <strong>{spelledNotes.join('  ')}</strong>
          </div>
        </div>
      </section>

      <section className="control-panel">
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

        <div className="control-note">
          <span className="control-note-label">Chart logic</span>
          <p>
            Notes are labeled by scale degree. The smaller charts use root-centered
            5-fret windows so they read like practice positions instead of one giant map.
          </p>
        </div>
      </section>

      <section className="info-grid">
        <article className="info-card">
          <p className="info-label">How it sounds</p>
          <p className="info-value">{scale.sound}</p>
        </article>

        <article className="info-card">
          <p className="info-label">How to use it</p>
          <p className="info-value">{scale.usage}</p>
        </article>

        <article className="info-card legend-card">
          <p className="info-label">Legend</p>
          <div className="legend-row">
            <span className="legend-chip is-root">1</span>
            <p>Root note</p>
          </div>
          <div className="legend-row">
            <span className="legend-chip">b3</span>
            <p>Other scale degrees</p>
          </div>
        </article>
      </section>

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
    </main>
  )
}

export default App
