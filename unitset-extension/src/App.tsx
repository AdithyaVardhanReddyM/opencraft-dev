/// <reference types="chrome" />
import { useState } from "react";
import "./App.css";

type PopupStatus = "idle" | "selecting" | "success" | "error";

function App() {
  const [status, setStatus] = useState<PopupStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const handleSelectClick = async () => {
    setError(null);

    try {
      // Get the active tab
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab?.id) {
        setError("No active tab found");
        setStatus("error");
        return;
      }

      // Check if we can inject into this page
      if (
        tab.url?.startsWith("chrome://") ||
        tab.url?.startsWith("chrome-extension://") ||
        tab.url?.startsWith("about:")
      ) {
        setError("Cannot select elements on this page");
        setStatus("error");
        return;
      }

      // Inject the content script
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content-script.js"],
      });

      // Small delay to ensure content script is ready
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Send activation message
      await chrome.tabs.sendMessage(tab.id, { type: "ACTIVATE_SELECTION" });

      setStatus("selecting");

      // Close popup to allow interaction with page
      // The content script will auto-copy to clipboard and show a toast
      window.close();
    } catch (err) {
      console.error("Failed to activate selection:", err);
      setError("Failed to start selection. Try refreshing the page.");
      setStatus("error");
    }
  };

  const handleRetry = () => {
    setStatus("idle");
    setError(null);
  };

  return (
    <div className="popup-container">
      {/* Logo */}
      <div className="logo-container">
        <img src="/unitset-logo.png" alt="UnitSet" className="logo" />
        <span className="logo-text">UnitSet</span>
      </div>

      {/* Title */}
      <h1 className="title">Element Selector</h1>
      <p className="subtitle">
        Capture any element from this page for AI replication
      </p>

      {/* Status-based content */}
      {status === "idle" && (
        <>
          <button className="select-button" onClick={handleSelectClick}>
            <svg
              className="button-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
              <path d="M13 13l6 6" />
            </svg>
            Select Element
          </button>
          <p className="hint">
            Click to start, then click any element on the page.
            <br />
            It will be automatically copied to your clipboard.
          </p>
        </>
      )}

      {status === "selecting" && (
        <div className="status-container selecting">
          <div className="pulse-dot" />
          <span>Selection Active</span>
          <p className="status-hint">
            Click any element on the page. Press Escape to cancel.
          </p>
        </div>
      )}

      {status === "success" && (
        <div className="status-container success">
          <svg
            className="status-icon success-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
          <span>Copied!</span>
          <p className="status-hint">
            Paste in UnitSet AI sidebar to replicate
          </p>
        </div>
      )}

      {status === "error" && (
        <div className="status-container error">
          <svg
            className="status-icon error-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <span>Error</span>
          {error && <p className="error-message">{error}</p>}
          <button className="retry-button" onClick={handleRetry}>
            Try Again
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="footer">
        <span>Capture • Paste • Replicate</span>
      </div>
    </div>
  );
}

export default App;
