import { useEffect, useRef, useState, type PointerEvent, type PropsWithChildren } from 'react'

interface DraggablePanelProps extends PropsWithChildren {
  initialX: number
  initialY: number
  width: number
  height: number
  title: string
  onPositionChange?: (position: { x: number; y: number }) => void
  onSizeChange?: (size: { width: number; height: number }) => void
  onClose?: () => void
}

function DraggablePanel({ initialX, initialY, width, height, title, onPositionChange, onSizeChange, onClose, children }: DraggablePanelProps) {
  const [position, setPosition] = useState({ x: initialX, y: initialY })
  const [dragging, setDragging] = useState(false)
  const dragRef = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null)
  const panelRef = useRef<HTMLElement>(null)
  const hasMeasuredRef = useRef(false)

  useEffect(() => {
    const panel = panelRef.current
    if (!panel || !onSizeChange) return

    const observer = new ResizeObserver(() => {
      if (!hasMeasuredRef.current) {
        hasMeasuredRef.current = true
        return
      }
      onSizeChange({
        width: panel.offsetWidth,
        height: panel.offsetHeight,
      })
    })
    observer.observe(panel)
    return () => observer.disconnect()
  }, [onSizeChange])

  const handleDown = (event: PointerEvent<HTMLDivElement>) => {
    const panel = panelRef.current
    if (!panel) return
    const rect = panel.getBoundingClientRect()
    dragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    }
    setDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handleMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    const canvas = panelRef.current?.closest('.desktop-surface')
    if (!drag || drag.pointerId !== event.pointerId || !(canvas instanceof HTMLElement)) return

    const rect = canvas.getBoundingClientRect()
    const next = {
      x: event.clientX - rect.left - drag.offsetX,
      y: event.clientY - rect.top - drag.offsetY,
    }
    setPosition(next)
    onPositionChange?.(next)
  }

  const handleUp = (event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return
    dragRef.current = null
    setDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const renderedPosition = dragging ? position : { x: initialX, y: initialY }

  return (
    <article
      ref={panelRef}
      className={['card', 'panel-draggable', dragging ? 'is-dragging' : ''].join(' ')}
      style={{ left: renderedPosition.x, top: renderedPosition.y, width, height }}
    >
      <div
        className="panel-drag-handle"
        role="button"
        tabIndex={0}
        aria-label={`Drag ${title}`}
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
        onPointerCancel={handleUp}
      >
        <span>Drag {title}</span>
        {onClose ? <button type="button" className="panel-close-button" onPointerDown={(event) => event.stopPropagation()} onClick={onClose}>x</button> : null}
      </div>
      <div className="panel-content">{children}</div>
    </article>
  )
}

export default DraggablePanel
