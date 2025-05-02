import React, { useState, useRef, useEffect } from 'react';
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
  
  const mediaRecorder = useRef(null);
  const chunks = useRef([]);
  const videoRef = useRef(null);
  const recognition = useRef(null);
  const chatEndRef = useRef(null);
  const mediaStream = useRef(null);

  useEffect(() => {
    setupMedia();
    setupSpeech();
    return cleanup;
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const setupMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 320, height: 240 }, 
        audio: true 
      });
      mediaStream.current = stream;
      videoRef.current.srcObject = stream;
    } catch (err) {
      setError('Camera/microphone access required');
    }
  };

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

  const setupSpeech = () => {
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

  const cleanup = () => {
    recognition.current?.stop();
    if (mediaRecorder.current?.state === 'recording') {
      mediaRecorder.current.stop();
    }
    mediaStream.current?.getTracks().forEach(track => track.stop());
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>AI Assistant</h1>
        <video ref={videoRef} autoPlay playsInline muted className="camera-preview" />
        <div className="recording-controls">
          <button
            type="button"
            className={`record-btn ${isRecording ? 'recording' : ''}`}
            onClick={isRecording ? stopRecording : startRecording}
          >
            {isRecording ? '⏹ Stop Recording' : '⏺ Start Recording'}
          </button>
          {isRecording && <div className="recording-indicator">● Recording</div>}
        </div>
      </header>

      <div className="chat-container">
        <div className="messages">
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
              className={`mic-btn ${isListening ? 'active' : ''}`}
              onClick={toggleListening}
            >
              🎤{isListening && ' Listening...'}
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything..."
              required
            />
            <button type="submit" disabled={isLoading}>
              {isLoading ? '✉️ Sending...' : 'Send'}
            </button>
          </div>
        </form>
      </div>

      {error && <div className="error-message">{error}</div>}
    </div>
  );
}

export default App;