import React from "react";
import Footer from "./Footer";
import Header from "./Header";

export default function Layout({ children, showHeader, onShowHeader, onHideHeader, adminRegisterEnabled, debateManagerRegisterEnabled }) {
    return (
        <div className="app-layout">
            {/* Header (toggleable) */}
            {showHeader && (
                <Header
                    adminRegisterEnabled={adminRegisterEnabled}
                    debateManagerRegisterEnabled={debateManagerRegisterEnabled}
                    onHide={onHideHeader}
                />
            )}

            {!showHeader && (
                <button className="header-restore-btn" onClick={onShowHeader}>
                    Show Header
                </button>
            )}

            {/* Main page content */}
            <main className="app-main">{children}</main>

            {/* Footer */}
            <Footer />
        </div>
    );
}
