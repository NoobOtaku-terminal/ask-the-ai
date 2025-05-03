import React, { useState, useRef, useEffect, useCallback } from 'react';
import './App.css';

const ChatMessage = ({ role, content }) => (
  <div className={`message ${role}`}>
    <div className="message-content">
      {(content || '').split('\n').map((line, i) => (
        <p key={i}>{line}</p>
      ))}
    </div>
  </div>
);

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  const mediaRecorder = useRef(null);
  const chunks = useRef([]);
  const videoRef = useRef(null);
  const recognition = useRef(null);
  const chatEndRef = useRef(null);
  const mediaStream = useRef(null);


  // Define setupSpeech inside a useCallback
  const setupSpeech = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Speech recognition not supported');
      return;
    }
    
    recognition.current = new SpeechRecognition();
    recognition.current.continuous = true;
    recognition.current.interimResults = true;
    
    recognition.current.onresult = (event) => {
      const transcript = Array.from(event.results)
        .slice(-1)[0][0].transcript;
      setInput(transcript);
    };

    recognition.current.onend = () => setIsListening(false);
  }, []);

  // Define cleanup function with useCallback to avoid recreating on each render
  const cleanup = useCallback(() => {
    recognition.current?.stop();
    if (mediaRecorder.current?.state === 'recording') {
      mediaRecorder.current.stop();
    }
    mediaStream.current?.getTracks().forEach(track => track.stop());
  }, []);
  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Setup media when component mounts or when isMobile changes
  useEffect(() => {
    setupMedia();
  }, [isMobile]); // Add setupMedia as dependency
  
  // Setup speech recognition and handle cleanup on unmount
  useEffect(() => {
    setupSpeech();
    return cleanup;
  }, [setupSpeech, cleanup]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Define setupMedia inside a useCallback to avoid recreating it on every render
  const setupMedia = React.useCallback(async () => {
    try {
      // Stop any existing tracks before requesting new ones
      if (mediaStream.current) {
        mediaStream.current.getTracks().forEach(track => track.stop());
      }
      
      // Adjust video constraints based on screen size
      const videoConstraints = isMobile
        ? { width: { ideal: 320 }, height: { ideal: 180 }, facingMode: "user" }
        : { width: { ideal: 320 }, height: { ideal: 240 } };
        
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: videoConstraints, 
        audio: true 
      });
      mediaStream.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Media setup error:", err);
      setError('Camera/microphone access required');
    }
  }, [isMobile]); // Add isMobile as dependency

  const startRecording = () => {
    if (mediaStream.current) {
      chunks.current = [];
      mediaRecorder.current = new MediaRecorder(mediaStream.current);
      
      mediaRecorder.current.ondataavailable = (e) => {
        chunks.current.push(e.data);
      };

      mediaRecorder.current.onstop = () => {
        const blob = new Blob(chunks.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `session-${Date.now()}.webm`;
        a.click();
      };

      mediaRecorder.current.start();
      setIsRecording(true);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current?.state === 'recording') {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  };

  

  const toggleListening = () => {
    if (isListening) {
      recognition.current?.stop();
    } else {
      recognition.current?.start();
    }
    setIsListening(!isListening);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    setMessages(prev => [...prev, { role: 'user', content: input }]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: input })
      });
      
      const data = await response.json();
      setMessages(prev => [...prev, { role: 'ai', content: data.response }]);
    } catch (err) {
      setError('Failed to get AI response');
    }
    setIsLoading(false);
  };

  

  // Show error as notification if present
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>AI Assistant</h1>
        <div className="recording-controls">
          <button
            type="button"
            className={`button record-btn ${isRecording ? 'recording' : ''}`}
            onClick={isRecording ? stopRecording : startRecording}
            aria-label={isRecording ? "Stop recording" : "Start recording"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              {isRecording ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
              )}
            </svg>
            <div className="text">
              {isRecording ? 'Stop Rec' : 'Start Rec'}
            </div>
          </button>
        </div>
        <video ref={videoRef} autoPlay playsInline muted className="camera-preview" />
      </header>

      {error && (
        <div className="error-notification">
          {error}
        </div>
      )}

      <div className="chat-container">
        <div className="messages">
          {messages.length === 0 && (
            <div className="empty-state">
              <p>Ask me anything to get started...</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <ChatMessage key={i} role={msg.role} content={msg.content} />
          ))}
          {isLoading && (
            <div className="message ai">
              <div className="message-content loading">
                <div className="typing-indicator">
                  <div className="dot"></div>
                  <div className="dot"></div>
                  <div className="dot"></div>
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="input-area">
          <div className="input-container">
            <button
              type="button"
              className={`button mic-btn ${isListening ? 'active' : ''}`}
              onClick={toggleListening}
              aria-label={isListening ? "Stop listening" : "Start listening"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
              </svg>
              <div className="text">
                {isListening ? 'Listening' : 'Mic'}
              </div>
            </button>
            
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything..."
              required
              className="chat-input"
              aria-label="Chat input"
            />
            
            <button 
              type="submit" 
              className="button send-btn" 
              disabled={isLoading}
              aria-label="Send message"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
              <div className="text">
                {isLoading ? 'Sending' : 'Send'}
              </div>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default App;