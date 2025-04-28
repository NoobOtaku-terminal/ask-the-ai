import React, { useState, useRef, useEffect } from 'react';
import './App.css';

function App() {
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recordingUrl, setRecordingUrl] = useState(null);

  const mediaRecorder = useRef(null);
  const chunks = useRef([]);
  const videoRef = useRef(null);
  const recognition = useRef(null);

  // Initialize media and speech recognition
  useEffect(() => {
    setupMedia();
    setupSpeech();
    return () => cleanup();
  }, []);

  const setupMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      if (videoRef.current) videoRef.current.srcObject = stream;
      return stream;
    } catch (err) {
      setError('Permission denied for camera/microphone');
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
      const text = Array.from(event.results)
        .map(result => result[0].transcript)
        .join('');
      setTranscript(text);
    };
  };

  const startRecording = async () => {
    const stream = await setupMedia();
    if (!stream) return;

    mediaRecorder.current = new MediaRecorder(stream);
    mediaRecorder.current.ondataavailable = (e) => chunks.current.push(e.data);
    mediaRecorder.current.onstop = () => {
      const blob = new Blob(chunks.current, { type: 'video/webm' });
      setRecordingUrl(URL.createObjectURL(blob));
      chunks.current = [];
    };
    mediaRecorder.current.start();
    setIsRecording(true);
  };

  const handleStart = () => {
    startRecording();
    recognition.current?.start();
  };

  const handleSubmit = () => {
    recognition.current?.stop();
    setIsLoading(true);
    
    setTimeout(() => {
      setResponse(generateResponse(transcript));
      setIsLoading(false);
      mediaRecorder.current?.stop();
      setIsRecording(false);
    }, 2000);
  };

  const generateResponse = (question) => {
    const mockResponses = {
      'hello': 'Hello! How can I assist you today?',
      'default': 'Interesting question. Let me explain...',
    };
    return mockResponses[question.toLowerCase()] || mockResponses.default;
  };

  const cleanup = () => {
    mediaRecorder.current?.stream?.getTracks().forEach(track => track.stop());
    recognition.current?.stop();
  };

  return (
    <div className="container">
      <h1>Ask the AI</h1>
      
      <video ref={videoRef} autoPlay playsInline muted className="camera-feed" />
      
      {error && <div className="error">{error}</div>}
      
      <div className="controls">
        <button 
          onClick={handleStart} 
          disabled={isRecording}
          className="mic-btn"
        >
          🎤 Start Session
        </button>
        
        <button 
          onClick={handleSubmit} 
          disabled={!isRecording || isLoading}
          className="submit-btn"
        >
          Submit
        </button>
      </div>

      <div className="transcript">{transcript}</div>
      
      {isLoading && <div className="loader">Analyzing...</div>}
      
      {response && (
        <div className="response">
          <h3>AI Response:</h3>
          <p>{response}</p>
        </div>
      )}

      {recordingUrl && (
        <a href={recordingUrl} download="session.webm" className="download">
          Download Recording
        </a>
      )}
    </div>
  );
}

export default App;
