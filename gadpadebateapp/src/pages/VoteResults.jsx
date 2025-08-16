import React, { useState, useEffect } from 'react';

const VoteResults = () => {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchResults = async () => {
    try {
      const response = await fetch('http://localhost:5076/api/vote-results');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setResults(data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch results: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
    
    let interval;
    if (autoRefresh) {
      interval = setInterval(fetchResults, 5000); // Refresh every 5 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const formatPercentage = (votes, total) => {
    if (total === 0) return '0.00';
    return ((votes / total) * 100).toFixed(2);
  };

  if (loading) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        backgroundColor: '#1a1a1a',
        color: 'white',
        minHeight: '100vh'
      }}>
        <h1>Loading Election Results...</h1>
        <div style={{
          width: '50px',
          height: '50px',
          border: '3px solid #333',
          borderTop: '3px solid #ff6b35',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '2rem auto'
        }}></div>
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        backgroundColor: '#1a1a1a',
        color: '#ff6b35',
        minHeight: '100vh'
      }}>
        <h1>Error</h1>
        <p>{error}</p>
        <button 
          onClick={fetchResults}
          style={{
            padding: '12px 24px',
            backgroundColor: '#ff6b35',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '16px',
            marginTop: '1rem'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: '#1a1a1a',
      color: 'white',
      minHeight: '100vh',
      padding: '2rem'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '2rem',
          borderBottom: '2px solid #333',
          paddingBottom: '1rem'
        }}>
          <h1 style={{
            fontSize: '2.5rem',
            margin: '0 0 0.5rem 0',
            background: 'linear-gradient(45deg, #ff6b35, #ffa726)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            🗳️ Election Results
          </h1>
          <h2 style={{ margin: '0', color: '#ccc', fontSize: '1.2rem' }}>
            Kongres PPI XMUM 2025/2026 - Presidential Election
          </h2>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '1rem',
            marginTop: '1rem'
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                style={{ accentColor: '#ff6b35' }}
              />
              Auto-refresh
            </label>
            <span style={{ color: '#999', fontSize: '0.9rem' }}>
              Last updated: {new Date(results?.lastUpdated).toLocaleTimeString()}
            </span>
          </div>
        </div>

        {/* Election Summary */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <div style={{
            backgroundColor: '#1e1e1e',
            padding: '1.5rem',
            borderRadius: '20px',
            textAlign: 'center',
            border: '4px solid #000',
            boxShadow: '6px 6px 0px #000',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
          }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#ff3030' }}>Total Votes</h3>
            <p style={{ fontSize: '2rem', margin: '0', fontWeight: 'bold', color: '#ff3030', textShadow: '2px 2px 0px #000' }}>
              {results?.summary?.totalVotes || 0}
            </p>
          </div>
          
          <div style={{
            backgroundColor: '#1e1e1e',
            padding: '1.5rem',
            borderRadius: '20px',
            textAlign: 'center',
            border: '4px solid #000',
            boxShadow: '6px 6px 0px #000',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
          }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#ff3030' }}>Eligible Voters</h3>
            <p style={{ fontSize: '2rem', margin: '0', fontWeight: 'bold', color: '#ff3030', textShadow: '2px 2px 0px #000' }}>
              {results?.summary?.totalEligibleVoters || 0}
            </p>
          </div>
          
          <div style={{
            backgroundColor: '#1e1e1e',
            padding: '1.5rem',
            borderRadius: '20px',
            textAlign: 'center',
            border: '4px solid #000',
            boxShadow: '6px 6px 0px #000',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
          }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#ff3030' }}>Turnout</h3>
            <p style={{ fontSize: '2rem', margin: '0', fontWeight: 'bold', color: '#ff3030', textShadow: '2px 2px 0px #000' }}>
              {results?.summary?.turnoutPercentage || 0}%
            </p>
          </div>
        </div>

        {/* Winner Announcement */}
        {results?.summary?.isWinnerDetermined && (
          <div style={{
            background: 'linear-gradient(135deg, #ff3030, #ff5050)',
            color: 'white',
            padding: '2rem',
            borderRadius: '20px',
            textAlign: 'center',
            marginBottom: '2rem',
            border: '4px solid #000',
            boxShadow: '8px 8px 0px #000'
          }}>
            <h2 style={{ margin: '0 0 1rem 0', fontSize: '2rem' }}>
              🎉 Election Winner Declared!
            </h2>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
              #{results.summary.winner.ticketNumber.toString().padStart(2, '0')} - {results.summary.winner.name}
              <div style={{ fontSize: '1rem', opacity: 0.9, marginTop: '0.25rem' }}>
                Position: {results.summary.winner.position}
              </div>
            </div>
            <div style={{ fontSize: '1.2rem', marginTop: '0.5rem', opacity: 0.9 }}>
              {results.summary.winner.voteCount} votes ({results.summary.winner.percentage}%)
            </div>
          </div>
        )}

        {/* Results Table */}
        <div style={{
          backgroundColor: '#1e1e1e',
          borderRadius: '20px',
          border: '4px solid #000',
          overflow: 'hidden',
          boxShadow: '6px 6px 0px #000'
        }}>
          <div style={{
            backgroundColor: '#2a2a2a',
            padding: '1rem',
            borderBottom: '3px solid #333'
          }}>
            <h3 style={{ margin: '0', color: '#ff3030' }}>Detailed Results</h3>
          </div>
          
          {results?.results && results.results.length > 0 ? (
            <div style={{ padding: '1rem' }}>
              {results.results.map((candidate, index) => (
                <div
                  key={candidate.Id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '1.5rem',
                    marginBottom: '1rem',
                    backgroundColor: index === 0 && results.summary.isWinnerDetermined ? 
                      'rgba(255, 48, 48, 0.1)' : '#2a2a2a',
                    borderRadius: '15px',
                    border: index === 0 && results.summary.isWinnerDetermined ? 
                      '3px solid #ff3030' : '3px solid #333',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: index === 0 && results.summary.isWinnerDetermined ? 
                      '4px 4px 0px #000' : '2px 2px 0px #000'
                  }}
                >
                  {/* Background progress bar */}
                  <div style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    height: '100%',
                    width: `${formatPercentage(candidate.VoteCount, results.summary.totalVotes)}%`,
                    backgroundColor: index === 0 && results.summary.isWinnerDetermined ? 
                      'rgba(255, 48, 48, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                    transition: 'width 0.5s ease',
                    borderRadius: '12px'
                  }}></div>
                  
                  <div style={{ zIndex: 1, position: 'relative' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem'
                    }}>
                      {index === 0 && results.summary.isWinnerDetermined && (
                        <span style={{ fontSize: '1.5rem' }}>👑</span>
                      )}
                      <div>
                        <div style={{
                          fontSize: '1.2rem',
                          fontWeight: 'bold',
                          color: index === 0 && results.summary.isWinnerDetermined ? '#ff3030' : 'white',
                          textShadow: index === 0 && results.summary.isWinnerDetermined ? '1px 1px 0px #000' : 'none'
                        }}>
                          #{candidate.TicketNumber.toString().padStart(2, '0')} - {candidate.Name}
                        </div>
                        {candidate.Position && (
                          <div style={{ color: '#ccc', fontSize: '0.9rem' }}>
                            Position: {candidate.Position}
                          </div>
                        )}
                        {candidate.VisionMission && (
                          <div style={{ color: '#999', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                            {candidate.VisionMission}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{
                    textAlign: 'right',
                    zIndex: 1,
                    position: 'relative'
                  }}>
                    <div style={{
                      fontSize: '1.5rem',
                      fontWeight: 'bold',
                      color: index === 0 && results.summary.isWinnerDetermined ? '#ff3030' : 'white',
                      textShadow: index === 0 && results.summary.isWinnerDetermined ? '1px 1px 0px #000' : 'none'
                    }}>
                      {candidate.VoteCount}
                    </div>
                    <div style={{ color: '#ccc' }}>
                      {formatPercentage(candidate.VoteCount, results.summary.totalVotes)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              padding: '2rem',
              textAlign: 'center',
              color: '#999'
            }}>
              No votes recorded yet.
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          marginTop: '2rem',
          padding: '1rem',
          color: '#666',
          fontSize: '0.9rem'
        }}>
          <p>Election managed by BPU (Badan Penyelenggara Undang) - Kongres PPI XMUM 2025/2026</p>
          <p>Real-time results powered by GADPA Debate Platform</p>
        </div>
      </div>
    </div>
  );
};

export default VoteResults;