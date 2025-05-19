import React, { useState, useEffect } from 'react';
import './ProjectionScreen.css';
import CameraView from './CameraView';

const ProjectionScreen = ({ 
  children, 
  image, 
  alt = 'Displayed content', 
  loading = false,
  showCamera = false,
  onCaptureImage = null,
  autoCaptureEnabled = false,
  similarityThreshold = 15 // Default similarity threshold
}) => {
  const [displayMode, setDisplayMode] = useState('image'); // 'image' or 'camera'
    // Reset display mode when props change
  useEffect(() => {
    // If camera is turned off, switch back to image mode
    if (!showCamera && displayMode === 'camera') {
      setDisplayMode('image');
    }
    // If there's no image and camera is on, switch to camera mode
    if (!image && showCamera && displayMode === 'image') {
      setDisplayMode('camera');
    }
    // If there is an image, keep it displayed by default, but allow toggling to camera
  }, [showCamera, image, displayMode]);
  
  // Add animation classes conditionally
  const imageClass = image ? "projection-image fade-in" : "projection-image";
  
  // Handle switching between camera and image
  const handleCameraClick = () => {
    setDisplayMode(displayMode === 'image' ? 'camera' : 'image');
  };
  
  const handleImageClick = () => {
    if (displayMode === 'camera' && image) {
      setDisplayMode('image');
    }
  };
  
  return (
    <div className="projection-screen-container">
      <div className="projection-screen">
        {loading ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
          </div>
        ) : (
          <>
            {/* Camera View - either minimized or fullscreen */}
            {showCamera && (
              <CameraView 
                isMinimized={displayMode === 'image'} 
                onClick={handleCameraClick}
                className={displayMode === 'image' ? 'camera-minimized' : 'camera-fullview'}                onCaptureImage={onCaptureImage}
                autoCapture={autoCaptureEnabled && displayMode === 'camera'}
                similarityThreshold={similarityThreshold}
              />
            )}
            
            {/* Image View - either minimized or fullscreen */}
            {image && (
              <div 
                className={`image-container ${displayMode === 'camera' ? 'minimized' : 'fullview'}`}
                onClick={handleImageClick}
              >
                <img 
                  src={image} 
                  alt={alt} 
                  className={imageClass}
                  onLoad={(e) => e.target.classList.add('loaded')}
                />
              </div>
            )}
            
            {/* Content when no image or camera */}
            {!showCamera && !image && children && (
              <div className="projection-content">
                {children}
              </div>
            )}
            
            {/* Placeholder when nothing to display */}
            {!showCamera && !image && !children && (
              <div className="placeholder-text">
                <p>No content to display</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ProjectionScreen;
