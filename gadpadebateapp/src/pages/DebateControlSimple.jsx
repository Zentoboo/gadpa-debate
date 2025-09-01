import React, { useState, useEffect } from 'react';
import useAuth from '../hooks/useAuth';

export default function DebateControlSimple() {
  const { token } = useAuth(true);
  const [debateSessions, setDebateSessions] = useState([]);
  const [liveStatus, setLiveStatus] = useState({ isLive: false, status: 'Offline' });
  const [activeTab, setActiveTab] = useState('control');
  const [loading, setLoading] = useState(true);
  
  // Form states for creating new session
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionDescription, setSessionDescription] = useState('');
  const [sessionType, setSessionType] = useState('Presidential');
  const [sessionDuration, setSessionDuration] = useState(60);
  
  const [questionSessionId, setQuestionSessionId] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [questionOrder, setQuestionOrder] = useState(1);
  const [questionDuration, setQuestionDuration] = useState(3);
  const [questionType, setQuestionType] = useState('General');
  const [questionTarget, setQuestionTarget] = useState('');

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
        body: JSON.stringify({
          title: sessionTitle,
          description: sessionDescription,
          sessionType: sessionType,
          totalDurationMinutes: sessionDuration
        })
      });
      
      if (response.ok) {
        setSessionTitle('');
        setSessionDescription('');
        setSessionType('Presidential');
        setSessionDuration(60);
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
      const response = await fetch(`${API_BASE}/api/debate-sessions/${questionSessionId}/questions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          question: questionText,
          orderIndex: questionOrder,
          durationMinutes: questionDuration,
          questionType: questionType,
          targetCandidate: questionTarget || null
        })
      });
      
      if (response.ok) {
        setQuestionText('');
        setQuestionOrder(questionOrder + 1);
        setQuestionDuration(3);
        setQuestionType('General');
        setQuestionTarget('');
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

  if (loading) return <div style={{ padding: '20px' }}>Loading...</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>🎛️ Debate Control Center - BPU</h1>
      
      <div style={{ display: 'flex', marginBottom: '30px', borderBottom: '2px solid #ddd' }}>
        <button 
          style={{
            padding: '12px 24px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'control' ? '3px solid #007bff' : '3px solid transparent',
            fontWeight: 'bold',
            color: activeTab === 'control' ? '#007bff' : 'inherit'
          }}
          onClick={() => setActiveTab('control')}
        >
          Live Control
        </button>
        <button 
          style={{
            padding: '12px 24px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'sessions' ? '3px solid #007bff' : '3px solid transparent',
            fontWeight: 'bold',
            color: activeTab === 'sessions' ? '#007bff' : 'inherit'
          }}
          onClick={() => setActiveTab('sessions')}
        >
          Sessions ({debateSessions.length})
        </button>
        <button 
          style={{
            padding: '12px 24px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'create' ? '3px solid #007bff' : '3px solid transparent',
            fontWeight: 'bold',
            color: activeTab === 'create' ? '#007bff' : 'inherit'
          }}
          onClick={() => setActiveTab('create')}
        >
          Create New
        </button>
      </div>

      {activeTab === 'control' && (
        <div>
          <h3>🎛️ Live Session Control</h3>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            background: '#f8f9fa',
            padding: '20px',
            borderRadius: '10px',
            marginBottom: '30px'
          }}>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              padding: '10px 20px',
              borderRadius: '50px',
              background: liveStatus.isLive ? '#dc3545' : '#6c757d',
              color: 'white'
            }}>
              {liveStatus.isLive ? '🔴 LIVE' : '⭕ OFFLINE'}
            </div>
            <div>
              <p><strong>Status:</strong> {liveStatus.status}</p>
              {liveStatus.debateSession && <p><strong>Session:</strong> {liveStatus.debateSession}</p>}
              {liveStatus.currentQuestion && <p><strong>Current Question:</strong> {liveStatus.currentQuestion}</p>}
              {liveStatus.timeRemaining !== null && (
                <p><strong>Time Remaining:</strong> {Math.floor(liveStatus.timeRemaining / 60)}:{(liveStatus.timeRemaining % 60).toString().padStart(2, '0')}</p>
              )}
            </div>
          </div>

          {liveStatus.isLive && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
              <div>
                <h4>Question Control</h4>
                <button 
                  onClick={() => controlLiveSession('prev')} 
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '12px',
                    marginBottom: '10px',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    background: '#ffc107',
                    color: '#000'
                  }}
                >
                  ⏮️ Previous Question
                </button>
                <button 
                  onClick={() => controlLiveSession('next')} 
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '12px',
                    marginBottom: '10px',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    background: '#28a745',
                    color: 'white'
                  }}
                >
                  ⏭️ Next Question
                </button>
              </div>
              
              <div>
                <h4>Session Control</h4>
                <button 
                  onClick={() => controlLiveSession(liveStatus.status === 'Paused' ? 'resume' : 'pause')} 
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '12px',
                    marginBottom: '10px',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    background: '#17a2b8',
                    color: 'white'
                  }}
                >
                  {liveStatus.status === 'Paused' ? '▶️ Resume' : '⏸️ Pause'}
                </button>
                <button 
                  onClick={() => controlLiveSession('extend', 60)} 
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '12px',
                    marginBottom: '10px',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    background: '#fd7e14',
                    color: 'white'
                  }}
                >
                  ⏱️ +1 Min
                </button>
                <button 
                  onClick={() => controlLiveSession('end')} 
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '12px',
                    marginBottom: '10px',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    background: '#dc3545',
                    color: 'white'
                  }}
                >
                  🛑 End Session
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'sessions' && (
        <div>
          <h3>📋 Debate Sessions</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
            {debateSessions.map(session => (
              <div key={session.id} style={{
                border: '1px solid #ddd',
                borderRadius: '10px',
                padding: '20px',
                background: 'white'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '15px'
                }}>
                  <h4>{session.title}</h4>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    background: session.status === 'Draft' ? '#e9ecef' : session.status === 'Live' ? '#dc3545' : '#28a745',
                    color: session.status === 'Draft' ? '#495057' : 'white'
                  }}>
                    {session.status}
                  </span>
                </div>
                <p>{session.description}</p>
                <div>
                  <p><strong>Type:</strong> {session.sessionType}</p>
                  <p><strong>Duration:</strong> {session.totalDurationMinutes} minutes</p>
                  <p><strong>Questions:</strong> {session.questions?.length || 0}</p>
                </div>
                
                {session.questions && session.questions.length > 0 && (
                  <div style={{
                    margin: '15px 0',
                    padding: '15px',
                    background: '#f8f9fa',
                    borderRadius: '5px'
                  }}>
                    <h5>Questions:</h5>
                    <ol style={{ margin: '10px 0 0 20px' }}>
                      {session.questions.map(q => (
                        <li key={q.id}>
                          {q.question} ({q.durationMinutes}min - {q.questionType})
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
                
                {session.status === 'Draft' && session.questions && session.questions.length > 0 && (
                  <button 
                    onClick={() => goLive(session.id)} 
                    style={{
                      background: '#dc3545',
                      color: 'white',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '5px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      fontSize: '16px'
                    }}
                  >
                    🔴 GO LIVE
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'create' && (
        <div>
          <h3>➕ Create New Debate Session</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
            <form onSubmit={createDebateSession} style={{
              background: '#f8f9fa',
              padding: '25px',
              borderRadius: '10px'
            }}>
              <h4>New Session</h4>
              <input
                type="text"
                placeholder="Session Title (e.g., Presidential Debate Round 1)"
                value={sessionTitle}
                onChange={(e) => setSessionTitle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  marginBottom: '15px',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  boxSizing: 'border-box'
                }}
                required
              />
              <textarea
                placeholder="Session Description"
                value={sessionDescription}
                onChange={(e) => setSessionDescription(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  marginBottom: '15px',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  boxSizing: 'border-box',
                  minHeight: '80px'
                }}
                required
              />
              <select
                value={sessionType}
                onChange={(e) => setSessionType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  marginBottom: '15px',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  boxSizing: 'border-box'
                }}
              >
                <option value="Presidential">Presidential Debate</option>
                <option value="OpenFloor">Open Floor</option>
                <option value="QnA">Q&A Session</option>
              </select>
              <input
                type="number"
                placeholder="Total Duration (minutes)"
                value={sessionDuration}
                onChange={(e) => setSessionDuration(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  padding: '10px',
                  marginBottom: '15px',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  boxSizing: 'border-box'
                }}
                required
              />
              <button type="submit" style={{
                background: '#007bff',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '5px',
                fontWeight: 'bold',
                cursor: 'pointer',
                width: '100%'
              }}>
                Create Session
              </button>
            </form>

            {debateSessions.length > 0 && (
              <form onSubmit={addQuestion} style={{
                background: '#f8f9fa',
                padding: '25px',
                borderRadius: '10px'
              }}>
                <h4>Add Question to Session</h4>
                <select
                  value={questionSessionId}
                  onChange={(e) => setQuestionSessionId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    marginBottom: '15px',
                    border: '1px solid #ddd',
                    borderRadius: '5px',
                    boxSizing: 'border-box'
                  }}
                  required
                >
                  <option value="">Select Session</option>
                  {debateSessions.filter(s => s.status === 'Draft').map(session => (
                    <option key={session.id} value={session.id}>{session.title}</option>
                  ))}
                </select>
                <textarea
                  placeholder="Question"
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    marginBottom: '15px',
                    border: '1px solid #ddd',
                    borderRadius: '5px',
                    boxSizing: 'border-box',
                    minHeight: '80px'
                  }}
                  required
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '15px' }}>
                  <input
                    type="number"
                    placeholder="Order"
                    value={questionOrder}
                    onChange={(e) => setQuestionOrder(parseInt(e.target.value))}
                    style={{
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '5px',
                      boxSizing: 'border-box'
                    }}
                    min="1"
                    required
                  />
                  <input
                    type="number"
                    placeholder="Duration (min)"
                    value={questionDuration}
                    onChange={(e) => setQuestionDuration(parseInt(e.target.value))}
                    style={{
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '5px',
                      boxSizing: 'border-box'
                    }}
                    min="1"
                    required
                  />
                  <select
                    value={questionType}
                    onChange={(e) => setQuestionType(e.target.value)}
                    style={{
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '5px',
                      boxSizing: 'border-box'
                    }}
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
                  value={questionTarget}
                  onChange={(e) => setQuestionTarget(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    marginBottom: '15px',
                    border: '1px solid #ddd',
                    borderRadius: '5px',
                    boxSizing: 'border-box'
                  }}
                />
                <button type="submit" style={{
                  background: '#007bff',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '5px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  width: '100%'
                }}>
                  Add Question
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}