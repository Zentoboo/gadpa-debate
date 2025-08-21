import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/AuthContext";
import "../css/Dashboard.css";

export default function UserQuestionsPage() {
    const { token, isAuthenticated, isDebateManager } = useAuth();
    const { id } = useParams(); // debateId
    const navigate = useNavigate();
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);

    const authFetch = (url, options = {}) =>
        fetch(url, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
                ...options.headers,
            },
        });

    useEffect(() => {
        if (!isAuthenticated || !isDebateManager) {
            navigate("/debate-manager/login");
        } else {
            fetchQuestions();
        }
    }, [isAuthenticated, isDebateManager, id]);

    const fetchQuestions = () => {
        setLoading(true);
        authFetch(`http://localhost:5076/debate-manager/debates/${id}/user-questions`)
            .then(res => res.json())
            .then(setQuestions)
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    const approveQuestion = (qid, approve) => {
        authFetch(`http://localhost:5076/debate-manager/debates/${id}/user-questions/${qid}/approve?approve=${approve}`, { method: "POST" })
            .then(() => fetchQuestions());
    };

    const addToRounds = (qid) => {
        authFetch(`http://localhost:5076/debate-manager/debates/${id}/user-questions/${qid}/add-to-rounds`, { method: "POST" })
            .then(() => fetchQuestions());
    };

    if (loading) return <p>Loading...</p>;

    return (
        <div className="dashboard-container">
            <h1>User Submitted Questions</h1>
            <button onClick={() => navigate("/debate-manager/dashboard")} className="table-button secondary">
                ← Back to Dashboard
            </button>
            <table className="dashboard-table" style={{ marginTop: "1rem" }}>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Question</th>
                        <th>Submitted At</th>
                        <th>Status</th>
                        <th>Used?</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {questions.length === 0 ? (
                        <tr><td colSpan="6">No user questions submitted yet.</td></tr>
                    ) : (
                        questions.map(q => (
                            <tr key={q.id}>
                                <td>{q.id}</td>
                                <td>{q.question}</td>
                                <td>{new Date(q.submittedAt).toLocaleString()}</td>
                                <td>{q.isApproved ? "Approved" : "Pending"}</td>
                                <td>{q.isAddedToRounds ? "Yes" : "No"}</td>
                                <td>
                                    {!q.isApproved && (
                                        <button onClick={() => approveQuestion(q.id, true)} className="table-button primary">Approve</button>
                                    )}
                                    {q.isApproved && (
                                        <button onClick={() => approveQuestion(q.id, false)} className="table-button secondary">Disapprove</button>
                                    )}
                                    {q.isApproved && !q.isAddedToRounds && (
                                        <button onClick={() => addToRounds(q.id)} className="table-button primary">Add to Rounds</button>
                                    )}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
