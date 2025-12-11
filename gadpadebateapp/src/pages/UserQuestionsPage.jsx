import API_URL from "../config";
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { useAuth } from "../contexts/AuthContext";
import "../css/Dashboard.css";

export default function UserQuestionsPage() {
    const { token, isAuthenticated, isDebateManager, loading } = useAuth();
    const { id } = useParams();
    const navigate = useNavigate();
    const [questions, setQuestions] = useState([]);
    const [error, setError] = useState(null);
    const [notification, setNotification] = useState(null);

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
        if (loading) return;
        if (!isAuthenticated || !isDebateManager) {
            navigate("/debate-manager/login");
        } else {
            fetchQuestions();
        }
    }, [loading, isAuthenticated, isDebateManager, id, navigate]);

    const fetchQuestions = () => {
        setError(null);
        authFetch(`${API_URL}/debate-manager/debates/${id}/user-questions`)
            .then(res => {
                if (!res.ok) throw new Error("Failed to fetch questions");
                return res.json();
            })
            .then(setQuestions)
            .catch(err => setError(err.message));
    };

    const approveQuestion = (qid, approve) => {
        authFetch(
            `${API_URL}/debate-manager/debates/${id}/user-questions/${qid}/approve?approve=${approve}`,
            { method: "POST" }
        ).then(() => fetchQuestions());
    };

    const addToRounds = (qid) => {
        authFetch(
            `${API_URL}/debate-manager/debates/${id}/user-questions/${qid}/add-to-rounds`,
            { method: "POST" }
        )
            .then(res => {
                if (!res.ok) throw new Error("Failed to add to rounds");
                return res.json();
            })
            .then(data => {
                setNotification(data.message || "Question added to rounds!");
                fetchQuestions();
                setTimeout(() => setNotification(null), 3000);
            })
            .catch(err => {
                setNotification(err.message);
                setTimeout(() => setNotification(null), 3000);
            });
    };


    if (loading) return <p>Checking authentication...</p>;
    if (error) return <p style={{ color: "red" }}>Error: {error}</p>;

    return (
        <div className="dashboard-container">
            <h1>User Submitted Questions</h1>
            <button
                onClick={() => navigate("/debate-manager/dashboard")}
                className="table-button secondary"
            >
                ← Back to Dashboard
            </button>

            <table className="dashboard-table" style={{ marginTop: "1rem" }}>
                <thead>
                    <tr>
                        <th className="col-idq">ID</th>
                        <th className="col-questionq">Question</th>
                        <th className="col-submittedat">Submitted At</th>
                        <th className="col-statusq">Status</th>
                        <th className="col-actionsq">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {questions.length === 0 ? (
                        <tr>
                            <td colSpan="6">No user questions submitted yet.</td>
                        </tr>
                    ) : (
                        questions.map((q) => (
                            <tr key={q.id}>
                                <td className="col-idq">{q.id}</td>
                                <td className="col-questionq">{q.question}</td>
                                <td className="col-submittedat">
                                    {new Date(q.submittedAt).toLocaleString("en-MY", {
                                        timeZone: "Asia/Kuala_Lumpur",
                                    })}
                                </td>
                                <td className="col-statusq">{q.isApproved ? "Approved" : "Pending"}</td>
                                <td className="col-actionsq">
                                    <div style={{display:"flex",flexDirection:"column"}}>
                                        {!q.isApproved && (
                                            <button
                                                onClick={() => approveQuestion(q.id, true)}
                                                className="table-button primary"
                                            >
                                                Approve
                                            </button>
                                        )}
                                        {q.isApproved && (
                                            <button
                                                onClick={() => approveQuestion(q.id, false)}
                                                className="table-button secondary"
                                            >
                                                Disapprove
                                            </button>
                                        )}
                                        {q.isApproved && (
                                            <button
                                                onClick={() => addToRounds(q.id)}
                                                className="table-button primary"
                                            >
                                                Add
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>

            {notification &&
                createPortal(
                    <div className="floating-notification">
                        {notification}
                    </div>,
                    document.body
                )
            }
        </div>
    );
}
