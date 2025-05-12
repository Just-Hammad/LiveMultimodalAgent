import React, { useState, useEffect, useRef } from 'react';

const Captions = ({ text, isActive, streamingSpeed = 60 }) => {
  const captionsRef = useRef(null);
  const [displayText, setDisplayText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const previousText = useRef("");
  const animationTimeoutRef = useRef(null);
  const textIdRef = useRef(Date.now()); // Add a unique ID for each text to track changes
    // Streaming animation effect with natural variations
  useEffect(() => {
    // Clear any existing animation when text changes or component becomes inactive
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
      animationTimeoutRef.current = null;
    }

    // Reset display text if not active
    if (!isActive) {
      setDisplayText("");
      setIsTyping(false);
      previousText.current = "";
      return;
    }

    // Handle new message (completely different from previous)
    if (text !== previousText.current) {
      // Generate a new ID to track this caption stream
      textIdRef.current = Date.now();
    }

    // Don't restart animation for the same text
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
    };    // Capture the current ID so we can check if it's still valid in the closure
    const captionId = textIdRef.current;
    
    // Recursive function to handle typing with natural pauses
    const typeNextChar = () => {
      // Check if this caption is still active and valid
      if (!isActive || captionId !== textIdRef.current) {
        setIsTyping(false);
        return;
      }
      
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
          animationTimeoutRef.current = setTimeout(typeNextChar, delay);
        } else {
          setIsTyping(false);
          previousText.current = text;
        }
      } else {
        setIsTyping(false);
        previousText.current = text;
      }
    };// Start the typing animation
    animationTimeoutRef.current = setTimeout(typeNextChar, 30);
    
    // Cleanup function
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
        animationTimeoutRef.current = null;
      }
      setIsTyping(false);
    };
  }, [text, streamingSpeed, isActive]);

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