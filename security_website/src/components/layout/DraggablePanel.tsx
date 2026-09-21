import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent, type PropsWithChildren } from 'react'

interface DraggablePanelProps extends PropsWithChildren {
  initialX: number
  initialY: number
  width?: number | string
  rotationDeg?: number
  contentHeight?: number | string
  title?: string
  onPositionChange?: (position: { x: number; y: number }) => void
  onClose?: () => void
  onContentSizeChange?: (size: { width: number; height: number }) => void
  onPanelSizeChange?: (size: { width: number; height: number }) => void
  onResizeStateChange?: (isResizing: boolean) => void
  onDragStateChange?: (isDragging: boolean) => void
  className?: string
  contentClassName?: string
  style?: CSSProperties
}

interface DraggablePanelItemProps extends PropsWithChildren {
  x: number | string
  y: number | string
  width?: number | string
  rotationDeg?: number
  orientation?: 'horizontal' | 'vertical'
  className?: string
  style?: CSSProperties
}

function DraggablePanelItem({
  x,
  y,
  width,
  rotationDeg = 0,
  orientation = 'vertical',
  className,
  style,
  children,
}: DraggablePanelItemProps) {
  return (
    <div
      className={[
        'panel-item',
        orientation === 'horizontal' ? 'panel-horizontal' : 'panel-vertical',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        left: typeof x === 'number' ? `${x}px` : x,
        top: typeof y === 'number' ? `${y}px` : y,
        width,
        transform: `rotate(${rotationDeg}deg)`,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

function DraggablePanel({
  initialX,
  initialY,
  width,
  rotationDeg = 0,
  contentHeight,
  title = 'Panel',
  onPositionChange,
  onClose,
  onContentSizeChange,
  onPanelSizeChange,
  onResizeStateChange,
  onDragStateChange,
  className,
  contentClassName,
  style,
  children,
}: DraggablePanelProps) {
  const [position, setPosition] = useState({ x: initialX, y: initialY })
  const [dragging, setDragging] = useState(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  const panelRef = useRef<HTMLElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const contentScrollRef = useRef({ top: 0, left: 0 })
  const canvasRef = useRef<HTMLElement | null>(null)
  const pointerIdRef = useRef<number | null>(null)
  const resizeIdleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resizingRef = useRef(false)
  const lastContentSizeRef = useRef<{ width: number; height: number } | null>(null)
  const lastPanelSizeRef = useRef<{ width: number; height: number } | null>(null)
  const [resizing, setResizing] = useState(false)

  useEffect(() => {
    setPosition({ x: initialX, y: initialY })
  }, [initialX, initialY])

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const panelRect = panelRef.current?.getBoundingClientRect()
    if (!panelRect) return

    canvasRef.current =
      (panelRef.current?.closest('.desktop-surface') as HTMLElement | null) ||
      (panelRef.current?.closest('.layout-canvas') as HTMLElement | null)
    if (!canvasRef.current) return

    dragOffset.current = {
      x: event.clientX - panelRect.left,
      y: event.clientY - panelRect.top,
    }

    pointerIdRef.current = event.pointerId
    setDragging(true)
    onDragStateChange?.(true)
    event.currentTarget.setPointerCapture(event.pointerId)
    event.preventDefault()
  }

  useEffect(() => {
    if (!dragging) return

    const handleWindowPointerMove = (event: globalThis.PointerEvent) => {
      if (pointerIdRef.current !== null && event.pointerId !== pointerIdRef.current) return

      const canvasRect = canvasRef.current?.getBoundingClientRect()
      if (!canvasRect) return

      const nextPosition = {
        x: event.clientX - canvasRect.left - dragOffset.current.x,
        y: event.clientY - canvasRect.top - dragOffset.current.y,
      }

      setPosition(nextPosition)
      onPositionChange?.(nextPosition)
    }

    const handleWindowPointerUp = (event: globalThis.PointerEvent) => {
      if (pointerIdRef.current !== null && event.pointerId !== pointerIdRef.current) return

      pointerIdRef.current = null
      setDragging(false)
      onDragStateChange?.(false)
    }

    window.addEventListener('pointermove', handleWindowPointerMove)
    window.addEventListener('pointerup', handleWindowPointerUp)

    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove)
      window.removeEventListener('pointerup', handleWindowPointerUp)
    }
  }, [dragging])

  useEffect(() => {
    const node = contentRef.current
    if (!node || !onContentSizeChange) return

    const publishSize = () => {
      const nextSize = {
        width: node.scrollWidth,
        height: node.scrollHeight,
      }

      const previous = lastContentSizeRef.current
      const isSameSize = previous && previous.width === nextSize.width && previous.height === nextSize.height
      if (isSameSize) {
        return
      }

      lastContentSizeRef.current = nextSize
      onContentSizeChange(nextSize)
    }

    publishSize()

    const observer = new ResizeObserver(() => {
      publishSize()
    })

    observer.observe(node)
    return () => observer.disconnect()
  }, [children, onContentSizeChange])

  useLayoutEffect(() => {
    const node = contentRef.current
    if (!node) return

    node.scrollTop = contentScrollRef.current.top
    node.scrollLeft = contentScrollRef.current.left
  })

  useEffect(() => {
    const panelNode = panelRef.current
    if (!panelNode || !onPanelSizeChange) return

    const publishSize = () => {
      const nextSize = {
        width: panelNode.offsetWidth,
        height: panelNode.offsetHeight,
      }

      const previous = lastPanelSizeRef.current
      const isSameSize = previous && previous.width === nextSize.width && previous.height === nextSize.height
      if (isSameSize) {
        return
      }

      lastPanelSizeRef.current = nextSize
      onPanelSizeChange(nextSize)
    }

    publishSize()

    const observer = new ResizeObserver(() => {
      if (!resizingRef.current) {
        resizingRef.current = true
        setResizing(true)
        onResizeStateChange?.(true)
      }

      if (resizeIdleTimeoutRef.current) {
        clearTimeout(resizeIdleTimeoutRef.current)
      }
      resizeIdleTimeoutRef.current = setTimeout(() => {
        resizingRef.current = false
        setResizing(false)
        onResizeStateChange?.(false)
      }, 180)

      publishSize()
    })

    observer.observe(panelNode)
    return () => {
      observer.disconnect()
      if (resizeIdleTimeoutRef.current) {
        clearTimeout(resizeIdleTimeoutRef.current)
      }
      resizingRef.current = false
      onResizeStateChange?.(false)
    }
  }, [onPanelSizeChange, onResizeStateChange])

  return (
    <article
      ref={(node) => {
        panelRef.current = node
      }}
      className={[
        'card',
        'panel-draggable',
        dragging ? 'is-dragging' : '',
        resizing ? 'is-resizing' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width,
        transform: `rotate(${rotationDeg}deg)`,
        ...style,
      }}
    >
      <div
        className="panel-drag-handle"
        role="button"
        aria-label={`Drag ${title}`}
        onPointerDown={handlePointerDown}
      >
        <span>Drag {title}</span>
        {onClose ? (
          <button
            type="button"
            className="panel-close-button"
            aria-label={`Close ${title}`}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => onClose()}
          >
            x
          </button>
        ) : null}
      </div>
      <div
        ref={contentRef}
        className={['panel-content', contentClassName].filter(Boolean).join(' ')}
        onScroll={(event) => {
          contentScrollRef.current = {
            top: event.currentTarget.scrollTop,
            left: event.currentTarget.scrollLeft,
          }
        }}
        style={{
          minHeight: contentHeight,
        }}
      >
        {children}
      </div>
    </article>
  )
}

export { DraggablePanelItem }
export default DraggablePanel
