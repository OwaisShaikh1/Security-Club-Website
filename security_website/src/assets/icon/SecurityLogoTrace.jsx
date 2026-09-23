import { useEffect, useRef } from "react";
import "./SecurityLogoTrace.css";

const CYAN = "#00eaff";

// Shield outline path (pentagon-style)
const SHIELD_D =
    "M 537 245 L 774 330 L 774 555 C 774 690 700 775 537 830 C 374 775 300 690 300 555 L 300 330 Z";

function DrawPath({
    d,
    className = "",
    delay = 0,
    duration = 1.5,
    strokeWidth = 3,
    opacity = 1,
}) {
    const ref = useRef(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        el.style.setProperty("--delay", `${delay}s`);
        el.style.setProperty("--duration", `${duration}s`);
    }, [delay, duration]);

    return (
        <path
            ref={ref}
            d={d}
            pathLength="1"
            className={`trace-path ${className}`}
            stroke={CYAN}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ opacity }}
        />
    );
}

// Network mesh node dots
function NetworkNode({ cx, cy, delay }) {
    const ref = useRef(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        el.style.setProperty("--delay", `${delay}s`);
        el.style.setProperty("--duration", "0.4s");
    }, [delay]);
    return (
        <circle
            ref={ref}
            cx={cx}
            cy={cy}
            r={5}
            fill={CYAN}
            className="trace-path node-dot"
            style={{ filter: "drop-shadow(0 0 4px rgba(0,234,255,0.9))" }}
        />
    );
}

// Generates a triangular / hexagonal lattice inside a clipped quadrant
function NetworkMesh({ points, edges, baseDelay }) {
    return (
        <>
            {edges.map(([a, b], i) => {
                const [x1, y1] = points[a];
                const [x2, y2] = points[b];
                return (
                    <DrawPath
                        key={`e-${i}`}
                        d={`M ${x1} ${y1} L ${x2} ${y2}`}
                        strokeWidth={1.5}
                        delay={baseDelay + i * 0.03}
                        duration={0.4}
                    />
                );
            })}
            {points.map(([cx, cy], i) => (
                <NetworkNode
                    key={`n-${i}`}
                    cx={cx}
                    cy={cy}
                    delay={baseDelay + edges.length * 0.03 + i * 0.03}
                />
            ))}
        </>
    );
}

// Build a grid of nodes and edges within a bounding box
function buildMesh(minX, maxX, minY, maxY, cols, rows) {
    const points = [];
    const edges = [];
    const stepX = (maxX - minX) / (cols - 1);
    const stepY = (maxY - minY) / (rows - 1);
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const x = minX + c * stepX + (r % 2 === 1 ? stepX * 0.45 : 0);
            const y = minY + r * stepY;
            points.push([Math.round(x), Math.round(y)]);
        }
    }
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const idx = r * cols + c;
            if (c < cols - 1) edges.push([idx, idx + 1]); // horizontal
            if (r < rows - 1) {
                edges.push([idx, idx + cols]); // vertical
                if (r % 2 === 0 && c > 0) edges.push([idx, idx + cols - 1]);
                if (r % 2 === 1 && c < cols - 1) edges.push([idx, idx + cols + 1]);
            }
        }
    }
    return { points, edges };
}

export default function SecurityLogoTrace({ size = 500, autoPlay = true }) {
    // Web radials: from inner ring outward to outer ring, full 360°
    const webRadials = Array.from({ length: 24 }, (_, i) => {
        const angle = (i * 15 * Math.PI) / 180;
        const r1 = 151; // inner circle radius
        const r2 = 525; // outer circle radius
        const x1 = (537 + r1 * Math.cos(angle)).toFixed(1);
        const y1 = (537 + r1 * Math.sin(angle)).toFixed(1);
        const x2 = (537 + r2 * Math.cos(angle)).toFixed(1);
        const y2 = (537 + r2 * Math.sin(angle)).toFixed(1);
        return { d: `M ${x1} ${y1} L ${x2} ${y2}`, delay: 0.45 + i * 0.03 };
    });

    // Web rings: concentric arcs spanning full circle between inner and outer
    const webRings = [220, 295, 370, 445].map((r, ringIdx) => {
        return Array.from({ length: 24 }, (_, i) => {
            const a1 = (i * 15 * Math.PI) / 180;
            const a2 = ((i + 1) * 15 * Math.PI) / 180;
            const mid = (a1 + a2) / 2;
            const sag = r - 12;
            const x1 = (537 + r * Math.cos(a1)).toFixed(1);
            const y1 = (537 + r * Math.sin(a1)).toFixed(1);
            const x2 = (537 + r * Math.cos(a2)).toFixed(1);
            const y2 = (537 + r * Math.sin(a2)).toFixed(1);
            const cx = (537 + sag * Math.cos(mid)).toFixed(1);
            const cy = (537 + sag * Math.sin(mid)).toFixed(1);
            return {
                d: `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`,
                delay: 1.0 + ringIdx * 0.18 + i * 0.03,
            };
        });
    });

    // Network mesh for top-left quadrant (inside shield)
    const meshTL = buildMesh(305, 535, 250, 535, 5, 5);
    // Network mesh for bottom-right quadrant
    const meshBR = buildMesh(540, 770, 540, 770, 5, 5);

    return (
        <div
            className={`security-logo ${autoPlay ? "playing" : ""}`}
            style={{ width: size, height: size }}
        >
            <svg
                viewBox="0 0 1074 1074"
                width="100%"
                height="100%"
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    {/* Mask: everything INSIDE the shield is hidden for web — so web shows only outside */}
                    <mask id="webMask">
                        {/* Full canvas white = visible */}
                        <rect x="0" y="0" width="1074" height="1074" fill="white" />
                        {/* Shield black = hidden (web clipped away inside) */}
                        <path d={SHIELD_D} fill={"black"} />
                    </mask>
                    {/* Clip: only inside shield */}
                    <clipPath id="shieldClip">
                        <path d={SHIELD_D} />
                    </clipPath>
                    {/* Clip: top-left shield quadrant */}
                    <clipPath id="tlClip">
                        <rect x="298" y="243" width="240" height="295" />
                    </clipPath>
                    {/* Clip: bottom-right shield quadrant */}
                    <clipPath id="brClip">
                        <rect x="538" y="538" width="238" height="294" />
                    </clipPath>
                </defs>

                {/* ── OUTER CIRCLE ── */}
                <DrawPath
                    d="M 537 12 A 525 525 0 1 1 536.9 12"
                    strokeWidth={7}
                    duration={2.2}
                />

                {/* ── INNER CIRCLE ── */}
                <DrawPath
                    d="M 537 151 A 386 386 0 1 1 536.9 151"
                    strokeWidth={5}
                    delay={0.25}
                    duration={1.8}
                />

                {/* ── SPIDER WEB (drawn BEHIND shield via mask) ── */}
                <g mask="url(#webMask)">
                    <g className="web">
                        {webRadials.map((seg, i) => (
                            <DrawPath
                                key={`rad-${i}`}
                                d={seg.d}
                                strokeWidth={2}
                                delay={seg.delay}
                                duration={0.4}
                            />
                        ))}
                        {webRings.flat().map((seg, i) => (
                            <DrawPath
                                key={`ring-${i}`}
                                d={seg.d}
                                strokeWidth={1.5}
                                delay={seg.delay}
                                duration={0.4}
                            />
                        ))}
                    </g>
                </g>

                {/* ── SHIELD BACKGROUND (blocks web behind it) ── */}
                <path d={SHIELD_D} fill="#050a14" stroke="none" />

                {/* ── SHIELD INTERIOR: Cross dividers ── */}
                {/* Vertical center line */}
                <DrawPath
                    d="M 537 245 L 537 828"
                    strokeWidth={4}
                    delay={2.5}
                    duration={1.0}
                />
                {/* Horizontal center line */}
                <DrawPath
                    d="M 302 538 L 772 538"
                    strokeWidth={4}
                    delay={2.8}
                    duration={1.0}
                />

                {/* ── SHIELD INTERIOR: Network mesh (clipped to shield first, then quadrant) ── */}
                <g clipPath="url(#shieldClip)">
                    {/* top-left quadrant */}
                    <g clipPath="url(#tlClip)">
                        <NetworkMesh
                            points={meshTL.points}
                            edges={meshTL.edges}
                            baseDelay={3.2}
                        />
                    </g>
                    {/* bottom-right quadrant */}
                    <g clipPath="url(#brClip)">
                        <NetworkMesh
                            points={meshBR.points}
                            edges={meshBR.edges}
                            baseDelay={3.6}
                        />
                    </g>
                </g>

                {/* ── SHIELD OUTLINE (drawn last = on top) ── */}
                <DrawPath
                    className="shield"
                    d={SHIELD_D}
                    strokeWidth={10}
                    delay={2.0}
                    duration={2.2}
                />
            </svg>
        </div>
    );
}