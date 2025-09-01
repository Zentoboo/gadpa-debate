import React, { useState, useEffect, useCallback } from 'react';
import useAuth from '../hooks/useAuth';
import useSignalR from '../hooks/useSignalR';

export default function DebateControlCenter() {
  const { token } = useAuth(true);
  const { connection, connectionStatus } = useSignalR();
  
  const [debateSessions, setDebateSessions] = useState([]);
  const [liveStatus, setLiveStatus] = useState({ isLive: false, status: 'Offline' });
  const [activeTab, setActiveTab] = useState('control');
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(null);
  
  // Form states for creating new session
  const [newSession, setNewSession] = useState({
    title: '',
    description: '',
    sessionType: 'Presidential',
    totalDurationMinutes: 60
  });
  
  const [newQuestion, setNewQuestion] = useState({
    sessionId: '',
    question: '',
    orderIndex: 1,
    durationMinutes: 3,
    questionType: 'General',
    targetCandidate: ''
  });

  // SignalR Event Handlers
  useEffect(() => {
    if (connection && connectionStatus === 'Connected') {
      // Join admin group for admin-specific updates
      if (token) {
        connection.invoke('JoinAdminGroup').catch(err => console.error('Error joining admin group:', err));
      }
      
      // Request initial data
      connection.invoke('GetDebateSessions').catch(err => console.error('Error fetching sessions:', err));
      connection.invoke('GetLiveStats').catch(err => console.error('Error fetching live stats:', err));
      
      // === LISTEN TO SIGNALR EVENTS ===
      
      // Session list update
      connection.on('DebateSessionsList', (sessions) => {
        console.log('Received debate sessions:', sessions);
        setDebateSessions(sessions);
        setLoading(false);
      });
      
      // Live status updates
      connection.on('LiveStatusUpdate', (status) => {
        setLiveStatus({
          isLive: status.isLive,
          status: status.status || (status.isLive ? 'Live' : 'Offline'),
          sessionTitle: status.sessionTitle,
          currentQuestion: status.currentQuestion,
          timeRemaining: status.timeRemaining
        });
      });
      
      // Timer updates
      connection.on('TimerUpdate', (data) => {
        setTimeRemaining(data.remainingSeconds);
        if (data.currentQuestion) {
          setLiveStatus(prev => ({ ...prev, currentQuestion: data.currentQuestion }));
        }
      });
      
      // Session went live
      connection.on('SessionWentLive', (data) => {
        console.log('Session went live:', data);
        setLiveStatus({
          isLive: true,
          status: 'Live',
          sessionTitle: data.sessionTitle,
          currentQuestion: data.firstQuestion,
          timeRemaining: null
        });
        // Refresh sessions list
        connection.invoke('GetDebateSessions').catch(err => console.error('Error:', err));
      });
      
      // Session ended
      connection.on('SessionEnded', () => {
        setLiveStatus({ isLive: false, status: 'Offline' });
        setTimeRemaining(null);
        // Refresh sessions list
        connection.invoke('GetDebateSessions').catch(err => console.error('Error:', err));
      });
      
      connection.on('SessionAutoEnded', (data) => {
        console.log('Session auto-ended:', data.reason);
        setLiveStatus({ isLive: false, status: 'Offline' });
        setTimeRemaining(null);
        connection.invoke('GetDebateSessions').catch(err => console.error('Error:', err));
      });
      
      // Question navigation
      connection.on('NextQuestion', (data) => {
        setCurrentQuestionIndex(data.index - 1);
        setLiveStatus(prev => ({ 
          ...prev, 
          currentQuestion: data.question 
        }));
        setTimeRemaining(data.duration * 60);
      });
      
      connection.on('PreviousQuestion', (data) => {
        setCurrentQuestionIndex(data.index);
        setLiveStatus(prev => ({ 
          ...prev, 
          currentQuestion: data.question 
        }));
        setTimeRemaining(data.duration * 60);
      });
      
      connection.on('AutoAdvancedToNextQuestion', (data) => {
        console.log('Auto-advanced to next question');
        setCurrentQuestionIndex(data.index - 1);
        setLiveStatus(prev => ({ 
          ...prev, 
          currentQuestion: data.question 
        }));
        setTimeRemaining(data.duration * 60);
      });
      
      // Session control events
      connection.on('SessionPaused', () => {
        setLiveStatus(prev => ({ ...prev, status: 'Paused' }));
      });
      
      connection.on('SessionResumed', () => {
        setLiveStatus(prev => ({ ...prev, status: 'Live' }));
      });
      
      connection.on('TimeExtended', (data) => {
        setTimeRemaining(data.newTimeRemaining);
      });
      
      // Creation confirmations
      connection.on('SessionCreated', (data) => {
        console.log('Session created:', data);
        setNewSession({ title: '', description: '', sessionType: 'Presidential', totalDurationMinutes: 60 });
        // Refresh sessions list
        connection.invoke('GetDebateSessions').catch(err => console.error('Error:', err));
        alert(`Session "${data.title}" created successfully!`);
      });
      
      connection.on('QuestionAdded', (data) => {
        console.log('Question added:', data);
        setNewQuestion({
          sessionId: newQuestion.sessionId,
          question: '',
          orderIndex: newQuestion.orderIndex + 1,
          durationMinutes: 3,
          questionType: 'General',
          targetCandidate: ''
        });
        // Refresh sessions list
        connection.invoke('GetDebateSessions').catch(err => console.error('Error:', err));
        alert('Question added successfully!');
      });
      
      // Error handling
      connection.on('Error', (message) => {
        console.error('SignalR Error:', message);
        alert(`Error: ${message}`);
      });
      
      // Admin group events
      connection.on('JoinedAdminGroup', () => {
        console.log('Joined admin group successfully');
      });
      
      connection.on('NewSessionCreated', (data) => {
        console.log('New session created by another admin:', data);
        // Refresh sessions list
        connection.invoke('GetDebateSessions').catch(err => console.error('Error:', err));
      });
      
      connection.on('NewQuestionAdded', (data) => {
        console.log('New question added by another admin:', data);
        // Refresh sessions list
        connection.invoke('GetDebateSessions').catch(err => console.error('Error:', err));
      });
      
      // Cleanup
      return () => {
        connection.off('DebateSessionsList');
        connection.off('LiveStatusUpdate');
        connection.off('TimerUpdate');
        connection.off('SessionWentLive');
        connection.off('SessionEnded');
        connection.off('SessionAutoEnded');
        connection.off('NextQuestion');
        connection.off('PreviousQuestion');
        connection.off('AutoAdvancedToNextQuestion');
        connection.off('SessionPaused');
        connection.off('SessionResumed');
        connection.off('TimeExtended');
        connection.off('SessionCreated');
        connection.off('QuestionAdded');
        connection.off('Error');
        connection.off('JoinedAdminGroup');
        connection.off('NewSessionCreated');
        connection.off('NewQuestionAdded');
      };
    }
  }, [connection, connectionStatus, token, newQuestion.sessionId, newQuestion.orderIndex]);

  // === SIGNALR ACTION METHODS ===
  
  const createDebateSession = useCallback(async (e) => {
    e.preventDefault();
    if (!connection || connectionStatus !== 'Connected') {
      alert('Not connected to server');
      return;
    }
    
    try {
      await connection.invoke('CreateDebateSession',
        newSession.title,
        newSession.description,
        newSession.sessionType,
        newSession.totalDurationMinutes
      );
    } catch (error) {
      console.error('Error creating debate session:', error);
      alert('Failed to create session');
    }
  }, [connection, connectionStatus, newSession]);

  const addQuestion = useCallback(async (e) => {
    e.preventDefault();
    if (!connection || connectionStatus !== 'Connected') {
      alert('Not connected to server');
      return;
    }
    
    try {
      await connection.invoke('AddQuestionToSession',
        parseInt(newQuestion.sessionId),
        newQuestion.question,
        newQuestion.orderIndex,
        newQuestion.durationMinutes,
        newQuestion.questionType,
        newQuestion.targetCandidate || null
      );
    } catch (error) {
      console.error('Error adding question:', error);
      alert('Failed to add question');
    }
  }, [connection, connectionStatus, newQuestion]);

  const goLive = useCallback(async (sessionId) => {
    if (!connection || connectionStatus !== 'Connected') {
      alert('Not connected to server');
      return;
    }
    
    try {
      await connection.invoke('GoLiveWithSession', sessionId);
    } catch (error) {
      console.error('Error going live:', error);
      alert('Failed to go live');
    }
  }, [connection, connectionStatus]);

  const controlLiveSession = useCallback(async (action, extendSeconds = null) => {
    if (!connection || connectionStatus !== 'Connected') {
      alert('Not connected to server');
      return;
    }
    
    try {
      await connection.invoke('ControlLiveSession', action, extendSeconds);
    } catch (error) {
      console.error('Error controlling live session:', error);
      alert(`Failed to ${action} session`);
    }
  }, [connection, connectionStatus]);

  // Format time display
  const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const LiveControlTab = () => (
    <div className="live-control-section">
      <h3>🎛️ Live Session Control</h3>
      
      <div className="status-card">
        <div className={`status-indicator ${liveStatus.isLive ? 'live' : 'offline'}`}>
          {liveStatus.isLive ? '🔴 LIVE' : '⭕ OFFLINE'}
        </div>
        <div className="status-info">
          <p><strong>Status:</strong> {liveStatus.status}</p>
          {liveStatus.sessionTitle && <p><strong>Session:</strong> {liveStatus.sessionTitle}</p>}
          {liveStatus.currentQuestion && <p><strong>Current Question:</strong> {liveStatus.currentQuestion}</p>}
          {timeRemaining !== null && (
            <p><strong>Time Remaining:</strong> {formatTime(timeRemaining)}</p>
          )}
        </div>
      </div>

      {liveStatus.isLive && (
        <div className="live-controls">
          <div className="control-group">
            <h4>Question Control</h4>
            <button onClick={() => controlLiveSession('prev')} className="control-btn prev">
              ⏮️ Previous Question
            </button>
            <button onClick={() => controlLiveSession('next')} className="control-btn next">
              ⏭️ Next Question
            </button>
          </div>
          
          <div className="control-group">
            <h4>Session Control</h4>
            <button 
              onClick={() => controlLiveSession(liveStatus.status === 'Paused' ? 'resume' : 'pause')} 
              className="control-btn pause"
            >
              {liveStatus.status === 'Paused' ? '▶️ Resume' : '⏸️ Pause'}
            </button>
            <button onClick={() => controlLiveSession('extend', 60)} className="control-btn extend">
              ⏱️ +1 Min
            </button>
            <button onClick={() => controlLiveSession('end')} className="control-btn end">
              🛑 End Session
            </button>
          </div>
        </div>
      )}
      
      {/* Connection Status */}
      <div className="connection-status-info">
        <p>SignalR Status: <span className={`connection-badge ${connectionStatus.toLowerCase()}`}>
          {connectionStatus}
        </span></p>
      </div>
    </div>
  );

  const SessionsTab = () => (
    <div className="sessions-section">
      <h3>📋 Debate Sessions</h3>
      
      <div className="sessions-grid">
        {debateSessions.map(session => (
          <div key={session.id} className="session-card">
            <div className="session-header">
              <h4>{session.title}</h4>
              <span className={`status-badge ${session.status.toLowerCase()}`}>
                {session.status}
              </span>
            </div>
            <p>{session.description}</p>
            <div className="session-details">
              <p><strong>Type:</strong> {session.sessionType}</p>
              <p><strong>Duration:</strong> {session.totalDurationMinutes} minutes</p>
              <p><strong>Questions:</strong> {session.questions?.length || 0}</p>
              {session.scheduledAt && (
                <p><strong>Scheduled:</strong> {new Date(session.scheduledAt).toLocaleString()}</p>
              )}
            </div>
            
            {session.questions && session.questions.length > 0 && (
              <div className="questions-preview">
                <h5>Questions:</h5>
                <ol>
                  {session.questions.map(q => (
                    <li key={q.id}>
                      {q.question} ({q.durationMinutes}min - {q.questionType})
                    </li>
                  ))}
                </ol>
              </div>
            )}
            
            <div className="session-actions">
              {session.status === 'Draft' && session.questions && session.questions.length > 0 && (
                <button onClick={() => goLive(session.id)} className="go-live-btn">
                  🔴 GO LIVE
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const CreateTab = () => (
    <div className="create-section">
      <h3>➕ Create New Debate Session</h3>
      
      <div className="create-forms">
        <form onSubmit={createDebateSession} className="session-form">
          <h4>New Session</h4>
          <input
            type="text"
            placeholder="Session Title (e.g., Presidential Debate Round 1)"
            value={newSession.title}
            onChange={(e) => setNewSession(prev => ({ ...prev, title: e.target.value }))}
            required
          />
          <textarea
            placeholder="Session Description"
            value={newSession.description}
            onChange={(e) => setNewSession(prev => ({ ...prev, description: e.target.value }))}
            required
          />
          <select
            value={newSession.sessionType}
            onChange={(e) => setNewSession(prev => ({ ...prev, sessionType: e.target.value }))}
          >
            <option value="Presidential">Presidential Debate</option>
            <option value="OpenFloor">Open Floor</option>
            <option value="QnA">Q&A Session</option>
          </select>
          <input
            type="number"
            placeholder="Total Duration (minutes)"
            value={newSession.totalDurationMinutes}
            onChange={(e) => setNewSession(prev => ({ ...prev, totalDurationMinutes: parseInt(e.target.value) }))}
            required
          />
          <button type="submit" disabled={connectionStatus !== 'Connected'}>Create Session</button>
        </form>

        {debateSessions.length > 0 && (
          <form onSubmit={addQuestion} className="question-form">
            <h4>Add Question to Session</h4>
            <select
              value={newQuestion.sessionId}
              onChange={(e) => setNewQuestion(prev => ({ ...prev, sessionId: e.target.value }))}
              required
            >
              <option value="">Select Session</option>
              {debateSessions.filter(s => s.status === 'Draft').map(session => (
                <option key={session.id} value={session.id}>{session.title}</option>
              ))}
            </select>
            <textarea
              placeholder="Question"
              value={newQuestion.question}
              onChange={(e) => setNewQuestion(prev => ({ ...prev, question: e.target.value }))}
              required
            />
            <div className="question-settings">
              <input
                type="number"
                placeholder="Order"
                value={newQuestion.orderIndex}
                onChange={(e) => setNewQuestion(prev => ({ ...prev, orderIndex: parseInt(e.target.value) }))}
                min="1"
                required
              />
              <input
                type="number"
                placeholder="Duration (min)"
                value={newQuestion.durationMinutes}
                onChange={(e) => setNewQuestion(prev => ({ ...prev, durationMinutes: parseInt(e.target.value) }))}
                min="1"
                required
              />
              <select
                value={newQuestion.questionType}
                onChange={(e) => setNewQuestion(prev => ({ ...prev, questionType: e.target.value }))}
              >
                <option value="General">General</option>
                <option value="Opening">Opening</option>
                <option value="Closing">Closing</option>
                <option value="Rebuttal">Rebuttal</option>
              </select>
            </div>
            <input
              type="text"
              placeholder="Target Candidate (optional)"
              value={newQuestion.targetCandidate}
              onChange={(e) => setNewQuestion(prev => ({ ...prev, targetCandidate: e.target.value }))}
            />
            <button type="submit" disabled={connectionStatus !== 'Connected'}>Add Question</button>
          </form>
        )}
      </div>
    </div>
  );

  if (loading && connectionStatus === 'Connecting') {
    return <div className="loading-container">
      <h2>Connecting to server...</h2>
      <p>Status: {connectionStatus}</p>
    </div>;
  }

  return (
    <div className="debate-control-center">
      <h1>🎛️ Debate Control Center - BPU (SignalR)</h1>
      
      <div className="tabs">
        <button 
          className={activeTab === 'control' ? 'active' : ''} 
          onClick={() => setActiveTab('control')}
        >
          Live Control
        </button>
        <button 
          className={activeTab === 'sessions' ? 'active' : ''} 
          onClick={() => setActiveTab('sessions')}
        >
          Sessions ({debateSessions.length})
        </button>
        <button 
          className={activeTab === 'create' ? 'active' : ''} 
          onClick={() => setActiveTab('create')}
        >
          Create New
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'control' && <LiveControlTab />}
        {activeTab === 'sessions' && <SessionsTab />}
        {activeTab === 'create' && <CreateTab />}
      </div>

      <style>{`
        .debate-control-center {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
          background: #1a1a1a;
          min-height: 100vh;
          color: #fff;
        }
        
        .debate-control-center h1 {
          color: #ff6b35;
          margin-bottom: 30px;
        }
        
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: #1a1a1a;
          color: #fff;
        }
        
        .tabs {
          display: flex;
          margin-bottom: 30px;
          border-bottom: 2px solid #333;
        }
        
        .tabs button {
          padding: 12px 24px;
          border: none;
          background: none;
          color: #aaa;
          cursor: pointer;
          border-bottom: 3px solid transparent;
          font-weight: bold;
          transition: all 0.3s;
        }
        
        .tabs button:hover {
          color: #ff6b35;
        }
        
        .tabs button.active {
          border-bottom-color: #ff6b35;
          color: #ff6b35;
        }
        
        .status-card {
          display: flex;
          align-items: center;
          gap: 20px;
          background: rgba(255, 255, 255, 0.05);
          padding: 20px;
          border-radius: 10px;
          margin-bottom: 30px;
        }
        
        .status-indicator {
          font-size: 1.5rem;
          font-weight: bold;
          padding: 10px 20px;
          border-radius: 50px;
        }
        
        .status-indicator.live {
          background: #dc3545;
          color: white;
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.7; }
          100% { opacity: 1; }
        }
        
        .status-indicator.offline {
          background: #6c757d;
          color: white;
        }
        
        .status-info p {
          margin: 5px 0;
          color: #ddd;
        }
        
        .live-controls {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
        }
        
        .control-group h4 {
          margin-bottom: 15px;
          color: #ff6b35;
        }
        
        .control-btn {
          display: block;
          width: 100%;
          padding: 12px;
          margin-bottom: 10px;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          cursor: pointer;
          font-weight: bold;
          transition: all 0.3s;
        }
        
        .control-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
        }
        
        .control-btn.prev { background: #ffc107; color: #000; }
        .control-btn.next { background: #28a745; color: white; }
        .control-btn.pause { background: #17a2b8; color: white; }
        .control-btn.extend { background: #fd7e14; color: white; }
        .control-btn.end { background: #dc3545; color: white; }
        
        .connection-status-info {
          margin-top: 20px;
          padding: 10px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 5px;
        }
        
        .connection-badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-weight: bold;
        }
        
        .connection-badge.connected { background: #28a745; color: white; }
        .connection-badge.connecting { background: #ffc107; color: #000; }
        .connection-badge.disconnected { background: #dc3545; color: white; }
        
        .sessions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 20px;
        }
        
        .session-card {
          border: 1px solid #333;
          border-radius: 10px;
          padding: 20px;
          background: rgba(255, 255, 255, 0.05);
        }
        
        .session-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }
        
        .session-header h4 {
          color: #ff6b35;
          margin: 0;
        }
        
        .status-badge {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: bold;
        }
        
        .status-badge.draft { background: #6c757d; color: white; }
        .status-badge.live { background: #dc3545; color: white; }
        .status-badge.completed { background: #28a745; color: white; }
        
        .session-details p {
          margin: 5px 0;
          color: #ddd;
        }
        
        .questions-preview {
          margin: 15px 0;
          padding: 15px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 5px;
        }
        
        .questions-preview h5 {
          color: #ff6b35;
          margin: 0 0 10px 0;
        }
        
        .questions-preview ol {
          margin: 10px 0 0 20px;
          color: #ddd;
        }
        
        .go-live-btn {
          background: #dc3545;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 5px;
          font-weight: bold;
          cursor: pointer;
          font-size: 16px;
          transition: all 0.3s;
        }
        
        .go-live-btn:hover {
          background: #c82333;
          transform: translateY(-2px);
        }
        
        .create-forms {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
        }
        
        .session-form, .question-form {
          background: rgba(255, 255, 255, 0.05);
          padding: 25px;
          border-radius: 10px;
        }
        
        .session-form h4, .question-form h4 {
          color: #ff6b35;
          margin: 0 0 20px 0;
        }
        
        .session-form input, .session-form textarea, .session-form select,
        .question-form input, .question-form textarea, .question-form select {
          width: 100%;
          padding: 10px;
          margin-bottom: 15px;
          border: 1px solid #333;
          border-radius: 5px;
          background: rgba(255, 255, 255, 0.1);
          color: white;
          box-sizing: border-box;
        }
        
        .session-form input::placeholder,
        .session-form textarea::placeholder,
        .question-form input::placeholder,
        .question-form textarea::placeholder {
          color: #888;
        }
        
        .question-settings {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 10px;
        }
        
        .session-form button, .question-form button {
          background: #ff6b35;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 5px;
          font-weight: bold;
          cursor: pointer;
          width: 100%;
          transition: all 0.3s;
        }
        
        .session-form button:hover:not(:disabled),
        .question-form button:hover:not(:disabled) {
          background: #e55a2b;
          transform: translateY(-2px);
        }
        
        .session-form button:disabled,
        .question-form button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}