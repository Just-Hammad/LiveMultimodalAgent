import React, { useRef, useEffect, useState } from 'react';
import './VoiceWaveform.css';

const VoiceWaveform = ({
  isActive = false,
  onActivate,
  onDeactivate,
  size = 120,
  isConnected = false,
  isConnecting = false,
  isSpeaking = false
}) => {
  const canvasRef = useRef(null);
  const requestRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const sourceRef = useRef(null);
  const streamRef = useRef(null);
  const [isBeepingReact, setIsBeepingReact] = useState(false);
  const isBeepingRef = useRef(false);
  const beepStartTimeRef = useRef({ timestamp: 0, isSpeakingMode: false });
  const beepDuration = 800; // Duration of beep in milliseconds
  const isSpeakingRef = useRef(isSpeaking);

  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const canvasSize = size * dpr;

  const baseRadius = Math.floor(size * 0.35) * dpr;
  const ringWidth = Math.floor(size * 0.08) * dpr;
  const maxExpansionScale = 1.05;

  useEffect(() => {
    const setupCanvas = () => {
      if (canvasRef.current) {
        canvasRef.current.width = canvasRef.current.height = canvasSize;
        canvasRef.current.style.width = `${size}px`;
        canvasRef.current.style.height = `${size}px`;
        const ctx = canvasRef.current.getContext('2d', { alpha: true });
        ctx.clearRect(0, 0, canvasSize, canvasSize);
      }
    };

    setupCanvas();

    const handleResize = () => {
      if (canvasRef.current) {
        setupCanvas();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      stopAudioProcessing();
      window.removeEventListener('resize', handleResize);
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        canvasRef.current.width = canvasRef.current.height = 0;
      }
    };
  }, [canvasSize]);

  useEffect(() => {
    if (isActive && canvasRef.current) {
      startAudioProcessing();
    } else {
      stopAudioProcessing();
    }
  }, [isActive]);

  useEffect(() => {
    if (isConnected && !isBeepingRef.current) {
      triggerBeep();
    }
  }, [isConnected]);

  useEffect(() => {
    if (isSpeaking) {
      triggerBeep(true);
    } else {
      if (isBeepingRef.current && beepStartTimeRef.current?.isSpeakingMode) {
        isBeepingRef.current = false;
        setIsBeepingReact(false);
      }
    }
  }, [isSpeaking]);

  const startAudioProcessing = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();

      analyser.fftSize = 1024;
      const dataArray = new Uint8Array(analyser.fftSize);
      const source = audioCtx.createMediaStreamSource(stream);

      source.connect(analyser);

      audioCtxRef.current = audioCtx;
      analyserRef.current = analyser;
      dataArrayRef.current = dataArray;
      sourceRef.current = source;
      streamRef.current = stream;

      draw();
    } catch (err) {
      console.error('Error accessing microphone:', err);
    }
  };

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
  };

  // Draw the waveform
  const draw = () => {
    if (!canvasRef.current || !analyserRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: true });
    const analyser = analyserRef.current;
    const dataArray = dataArrayRef.current;

    if (canvas.width !== canvasSize || canvas.height !== canvasSize) {
      canvas.width = canvas.height = canvasSize;
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
    }

    requestRef.current = requestAnimationFrame(draw);

    analyser.getByteTimeDomainData(dataArray);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const avgMicAmplitude = dataArray.reduce((sum, val) => sum + Math.abs(val - 128), 0) / dataArray.length;
    const micAmplitude = Math.min(1, Math.max(0, avgMicAmplitude / 50));

    let activeAmplitude = micAmplitude;
    let scale = 1;

    if (isBeepingRef.current) {
      const elapsedTime = Date.now() - beepStartTimeRef.current.timestamp;
      const isContinuousSpeakingMode = beepStartTimeRef.current.isSpeakingMode;

      if (isContinuousSpeakingMode && !isSpeakingRef.current) {
        isBeepingRef.current = false;
        setIsBeepingReact(false);
        activeAmplitude = micAmplitude;
        scale = 1;
      } else if (elapsedTime < beepDuration || isContinuousSpeakingMode) {
        let progress, beepAmplitude;

        if (isContinuousSpeakingMode) {
          progress = (Date.now() % beepDuration) / beepDuration;
          beepAmplitude = 0.4 + 0.2 * Math.sin(progress * Math.PI * 2);
        } else {
          progress = elapsedTime / beepDuration;
          if (progress < 0.2) {
            beepAmplitude = 0.8 * progress / 0.2; // Ramp up
          } else {
            beepAmplitude = 0.8 * (1 - (progress - 0.2) / 0.8); // Fade out
          }
        }
        activeAmplitude = beepAmplitude;
        scale = 1 + beepAmplitude * 0.05;
      } else {
        isBeepingRef.current = false;
        setIsBeepingReact(false);
      }
    } else if (activeAmplitude > 0.05) {
      scale = 1 - activeAmplitude * 0.15;
    }

    const baseOffset = Math.floor(size * 0.05);
    let dynamicOffset = baseOffset * scale;

    let shadowAlpha = 0.7;
    let glowAlpha = 0.9;
    if (isBeepingRef.current) {
      shadowAlpha = 0.7 + activeAmplitude * 0.3;
      glowAlpha = 0.9 + activeAmplitude * 0.125;

      const progress = (Date.now() - (beepStartTimeRef.current?.timestamp || 0)) / beepDuration;
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
      }
    }
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // First pass: bottom-right shadow (darker)
    ctx.shadowColor = `rgba(143, 157, 178, ${Math.min(1, shadowAlpha)})`;
    ctx.shadowBlur = Math.floor((12 + activeAmplitude * 6) * dpr);
    ctx.shadowOffsetX = Math.floor(4 * dpr);
    ctx.shadowOffsetY = Math.floor(4 * dpr);
    ctx.beginPath();
    ctx.arc(Math.round(cx), Math.round(cy), Math.round(baseRadius * scale), 0, Math.PI * 2, false);
    ctx.arc(Math.round(cx), Math.round(cy), Math.round((baseRadius - ringWidth) * scale), 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fillStyle = '#E0E5EC';
    ctx.fill();
    ctx.restore();

    // Second pass: top-left glow (lighter)
    ctx.save();
    ctx.shadowColor = `rgba(255, 255, 255, ${Math.min(1, glowAlpha)})`;
    ctx.shadowBlur = Math.floor((14 + activeAmplitude * 5) * dpr);
    ctx.shadowOffsetX = -Math.floor(dynamicOffset);
    ctx.shadowOffsetY = -Math.floor(dynamicOffset);

    ctx.beginPath();
    ctx.arc(cx, cy, baseRadius * scale, 0, Math.PI * 2, false);
    ctx.arc(cx, cy, (baseRadius - ringWidth) * scale, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fillStyle = '#E0E5EC';
    ctx.fill();
    ctx.restore();

    ctx.save();
    const innerCircleRadius = (baseRadius - ringWidth) * 0.45;
    const holeRadius = Math.floor(size * 0.02) * dpr;
    const numHoles = 8;

    ctx.fillStyle = '#919093ff';

    for (let i = 0; i < numHoles; i++) {
      const angle = (i / numHoles) * Math.PI * 2;
      const holeX = cx + innerCircleRadius * Math.cos(angle);
      const holeY = cy + innerCircleRadius * Math.sin(angle);

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

  const triggerBeep = (isSpeakingMode = false) => {
    if (!audioCtxRef.current) {
      try {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        console.error("Failed to initialize AudioContext for beep:", e);
        return;
      }
    }

    if (!isSpeakingMode) {
      const oscillator = audioCtxRef.current.createOscillator();
      const gainNode = audioCtxRef.current.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtxRef.current.currentTime); // A5 note

      gainNode.gain.setValueAtTime(0.5, audioCtxRef.current.currentTime);
      gainNode.gain.linearRampToValueAtTime(0, audioCtxRef.current.currentTime + beepDuration / 1000);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtxRef.current.destination);
      oscillator.start();
      oscillator.stop(audioCtxRef.current.currentTime + beepDuration / 1000);
    }
    setIsBeepingReact(true);
    isBeepingRef.current = true;
    beepStartTimeRef.current = {
      timestamp: Date.now(),
      isSpeakingMode: isSpeakingMode
    };
  }

  const handleClick = () => {
    if (isConnecting) return;

    if (isConnected) {
      onDeactivate?.();
    } else {
      onActivate?.();
      triggerBeep();
    }
  };

  return (
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
