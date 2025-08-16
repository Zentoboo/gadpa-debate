import React, { useState, useEffect } from 'react';
import useAuth from '../hooks/useAuth';

export default function BpuDashboard() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('tasks');
  const [bpuMembers, setBpuMembers] = useState([]);
  const [bpuTasks, setBpuTasks] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [voters, setVoters] = useState([]);
  const [shiftRecords, setShiftRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const API_BASE = 'http://localhost:5076';

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const [membersRes, tasksRes, candidatesRes, votersRes, shiftsRes] = await Promise.all([
        fetch(`${API_BASE}/api/bpu/members`, { headers }),
        fetch(`${API_BASE}/api/bpu/tasks`, { headers }),
        fetch(`${API_BASE}/api/candidates`),
        fetch(`${API_BASE}/api/voters`, { headers }),
        fetch(`${API_BASE}/api/shift-records`, { headers })
      ]);

      if (membersRes.ok) setBpuMembers(await membersRes.json());
      if (tasksRes.ok) setBpuTasks(await tasksRes.json());
      if (candidatesRes.ok) setCandidates(await candidatesRes.json());
      if (votersRes.ok) setVoters(await votersRes.json());
      if (shiftsRes.ok) setShiftRecords(await shiftsRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateTaskStatus = async (taskId, status) => {
    try {
      const response = await fetch(`${API_BASE}/api/bpu/tasks/${taskId}/status?status=${status}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        fetchData(); // Refresh data
      }
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const TasksTab = () => (
    <div>
      <h3>BPU Tasks Management</h3>
      <div className="stats">
        <div>Total Tasks: {bpuTasks.length}</div>
        <div>Pending: {bpuTasks.filter(t => t.status === 'Pending').length}</div>
        <div>In Progress: {bpuTasks.filter(t => t.status === 'InProgress').length}</div>
        <div>Completed: {bpuTasks.filter(t => t.status === 'Completed').length}</div>
      </div>
      
      <div className="tasks-grid">
        {bpuTasks.map(task => (
          <div key={task.id} className="task-card">
            <h4>{task.title}</h4>
            <p>{task.description}</p>
            <div>Category: {task.category}</div>
            <div>Priority: {task.priority}</div>
            <div>Status: {task.status}</div>
            {task.assignedToBpuMember && (
              <div>Assigned to: {task.assignedToBpuMember.name}</div>
            )}
            <div className="task-actions">
              <button onClick={() => updateTaskStatus(task.id, 'InProgress')}>
                Start
              </button>
              <button onClick={() => updateTaskStatus(task.id, 'Completed')}>
                Complete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const MembersTab = () => (
    <div>
      <h3>BPU Members</h3>
      <div className="members-grid">
        {bpuMembers.map(member => (
          <div key={member.id} className="member-card">
            <h4>{member.name}</h4>
            <div>Position: {member.position}</div>
            <div>Email: {member.email}</div>
            <div>Oath Date: {new Date(member.oathDate).toLocaleDateString()}</div>
            <div>Status: {member.isActive ? 'Active' : 'Inactive'}</div>
          </div>
        ))}
      </div>
    </div>
  );

  const CandidatesTab = () => (
    <div>
      <h3>Presidential Candidates</h3>
      <div className="candidates-grid">
        {candidates.map(candidate => (
          <div key={candidate.id} className="candidate-card">
            <h4>#{candidate.ticketNumber.toString().padStart(2, '0')} - {candidate.name}</h4>
            <div>Student ID: {candidate.studentId}</div>
            <div>Position: {candidate.position}</div>
            <div>Registration: {new Date(candidate.registrationDate).toLocaleDateString()}</div>
            <div>Status: {candidate.isApproved ? 'Approved' : 'Pending'}</div>
            {candidate.visionMission && (
              <div>Vision & Mission: {candidate.visionMission.substring(0, 100)}...</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const VotersTab = () => (
    <div>
      <h3>Registered Voters</h3>
      <div className="stats">
        <div>Total Registered: {voters.length}</div>
        <div>Voted: {voters.filter(v => v.hasVoted).length}</div>
        <div>Not Voted: {voters.filter(v => !v.hasVoted).length}</div>
      </div>
      
      <div className="voters-table">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Student ID</th>
              <th>Registration Date</th>
              <th>Status</th>
              <th>Voted At</th>
            </tr>
          </thead>
          <tbody>
            {voters.map(voter => (
              <tr key={voter.id}>
                <td>{voter.name}</td>
                <td>{voter.studentId}</td>
                <td>{new Date(voter.registrationDate).toLocaleDateString()}</td>
                <td>{voter.hasVoted ? '✅ Voted' : '⏳ Not Voted'}</td>
                <td>{voter.votedAt ? new Date(voter.votedAt).toLocaleString() : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const ShiftsTab = () => (
    <div>
      <h3>BPU Shift Records</h3>
      <div className="shifts-table">
        <table>
          <thead>
            <tr>
              <th>BPU Member</th>
              <th>Activity</th>
              <th>Start Time</th>
              <th>End Time</th>
              <th>Duration</th>
              <th>Status</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {shiftRecords.map(shift => (
              <tr key={shift.id}>
                <td>{shift.bpuMember.name}</td>
                <td>{shift.activity}</td>
                <td>{new Date(shift.startTime).toLocaleString()}</td>
                <td>{shift.endTime ? new Date(shift.endTime).toLocaleString() : 'Ongoing'}</td>
                <td>
                  {shift.endTime 
                    ? Math.round((new Date(shift.endTime) - new Date(shift.startTime)) / (1000 * 60)) + ' min'
                    : 'Ongoing'}
                </td>
                <td>{shift.isActive ? '🟢 Active' : '🔴 Completed'}</td>
                <td>{shift.notes || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (!token) {
    return <div>Please login to access BPU Dashboard</div>;
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="bpu-dashboard">
      <div className="dashboard-header">
        <h1 className="dashboard-title">
          📊 BPU Management Dashboard
        </h1>
        <div className="subtitle">Kongres PPI XMUM 2025/2026</div>
      </div>
      
      <div className="tabs">
        <button 
          className={`tab-button ${activeTab === 'tasks' ? 'active' : ''}`}
          onClick={() => setActiveTab('tasks')}
        >
          📋 Tasks ({bpuTasks.length})
        </button>
        <button 
          className={`tab-button ${activeTab === 'members' ? 'active' : ''}`}
          onClick={() => setActiveTab('members')}
        >
          👥 Members ({bpuMembers.length})
        </button>
        <button 
          className={`tab-button ${activeTab === 'candidates' ? 'active' : ''}`}
          onClick={() => setActiveTab('candidates')}
        >
          🗳️ Candidates ({candidates.length})
        </button>
        <button 
          className={`tab-button ${activeTab === 'voters' ? 'active' : ''}`}
          onClick={() => setActiveTab('voters')}
        >
          👤 Voters ({voters.length})
        </button>
        <button 
          className={`tab-button ${activeTab === 'shifts' ? 'active' : ''}`}
          onClick={() => setActiveTab('shifts')}
        >
          ⏰ Shifts ({shiftRecords.length})
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'tasks' && <TasksTab />}
        {activeTab === 'members' && <MembersTab />}
        {activeTab === 'candidates' && <CandidatesTab />}
        {activeTab === 'voters' && <VotersTab />}
        {activeTab === 'shifts' && <ShiftsTab />}
      </div>

      <style jsx>{`
        .bpu-dashboard {
          min-height: 100vh;
          background: #1a1a1a;
          padding: 2rem;
          color: white;
        }

        .dashboard-header {
          text-align: center;
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 3px solid #333;
        }

        .dashboard-title {
          font-size: 2.5rem;
          margin: 0;
          color: #ff3030;
          text-shadow: 2px 2px 0px #000;
        }

        .subtitle {
          font-size: 1.2rem;
          color: #ccc;
          margin-top: 0.5rem;
        }

        .tabs {
          display: flex;
          justify-content: center;
          gap: 1rem;
          margin-bottom: 2rem;
          flex-wrap: wrap;
        }

        .tab-button {
          padding: 12px 24px;
          background: #2a2a2a;
          color: white;
          border: 3px solid #333;
          border-radius: 15px;
          cursor: pointer;
          font-weight: bold;
          font-size: 16px;
          box-shadow: 4px 4px 0px #000;
          transition: transform 0.1s ease, box-shadow 0.1s ease, background-color 0.3s ease;
        }

        .tab-button:hover {
          background: #3a3a3a;
          transform: translateY(-2px);
          box-shadow: 6px 6px 0px #000;
        }

        .tab-button.active {
          background: #ff3030;
          border-color: #000;
          color: white;
        }

        .tab-button.active:hover {
          background: #ff5050;
        }

        .tab-content {
          background: #1e1e1e;
          border: 4px solid #000;
          border-radius: 20px;
          padding: 2rem;
          box-shadow: 6px 6px 0px #000;
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .stats div {
          padding: 1rem;
          background: #2a2a2a;
          border: 3px solid #333;
          border-radius: 15px;
          font-weight: bold;
          text-align: center;
          color: #ff3030;
          box-shadow: 4px 4px 0px #000;
        }

        .tasks-grid, .members-grid, .candidates-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
        }

        .task-card, .member-card, .candidate-card {
          background: #2a2a2a;
          border: 3px solid #333;
          border-radius: 15px;
          padding: 1.5rem;
          box-shadow: 4px 4px 0px #000;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .task-card:hover, .member-card:hover, .candidate-card:hover {
          transform: translateY(-4px);
          box-shadow: 6px 6px 0px #000;
        }

        .task-card h4, .member-card h4, .candidate-card h4 {
          color: #ff3030;
          margin-top: 0;
          text-shadow: 1px 1px 0px #000;
        }

        .task-actions {
          margin-top: 1rem;
          display: flex;
          gap: 0.5rem;
        }

        .task-actions button {
          padding: 8px 16px;
          border: 2px solid #000;
          border-radius: 8px;
          cursor: pointer;
          font-weight: bold;
          font-size: 14px;
          box-shadow: 2px 2px 0px #000;
          transition: transform 0.1s ease;
        }

        .task-actions button:hover {
          transform: translateY(-1px);
          box-shadow: 3px 3px 0px #000;
        }

        .task-actions button:first-child {
          background: #28a745;
          color: white;
        }

        .task-actions button:last-child {
          background: #ff3030;
          color: white;
        }

        .voters-table, .shifts-table {
          background: #2a2a2a;
          border: 3px solid #333;
          border-radius: 15px;
          overflow: hidden;
          box-shadow: 4px 4px 0px #000;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th, td {
          padding: 12px;
          text-align: left;
          border-bottom: 2px solid #333;
        }

        th {
          background: #333;
          color: #ff3030;
          font-weight: bold;
          text-shadow: 1px 1px 0px #000;
        }

        td {
          color: white;
        }

        tr:hover td {
          background: rgba(255, 48, 48, 0.1);
        }

        @media (max-width: 768px) {
          .tabs {
            flex-direction: column;
            align-items: center;
          }
          
          .tab-button {
            width: 200px;
          }
          
          .tasks-grid, .members-grid, .candidates-grid {
            grid-template-columns: 1fr;
          }
          
          .stats {
            grid-template-columns: repeat(2, 1fr);
          }
          
          table {
            font-size: 14px;
          }
          
          th, td {
            padding: 8px;
          }
        }
      `}</style>
    </div>
  );
}