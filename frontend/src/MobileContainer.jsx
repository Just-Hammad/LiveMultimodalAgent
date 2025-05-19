import React, { useEffect, useState } from 'react';
import './MobileContainer.css';
import Captions from './components/Captions';
import VoiceWaveform from './components/VoiceWaveform';
import NeumorphicButton from './components/NeumorphicButton';
import ProjectionScreen from './components/ProjectionScreen';
import AvatarSelection from './components/AvatarSelection';

function MobileContainer({ 
  children,
  uploadedImageUrl,
  handleImageChange,
  handleImageUpload,
  isUploading,
  selectedImage,
  status,
  lastAgentMessage,
  handleConnect,
  stopConversation,
  conversation
}) {
  // Force waveform to redraw when status changes
  const [waveformKey, setWaveformKey] = useState(0);
  // State for selected avatar
  const [selectedAvatar, setSelectedAvatar] = useState('avatar_sam');
  const [instructorName, setInstructorName] = useState('Sam');
  // State for camera
  const [cameraActive, setCameraActive] = useState(false);
  // State for smart camera image capture
  const [capturedImage, setCapturedImage] = useState(null);
  const [isAutoCapturing, setIsAutoCapturing] = useState(false);
  const [lastCaptureTimestamp, setLastCaptureTimestamp] = useState(0);
  
  useEffect(() => {
    setWaveformKey(prev => prev + 1);
  }, [status]);
  
  // Direct click handler to upload image
  const onUploadClick = () => {
    console.log("Upload button clicked directly!!!");
    if (selectedImage && !isUploading) {
      handleImageUpload();
    }
  };

  // Handle avatar selection
  const handleAvatarSelect = (avatarId) => {
    setSelectedAvatar(avatarId);
    // Update instructor name based on avatar selection
    if (avatarId === 'avatar_john') {
      setInstructorName('John');
    } else if (avatarId === 'avatar_sam') {
      setInstructorName('Sam');
    } else if (avatarId === 'avatar_laura') {
      setInstructorName('Laura');
    }
  };
  
  // Toggle camera activation
  const handleCameraToggle = () => {
    const newState = !cameraActive;
    setCameraActive(newState);
    
    // If turning off camera, clear the captured image if it exists
    if (!newState) {
      setCapturedImage(null);
      setIsAutoCapturing(false);
    } else {
      // Enable auto-capturing when camera is activated
      setIsAutoCapturing(true);
    }
    
    // Note: We don't modify selectedImage or uploadedImageUrl 
    // when toggling camera on/off
  };
  
  // Handler for camera image capture
  const handleCameraCapture = async (imageFile) => {
    if (!imageFile || isUploading) return;
    
    // Make sure we don't capture too frequently (max 1 per second)
    const now = Date.now();
    if (now - lastCaptureTimestamp < 1000) {
      return;
    }
    
    setLastCaptureTimestamp(now);
    console.log("Camera captured image:", imageFile.name);
    
    // Store the captured image
    setCapturedImage(imageFile);
    
    // Create a FormData object directly (don't use handleImageChange to avoid UI state changes)
    const formData = new FormData();
    formData.append('image', imageFile);
    
    // Use the current conversation sessionId if available
    const currentSessionId = conversation?.sessionId;
    if (currentSessionId) {
      console.log("Using sessionId for camera image upload:", currentSessionId);
      formData.append('session_id', currentSessionId);
    } else {
      console.log("No sessionId available for camera image, backend will use pending session");
    }
    
    // Only proceed if we're connected to the bot
    if (status !== 'connected') {
      console.log("Not uploading camera image: no active connection");
      return;
    }
    
    try {
      // Call the same upload endpoint but don't update UI state for selected image
      console.log(`Sending camera image to backend`);
      
      // Using the same endpoint as regular image uploads
      const backendUrl = 'https://2point.artsensei.ai/';
      const response = await fetch(`${backendUrl}/upload_image`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Camera upload failed: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Camera image uploaded successfully:', data);
      
      // Don't update the uploadedImageUrl or selectedImage states
      // This keeps the UI unchanged while still sending the image context to the backend
    } catch (error) {
      console.error('Error uploading camera image:', error);
      // Don't show errors to the user for automatic camera uploads
    }
  };

  return (
    <div className="mobile-container">      
      {/* Header with avatar selection */}
      <div className="header">
        {/* AvatarSelection component replaces avatar and name */}        
        <AvatarSelection 
          onSelectAvatar={handleAvatarSelect} 
          initialAvatar={selectedAvatar} 
        />
        {/* Connection indicator moved to waveform wrapper */}
      </div>

      {/* Main content area with image and captions */}
      <div className="content-area">
        <div className="image-container">            
          <ProjectionScreen 
            image={uploadedImageUrl}
            loading={isUploading}            
            showCamera={cameraActive}
            onCaptureImage={handleCameraCapture}
            autoCaptureEnabled={isAutoCapturing && status === 'connected' && !isUploading}
            similarityThreshold={20} // Higher threshold means more difference is required
          >
            {!uploadedImageUrl && !isUploading && !cameraActive && (
              <div style={{ textAlign: 'center', color: '#666666' }}>
                <p>Upload an image or activate the camera to start the discussion</p>
              </div>
            )}
          </ProjectionScreen>
        </div>
        
        {/* Captions directly below the image */}
        <div className="captions-area">          
          <Captions 
            text={lastAgentMessage || ''}
            isActive={status === 'connected' && conversation?.status === 'connected'}
            streamingSpeed={80} 
          />
        </div>
      </div>

      {/* Footer with controls */}
      <div className="footer">
        {/* File input for image selection */}
        <input
          type="file"
          id="imageInput"
          accept="image/*"
          onChange={handleImageChange}
          disabled={isUploading}
          style={{ display: 'none' }}
        />

        {/* Image upload/select button */}        
        {!selectedImage ? (
          // Button to select an image
          <div style={{ position: 'relative' }}>
            <label htmlFor="imageInput" style={{ cursor: 'pointer', display: 'block' }}>              
              <div 
                className="neumorphic-button btn-round upload-button"                
                style={{ width: '70px', height: '70px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >              
                <div style={{ width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="42" height="42" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 7v11c0 1.1-.9 2-2 2H7c-1.1 0-2-.9-2-2V7c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2zM16 7H8v6.5l2-1.5 4 3 2-1.5V7z"></path>
                  </svg>
                </div>
              </div>
            </label>
          </div>
        ) : (          
          // Button to upload the selected image
          <div style={{ position: 'relative' }}>            
            <button 
              className="neumorphic-button btn-round upload-button active"              
              style={{ width: '70px', height: '70px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: isUploading ? 'not-allowed' : 'pointer' }}
              onClick={onUploadClick}
              disabled={isUploading}
              type="button"
            >              
              <div style={{ width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isUploading ? (
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid transparent', borderTop: '2px solid #4CAF50', animation: 'spin 1s linear infinite' }}></div>
                ) : (
                  <svg width="42" height="42" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 7v11c0 1.1-.9 2-2 2H7c-1.1 0-2-.9-2-2V7c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2zM16 7H8v6.5l2-1.5 4 3 2-1.5V7z"></path>
                  </svg>
                )}
              </div>
            </button>

            {/* Indicator dot and tooltip */}
            {!uploadedImageUrl && !isUploading && (
              <>
                <div style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '-8px',
                  width: '16px',
                  height: '16px',
                  backgroundColor: '#4CAF50',
                  borderRadius: '50%',
                  border: '2px solid #E8ECF2',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}></div>

                {/* Tooltip */}
                <div style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: 'rgba(0, 0, 0, 0.75)',
                  color: 'white',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                  marginBottom: '8px',
                  zIndex: 100
                }}>
                  Click to upload image
                </div>
              </>
            )}
          </div>
        )}        
        
        {/* Voice waveform button */}
        <div className="waveform-wrapper">
          <VoiceWaveform 
            key={waveformKey}
            isActive={true}
            onActivate={handleConnect}
            onDeactivate={stopConversation}
            isConnected={status === 'connected'}
            isConnecting={status === 'connecting'}
            // Pass conversation status to have waveform react to streaming audio
            isStreaming={conversation?.status === 'connected'}
            size={140} /* Increased from 120 to be larger than the other buttons */
          />
          {/* Connection indicator moved here */}
          <div className={`connection-indicator ${status === 'connected' ? 'connected' : ''}`}></div>
        </div>        
        
        {/* Camera button */}
        <button
          className={`neumorphic-button btn-round camera-button ${cameraActive ? 'active' : ''}`}
          style={{ width: '70px', height: '70px', borderRadius: '50%' }}
          onClick={handleCameraToggle}
        >
          <div style={{ width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="42" height="42" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 15.2C13.7673 15.2 15.2 13.7673 15.2 12C15.2 10.2327 13.7673 8.8 12 8.8C10.2327 8.8 8.8 10.2327 8.8 12C8.8 13.7673 10.2327 15.2 12 15.2Z" />
              <path d="M9 2L7.17 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4H16.83L15 2H9ZM12 17C9.24 17 7 14.76 7 12C7 9.24 9.24 7 12 7C14.76 7 17 9.24 17 12C17 14.76 14.76 17 12 17Z" />
            </svg>
          </div>
          {cameraActive && (
            <div className="camera-indicator-dot" style={{
              position: 'absolute',
              top: '-8px',
              right: '-8px',
              width: '16px',
              height: '16px',
              backgroundColor: '#ff3b30',
              borderRadius: '50%',
              border: '2px solid #E8ECF2',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              animation: 'pulse 2s infinite'
            }}></div>
          )}
        </button>
      </div>
    </div>
  );
}

export default MobileContainer;
