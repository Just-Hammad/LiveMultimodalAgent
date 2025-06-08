import React, { useState, useEffect, useRef } from 'react';
import { useConversation } from '@11labs/react';
import './App.css';
import Captions from './components/Captions';
import MobileContainer from './MobileContainer';
import './components/VoiceWaveform.css';
import './components/NeumorphicButton.css';
import './components/ProjectionScreen.css';

function App() {  // Basic state
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null); // State for selected image file
  const [isUploading, setIsUploading] = useState(false); // State for upload loading indicator
  const [sessionId, setSessionId] = useState(null); // State for sessionId
  const [uploadedImageUrl, setUploadedImageUrl] = useState(null); // Add state to hold the image URL
  const [currentAgentMessageId, setCurrentAgentMessageId] = useState(null); // Track current message ID
  
  // Reference to track component mounting status
  const isMounted = useRef(true);
  

  // Backend URL for fetching signed URL - use relative path when served from same domain
  const backendUrl = 'https://2point.artsensei.ai/';  // Empty string will make fetch use relative paths  // Initialize the ElevenLabs conversation hook
  const { status, isSpeaking, ...conversation } = useConversation({
    autoPlayAudio: true,
    enableAudio: true,
      onConnect: () => {
      console.log('Successfully connected');
      if (isMounted.current) {
        setError(null);
      }
    },
      onDisconnect: () => {
      console.log('Disconnected');
      if (isMounted.current) {
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
      }
    },
  });

  useEffect(() => {
    console.log('[App.jsx] isSpeaking changed:', isSpeaking);
  }, [isSpeaking]);
    // Fetch signed URL from the backend
  const fetchSignedUrl = async () => {
    console.log(`Fetching signed URL from ${backendUrl}/api/elevenlabs/get-signed-url`);
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
      throw error; // Re-throw to be caught by handleConnect
    }
  };
  // Function to start the conversation
  const startConversation = async (signedUrl, agentId, sessionId) => { // Accept agentId and sessionId
    console.log('Starting conversation with signed URL, Agent ID, and Session ID');
    try {
      console.log('[Diag] Attempting conversation.startSession...');
      // Use the URL, agentId, and sessionId directly
      await conversation.startSession({ url: signedUrl, agentId: agentId, sessionId: sessionId });
      console.log('Conversation started successfully via startSession');
      setSessionId(sessionId); // Store the sessionId
    } catch (error) {
      console.error('Failed to start conversation:', error);
      // Detailed error logging
      if (error instanceof CloseEvent) {
        console.error(`WebSocket closed with code: ${error.code}, reason: ${error.reason}, wasClean: ${error.wasClean}`);
      }
      throw error; // Re-throw to be handled by handleConnect
    }
  };  // Function to stop the conversation
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
    if (status === 'connected') {
      console.log('Already connected');
      return;
    }
    
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
      const file = event.target.files[0];
      setSelectedImage(file); // Keep setting state for any UI that might depend on it
      console.log("Image selected, automatically uploading:", file.name);
      handleImageUpload(file); // Call upload directly with the file
    } else {
      setSelectedImage(null);
    }
    // Clear the file input's value to allow selecting the same file again to trigger onChange
    event.target.value = null;
  };

  // Handler for image upload
  const handleImageUpload = async (fileToUpload) => { // Accept file as a parameter
    console.log("handleImageUpload function called with file:", fileToUpload ? fileToUpload.name : 'undefined'); // Debug message
    
    if (!fileToUpload) { // Check the passed file
      setError("No image file provided for upload.");
      return;
    }
    
    setIsUploading(true);
    setError(null);
    console.log("Uploading image:", fileToUpload.name);

    const currentSessionId = conversation?.sessionId || sessionId;
    console.log("Current conversation sessionId for upload:", conversation?.sessionId);
    console.log("Current stored sessionId for upload:", sessionId);
    
    const formData = new FormData();
    formData.append('image', fileToUpload); // Use the passed file
    if (currentSessionId) {
      console.log("Using sessionId for image upload:", currentSessionId);
      formData.append('session_id', currentSessionId);
    } else {
      console.log("No sessionId available for image upload, backend will use pending session");
    }

    try {
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
  // Extract the last agent message for the captions
  const lastAgentMessage = React.useMemo(() => {
    const lastAgentMsg = [...messages].reverse().find(msg => msg.type === 'agent');
    return lastAgentMsg ? lastAgentMsg.text : '';
  }, [messages]);

  return (
    <div className="App">
      <MobileContainer
        uploadedImageUrl={uploadedImageUrl}
        handleImageChange={handleImageChange}
        handleImageUpload={handleImageUpload}
        isUploading={isUploading}
        selectedImage={selectedImage}
        status={status}
        isSpeaking={isSpeaking} // Pass isSpeaking directly
        lastAgentMessage={lastAgentMessage}
        handleConnect={handleConnect}
        stopConversation={stopConversation}
        // conversation object might still be needed for other functionalities if any
        // If not, it can be removed from here. For now, I'll keep it.
        conversation={conversation} 
      />
      
      {/* Error Display */}
      {error && (
        <div style={{ 
          padding: '12px', 
          backgroundColor: '#ffebee', 
          color: '#c62828',
          border: '1px solid #ef9a9a',
          borderRadius: '4px',
          marginBottom: '15px',
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          maxWidth: '80%',
          zIndex: 1000,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  );
}

export default App;
