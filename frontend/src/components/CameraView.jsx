import React, { useEffect, useRef, useState, useCallback } from 'react';
import './CameraView.css';
import { encode } from 'blurhash';

const CameraView = ({ 
  isMinimized, 
  onClick, 
  className, 
  onCaptureImage,
  autoCapture = false,
  captureInterval = 1000, // 1 second interval by default
  similarityThreshold = 10, // Threshold for image similarity (0-100, higher = more different)
  hashResetTimeout = 5000 // Time in ms after which to reset the hash (5 seconds)
}) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deviceList, setDeviceList] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [lastCaptureTime, setLastCaptureTime] = useState(0);
  const [lastImageHash, setLastImageHash] = useState(null);
  
  // Initialize camera and handle camera listing
  useEffect(() => {
    let stream = null;
    
    const getDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        setDeviceList(videoDevices);
        
        // Select the first device by default
        if (videoDevices.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(videoDevices[0].deviceId);
        }
      } catch (err) {
        console.error('Error getting device list:', err);
      }
    };
    
    const startCamera = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Stop any existing stream first
        if (videoRef.current && videoRef.current.srcObject) {
          const tracks = videoRef.current.srcObject.getTracks();
          tracks.forEach(track => track.stop());
        }
        
        // Get user media - specifying the device ID if we have one
        const constraints = { 
          video: { 
            width: { ideal: 1280 },
            height: { ideal: 720 }
          } 
        };
        
        // If we have a selected device, use it
        if (selectedDeviceId) {
          constraints.video.deviceId = { exact: selectedDeviceId };
        }
        
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        
        // Update device list after getting permission
        await getDevices();
      } catch (err) {
        console.error('Error accessing camera:', err);
        setError('Could not access camera');
        
        // Try to get devices list again in case permission was granted
        await getDevices();
      } finally {
        setIsLoading(false);
      }
    };
    
    // Start with getting the device list
    getDevices().then(() => startCamera());
    
    // Cleanup function to stop all tracks when component unmounts
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [selectedDeviceId]);

  // Function to get image data from video
  const getImageData = useCallback(() => {
    if (!videoRef.current || !videoRef.current.srcObject) {
      return null;
    }

    // Create canvas if it doesn't exist
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Scale down for faster processing when comparing
    const width = 32; // Small size is enough for comparison
    const height = Math.floor(video.videoHeight * (width / video.videoWidth));
    
    canvas.width = width;
    canvas.height = height;

    // Draw the current video frame to the canvas
    ctx.drawImage(video, 0, 0, width, height);
    
    return ctx.getImageData(0, 0, width, height);
  }, [videoRef]);

  // Calculate a simplified perceptual hash from image data
  const calculateImageHash = useCallback(async (imageData) => {
    if (!imageData) return null;
    
    try {
      // Use blurhash to create a compact representation (hash) of the image
      // Use 4,3 components for a good balance between accuracy and performance
      const hash = await encode(
        imageData.data, 
        imageData.width, 
        imageData.height, 
        4, 3
      );
      return hash;
    } catch (err) {
      console.error('Error calculating image hash:', err);
      return null;
    }
  }, []);

  // Calculate similarity between two hashes (returns 0-100, higher means more different)
  const calculateSimilarity = useCallback((hash1, hash2) => {
    if (!hash1 || !hash2) return 100; // If either hash is missing, treat as completely different
    
    // Simple character difference approach
    // This works because similar images will have similar blurhashes
    let diff = 0;
    const minLength = Math.min(hash1.length, hash2.length);
    
    for (let i = 0; i < minLength; i++) {
      if (hash1[i] !== hash2[i]) {
        diff++;
      }
    }
    
    // Convert to a percentage (0-100)
    const percentDiff = (diff / minLength) * 100;
    return percentDiff;
  }, []);

  // New function to capture an image from the camera feed
  const captureImage = useCallback(async () => {
    if (!videoRef.current || !videoRef.current.srcObject) {
      console.error("Cannot capture image: video stream not available");
      return null;
    }

    // Create canvas if it doesn't exist
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Set canvas dimensions to match video for full quality capture
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the current video frame to the canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Calculate image hash for comparison before creating the file
    const smallImageData = getImageData();
    const currentHash = await calculateImageHash(smallImageData);
    
    // Compare with last hash if available
    if (lastImageHash) {
      const difference = calculateSimilarity(currentHash, lastImageHash);
      console.log(`Image similarity difference: ${difference.toFixed(2)}%`);
      
      // If images are too similar, don't capture
      if (difference < similarityThreshold) {
        console.log("Image too similar to previous, skipping capture");
        return null;
      }
    }
      // Update the last hash
    setLastImageHash(currentHash);
    
    // Set a timer to reset the hash after specified timeout
    setTimeout(() => {
      setLastImageHash(null);
      console.log("Image hash reset after timeout");
    }, hashResetTimeout);

    // Convert canvas to blob for full quality image
    return new Promise(resolve => {
      canvas.toBlob(blob => {
        if (!blob) {
          console.error("Failed to convert canvas to blob");
          resolve(null);
          return;
        }
        
        // Create a File object from the blob
        const file = new File([blob], `camera-capture-${Date.now()}.jpg`, { 
          type: 'image/jpeg',
          lastModified: Date.now()
        });
        
        resolve(file);
      }, 'image/jpeg', 0.95); // High quality JPEG
    });
  }, [videoRef, getImageData, calculateImageHash, calculateSimilarity, lastImageHash, similarityThreshold, hashResetTimeout]);

  // Auto-capture logic when enabled
  useEffect(() => {
    let captureTimer = null;
    
    // Function to handle timed capture
    const handleTimedCapture = async () => {
      // Check if enough time has passed since last capture
      const now = Date.now();
      if (now - lastCaptureTime < captureInterval) {
        return;
      }
      
      // For auto-capture from camera, we check isMinimized to ensure we're in full view
      if (autoCapture && onCaptureImage && !isLoading && !error && !isMinimized) {
        const imageFile = await captureImage();
        if (imageFile) {
          setLastCaptureTime(now);
          onCaptureImage(imageFile);
        }
      }
    };

    // Set up timer for auto-capture when enabled
    if (autoCapture && onCaptureImage) {
      captureTimer = setInterval(handleTimedCapture, captureInterval);
      // Initial capture after camera is ready
      if (!isLoading && !error) {
        handleTimedCapture();
      }
    }
    
    return () => {
      if (captureTimer) {
        clearInterval(captureTimer);
      }
    };
  }, [autoCapture, onCaptureImage, isLoading, error, captureImage, lastCaptureTime, captureInterval, isMinimized]);

  // Handle device change
  const handleDeviceChange = (e) => {
    setSelectedDeviceId(e.target.value);
  };
  
  const containerClass = isMinimized 
    ? "camera-container minimized" 
    : "camera-container fullview";
  
  return (
    <div 
      className={`${containerClass} ${className || ''}`} 
      onClick={onClick}
    >
      {isLoading && (
        <div className="camera-loading">
          <div className="camera-spinner"></div>
        </div>
      )}
      
      {error && (
        <div className="camera-error">
          <p>{error}</p>
        </div>
      )}
      
      <video 
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="camera-video"
        onLoadedData={() => setIsLoading(false)}
      />
      
      <div className="camera-overlay">
        <div className="camera-indicator"></div>
        
        {/* Only show camera selector in fullview mode */}
        {!isMinimized && deviceList.length > 1 && (
          <div className="camera-controls">
            <select 
              value={selectedDeviceId || ''} 
              onChange={handleDeviceChange}
              className="camera-select"
              onClick={(e) => e.stopPropagation()} // Prevent click from bubbling to container
            >
              {deviceList.map(device => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Camera ${deviceList.indexOf(device) + 1}`}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
};

export default CameraView;