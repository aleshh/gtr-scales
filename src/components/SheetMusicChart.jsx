import { useEffect, useRef, useState } from 'react'

const STEP_PITCH_CLASSES = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
}

function getPlayableNotes(musicXml) {
  const parsedXml = new DOMParser().parseFromString(musicXml, 'application/xml')

  return [...parsedXml.querySelectorAll('note')]
    .filter((note) => note.querySelector('pitch'))
    .map((note) => {
      const step = note.querySelector('step')?.textContent
      const alter = Number(note.querySelector('alter')?.textContent ?? 0)
      const octave = Number(note.querySelector('octave')?.textContent)
      const pitchClass = STEP_PITCH_CLASSES[step] + alter

      return {
        midiNote: (octave + 1) * 12 + pitchClass,
      }
    })
}

export default function SheetMusicChart({
  title,
  subtitle,
  musicXml,
  compact = false,
  embedded = false,
  bare = false,
  onPlayNote,
}) {
  const containerRef = useRef(null)
  const osmdRef = useRef(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    let lastWidth = 0
    const container = containerRef.current

    if (!container || !musicXml) return undefined
    const playableNotes = onPlayNote ? getPlayableNotes(musicXml) : []

    function bindPlayableNotes() {
      if (!onPlayNote || playableNotes.length < 1) return

      const noteheads = [...container.querySelectorAll('.vf-notehead')]

      noteheads.forEach((notehead, index) => {
        const note = playableNotes[index]

        if (!note) return

        notehead.classList.add('is-clickable-note')
        notehead.setAttribute('role', 'button')
        notehead.setAttribute('tabindex', '0')
        notehead.setAttribute('aria-label', `Play note ${index + 1}`)
        notehead.addEventListener('click', () => onPlayNote(note))
        notehead.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onPlayNote(note)
          }
        })
      })
    }

    async function renderScore() {
      try {
        const { OpenSheetMusicDisplay } = await import('opensheetmusicdisplay')

        if (cancelled) return

        container.replaceChildren()
        const osmd = new OpenSheetMusicDisplay(container, {
          backend: 'svg',
          autoResize: false,
          drawTitle: false,
          drawComposer: false,
          drawPartNames: false,
          drawMeasureNumbers: false,
          drawingParameters: 'compacttight',
        })
        osmdRef.current = osmd
        await osmd.load(musicXml)

        if (cancelled) return

        lastWidth = container.clientWidth
        osmd.render()
        bindPlayableNotes()
        setError('')
      } catch (renderError) {
        if (!cancelled) {
          setError('Sheet music could not be rendered.')
          console.error(renderError)
        }
      }
    }

    renderScore()

    const observer = new ResizeObserver(() => {
      const nextWidth = container.clientWidth

      if (!cancelled && osmdRef.current && nextWidth !== lastWidth) {
        lastWidth = nextWidth
        osmdRef.current.render()
        bindPlayableNotes()
      }
    })
    observer.observe(container)

    return () => {
      cancelled = true
      observer.disconnect()
      osmdRef.current = null
      container.replaceChildren()
    }
  }, [musicXml, onPlayNote])

  const content = (
    <>
      {title || subtitle ? (
        <div className="chart-heading">
          <div>
            {title ? <h3>{title}</h3> : null}
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
        </div>
      ) : null}
      {error ? <p className="sheet-music-error">{error}</p> : null}
      <div className="sheet-music-render" ref={containerRef}></div>
    </>
  )

  if (embedded) {
    return (
      <div
        className={`sheet-music-embedded${bare ? ' is-bare' : ''}`}
        aria-label={title || 'Staff notation'}
      >
        {content}
      </div>
    )
  }

  return (
    <article
      className={`chart-card sheet-music-card${compact ? ' is-compact' : ''}${title || subtitle ? '' : ' is-score-only'}`}
      aria-label={title || 'Staff notation'}
    >
      {content}
    </article>
  )
}
