import { useEffect, useRef, useState } from 'react'

export default function SheetMusicChart({
  title,
  subtitle,
  musicXml,
  compact = false,
  embedded = false,
  bare = false,
}) {
  const containerRef = useRef(null)
  const osmdRef = useRef(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    let lastWidth = 0
    const container = containerRef.current

    if (!container || !musicXml) return undefined

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
      }
    })
    observer.observe(container)

    return () => {
      cancelled = true
      observer.disconnect()
      osmdRef.current = null
      container.replaceChildren()
    }
  }, [musicXml])

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
