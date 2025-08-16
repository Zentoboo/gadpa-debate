import React, { useState, useEffect } from 'react';
import useAuth from '../hooks/useAuth';

export default function DebateControlCenter() {
  const { token } = useAuth(true);
  const [debateSessions, setDebateSessions] = useState([]);
  const [liveStatus, setLiveStatus] = useState({ isLive: false, status: 'Offline' });
  const [activeTab, setActiveTab] = useState('control');
  const [loading, setLoading] = useState(true);
  
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

  const API_BASE = 'http://localhost:5076';

  useEffect(() => {
    if (token) {
      fetchData();
      // Poll for live status updates
      const interval = setInterval(fetchLiveStatus, 3000);
      return () => clearInterval(interval);
    }
  }, [token]);

  const fetchData = async () => {
    await Promise.all([fetchDebateSessions(), fetchLiveStatus()]);
    setLoading(false);
  };

  const fetchDebateSessions = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/debate-sessions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setDebateSessions(data);
      }
    } catch (error) {
      console.error('Error fetching debate sessions:', error);
    }
  };

  const fetchLiveStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/live-status`);
      if (response.ok) {
        const data = await response.json();
        setLiveStatus(data);
      }
    } catch (error) {
      console.error('Error fetching live status:', error);
    }
  };

  const createDebateSession = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE}/api/debate-sessions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newSession)
      });
      
      if (response.ok) {
        setNewSession({ title: '', description: '', sessionType: 'Presidential', totalDurationMinutes: 60 });
        fetchDebateSessions();
        alert('Debate session created successfully!');
      }
    } catch (error) {
      console.error('Error creating debate session:', error);
    }
  };

  const addQuestion = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE}/api/debate-sessions/${newQuestion.sessionId}/questions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          question: newQuestion.question,
          orderIndex: newQuestion.orderIndex,
          durationMinutes: newQuestion.durationMinutes,
          questionType: newQuestion.questionType,
          targetCandidate: newQuestion.targetCandidate || null
        })
      });
      
      if (response.ok) {
        setNewQuestion({
          sessionId: newQuestion.sessionId,
          question: '',
          orderIndex: newQuestion.orderIndex + 1,
          durationMinutes: 3,
          questionType: 'General',
          targetCandidate: ''
        });
        fetchDebateSessions();
        alert('Question added successfully!');
      }
    } catch (error) {
      console.error('Error adding question:', error);
    }
  };

  const goLive = async (sessionId) => {
    try {
      const response = await fetch(`${API_BASE}/api/debate-sessions/${sessionId}/go-live`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        fetchLiveStatus();
        alert('Debate session is now LIVE!');
      }
    } catch (error) {
      console.error('Error going live:', error);
    }
  };

  const controlLiveSession = async (action, extendSeconds = null) => {
    try {
      const response = await fetch(`${API_BASE}/api/live-control`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action,
          extendTimeSeconds: extendSeconds
        })
      });
      
      if (response.ok) {
        fetchLiveStatus();
      }
    } catch (error) {
      console.error('Error controlling live session:', error);
    }
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
          {liveStatus.debateSession && <p><strong>Session:</strong> {liveStatus.debateSession}</p>}
          {liveStatus.currentQuestion && <p><strong>Current Question:</strong> {liveStatus.currentQuestion}</p>}
          {liveStatus.timeRemaining !== null && (
            <p><strong>Time Remaining:</strong> {Math.floor(liveStatus.timeRemaining / 60)}:{(liveStatus.timeRemaining % 60).toString().padStart(2, '0')}</p>
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
      
      <div className="debate-create-forms">
        <form onSubmit={createDebateSession} className="debate-session-form">
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
          <button type="submit">Create Session</button>
        </form>

        {debateSessions.length > 0 && (
          <form onSubmit={addQuestion} className="debate-question-form">
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
            <div className="debate-question-settings">
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
            <button type="submit">Add Question</button>
          </form>
        )}
      </div>
    </div>
  );

  if (loading) return <div>Loading...</div>;

  return (
    <div className="debate-control-center">
      <h1>🎛️ Debate Control Center - BPU</h1>
      
      <div className="debate-control-tabs">
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
        }
        
        .debate-control-tabs {
          display: flex;
          margin-bottom: 30px;
          border-bottom: 2px solid #ddd;
        }
        
        .debate-control-tabs button {
          padding: 12px 24px;
          border: none;
          background: none;
          cursor: pointer;
          border-bottom: 3px solid transparent;
          font-weight: bold;
        }
        
        .debate-control-tabs button.active {
          border-bottom-color: #007bff;
          color: #007bff;
        }
        
        .debate-status-card {
          display: flex;
          align-items: center;
          gap: 20px;
          background: #f8f9fa;
          padding: 20px;
          border-radius: 10px;
          margin-bottom: 30px;
        }
        
        .debate-status-indicator {
          font-size: 1.5rem;
          font-weight: bold;
          padding: 10px 20px;
          border-radius: 50px;
        }
        
        .debate-status-indicator.live {
          background: #dc3545;
          color: white;
        }
        
        .debate-status-indicator.offline {
          background: #6c757d;
          color: white;
        }
        
        .debate-live-controls {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
        }
        
        .debate-control-group h4 {
          margin-bottom: 15px;
          color: #333;
        }
        
        .debate-control-btn {
          display: block;
          width: 100%;
          padding: 12px;
          margin-bottom: 10px;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          cursor: pointer;
          font-weight: bold;
        }
        
        .debate-control-btn.prev { background: #ffc107; color: #000; }
        .debate-control-btn.next { background: #28a745; color: white; }
        .debate-control-btn.pause { background: #17a2b8; color: white; }
        .debate-control-btn.extend { background: #fd7e14; color: white; }
        .debate-control-btn.end { background: #dc3545; color: white; }
        
        .debate-sessions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 20px;
        }
        
        .debate-session-card {
          border: 1px solid #ddd;
          border-radius: 10px;
          padding: 20px;
          background: white;
        }
        
        .debate-session-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }
        
        .debate-status-badge {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: bold;
        }
        
        .debate-status-badge.draft { background: #e9ecef; color: #495057; }
        .debate-status-badge.live { background: #dc3545; color: white; }
        .debate-status-badge.completed { background: #28a745; color: white; }
        
        .debate-questions-preview {
          margin: 15px 0;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 5px;
        }
        
        .debate-questions-preview ol {
          margin: 10px 0 0 20px;
        }
        
        .debate-go-live-btn {
          background: #dc3545;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 5px;
          font-weight: bold;
          cursor: pointer;
          font-size: 16px;
        }
        
        .debate-create-forms {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
        }
        
        .debate-session-form, .debate-question-form {
          background: #f8f9fa;
          padding: 25px;
          border-radius: 10px;
        }
        
        .debate-session-form input, .debate-session-form textarea, .debate-session-form select,
        .debate-question-form input, .debate-question-form textarea, .debate-question-form select {
          width: 100%;
          padding: 10px;
          margin-bottom: 15px;
          border: 1px solid #ddd;
          border-radius: 5px;
          box-sizing: border-box;
        }
        
        .debate-question-settings {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 10px;
        }
        
        .debate-session-form button, .debate-question-form button {
          background: #007bff;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 5px;
          font-weight: bold;
          cursor: pointer;
          width: 100%;
        }
      `}</style>
    </div>
  );
}