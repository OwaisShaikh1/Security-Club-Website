import { useEffect, useRef, useState, type PointerEvent } from 'react'
import type { AppRoute } from '../../app/routes'
import DraggablePanel from './DraggablePanel'

interface DesktopWorkspaceProps {
  routes: AppRoute[]
}

interface Panel {
  route: AppRoute
  x: number
  y: number
  width: number
  height: number
  customized: boolean
}

interface HeaderGesture {
  path: string
  pointerId: number
  startX: number
  startY: number
  opened: boolean
}

interface SurfaceSize {
  width: number
  height: number
}

function overlaps(x: number, y: number, width: number, height: number, panel: Panel) {
  return x < panel.x + panel.width &&
    x + width > panel.x &&
    y < panel.y + panel.height &&
    y + height > panel.y
}

function isPanelPositionFree(panels: Panel[], path: string, x: number, y: number, width: number, height: number) {
  return !panels.some((panel) => panel.route.path !== path && overlaps(x, y, width, height, panel))
}

function arrangePanels(panels: Panel[], left: number, surfaceWidth: number, surfaceHeight: number) {
  const automatic = panels.filter((panel) => !panel.customized)
  const fixed = panels.filter((panel) => panel.customized)
  if (automatic.length === 0) return panels

  const availableWidth = Math.max(260, surfaceWidth - left - 24)
  const minWidth = 160
  const minHeight = 140
  const placed = fixed.map((panel) => ({
    ...panel,
    x: Math.max(left + 12, Math.min(panel.x, surfaceWidth - panel.width - 12)),
    y: Math.max(12, Math.min(panel.y, surfaceHeight - panel.height - 12)),
  }))
  const baseWidth = Math.max(minWidth, Math.floor((availableWidth - 24) / 2))
  const baseHeight = Math.max(minHeight, Math.floor((surfaceHeight - 36) / 2))

  return panels.map((panel) => {
    if (panel.customized) {
      return placed.find((item) => item.route.path === panel.route.path) ?? panel
    }

    for (let width = baseWidth; width >= minWidth; width -= 20) {
      for (let height = baseHeight; height >= minHeight; height -= 20) {
        for (let y = 12; y + height <= surfaceHeight - 12; y += 12) {
          for (let x = left + 12; x + width <= surfaceWidth - 12; x += 12) {
            if (!placed.some((item) => overlaps(x, y, width, height, item))) {
              const nextPanel = { ...panel, x, y, width, height }
              placed.push(nextPanel)
              return nextPanel
            }
          }
        }
      }
    }

    return {
      ...panel,
      x: left + 12,
      y: 12,
      width: minWidth,
      height: minHeight,
    }
  })
}

function DesktopWorkspace({ routes }: DesktopWorkspaceProps) {
  const [activePath, setActivePath] = useState(routes[0]?.path ?? '/')
  const [panels, setPanels] = useState<Record<string, Panel>>({})
  const [surfaceSize, setSurfaceSize] = useState<SurfaceSize>({ width: 0, height: 0 })
  const [activePaneWidth, setActivePaneWidth] = useState(0)
  const gestureRef = useRef<HeaderGesture | null>(null)
  const surfaceRef = useRef<HTMLDivElement>(null)
  const paneResizeRef = useRef<{ pointerId: number; startX: number; startWidth: number } | null>(null)
  const activePaneWidthRef = useRef(0)

  const activeRoute = routes.find((route) => route.path === activePath)

  useEffect(() => {
    activePaneWidthRef.current = activePaneWidth
  }, [activePaneWidth])

  useEffect(() => {
    const surface = surfaceRef.current
    if (!surface) return

    const updateSize = () => {
      const rect = surface.getBoundingClientRect()
      setSurfaceSize({ width: rect.width, height: rect.height })
      setActivePaneWidth((current) => current || Math.floor(rect.width * 0.52))
      setPanels((current) => {
        if (!Object.keys(current).length) return current
        const left = Math.max(260, activePaneWidthRef.current || Math.floor(rect.width * 0.52))
        const arranged = arrangePanels(Object.values(current), left, rect.width, rect.height)
        return Object.fromEntries(arranged.map((panel) => [panel.route.path, panel]))
      })
    }

    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(surface)
    return () => observer.disconnect()
  }, [])

  const openPanel = (route: AppRoute) => {
    if (!panels[route.path] && Object.keys(panels).length >= 3) return
    const surface = surfaceRef.current
    if (!surface) return

    const rect = surface.getBoundingClientRect()
    const left = Math.max(260, activePaneWidth || Math.floor(rect.width * 0.52))
    const availableWidth = Math.max(260, rect.width - left)
    setPanels((current) => {
      const next = {
        ...current,
        [route.path]: {
          route,
          x: left + 12,
          y: 12,
          width: Math.max(220, Math.floor(availableWidth * 0.8)),
          height: Math.max(180, Math.floor(rect.height * 0.7)),
          customized: false,
        },
      }
      const arranged = arrangePanels(Object.values(next), left, rect.width, rect.height)
      return Object.fromEntries(arranged.map((panel) => [panel.route.path, panel]))
    })
  }

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>, path: string) => {
    gestureRef.current = {
      path,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      opened: false,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const gesture = gestureRef.current
    if (!gesture || gesture.opened || gesture.pointerId !== event.pointerId) return

    const movedDown = event.clientY - gesture.startY
    const movedSideways = Math.abs(event.clientX - gesture.startX)
    if (movedDown <= 26 || movedDown <= movedSideways) return

    gesture.opened = true
    const route = routes.find((item) => item.path === gesture.path)
    if (route) openPanel(route)
  }

  const finishPointer = (event: PointerEvent<HTMLButtonElement>) => {
    const gesture = gestureRef.current
    if (!gesture || gesture.pointerId !== event.pointerId) return

    if (!gesture.opened) setActivePath(gesture.path)
    gestureRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const handlePaneResizeStart = (event: PointerEvent<HTMLDivElement>) => {
    paneResizeRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startWidth: activePaneWidth,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePaneResizeMove = (event: PointerEvent<HTMLDivElement>) => {
    const resize = paneResizeRef.current
    if (!resize || resize.pointerId !== event.pointerId) return
    setActivePaneWidth(Math.max(260, Math.min(surfaceSize.width - 260, resize.startWidth + event.clientX - resize.startX)))
  }

  const handlePaneResizeEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (paneResizeRef.current?.pointerId !== event.pointerId) return
    paneResizeRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  return (
    <section
      className={`desktop-workspace ${Object.keys(panels).length ? 'split-view' : ''}`}
      aria-label="Desktop panel workspace"
      style={activePaneWidth ? { ['--active-pane-width' as string]: `${activePaneWidth}px` } : undefined}
    >
      <header className="navbar-wrap desktop-header-strip">
        <div className="navbar">
          <div className="brand">Security Club</div>
          <nav className="nav-links desktop-page-links" aria-label="Page headers">
            {routes.map((route) => (
              <button
                key={route.path}
                type="button"
                className="nav-link desktop-header-button"
                onPointerDown={(event) => handlePointerDown(event, route.path)}
                onPointerMove={handlePointerMove}
                onPointerUp={finishPointer}
                onPointerCancel={finishPointer}
              >
                {route.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <div ref={surfaceRef} className="desktop-surface">
        <div className="desktop-fullpage-view">{activeRoute?.element}</div>
        {Object.keys(panels).length > 0 ? (
          <div
            className="desktop-pane-resizer"
            role="separator"
            aria-label="Resize main panel"
            onPointerDown={handlePaneResizeStart}
            onPointerMove={handlePaneResizeMove}
            onPointerUp={handlePaneResizeEnd}
            onPointerCancel={handlePaneResizeEnd}
          />
        ) : null}
        {Object.values(panels).map((panel) => (
          <DraggablePanel
            key={panel.route.path}
            initialX={panel.x}
            initialY={panel.y}
            width={panel.width}
            height={panel.height}
            title={panel.route.label}
            onClose={() => {
              setPanels((current) => {
                const next = { ...current }
                delete next[panel.route.path]
                return next
              })
            }}
            onPositionChange={(position) => {
              setPanels((current) => {
                const existing = current[panel.route.path]
                if (!existing || !isPanelPositionFree(Object.values(current), panel.route.path, position.x, position.y, existing.width, existing.height)) {
                  return current
                }
                return {
                  ...current,
                  [panel.route.path]: { ...existing, ...position, customized: true },
                }
              })
            }}
            onSizeChange={(size) => {
              setPanels((current) => {
                const existing = current[panel.route.path]
                if (!existing || (existing.width === size.width && existing.height === size.height)) return current
                const maxWidth = Math.max(160, surfaceSize.width - Math.max(260, activePaneWidth || Math.floor(surfaceSize.width * 0.52)) - 24)
                const nextPanel = {
                  ...existing,
                  width: Math.min(size.width, maxWidth),
                  height: Math.min(size.height, Math.max(140, surfaceSize.height - 24)),
                  customized: true,
                }
                const arranged = arrangePanels(
                  Object.values(current).map((item) =>
                    item.route.path === panel.route.path ? nextPanel : { ...item, customized: false },
                  ),
                  Math.max(260, activePaneWidth || Math.floor(surfaceSize.width * 0.52)),
                  surfaceSize.width,
                  surfaceSize.height,
                )
                return Object.fromEntries(arranged.map((item) => [item.route.path, item]))
              })
            }}
          >
            {panel.route.element}
          </DraggablePanel>
        ))}
      </div>
    </section>
  )
}

export default DesktopWorkspace
