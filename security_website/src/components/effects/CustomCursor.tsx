import React, { useEffect, useState, useRef } from 'react';

/**
 * CURSOR CONFIGURATION
 * Increase LERP_FACTOR for faster tracking (closer to 1.0)
 * Decrease LERP_FACTOR for more lag (closer to 0.0)
 */
const CONFIG = {
  LERP_FACTOR: 0.15, // 0.15 = 15% of the distance covered per frame
};

const CustomCursor: React.FC = () => {
  const [isClicking, setIsClicking] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  
  const mousePos = useRef({ x: 0, y: 0 });
  const cursorPos = useRef({ x: 0, y: 0 });
  const requestRef = useRef<number>();
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
      if (!isVisible) setIsVisible(true);
    };

    const onMouseDown = () => setIsClicking(true);
    const onMouseUp = () => setIsClicking(false);

    const animate = () => {
      // Linear Interpolation (LERP)
      cursorPos.current.x += (mousePos.current.x - cursorPos.current.x) * CONFIG.LERP_FACTOR;
      cursorPos.current.y += (mousePos.current.y - cursorPos.current.y) * CONFIG.LERP_FACTOR;

      if (cursorRef.current) {
        cursorRef.current.style.left = `${cursorPos.current.x}px`;
        cursorRef.current.style.top = `${cursorPos.current.y}px`;
      }

      requestRef.current = requestAnimationFrame(animate);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mouseup', onMouseUp);
    requestRef.current = requestAnimationFrame(animate);

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mouseup', onMouseUp);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div
      ref={cursorRef}
      className={`custom-cursor ${isClicking ? 'clicking' : ''}`}
      style={{
        position: 'fixed',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    />
  );
};

export default CustomCursor;
