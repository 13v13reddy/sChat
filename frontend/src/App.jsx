import { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';

const socket = io('http://35.173.248.7:3001');

function App() {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [msg, setMsg] = useState('');
  const [darkMode, setDarkMode] = useState(true);
  const [nextClickCount, setNextClickCount] = useState(0);
  const [nextButtonText, setNextButtonText] = useState('Next');
  const [acceptedDisclaimer, setAcceptedDisclaimer] = useState(() => {
    return localStorage.getItem('acceptedDisclaimer') === 'true';
  });
  const [typingIndicator, setTypingIndicator] = useState(false); // State for typing indicator
  const messageEndRef = useRef(null);

  const acceptDisclaimer = () => {
    localStorage.setItem('acceptedDisclaimer', 'true');
    setAcceptedDisclaimer(true);
  };

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        if (nextClickCount === 0) {
          setNextButtonText('Really?');
          setNextClickCount(1);
        } else {
          handleNext();
        }
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [nextClickCount]);

  useEffect(() => {
    if (!acceptedDisclaimer) return;

    // Clear previous listeners to avoid duplicates
    socket.off('waiting');
    socket.off('partner-connected');
    socket.off('receive-msg');
    socket.off('partner-left');
    socket.off('connect');
    socket.off('disconnect');
    socket.off('typing'); // Listener for typing events
    socket.off('stop-typing'); // Listener for stop-typing events

    socket.on('waiting', () => {
      setConnected(false);
      setMessages([{ sender: 'system', text: 'Waiting for a partner...' }]);
      setNextClickCount(0);
      setNextButtonText('Next');
    });

    socket.on('partner-connected', () => {
      setConnected(true);
      setMessages((prev) => [...prev, { sender: 'system', text: 'Partner connected!' }]);
    });

    socket.on('receive-msg', (data) => {
      setMessages((prev) => [...prev, { sender: 'stranger', text: data }]);
    });

    socket.on('partner-left', () => {
      setConnected(false);
      setMessages((prev) => [...prev, { sender: 'system', text: 'Partner disconnected. Refresh to find a new one.' }]);
      setNextClickCount(0);
      setNextButtonText('Next');
    });

    socket.on('connect', () => {
      console.log('✅ Connected to server');
      setConnected(false);
      setMessages([{ sender: 'system', text: 'Waiting for a partner...' }]);
      setNextClickCount(0);
      setNextButtonText('Next');
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from server:', reason);
    });

    // Handle typing indicator
    socket.on('typing', () => {
      setTypingIndicator(true);
    });

    socket.on('stop-typing', () => {
      setTypingIndicator(false);
    });
  }, [acceptedDisclaimer]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (msg.trim()) {
      socket.emit('send-msg', msg);
      setMessages((prev) => [...prev, { sender: 'you', text: msg }]);
      setMsg('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  const handleNext = () => {
    window.location.reload();
  };

  const toggleTheme = () => setDarkMode((prev) => !prev);

  const themeStyles = {
    backgroundColor: darkMode ? '#0f172a' : '#f8fafc',
    color: darkMode ? '#f8fafc' : '#0f172a',
    minHeight: '100vh',
    padding: '1rem',
    fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
    transition: 'all 0.3s ease',
    boxSizing: 'border-box'
  };

  const containerStyle = {
    maxWidth: '600px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    padding: '1rem'
  };

  const inputStyle = {
    flex: 1,
    padding: '0.75rem 1rem',
    backgroundColor: darkMode ? '#1e293b' : '#ffffff',
    color: darkMode ? '#f8fafc' : '#0f172a',
    border: `1px solid ${darkMode ? '#334155' : '#cbd5e1'}`,
    borderRadius: '0.5rem',
    outline: 'none',
    fontSize: '1rem',
    minWidth: '100px'
  };

  const messageBoxStyle = {
    border: `1px solid ${darkMode ? '#334155' : '#cbd5e1'}`,
    backgroundColor: darkMode ? '#1e293b' : '#ffffff',
    color: darkMode ? '#f8fafc' : '#0f172a',
    height: 'calc(100vh - 250px)',
    overflowY: 'auto',
    padding: '1rem',
    marginBottom: '1.5rem',
    borderRadius: '0.5rem',
    fontSize: '0.95rem'
  };

  const buttonStyle = {
    padding: '0.75rem 1.5rem',
    borderRadius: '0.5rem',
    border: 'none',
    cursor: 'pointer',
    backgroundColor: darkMode ? '#2563eb' : '#3b82f6',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: '1rem',
    transition: 'background 0.3s ease'
  };

  // Debounced typing event handler
  useEffect(() => {
    let timeoutId;

    const handleTyping = () => {
      if (msg.trim()) {
        // Emit "typing" only if there's text in the input
        socket.emit('typing');
      }

      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        // Emit "stop-typing" after 1 second of inactivity
        socket.emit('stop-typing');
      }, 1000);
    };

    if (connected) {
      handleTyping();
    }

    return () => clearTimeout(timeoutId); // Cleanup timeout on unmount or change
  }, [msg, connected]);

  if (!acceptedDisclaimer) {
    return (
      <div style={themeStyles}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', padding: '1rem' }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Welcome to sChat</h1>
          <p style={{ margin: '1rem 0', fontSize: '1rem' }}>
            This platform connects you randomly with strangers for anonymous conversations.
            Please be respectful. This site is intended for adults (18+).
          </p>
          <button onClick={acceptDisclaimer} style={{
            padding: '0.75rem 1.5rem',
            borderRadius: '0.5rem',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: '#3b82f6',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '1rem',
            width: '100%'
          }}>
            I am 18 or older and accept
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={themeStyles}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <button onClick={toggleTheme} style={{
          background: 'transparent',
          border: 'none',
          fontSize: '1.25rem',
          color: darkMode ? '#f8fafc' : '#0f172a',
          cursor: 'pointer'
        }}>
          {darkMode ? '🌞' : '🌙'}
        </button>
      </div>
      <div style={containerStyle}>
        <h1 style={{ textAlign: 'center', marginBottom: '1.5rem', fontSize: '1.5rem' }}>sChat</h1>
        <div style={messageBoxStyle}>
          {messages.map((m, i) => (
            <p key={i} style={{ marginBottom: '0.5rem' }}>
              <strong style={{ color: m.sender === 'you' ? '#38bdf8' : m.sender === 'stranger' ? '#facc15' : '#94a3b8' }}>{m.sender}:</strong> {m.text}
            </p>
          ))}
          {typingIndicator && <p style={{ color: '#94a3b8', fontStyle: 'italic', marginBottom: '0.5rem' }}>Stranger is typing...</p>}
          <div ref={messageEndRef} />
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
          <button onClick={() => {
            if (nextClickCount === 0) {
              setNextButtonText('Really?');
              setNextClickCount(1);
            } else {
              handleNext();
            }
          }} style={{ ...buttonStyle, width: '100px', textAlign: 'center' }}>{nextButtonText}</button>
          <input
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            style={inputStyle}
            disabled={!connected}
          />
          <button onClick={sendMessage} disabled={!connected || !msg.trim()} style={{ ...buttonStyle, minWidth: '100px', textAlign: 'center' }}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;