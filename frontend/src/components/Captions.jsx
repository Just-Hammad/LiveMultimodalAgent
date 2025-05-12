import React, { useState, useEffect, useRef } from 'react';

const Captions = ({ text, isActive, streamingSpeed = 60 }) => {
  const captionsRef = useRef(null);
  const [displayText, setDisplayText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const previousText = useRef("");
  
  // Streaming animation effect with natural variations
  useEffect(() => {
    if (!text || text === previousText.current) return;

    let currentIndex = 0;
    setIsTyping(true);
    
    // Start with empty string for a fresh animation
    setDisplayText("");
      // Function to get natural typing speed variations
    const getTypingDelay = (char, nextChar) => {
      // Longer pause after sentence-ending punctuation
      if (['.', '!', '?'].includes(char)) {
        return streamingSpeed * 2;
      }
      // Medium pause after commas, semicolons, colons
      else if ([',', ';', ':'].includes(char)) {
        return streamingSpeed * 1;
      }
      // Small pause at spaces to mimic natural speech rhythm
      else if (char === ' ') {
        return streamingSpeed * 0.5;
      }
      // Random small variations for everything else
      else {
        return streamingSpeed * (0.75 + Math.random() * 0.2);
      }
    };
      // Recursive function to handle typing with natural pauses
    const typeNextChar = () => {
      if (currentIndex < text.length) {
        // Get current character first, before any changes to currentIndex
        const char = text.charAt(currentIndex);
        const nextChar = text.charAt(currentIndex + 1);
        
        // Add the current character to display text
        setDisplayText(prev => prev + char);
        
        // Increment index after using current character
        currentIndex++;
        
        if (currentIndex < text.length) {
          const delay = getTypingDelay(char, nextChar);
          setTimeout(typeNextChar, delay);
        } else {
          setIsTyping(false);
          previousText.current = text;
        }
      } else {
        setIsTyping(false);
        previousText.current = text;
      }
    };
      // Start the typing animation
    setTimeout(typeNextChar, 30);
    
    // Cleanup function
    return () => {
      setIsTyping(false);
    };
  }, [text, streamingSpeed]);

  // Auto-scroll to the latest caption
  useEffect(() => {
    if (captionsRef.current) {
      captionsRef.current.scrollTop = captionsRef.current.scrollHeight;
    }
  }, [displayText]);

  // Don't render if inactive
  if (!isActive) {
    return null;
  }  return (
    <div 
      className="captions-container"
      aria-live="polite" 
    >
      <div
        ref={captionsRef}
        className="captions-text"
      >
        {displayText || <span style={{ opacity: 0.6, fontStyle: 'italic', fontSize: '0.8rem' }}>Waiting...</span>}
        {isTyping && <span className="typing-cursor"></span>}
      </div>
    </div>
  );
};

export default Captions;