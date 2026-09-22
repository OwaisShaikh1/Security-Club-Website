import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { canAccessRoute, type AppRoute } from '../../app/routes'
import { getAuthSession, logout } from '../../api/client'
import type { AuthSession } from '../../types'
import AccessDeniedPage from '../../pages/AccessDeniedPage'
import DraggablePanel from './DraggablePanel'

interface DesktopWorkspaceProps {
  routes: AppRoute[]
}

interface OpenPanel {
  path: string
  x: number
  y: number
  width: number
  height: number
  preferredWidth: number
  preferredHeight: number
  z: number
  isLocked: boolean
}

interface HeaderDragState {
  path: string
  opened: boolean
  pointerId: number
  startX: number
  startY: number
}

interface HostResizeState {
  pointerId: number
  startX: number
  startWidth: number
  currentWidth: number
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function rectIntersects(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
) {
  return !(
    a.x + a.width <= b.x ||
    b.x + b.width <= a.x ||
    a.y + a.height <= b.y ||
    b.y + b.height <= a.y
  )
}

function findAvailableSlot(
  panel: OpenPanel,
  existing: OpenPanel[],
  surfaceWidth: number,
  surfaceHeight: number,
  regionStartX: number,
  margin: number,
): OpenPanel {
  const minX = Math.max(margin, regionStartX)
  const xCandidates = [minX, ...existing.map((item) => item.x + item.width + margin)]
  const yCandidates = [margin, ...existing.map((item) => item.y + item.height + margin)]

  for (const y of yCandidates.sort((a, b) => a - b)) {
    for (const x of xCandidates.sort((a, b) => a - b)) {
      if (x < minX || x >= surfaceWidth - margin || y >= surfaceHeight - margin) {
        continue
      }

      let width = surfaceWidth - x - margin
      let height = surfaceHeight - y - margin

      for (const item of existing) {
        const verticalOverlap =
          y < item.y + item.height &&
          y + panel.height > item.y

        const horizontalOverlap =
          x < item.x + item.width &&
          x + panel.width > item.x

        if (verticalOverlap && item.x > x) {
          width = Math.min(width, item.x - x - margin)
        }

        if (horizontalOverlap && item.y > y) {
          height = Math.min(height, item.y - y - margin)
        }
      }

      width = Math.min(panel.width, width)
      height = Math.min(panel.height, height)

      if (width <= 0 || height <= 0) {
        continue
      }

      const trial = {
        ...panel,
        x,
        y,
        width,
        height,
        preferredWidth: width,
        preferredHeight: height,
      }

      if (!existing.some((item) => rectIntersects(item, trial))) {
        return trial
      }
    }
  }

  return {
    ...panel,
    x: minX,
    y: margin,
    width: Math.min(
      panel.width,
      Math.max(1, surfaceWidth - minX - margin),
    ),
    height: Math.min(
      panel.height,
      Math.max(1, surfaceHeight - margin * 2),
    ),
    preferredWidth: Math.min(
      panel.width,
      Math.max(1, surfaceWidth - minX - margin),
    ),
    preferredHeight: Math.min(
      panel.height,
      Math.max(1, surfaceHeight - margin * 2),
    ),
  }
}

/*
 * Fits open panels against the host boundary during host resizing.
 *
 * Only horizontal properties are changed:
 *   - x
 *   - width
 *
 * Vertical properties are deliberately preserved:
 *   - y
 *   - height
 *
 * Panels are never moved onto another row and are never pushed
 * below the visible workspace.
 */
function fitPanelsToHostBoundary(
  panels: OpenPanel[],
  boundary: number,
  surfaceWidth: number,
  surfaceHeight: number,
) {
  void surfaceHeight
  const gap = 14
  const rightEdge = Math.max(boundary + 1, surfaceWidth - 12)
  const placed: OpenPanel[] = []

  for (const panel of panels) {
    // Vertical position and height are never modified here.
    const nextY = panel.y
    const nextHeight = panel.height

    // Keep the panel's left edge inside the available horizontal area.
    let nextX = clamp(
      panel.x,
      boundary,
      Math.max(boundary, rightEdge - 1),
    )

    // Width is limited by the right edge of the workspace.
    let nextWidth = Math.min(
      panel.width,
      Math.max(1, rightEdge - nextX),
    )

    for (const existing of placed) {
      const verticalOverlap =
        nextY < existing.y + existing.height &&
        nextY + nextHeight > existing.y

      if (!verticalOverlap) {
        continue
      }

      const horizontalOverlap =
        nextX < existing.x + existing.width &&
        nextX + nextWidth > existing.x

      if (!horizontalOverlap) {
        continue
      }

      // Try moving horizontally to the right of the existing panel.
      const shiftedX = existing.x + existing.width + gap

      if (shiftedX < rightEdge) {
        nextX = shiftedX

        nextWidth = Math.min(
          panel.width,
          Math.max(1, rightEdge - nextX),
        )
      } else {
        /*
         * There is no room to move to the right.
         *
         * Do NOT change Y.
         * Instead, reduce the width so the panel fits horizontally.
         */
        const availableWidth = existing.x - gap - nextX

        if (availableWidth > 0) {
          nextWidth = Math.min(
            nextWidth,
            availableWidth,
          )
        } else {
          /*
           * The current X position cannot fit beside the collision.
           * Move horizontally to the nearest usable position and
           * recalculate its width.
           */
          const fittedX = Math.max(
            boundary,
            Math.min(
              nextX,
              existing.x - gap - 1,
            ),
          )

          nextX = fittedX

          nextWidth = Math.min(
            panel.width,
            Math.max(1, rightEdge - nextX),
          )

          /*
           * Final horizontal collision protection.
           * The panel remains on the same Y coordinate.
           */
          if (nextX + nextWidth > existing.x - gap) {
            nextWidth = Math.max(
              1,
              existing.x - gap - nextX,
            )
          }
        }
      }
    }

    /*
     * Final boundary protection.
     *
     * This is important when the host becomes narrower than the
     * panel's previous position. The panel cannot remain outside
     * the right edge of the surface.
     */
    nextX = clamp(
      nextX,
      boundary,
      Math.max(boundary, rightEdge - 1),
    )

    nextWidth = Math.min(
      nextWidth,
      Math.max(1, rightEdge - nextX),
    )

    const fitted: OpenPanel = {
      ...panel,

      // Horizontal position may change.
      x: nextX,

      // Vertical position NEVER changes.
      y: nextY,

      // Horizontal size may change.
      width: Math.max(1, nextWidth),

      // Vertical size NEVER changes.
      height: nextHeight,

      preferredWidth: Math.max(1, nextWidth),
      preferredHeight: nextHeight,
    }

    placed.push(fitted)
  }

  return placed
}

function RouteContent({ route, requestedPath, session, loading }: {
  route?: AppRoute
  requestedPath: string
  session: AuthSession | null
  loading: boolean
}): ReactNode {
  if (!route) {
    return <div className="page"><section className="auth-page"><div className="card auth-card"><h2>Page not found</h2><p className="muted">No page exists at <strong>{requestedPath}</strong>.</p></div></section></div>
  }

  const requiresAccess = route.requiredRole !== 'visitor' || Boolean(route.requiredPermission) || Boolean(route.requiredPosition) || Boolean(route.anonymousOnly)
  if (requiresAccess && loading) {
    return <div className="page"><section className="auth-page"><div className="card auth-card"><p className="muted">Checking access…</p></div></section></div>
  }

  if (requiresAccess && !canAccessRoute(route, session)) {
    return <AccessDeniedPage requestedPath={requestedPath} />
  }

  return route.element
}

function DesktopWorkspace({ routes }: DesktopWorkspaceProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const routeMap = useMemo(
    () => new Map(routes.map((route) => [route.path, route])),
    [routes],
  )

  const [session, setSession] = useState<AuthSession | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)

  const [activePaneWidth, setActivePaneWidth] = useState<number | null>(null)
  const [openPanels, setOpenPanels] = useState<OpenPanel[]>([])
  const [isAnyPanelResizing, setIsAnyPanelResizing] = useState(false)
  const [isAnyPanelDragging, setIsAnyPanelDragging] = useState(false)

  const surfaceRef = useRef<HTMLDivElement | null>(null)
  const fullPageViewRef = useRef<HTMLDivElement | null>(null)

  const fullPageScrollRef = useRef({ top: 0, left: 0 })
  const surfaceScrollRef = useRef({ top: 0, left: 0 })

  const dragStateRef = useRef<HeaderDragState | null>(null)
  const hostResizeStateRef = useRef<HostResizeState | null>(null)

  const resizingPathsRef = useRef<Set<string>>(new Set())
  const draggingPathsRef = useRef<Set<string>>(new Set())

  const isAnyPanelResizingRef = useRef(false)
  const isAnyPanelDraggingRef = useRef(false)

  useEffect(() => {
    let active = true
    getAuthSession()
      .then((nextSession) => {
        if (active) setSession(nextSession)
      })
      .catch(() => {
        if (active) setSession(null)
      })
      .finally(() => {
        if (active) setSessionLoading(false)
      })

    return () => {
      active = false
    }
  }, [location.pathname])

  useEffect(() => {
    const handlePointerMove = (event: globalThis.PointerEvent) => {
      const resizeState = hostResizeStateRef.current

      if (
        !resizeState ||
        resizeState.pointerId !== event.pointerId
      ) {
        return
      }

      const surfaceWidth =
        surfaceRef.current?.getBoundingClientRect().width ??
        window.innerWidth

      const nextWidth = clamp(
        resizeState.startWidth +
          event.clientX -
          resizeState.startX,
        300,
        surfaceWidth - 300,
      )

      resizeState.currentWidth = nextWidth

      setActivePaneWidth(nextWidth)

      setOpenPanels((prev) =>
        fitPanelsToHostBoundary(
          prev,
          nextWidth + 14,
          surfaceWidth,
          surfaceRef.current?.getBoundingClientRect().height ??
            window.innerHeight,
        ),
      )
    }

    const handlePointerUp = (event: globalThis.PointerEvent) => {
      const resizeState = hostResizeStateRef.current

      if (
        !resizeState ||
        resizeState.pointerId !== event.pointerId
      ) {
        return
      }

      const surfaceWidth =
        surfaceRef.current?.getBoundingClientRect().width ??
        window.innerWidth

      const surfaceHeight =
        surfaceRef.current?.getBoundingClientRect().height ??
        window.innerHeight

      setOpenPanels((prev) =>
        fitPanelsToHostBoundary(
          prev,
          resizeState.currentWidth + 14,
          surfaceWidth,
          surfaceHeight,
        ),
      )

      setActivePaneWidth(resizeState.currentWidth)

      hostResizeStateRef.current = null
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [])

  useEffect(() => {
    isAnyPanelResizingRef.current = isAnyPanelResizing
  }, [isAnyPanelResizing])

  useEffect(() => {
    isAnyPanelDraggingRef.current = isAnyPanelDragging
  }, [isAnyPanelDragging])

  const openPanelFromHeader = (
    path: string,
    clientY: number,
  ) => {
    const surfaceRect =
      surfaceRef.current?.getBoundingClientRect()

    if (!surfaceRect) {
      return
    }

    const width = Math.max(
      320,
      Math.floor(surfaceRect.width * 0.42),
    )

    const height = Math.max(
      240,
      Math.floor(surfaceRect.height * 0.62),
    )

    const margin = 12

    setOpenPanels((prev) => {
      const maxZ = prev.reduce(
        (acc, panel) => Math.max(acc, panel.z),
        1,
      )

      const nextPanel: OpenPanel = {
        path,

        x: clamp(
          Math.floor(surfaceRect.width * 0.56),
          margin,
          Math.max(
            margin,
            surfaceRect.width - width - margin,
          ),
        ),

        y: clamp(
          clientY - surfaceRect.top + 10,
          margin,
          Math.max(
            margin,
            surfaceRect.height - height - margin,
          ),
        ),

        width,
        height,
        preferredWidth: width,
        preferredHeight: height,
        z: maxZ + 1,
        isLocked: false,
      }

      const existingIndex = prev.findIndex(
        (panel) => panel.path === path,
      )

      if (existingIndex >= 0) {
        const updated = [...prev]

        updated[existingIndex] = {
          ...updated[existingIndex],
          z: maxZ + 1,
        }

        return updated
      }

      const hostWidth =
        prev.length === 0
          ? clamp(
              surfaceRect.width - width - 32,
              300,
              surfaceRect.width - 300,
            )
          : activePaneWidth ??
            clamp(
              surfaceRect.width * 0.55,
              320,
              surfaceRect.width - 340,
            )

      const panelRegionStart = hostWidth + 14

      const candidate = findAvailableSlot(
        nextPanel,
        prev,
        surfaceRect.width,
        surfaceRect.height,
        panelRegionStart,
        margin,
      )

      const merged = [
        ...prev,
        {
          ...candidate,
          path,
          z: maxZ + 1,
          isLocked: false,
        },
      ]

      setActivePaneWidth(hostWidth)

      return merged
    })
  }

  const handleHeaderPointerDown = (
    event: PointerEvent<HTMLButtonElement>,
    path: string,
  ) => {
    dragStateRef.current = {
      path,
      pointerId: event.pointerId,
      opened: false,
      startX: event.clientX,
      startY: event.clientY,
    }

    event.currentTarget.setPointerCapture(
      event.pointerId,
    )
  }

  const handleHeaderPointerMove = (
    event: PointerEvent<HTMLButtonElement>,
  ) => {
    const state = dragStateRef.current

    if (
      !state ||
      state.pointerId !== event.pointerId ||
      state.opened
    ) {
      return
    }

    const dx = event.clientX - state.startX
    const dy = event.clientY - state.startY

    if (
      dy > 26 &&
      Math.abs(dy) > Math.abs(dx)
    ) {
      openPanelFromHeader(
        state.path,
        event.clientY,
      )

      dragStateRef.current = {
        ...state,
        opened: true,
      }
    }
  }

  const handleHeaderPointerUp = (
    event: PointerEvent<HTMLButtonElement>,
  ) => {
    const state = dragStateRef.current

    if (state?.pointerId === event.pointerId) {
      if (!state.opened) {
        navigate(state.path)
      }

      dragStateRef.current = null
    }

    event.currentTarget.releasePointerCapture(
      event.pointerId,
    )
  }

  const handleHostResizePointerDown = (
    event: PointerEvent<HTMLDivElement>,
  ) => {
    if (activePaneWidth === null) {
      return
    }

    hostResizeStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startWidth: activePaneWidth,
      currentWidth: activePaneWidth,
    }

    event.currentTarget.setPointerCapture(
      event.pointerId,
    )

    event.preventDefault()
  }

  useLayoutEffect(() => {
    const node = surfaceRef.current

    if (!node) {
      return
    }

    node.scrollTop = surfaceScrollRef.current.top
    node.scrollLeft = surfaceScrollRef.current.left
  })

  useLayoutEffect(() => {
    const node = fullPageViewRef.current

    if (!node) {
      return
    }

    node.scrollTop = fullPageScrollRef.current.top
    node.scrollLeft = fullPageScrollRef.current.left
  })

  const activeRoute = routeMap.get(location.pathname)
  const visibleRoutes = routes.filter((route) => route.showInNavigation && canAccessRoute(route, session))

  const handleHeaderLogout = async () => {
    try { await logout() } finally { setSession(null); navigate('/') }
  }

  return (
    <section
      className={`desktop-workspace ${
        openPanels.length > 0
          ? 'split-view'
          : ''
      }`.trim()}
      aria-label="Desktop panel workspace"
      style={
        activePaneWidth
          ? ({
              ['--active-pane-width' as string]:
                `${activePaneWidth}px`,
            } as CSSProperties)
          : undefined
      }
    >
      <header className="navbar-wrap desktop-header-strip">
        <div className="navbar">
          <div className="brand">
            <svg className="brand-mark" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 20 5v6c0 5-3.2 8.8-8 11-4.8-2.2-8-6-8-11V5l8-3Z" /><path d="m8.5 12 2.2 2.2 4.8-5" /></svg>
            <span>Security Club</span>
          </div>

          <nav
            className="nav-links desktop-page-links"
            aria-label="Page headers"
          >
            {visibleRoutes.map((route) => (
              <button
                key={route.path}
                type="button"
                className={`nav-link desktop-header-button ${location.pathname === route.path ? 'active' : ''}`.trim()}
                onPointerDown={(event) =>
                  handleHeaderPointerDown(
                    event,
                    route.path,
                  )
                }
                onPointerMove={
                  handleHeaderPointerMove
                }
                onPointerUp={
                  handleHeaderPointerUp
                }
              >
                {route.label}
              </button>
            ))}
          </nav>
          <div className="account-actions" aria-label="Account controls">
            {session?.authenticated ? <>
              <button type="button" className="account-action" onClick={() => navigate('/profile')} title="Open profile" aria-label="Open profile"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 21a8 8 0 0 0-16 0M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" /></svg><span>Profile</span></button>
              <button type="button" className="account-action" onClick={handleHeaderLogout} title="Log out" aria-label="Log out"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 17l5-5-5-5M15 12H3M21 3v18" /></svg><span>Log out</span></button>
            </> : <button type="button" className="account-action" onClick={() => navigate('/auth')} title="Log in" aria-label="Log in"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-3M10 12h11M17 8l4 4-4 4" /></svg><span>Log in</span></button>}
          </div>
        </div>
      </header>

      <div
        ref={surfaceRef}
        className="desktop-surface"
      >
        <div
          ref={fullPageViewRef}
          className="desktop-fullpage-view"
          onScroll={(event) => {
            fullPageScrollRef.current = {
              top: event.currentTarget.scrollTop,
              left: event.currentTarget.scrollLeft,
            }
          }}
        >
          <RouteContent route={activeRoute} requestedPath={location.pathname} session={session} loading={sessionLoading} />
        </div>

        {openPanels.length > 0 ? (
          <div
            className="desktop-host-resizer"
            role="separator"
            aria-label="Resize host window"
            aria-orientation="vertical"
            onPointerDown={
              handleHostResizePointerDown
            }
          />
        ) : null}

        {openPanels.map((panel) => {
          const route = routeMap.get(panel.path)

          if (!route) {
            return null
          }

          return (
            <DraggablePanel
              key={panel.path}
              initialX={panel.x}
              initialY={panel.y}
              width={`${panel.width}px`}
              contentHeight={`calc(${panel.height}px - 44px)`}
              title={route.label}
              className="desktop-opened-panel"
              style={{
                height: `${panel.height}px`,
                zIndex: panel.z,
              }}
              onClose={() => {
                setOpenPanels((prev) =>
                  prev.filter(
                    (item) =>
                      item.path !== panel.path,
                  ),
                )
              }}
              onPositionChange={(nextPosition) => {
                setOpenPanels((prev) =>
                  prev.map((item) => {
                    if (
                      item.path !== panel.path
                    ) {
                      return item
                    }

                    if (
                      item.x === nextPosition.x &&
                      item.y === nextPosition.y &&
                      item.isLocked
                    ) {
                      return item
                    }

                    return {
                      ...item,
                      x: nextPosition.x,
                      y: nextPosition.y,
                      isLocked: true,
                    }
                  }),
                )
              }}
              onContentSizeChange={(size) => {
                setOpenPanels((prev) => {
                  let changed = false

                  const updated = prev.map(
                    (item) => {
                      if (
                        item.path !== panel.path ||
                        item.isLocked
                      ) {
                        return item
                      }

                      const nextPreferredWidth =
                        clamp(
                          size.width + 48,
                          260,
                          760,
                        )

                      const nextPreferredHeight =
                        clamp(
                          size.height + 52,
                          200,
                          680,
                        )

                      if (
                        item.preferredWidth ===
                          nextPreferredWidth &&
                        item.preferredHeight ===
                          nextPreferredHeight
                      ) {
                        return item
                      }

                      changed = true

                      return {
                        ...item,
                        preferredWidth:
                          nextPreferredWidth,
                        preferredHeight:
                          nextPreferredHeight,
                      }
                    },
                  )

                  return changed
                    ? updated
                    : prev
                })
              }}
              onPanelSizeChange={(size) => {
                setOpenPanels((prev) => {
                  let changed = false

                  const updated = prev.map((item) => {
                    if (item.path !== panel.path) {
                      return item
                    }

                    /*
                    * When the host window is being resized, the panel may
                    * legitimately become narrower than the normal 260px
                    * manual-resize minimum.
                    *
                    * Once a panel has been compressed below 260px by the
                    * host resize logic, preserve that width instead of
                    * immediately expanding it back to 260px.
                    */
                    const hostFittedPanel = item.width < 260

                    const nextWidth = hostFittedPanel
                      ? clamp(size.width, 1, 900)
                      : clamp(size.width, 260, 900)

                    const nextHeight = clamp(size.height, 200, 760)

                    if (
                      item.width === nextWidth &&
                      item.height === nextHeight &&
                      item.preferredWidth === nextWidth &&
                      item.preferredHeight === nextHeight &&
                      item.isLocked
                    ) {
                      return item
                    }

                    changed = true

                    return {
                      ...item,
                      width: nextWidth,
                      height: nextHeight,
                      preferredWidth: nextWidth,
                      preferredHeight: nextHeight,
                      isLocked: true,
                    }
                  })

                  return changed ? updated : prev
                })
              }}
              onDragStateChange={
                (isDragging) => {
                  if (isDragging) {
                    draggingPathsRef.current.add(
                      panel.path,
                    )
                  } else {
                    draggingPathsRef.current.delete(
                      panel.path,
                    )
                  }

                  setIsAnyPanelDragging(
                    draggingPathsRef.current.size >
                      0,
                  )
                }
              }
              onResizeStateChange={
                (isResizing) => {
                  if (isResizing) {
                    resizingPathsRef.current.add(
                      panel.path,
                    )
                  } else {
                    resizingPathsRef.current.delete(
                      panel.path,
                    )
                  }

                  setIsAnyPanelResizing(
                    resizingPathsRef.current.size >
                      0,
                  )
                }
              }
            >
              <RouteContent route={route} requestedPath={panel.path} session={session} loading={sessionLoading} />
            </DraggablePanel>
          )
        })}
      </div>
    </section>
  )
}

export default DesktopWorkspace
