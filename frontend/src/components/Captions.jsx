import React, { useEffect, useRef } from 'react';

const Captions = ({ text, isActive }) => {
  const captionsRef = useRef(null);

  useEffect(() => {
    // Auto-scroll to the latest caption
    if (captionsRef.current) {
      captionsRef.current.scrollTop = captionsRef.current.scrollHeight;
    }
    
    // Debug output when text changes
    console.log("Caption text updated:", text);
    console.log("Caption visibility:", isActive);
  }, [text, isActive]);

  if (!isActive) {
    console.log("Captions component is inactive and not rendering");
    return null;
  }

  return (
    <div 
      className="captions-container"
      aria-live="polite" 
      style={{
        position: 'sticky',
        bottom: 0,
        width: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        borderRadius: '8px',
        padding: '12px 20px',
        marginTop: '10px',
        marginBottom: '20px',
        zIndex: 10
      }}
    >
      <div
        ref={captionsRef}
        className="captions-text"
        style={{
          color: 'white',
          fontSize: '1.1rem',
          lineHeight: 1.4,
          textAlign: 'center',
          fontWeight: 500,
          textShadow: '0px 1px 2px rgba(0, 0, 0, 0.5)',
          maxHeight: '100px',
          overflowY: 'auto',
          wordBreak: 'break-word'
        }}
      >
        {text || "Waiting for speech..."}
      </div>
    </div>
  );
};

export default Captions;