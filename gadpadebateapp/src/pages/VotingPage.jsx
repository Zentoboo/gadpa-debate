import React, { useState, useEffect } from 'react';

export default function VotingPage() {
  const [candidates, setCandidates] = useState([]);
  const [voters, setVoters] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [voterForm, setVoterForm] = useState({ name: '', studentId: '', email: '' });
  const [selectedVoterId, setSelectedVoterId] = useState('');
  const [step, setStep] = useState('register'); // register, vote, confirm
  const [voteSubmitted, setVoteSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);

  const API_BASE = 'http://localhost:5076';

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/candidates`);
      if (response.ok) {
        const data = await response.json();
        setCandidates(data.filter(c => c.isApproved));
      }
    } catch (error) {
      console.error('Error fetching candidates:', error);
    } finally {
      setLoading(false);
    }
  };

  const registerVoter = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE}/api/voters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(voterForm),
      });

      if (response.ok) {
        const newVoter = await response.json();
        setSelectedVoterId(newVoter.id);
        setStep('vote');
      } else {
        const error = await response.json();
        alert(`Registration failed: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error registering voter:', error);
      alert('Registration failed. Please try again.');
    }
  };

  const submitVote = async () => {
    if (!selectedCandidate || !selectedVoterId) {
      alert('Please select a candidate and ensure you are registered.');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voterId: parseInt(selectedVoterId),
          candidateId: selectedCandidate.id,
        }),
      });

      if (response.ok) {
        setVoteSubmitted(true);
        setStep('confirm');
      } else {
        const error = await response.json();
        alert(`Voting failed: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error submitting vote:', error);
      alert('Voting failed. Please try again.');
    }
  };

  const RegisterStep = () => (
    <div className="register-section">
      <h2>Voter Registration - Kongres PPI XMUM 2025/2026</h2>
      <p>Please register to participate in the presidential election.</p>
      
      <form onSubmit={registerVoter} className="voter-form">
        <div className="form-group">
          <label htmlFor="name">Full Name:</label>
          <input
            type="text"
            id="name"
            value={voterForm.name}
            onChange={(e) => setVoterForm({ ...voterForm, name: e.target.value })}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="studentId">Student ID:</label>
          <input
            type="text"
            id="studentId"
            value={voterForm.studentId}
            onChange={(e) => setVoterForm({ ...voterForm, studentId: e.target.value })}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            value={voterForm.email}
            onChange={(e) => setVoterForm({ ...voterForm, email: e.target.value })}
            required
          />
        </div>
        
        <button type="submit" className="register-btn">Register to Vote</button>
      </form>
    </div>
  );

  const VotingStep = () => (
    <div className="voting-section">
      <h2>Cast Your Vote - Presidential Election</h2>
      <p>Select your preferred presidential candidate:</p>
      
      <div className="candidates-grid">
        {candidates.map(candidate => (
          <div
            key={candidate.id}
            className={`candidate-card ${selectedCandidate?.id === candidate.id ? 'selected' : ''}`}
            onClick={() => setSelectedCandidate(candidate)}
          >
            <div className="candidate-number">
              #{candidate.ticketNumber.toString().padStart(2, '0')}
            </div>
            <h3>{candidate.name}</h3>
            <div className="candidate-position">{candidate.position}</div>
            {candidate.visionMission && (
              <div className="vision-mission">
                <strong>Vision & Mission:</strong>
                <p>{candidate.visionMission}</p>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {selectedCandidate && (
        <div className="vote-confirmation">
          <h3>Confirm Your Choice</h3>
          <p>You have selected: <strong>#{selectedCandidate.ticketNumber.toString().padStart(2, '0')} - {selectedCandidate.name}</strong></p>
          <button onClick={submitVote} className="vote-btn">
            Submit Vote
          </button>
          <button onClick={() => setSelectedCandidate(null)} className="cancel-btn">
            Change Selection
          </button>
        </div>
      )}
    </div>
  );

  const ConfirmationStep = () => (
    <div className="confirmation-section">
      <h2>🎉 Vote Successfully Submitted!</h2>
      <div className="success-message">
        <p>Thank you for participating in the Kongres PPI XMUM 2025/2026 presidential election.</p>
        <p>Your vote has been recorded and will be counted in the final results.</p>
        
        {selectedCandidate && (
          <div className="vote-summary">
            <h3>Vote Summary:</h3>
            <p>You voted for: <strong>#{selectedCandidate.ticketNumber.toString().padStart(2, '0')} - {selectedCandidate.name}</strong></p>
            <p>Submitted at: <strong>{new Date().toLocaleString()}</strong></p>
          </div>
        )}
        
        <div className="next-steps">
          <h4>What's Next:</h4>
          <ul>
            <li>The voting period will close as scheduled</li>
            <li>Vote counting will be conducted transparently by BPU</li>
            <li>Results will be announced officially</li>
            <li>Thank you for making your voice heard!</li>
          </ul>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return <div className="loading">Loading candidates...</div>;
  }

  return (
    <div className="voting-page">
      <div className="voting-container">
        <div className="progress-bar">
          <div className={`step ${step === 'register' ? 'active' : step !== 'register' ? 'completed' : ''}`}>
            1. Register
          </div>
          <div className={`step ${step === 'vote' ? 'active' : step === 'confirm' ? 'completed' : ''}`}>
            2. Vote
          </div>
          <div className={`step ${step === 'confirm' ? 'active' : ''}`}>
            3. Confirm
          </div>
        </div>

        {step === 'register' && <RegisterStep />}
        {step === 'vote' && <VotingStep />}
        {step === 'confirm' && <ConfirmationStep />}
      </div>

      <style jsx>{`
        .voting-page {
          min-height: 100vh;
          background: #1a1a1a;
          padding: 20px;
          color: white;
        }
        
        .voting-container {
          max-width: 800px;
          margin: 0 auto;
          background: #1e1e1e;
          border: 4px solid #000;
          border-radius: 20px;
          padding: 30px;
          box-shadow: 6px 6px 0px #000;
        }
        
        .progress-bar {
          display: flex;
          justify-content: space-between;
          margin-bottom: 30px;
          position: relative;
        }
        
        .progress-bar::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 0;
          right: 0;
          height: 2px;
          background: #333;
          z-index: 1;
        }
        
        .step {
          background: #1e1e1e;
          padding: 10px 20px;
          border: 2px solid #333;
          border-radius: 20px;
          position: relative;
          z-index: 2;
          font-weight: bold;
          color: white;
        }
        
        .step.active {
          border-color: #ff3030;
          color: #ff3030;
          background: #2a1a1a;
        }
        
        .step.completed {
          border-color: #dc3545;
          color: #dc3545;
          background: #2a1a1a;
        }
        
        .voter-form {
          max-width: 400px;
          margin: 0 auto;
        }
        
        .form-group {
          margin-bottom: 20px;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: bold;
        }
        
        .form-group input {
          width: 100%;
          padding: 10px;
          border: 2px solid #333;
          border-radius: 10px;
          font-size: 16px;
          background: #2a2a2a;
          color: white;
          box-sizing: border-box;
        }
        
        .form-group input:focus {
          border-color: #ff3030;
          outline: none;
          background: #333;
        }
        
        .register-btn, .vote-btn {
          background: #ff3030;
          color: white;
          padding: 12px 30px;
          border: 3px solid #000;
          border-radius: 15px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          width: 100%;
          margin-bottom: 10px;
          box-shadow: 4px 4px 0px #000;
          transition: transform 0.1s ease, box-shadow 0.1s ease;
        }
        
        .register-btn:hover, .vote-btn:hover {
          background: #ff5050;
          transform: translateY(-2px);
          box-shadow: 6px 6px 0px #000;
        }
        
        .register-btn:active, .vote-btn:active {
          transform: translateY(0px);
          box-shadow: 2px 2px 0px #000;
        }
        
        .cancel-btn {
          background: #6c757d;
          color: white;
          padding: 10px 30px;
          border: 3px solid #000;
          border-radius: 15px;
          cursor: pointer;
          width: 100%;
          font-weight: bold;
          box-shadow: 4px 4px 0px #000;
          transition: transform 0.1s ease, box-shadow 0.1s ease;
        }
        
        .cancel-btn:hover {
          background: #828a91;
          transform: translateY(-2px);
          box-shadow: 6px 6px 0px #000;
        }
        
        .candidates-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }
        
        .candidate-card {
          border: 3px solid #333;
          border-radius: 15px;
          padding: 20px;
          cursor: pointer;
          transition: all 0.3s ease;
          background: #2a2a2a;
          box-shadow: 4px 4px 0px #000;
        }
        
        .candidate-card:hover {
          border-color: #ff3030;
          transform: translateY(-4px);
          box-shadow: 6px 6px 0px #000;
        }
        
        .candidate-card.selected {
          border-color: #ff3030;
          background: #3a1a1a;
          box-shadow: 0 0 20px rgba(255, 48, 48, 0.3);
        }
        
        .candidate-number {
          background: #ff3030;
          color: white;
          width: 50px;
          height: 50px;
          border: 3px solid #000;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          margin-bottom: 10px;
          font-size: 1.2rem;
        }
        
        .candidate-position {
          color: #ccc;
          margin-bottom: 10px;
        }
        
        .vision-mission {
          margin-top: 15px;
        }
        
        .vision-mission p {
          color: #aaa;
          font-size: 14px;
          margin-top: 5px;
        }
        
        .vote-confirmation {
          background: #2a2a2a;
          padding: 20px;
          border: 3px solid #ff3030;
          border-radius: 15px;
          text-align: center;
          box-shadow: 4px 4px 0px #000;
        }
        
        .success-message {
          text-align: center;
          padding: 20px;
        }
        
        .vote-summary {
          background: #2a2a2a;
          border: 2px solid #dc3545;
          padding: 20px;
          border-radius: 15px;
          margin: 20px 0;
        }
        
        .next-steps {
          text-align: left;
          margin-top: 30px;
        }
        
        .next-steps ul {
          padding-left: 20px;
        }
        
        .next-steps li {
          margin-bottom: 10px;
        }
        
        .loading {
          text-align: center;
          padding: 50px;
          font-size: 18px;
        }
      `}</style>
    </div>
  );
}