import React, { useState, useEffect, useRef } from 'react';

const Captions = ({ text, isActive, streamingSpeed = 50 }) => {
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
    if (!text || text === previousText.current) return;    let currentIndex = 0;
    setIsTyping(true);
    
    // Start with empty string for a fresh animation
    setDisplayText("");
    
    // Capture the current ID so we can check if it's still valid in the closure
    const captionId = textIdRef.current;
      // Split text into words
    const words = text.split(/(\s+|\b(?=[.,;:!?]))/);
    
    // Recursive function to handle typing word by word with natural pauses
    const typeNextWord = () => {
      // Check if this caption is still active and valid
      if (!isActive || captionId !== textIdRef.current) {
        setIsTyping(false);
        return;
      }
      
      if (currentIndex < words.length) {
        // Get current word
        const word = words[currentIndex];
        
        // Add the current word to display text
        setDisplayText(prev => prev + word);
        
        // Increment index after using current word
        currentIndex++;
        
        if (currentIndex < words.length) {
          // Calculate delay based on the word and the context
          let delay = streamingSpeed;
          
          // Last character of the word just added
          const lastChar = word.charAt(word.length - 1);          // Set different delays based on word endings with balanced timing
          if (['.', '!', '?'].includes(lastChar)) {
            delay = streamingSpeed * 4; // Longer pause after sentences
          } else if ([',', ';', ':'].includes(lastChar)) {
            delay = streamingSpeed * 2.5; // Medium pause after clauses
          } else if (word.trim() === '') {
            delay = streamingSpeed * 0.8; // Light space delay
          } else {
            // Random variation for regular words with moderate values
            delay = streamingSpeed * (1.2 + Math.random() * 0.6);
          }
          
          animationTimeoutRef.current = setTimeout(typeNextWord, delay);
        } else {
          setIsTyping(false);
          previousText.current = text;
        }
      } else {
        setIsTyping(false);
        previousText.current = text;
      }
    };// Start the typing animation
    animationTimeoutRef.current = setTimeout(typeNextWord, 150);
    
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
        {displayText || <span style={{ opacity: 0.6, fontStyle: 'italic', fontSize: '1rem' }}>Waiting...</span>}
        {isTyping && <span className="typing-cursor"></span>}
      </div>
    </div>
  );
};

export default Captions;