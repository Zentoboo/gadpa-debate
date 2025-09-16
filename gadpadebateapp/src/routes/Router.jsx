import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import TransitionComponent from "../components/Transition.jsx";

import Home from "../pages/Home.jsx";
import About from "../pages/About.jsx";
import AdminLogin from "../pages/AdminLogin.jsx";
import AdminDashboard from "../pages/AdminDashboard.jsx";
import AdminRegister from "../pages/AdminRegister.jsx";
import DebateManagerLogin from "../pages/DebateManagerLogin.jsx";
import DebateManagerRegister from "../pages/DebateManagerRegister.jsx";
import DebateManagerDashboard from "../pages/DebateManagerDashboard.jsx";
import NotFound from "../pages/NotFound.jsx";
import LiveDebatePage from "../pages/LiveDebatePage.jsx";
import LiveDebateCandidatesVotingPage from "../pages/LiveDebateCandidatesVotingPage.jsx";
import DebatePage from "../pages/DebatePage.jsx";
import UserQuestionsPage from "../pages/UserQuestionsPage.jsx";

export default function Router({
    adminRegisterEnabled,
    debateManagerRegisterEnabled,
}) {
    return (
        <TransitionComponent>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/about" element={<About />} />
                <Route path="/debate/:debateId" element={<DebatePage />} />

                {/* Admin */}
                <Route path="/admin/login" element={<AdminLogin />} />
                {adminRegisterEnabled && (
                    <Route path="/admin/register" element={<AdminRegister />} />
                )}
                <Route path="/admin/dashboard" element={<AdminDashboard />} />

                {/* Debate Manager */}
                <Route path="/debate-manager/login" element={<DebateManagerLogin />} />
                {debateManagerRegisterEnabled && (
                    <Route path="/debate-manager/register" element={<DebateManagerRegister />} />
                )}
                <Route path="/debate-manager/dashboard" element={<DebateManagerDashboard />} />
                <Route
                    path="/debate-manager/debates/:id/user-questions"
                    element={<UserQuestionsPage />}
                />
                <Route
                    path="/debate-manager/user-questions"
                    element={<Navigate to="/debate-manager/dashboard" replace />}
                />
                <Route path="/debate-manager/debate" element={<LiveDebatePage />} />
                <Route path="/debate-manager/vote" element={<LiveDebateCandidatesVotingPage />} />

                {/* Other */}
                <Route path="*" element={<NotFound />} />
            </Routes>
        </TransitionComponent>
    );
}