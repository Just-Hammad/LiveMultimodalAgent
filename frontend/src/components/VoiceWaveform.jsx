import React, { useRef, useEffect, useState } from 'react';
import './VoiceWaveform.css';

const VoiceWaveform = ({ 
  isActive = false, 
  onActivate,
  onDeactivate,
  size = 120,
  isConnected = false,
  isConnecting = false,
  isStreaming = false // New prop to handle bot streaming audio
}) => {
  const canvasRef = useRef(null);
  const requestRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const sourceRef = useRef(null);
  const streamRef = useRef(null);
  const [isBeeping, setIsBeeping] = useState(false);
  const [beepStartTime, setBeepStartTime] = useState(0);  const beepDuration = 800; // Duration of beep in milliseconds
  // Fixed pixel-perfect sizes with proper proportions
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const canvasSize = size * dpr; // Multiply by device pixel ratio for sharper rendering
  
  // Perfect circle proportions - ring is exactly 1/3 of the button size
  const baseRadius = Math.floor(size * 0.35) * dpr; // 35% of component size for better visibility
  const ringWidth = Math.floor(size * 0.08) * dpr; // 8% of component size
  // Enhanced beep effect parameters
  const maxExpansionScale = 1.05; // Match reference's 0.05 expansion factor
  // Set up canvas with pixel ratio awareness for sharp rendering
  useEffect(() => {
    // Setup canvas dimensions when component mounts
    const setupCanvas = () => {
      if (canvasRef.current) {
        // Set physical size (scaled by device pixel ratio)
        canvasRef.current.width = canvasRef.current.height = canvasSize;
        
        // Set display size (CSS pixels)
        canvasRef.current.style.width = `${size}px`;
        canvasRef.current.style.height = `${size}px`;
        
        // Get context and set up initial state
        const ctx = canvasRef.current.getContext('2d', { alpha: true });
        
        // Clear canvas with perfect circle dimensions
        ctx.clearRect(0, 0, canvasSize, canvasSize);
      }
    };
    
    // Initial setup
    setupCanvas();
    
    // Handle window resize and device pixel ratio changes
    const handleResize = () => {
      if (canvasRef.current) {
        setupCanvas();
      }
    };
    
    window.addEventListener('resize', handleResize);
      // Enhanced cleanup function to ensure all resources are properly released
    return () => {
      // Stop all audio processing
      stopAudioProcessing();
      
      // Remove event listeners
      window.removeEventListener('resize', handleResize);
      
      // Cancel any pending animation frames
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
      
      // Final canvas cleanup - clear any remaining shadows or artifacts
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        
        // Release canvas memory
        canvasRef.current.width = canvasRef.current.height = 0;
      }
    };
  }, [canvasSize]);
  
  // Handle active state changes
  useEffect(() => {
    if (isActive && canvasRef.current) {
      startAudioProcessing();
    } else {
      stopAudioProcessing();
    }
  }, [isActive]);
  
  // Draw animation effect when connection status changes
  useEffect(() => {
    if (isConnected && !isBeeping) {
      triggerBeep();
    }
  }, [isConnected]);
  
  // Start audio processing
  const startAudioProcessing = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      
      analyser.fftSize = 1024;
      const dataArray = new Uint8Array(analyser.fftSize);
      const source = audioCtx.createMediaStreamSource(stream);
      
      source.connect(analyser);
      
      // Store refs
      audioCtxRef.current = audioCtx;
      analyserRef.current = analyser;
      dataArrayRef.current = dataArray;
      sourceRef.current = source;
      streamRef.current = stream;
      
      // Start drawing
      draw();
    } catch (err) {
      console.error('Error accessing microphone:', err);
    }
  };
  
  // Stop audio processing
  const stopAudioProcessing = () => {
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
      requestRef.current = null;
    }
    
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(e => console.error(e));
      audioCtxRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    analyserRef.current = null;
    dataArrayRef.current = null;
    sourceRef.current = null;
  };  // Draw the waveform with perfect circle rendering and debug helpers
  const draw = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    
    // Debug context - uncomment to log the actual dimensions once
    // if (!window._debuggedWaveform) {
    //   console.log('Canvas physical size:', canvasRef.current.width, 'x', canvasRef.current.height);
    //   console.log('Canvas display size:', canvasRef.current.style.width, canvasRef.current.style.height);
    //   console.log('Device pixel ratio:', dpr);
    //   console.log('Base radius:', baseRadius, 'Ring width:', ringWidth);
    //   window._debuggedWaveform = true;
    // }
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: true });
    const analyser = analyserRef.current;
    const dataArray = dataArrayRef.current;
    
    // First time setup or if dimensions are incorrect
    if (canvas.width !== canvasSize || canvas.height !== canvasSize) {
      // Set physical size
      canvas.width = canvas.height = canvasSize;
      // Set display size
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
    }
    
    requestRef.current = requestAnimationFrame(draw);
    
    analyser.getByteTimeDomainData(dataArray);
    ctx.clearRect(0, 0, canvas.width, canvas.height);// Calculate amplitude
    const avgMicAmplitude = dataArray.reduce((sum, val) => sum + Math.abs(val - 128), 0) / dataArray.length;
    const micAmplitude = Math.min(1, Math.max(0, avgMicAmplitude / 50)); // Normalize mic amplitude 0-1
    
    // Default state - respond to microphone input
    let activeAmplitude = micAmplitude;
    let scale = 1; // Default scale (no change)
    
    if (isBeeping) {
      // Check if beep is still active
      const elapsedTime = Date.now() - beepStartTime;
      if (elapsedTime < beepDuration) {
        // Calculate beep amplitude - start soft and ramp up then fade out
        const progress = elapsedTime / beepDuration;
        let beepAmplitude;
        if (progress < 0.2) {
          beepAmplitude = 0.8 * progress / 0.2; // Ramp up
        } else {
          beepAmplitude = 0.8 * (1 - (progress - 0.2) / 0.8); // Fade out
        }
        
        // Use beep amplitude and expand the ring exactly like reference
        activeAmplitude = beepAmplitude;
        scale = 1 + beepAmplitude * 0.05; // Exactly as in reference
      } else {
        // Beep finished
        setIsBeeping(false);
      }
    } else if (activeAmplitude > 0.05) {
      // Only contract if actual user voice is detected (above threshold)
      scale = 1 - activeAmplitude * 0.15; // Shrink for user speaking
    }    // Dynamic offset calculation - enhanced for perfect shadow alignment
    const baseOffset = Math.floor(size * 0.05); // 5% of component size for consistent proportions
    let dynamicOffset = baseOffset * scale; // Scale with the ring size
    
    // Shadow alpha calculation - exactly as in reference
    let shadowAlpha = 0.7;
    let glowAlpha = 0.9;
    if (isBeeping) {
      shadowAlpha = 0.7 + activeAmplitude * 0.3;
      glowAlpha = 0.9 + activeAmplitude * 0.125;
      
      // Non-linear shadow intensification - exactly as in reference
      const progress = (Date.now() - beepStartTime) / beepDuration;
      const maxShadowAlpha = 1.0;
      const baseShadowAlpha = 0.7;
      const shadowRange = maxShadowAlpha - baseShadowAlpha;

      if (progress < 0.2) {
        const rampProgress = progress / 0.2;
        shadowAlpha = baseShadowAlpha + Math.pow(rampProgress, 2) * shadowRange;
      } else if (progress < 1.0) {
        const fadeProgress = (progress - 0.2) / 0.8;
        shadowAlpha = maxShadowAlpha - fadeProgress * shadowRange;
      } else {
        shadowAlpha = baseShadowAlpha;
      }    }        // Mathematically precise center position for perfect circles
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    
    // Draw a real perfect circle with consistent shadow
    ctx.save();
      // Clear with a fully transparent background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
      // First pass: bottom-right shadow (darker) - pixel perfect shadow rendering
    ctx.shadowColor = `rgba(143, 157, 178, ${Math.min(1, shadowAlpha)})`; // Ensure alpha doesn't exceed 1.0
    ctx.shadowBlur = Math.floor((12 + activeAmplitude * 6) * dpr); // Adjusted blur to fit perfectly around the ring
    ctx.shadowOffsetX = Math.floor(4 * dpr); // Fixed consistent offset for better shadow
    ctx.shadowOffsetY = Math.floor(4 * dpr); // Fixed consistent offset for better shadow
      // Draw the perfect donut shape with precise integer coordinates
    ctx.beginPath();
    ctx.arc(Math.round(cx), Math.round(cy), Math.round(baseRadius * scale), 0, Math.PI * 2, false); // Outer circle
    ctx.arc(Math.round(cx), Math.round(cy), Math.round((baseRadius - ringWidth) * scale), 0, Math.PI * 2, true); // Inner circle
    ctx.closePath();
    ctx.fillStyle = '#E0E5EC'; // Match reference fill color exactly
    ctx.fill();
    ctx.restore();    // Second pass: top-left glow (lighter) - pixel perfect shadow rendering
    ctx.save();
    ctx.shadowColor = `rgba(255, 255, 255, ${Math.min(1, glowAlpha)})`; // Ensure alpha doesn't exceed 1.0
    ctx.shadowBlur = Math.floor((14 + activeAmplitude * 5) * dpr); // Integer values for consistent shadows
    ctx.shadowOffsetX = -Math.floor(dynamicOffset); // Precise negative offset for top-left
    ctx.shadowOffsetY = -Math.floor(dynamicOffset); // Precise negative offset for top-left
    
    // Use identical path as before for consistency - important for perfect donut shape
    ctx.beginPath();
    ctx.arc(cx, cy, baseRadius * scale, 0, Math.PI * 2, false); // Outer circle
    ctx.arc(cx, cy, (baseRadius - ringWidth) * scale, 0, Math.PI * 2, true); // Inner circle (counter-clockwise)
    ctx.closePath();
    ctx.fillStyle = '#E0E5EC'; // Match reference fill color exactly
    ctx.fill();
    ctx.restore();      // Draw speaker holes in a circular pattern inside the waveform
    ctx.save();    // Calculate a smaller inner circle radius to match the reference image
    const innerCircleRadius = (baseRadius - ringWidth) * 0.45; // Reduced from 0.6 to 0.45 to bring holes into the red circle area
    const holeRadius = Math.floor(size * 0.02) * dpr; // Increased from 0.01 to 0.0125 for better visibility
    const numHoles = 8; // Increased from 7 to 8 to match reference image
    
    // Match the gray in the image/camera upload icons
    ctx.fillStyle = '#919093ff'; // Updated to match the camera icon color from MobileContainer.css
    
    // Draw holes in a circular pattern - fixed position
    for (let i = 0; i < numHoles; i++) {
      const angle = (i / numHoles) * Math.PI * 2;
      const holeX = cx + innerCircleRadius * Math.cos(angle);
      const holeY = cy + innerCircleRadius * Math.sin(angle);
      
      // Simplified shadow for cleaner look
      ctx.beginPath();
      ctx.shadowColor = 'rgba(143, 157, 178, 0.4)';
      ctx.shadowBlur = 0.5 * dpr;
      ctx.shadowOffsetX = 0.3 * dpr;
      ctx.shadowOffsetY = 0.3 * dpr;
      ctx.arc(Math.round(holeX), Math.round(holeY), holeRadius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };
    // Play beep effect with enhanced visual feedback
  const triggerBeep = () => {
    setIsBeeping(true);
    setBeepStartTime(Date.now());
    
    // Force a redraw for immediate visual feedback
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    
    // Create audio beep if audio context exists
    if (audioCtxRef.current) {
      const oscillator = audioCtxRef.current.createOscillator();
      const gainNode = audioCtxRef.current.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtxRef.current.currentTime);
      
      gainNode.gain.setValueAtTime(0.5, audioCtxRef.current.currentTime);
      gainNode.gain.linearRampToValueAtTime(0, audioCtxRef.current.currentTime + beepDuration/1000);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtxRef.current.destination);
      oscillator.start();
      oscillator.stop(audioCtxRef.current.currentTime + beepDuration/1000);
    }
  };
  
  // Handle click on the waveform
  const handleClick = () => {
    if (isConnecting) return; // Do nothing if already connecting
    
    if (isConnected) {
      onDeactivate?.();
    } else {
      onActivate?.();
      triggerBeep();
    }
  };  return (
    <div 
      className={`voice-waveform ${isActive ? 'active' : ''} ${isConnecting ? 'connecting' : ''}`}
      onClick={handleClick}
      style={{ width: size, height: size }}
    >
      <div className="canvas-container" style={{ width: size, height: size }}>
        <canvas 
          ref={canvasRef} 
          width={canvasSize} 
          height={canvasSize} 
          className="waveform-canvas"
        />
      </div>
      {isConnecting && (
        <div className="connecting-indicator">
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
        </div>
      )}
    </div>
  );
};

export default VoiceWaveform;
