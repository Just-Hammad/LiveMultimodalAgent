import React, { useState, useEffect, useRef } from 'react';
import { useConversation } from '@11labs/react';
import './App.css';
import Captions from './components/Captions';

function App() {  // Basic state
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('disconnected');
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null); // State for selected image file
  const [isUploading, setIsUploading] = useState(false); // State for upload loading indicator
  const [sessionId, setSessionId] = useState(null); // State for sessionId
  const [uploadedImageUrl, setUploadedImageUrl] = useState(null); // Add state to hold the image URL
  const [currentAgentMessageId, setCurrentAgentMessageId] = useState(null); // Track current message ID
  
  // Reference to track component mounting status
  const isMounted = useRef(true);
  

  // Backend URL for fetching signed URL - use relative path when served from same domain
  const backendUrl = 'https://2point.artsensei.ai/';  // Empty string will make fetch use relative paths
  
  // Initialize the ElevenLabs conversation hook
  const conversation = useConversation({
    autoPlayAudio: true,
    enableAudio: true,
    
    onConnect: () => {
      console.log('Successfully connected');
      if (isMounted.current) {
        setStatus('connected');
        setError(null);
      }
    },
      onDisconnect: () => {
      console.log('Disconnected');
      if (isMounted.current) {
        setStatus('disconnected');
        // Reset current agent message ID when disconnected to ensure captions don't continue
        setCurrentAgentMessageId(null);
      }
    },
    
    onMessage: (message) => {
      // console.log('Received message (raw):', JSON.stringify(message)); // Keep this commented out for potential future debugging
      if (!isMounted.current) return;
      
      // Use message.source to determine type, based on console logs
      if (message?.source === 'user' && message.message) {
        const transcript = message.message;
        // console.log('[App.jsx] User said (from source):', transcript);
        
        setMessages(prev => [...prev, { 
          type: 'user', 
          text: transcript,
          timestamp: new Date().toISOString()
        }]);
      }      // Handle agent responses based on source
      else if (message?.source === 'ai' && message.message) {
        const messageText = message.message;
        const messageId = message.id || Date.now().toString();
        console.log('[App.jsx] Agent said (from source):', messageText);
        
        // Check if this is a new message or still the same one
        if (message.id && message.id === currentAgentMessageId) {
          // Update existing message
          setMessages(prev => prev.map(msg => 
            // Find the latest agent message and update its text
            msg.type === 'agent' && msg.id === currentAgentMessageId 
              ? { ...msg, text: messageText, updated: true }
              : msg
          ));
        } else {
          // This is a new message - clear any previous message and add the new one
          setCurrentAgentMessageId(messageId);
          setMessages(prev => {
            // Filter out any incomplete agent messages (optional)
            // const filteredMessages = prev.filter(m => m.type !== 'agent' || m.status === 'complete');
            return [...prev, { 
              type: 'agent', 
              id: messageId,
              text: messageText,
              timestamp: new Date().toISOString()
            }];
          });
        }
      }
      // Fallback for original user_transcript type if it ever occurs
      else if (message?.type === 'user_transcript' && message.user_transcription_event?.is_final) {
        const transcript = message.user_transcription_event.user_transcript;
        // console.log('[App.jsx] User said (from type user_transcript):', transcript);
        setMessages(prev => [...prev, { type: 'user', text: transcript, timestamp: new Date().toISOString() }]);
      }      // Fallback for original agent_response type if it ever occurs
      else if (message?.type === 'agent_response') {
        let messageText = message.message || message.agent_response_event?.text;
        const messageId = message.id || Date.now().toString();
        
        if (messageText) {
          console.log('[App.jsx] Agent said (from type agent_response):', messageText);
          
          // Check if this is a new message or an update to an existing one
          if (message.id && message.id === currentAgentMessageId) {
            // Update existing message
            setMessages(prev => prev.map(msg => 
              msg.type === 'agent' && msg.id === currentAgentMessageId 
                ? { ...msg, text: messageText, updated: true }
                : msg
            ));
          } else {
            // This is a new message
            setCurrentAgentMessageId(messageId);
            setMessages(prev => [...prev, { 
              type: 'agent', 
              id: messageId,
              text: messageText, 
              timestamp: new Date().toISOString() 
            }]);
          }
        }
      }
      // else {
      //   console.log('[App.jsx] Unhandled message structure:', message);
      // }
    },
    
    onError: (err) => {
      console.error('Conversation error:', err);
      if (isMounted.current) {
        setError(`Error: ${err.message || 'Unknown error'}`);
        setStatus('error');
      }
    },
  });
  
  // Fetch signed URL from the backend
  const fetchSignedUrl = async () => {
    console.log(`Fetching signed URL from ${backendUrl}/api/elevenlabs/get-signed-url`);
    setStatus('Fetching URL...');
    try {
      const response = await fetch(`${backendUrl}/api/elevenlabs/get-signed-url`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error || 'Unknown error'}`);
      }
      const data = await response.json();
      // Expecting { signedUrl: '...', agentId: '...', sessionId: '...' }
      if (!data.signedUrl || !data.agentId || !data.sessionId) {
        throw new Error('Invalid response format from backend: missing signedUrl, agentId, or sessionId');
      }
      console.log('Successfully obtained signed URL, Agent ID, and Session ID');
      return data; // Return the whole object { signedUrl, agentId, sessionId }
    } catch (error) {
      console.error('Failed to fetch signed URL:', error);
      setStatus(`Error fetching URL: ${error.message}`);
      throw error; // Re-throw to be caught by handleConnect
    }
  };

  // Function to start the conversation
  const startConversation = async (signedUrl, agentId, sessionId) => { // Accept agentId and sessionId
    console.log('Starting conversation with signed URL, Agent ID, and Session ID');
    setStatus('Connecting...');
    try {
      console.log('[Diag] Attempting conversation.startSession...');
      // Use the URL, agentId, and sessionId directly
      await conversation.startSession({ url: signedUrl, agentId: agentId, sessionId: sessionId });
      console.log('Conversation started successfully via startSession');
      setSessionId(sessionId); // Store the sessionId
    } catch (error) {
      console.error('Failed to start conversation:', error);
      setStatus(`Error connecting: ${error.message || error.reason || 'Unknown connection error'}`);
      // Detailed error logging
      if (error instanceof CloseEvent) {
        console.error(`WebSocket closed with code: ${error.code}, reason: ${error.reason}, wasClean: ${error.wasClean}`);
      }
    }
  };
  // Function to stop the conversation
  const stopConversation = async () => {
    if (status !== 'connected') {
      console.log('Not connected, nothing to stop');
      return;
    }
    
    try {
      console.log('Stopping conversation...');
      // Reset the current agent message ID to ensure captions start fresh next time
      setCurrentAgentMessageId(null);
      await conversation.endSession();
      console.log('Conversation stopped successfully');
    } catch (error) {
      console.error('Error stopping conversation:', error);
      setError(`Error stopping conversation: ${error.message}`);
    }
  };
  
  // Handler for the connect button
  const handleConnect = async () => {
    if (conversation.status === 'connected') {
      console.log('Already connected');
      return;
    }
    
    setStatus('connecting');
    setError(null);
    
    try {
      // 1. Request microphone permission
      console.log('Requesting microphone permissions...');
      await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('Microphone access granted');
      
      // 2. Get the signed URL from backend
      const { signedUrl, agentId, sessionId } = await fetchSignedUrl(); // Destructure response
      if (signedUrl && agentId && sessionId) {
        await startConversation(signedUrl, agentId, sessionId); // Pass all to startConversation
      }
    } catch (error) {
      // Errors from permission or fetch are already handled and status set
      console.error('Failed to start conversation:', error);
      setError(`Connection failed: ${error.message}`);
      setStatus('error');
    }
  };
  
  // --- Debugging: Log temporaryId changes --- 
  useEffect(() => {
    console.log(`[Debug] Conversation Status: ${status}, Temporary ID: ${conversation?.temporaryId}`);
    // Log the whole conversation object when status changes, especially when connected
    if (status) { // Log whenever status is not null/undefined
        try {
            // Attempt to stringify. Might fail on circular refs, but good first step.
            console.log(`[Debug] Conversation Object (Status: ${status}):`, JSON.stringify(conversation, null, 2)); 
        } catch (e) {
            console.log(`[Debug] Conversation Object (Status: ${status}):`, conversation); // Log raw object if stringify fails
        }
        
        // Add detailed information requested by 11Labs support
        console.log('[11Labs Support] Connection state change:', {
            status,
            timestamp: new Date().toISOString(),
            conversationId: conversation?.id || 'unknown',
            sessionId: conversation?.sessionId || sessionId || 'unknown',
            connectionState: conversation?.status || 'unknown'
        });
    }
  }, [conversation, status, sessionId]); // Re-run when conversation object reference or status changes
  // --- End Debugging ---
  
  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    console.log("App component mounted");

    return () => {
      isMounted.current = false;
      console.log("App component unmounting - Attempting cleanup...");
      // Ensure we only attempt to stop if the conversation object exists and might be active
      if (conversation && typeof conversation.endSession === 'function') {
         console.log("Calling stopConversation during unmount cleanup");
         stopConversation(); // Attempt to clean up the session
      } else {
         console.log("Conversation object not available or endSession not function during unmount");
      }
    };
  }, []); // Empty dependency array to prevent re-execution on conversation changes

  // Handler for file input change
  const handleImageChange = (event) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedImage(event.target.files[0]);
      console.log("Image selected:", event.target.files[0].name);
    } else {
      setSelectedImage(null);
    }
  };

  // Handler for image upload button
  const handleImageUpload = async () => {
    if (!selectedImage) {
      setError("Please select an image first.");
      return;
    }
    
    // Allow upload even if not connected yet - the session ID will be stored
    // and linked when the connection is established
    setIsUploading(true);
    setError(null);
    console.log("Uploading image:", selectedImage.name);

    // Always use the sessionId from the conversation object if available
    // This ensures we're using the same ID that ElevenLabs assigned
    const currentSessionId = conversation?.sessionId || sessionId;
    console.log("Current conversation sessionId:", conversation?.sessionId);
    console.log("Current stored sessionId:", sessionId);
    
    const formData = new FormData();
    formData.append('image', selectedImage);
    if (currentSessionId) {
      console.log("Using sessionId for image upload:", currentSessionId);
      formData.append('session_id', currentSessionId);
    } else {
      console.log("No sessionId available, backend will use pending session");
    }

    try {
      // Simple upload endpoint for images
      console.log(`Sending image to backend: ${backendUrl}/upload_image`);
      
      const response = await fetch(`${backendUrl}/upload_image`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Upload response:', data);
      
      // Add a message to the conversation about the image
      setMessages(prev => [...prev, {
        type: 'system',
        text: '✅ Image uploaded successfully. You can now ask the AI about this image.',
        timestamp: new Date().toISOString()
      }]);
      
      // Set state with the public image URL
      setUploadedImageUrl(data.public_image_url); 
      
      // Clear the selected image from state but keep the UI feedback
      setSelectedImage(null);
    } catch (error) {
      console.error('Error uploading image:', error);
      setError(`Upload failed: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="App" style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>ArtSensei Image Discussion</h1>
      
      {/* Status Banner */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        padding: '12px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        marginBottom: '15px',
        backgroundColor: '#f8f9fa'
      }}>
        {/* Status indicator light */}
        <div style={{ 
          width: '12px', 
          height: '12px', 
          borderRadius: '50%', 
          backgroundColor: 
            status === 'connected' ? '#4CAF50' : // Green for connected
            status === 'connecting' ? '#FFC107' : // Yellow for connecting
            status === 'error' ? '#F44336' : // Red for error
            '#9E9E9E', // Grey for disconnected
          marginRight: '10px',
          transition: 'background-color 0.3s'
        }}></div>
        
        {/* Status text */}
        <div style={{ flex: 1 }}>
          <strong>Status:</strong> {
            status === 'connected' ? 'Connected' :
            status === 'connecting' ? 'Connecting...' :
            status === 'error' ? 'Error' : 'Disconnected'
          }
        </div>
      </div>
      
      {/* Controls */}
      <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
        <button 
          onClick={status === 'connected' ? stopConversation : handleConnect}
          disabled={status === 'connecting'}
          style={{ 
            flex: 1,
            padding: '10px 16px',
            backgroundColor: status === 'connected' ? '#4CAF50' : '#f44336', 
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: status === 'connecting' ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.3s'
          }}>
          {status === 'connecting' ? 'Connecting...' :
           status === 'connected' ? 'Disconnect' : 'Connect'}
        </button>
      </div>

      {/* Image Upload Section */}
      <div style={{
        border: '1px dashed #ccc',
        borderRadius: '4px',
        padding: '15px',
        marginBottom: '20px',
        backgroundColor: '#f0f4f8'
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '10px' }}>Upload Image for Discussion</h3>
        <input
          type="file"
          id="imageInput"
          accept="image/*"
          onChange={handleImageChange}
          style={{ display: 'block', marginBottom: '10px' }}
        />
        <button 
          onClick={handleImageUpload}
          disabled={isUploading || !selectedImage}
          style={{
            padding: '8px 16px',
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: (isUploading || !selectedImage) ? 'not-allowed' : 'pointer',
            width: '100%'
          }}>
          {isUploading ? 'Uploading...' : 'Upload Image'}
        </button>
      </div>
      
      {/* Image Display Section */}
      {uploadedImageUrl && (
        <div style={{ margin: '18px 0', textAlign: 'center' }}>
          <h4 style={{ marginBottom: '8px' }}>Uploaded Image Preview:</h4>
          <img
            src={uploadedImageUrl}
            alt="Uploaded context"
            style={{
              maxWidth: '300px',
              maxHeight: '220px',
              borderRadius: '8px',
              boxShadow: '0 3px 16px rgba(0,0,0,0.08)'
            }}
          />
        </div>
      )}        {/* Live AI Caption - Enhanced with streaming effect */}      <Captions 
        text={(() => {
          const lastAgentMsg = [...messages].reverse().find(msg => msg.type === 'agent');
          return lastAgentMsg ? lastAgentMsg.text : '';
        })()} 
        isActive={status === 'connected' && conversation.status === 'connected'}
        streamingSpeed={60} // Faster animation while still maintaining natural feel
        key={currentAgentMessageId || 'no-message'} // Force remount on message change
      />
      
      {/* Error Display */}
      {error && (
        <div style={{ 
          padding: '12px', 
          backgroundColor: '#ffebee', 
          color: '#c62828',
          border: '1px solid #ef9a9a',
          borderRadius: '4px',
          marginBottom: '15px'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  );
}

export default App;
