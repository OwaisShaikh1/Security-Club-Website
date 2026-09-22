import React, { useState } from 'react';

const HUDAccents: React.FC = () => {
  const [tracingId] = useState(() => crypto.randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase());
  return (
    <div className="hud-layer" style={{
      position: 'fixed',
      inset: 0,
      pointerEvents: 'none',
      zIndex: 5,
      opacity: 0.4,
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '10px',
      color: 'var(--alien-green)'
    }}>
      {/* Top Left */}
      <div style={{ position: 'absolute', top: '20px', left: '20px' }}>
        [ LAT: 37.7749 | LON: -122.4194 ]
      </div>
      
      {/* Top Right */}
      <div style={{ position: 'absolute', top: '20px', right: '20px', textAlign: 'right' }}>
        SYSTEM: SECURE<br />
        ENCRYPTION: AES-256
      </div>

      {/* Bottom Left */}
      <div style={{ position: 'absolute', bottom: '20px', left: '20px' }}>
        UPLINK: ACTIVE<br />
        PACKETS: 0101...
      </div>

      {/* Bottom Right */}
      <div style={{ position: 'absolute', bottom: '20px', right: '20px', textAlign: 'right' }}>
        TRACING_ID: {tracingId}
      </div>
    </div>
  );
};

export default HUDAccents;
