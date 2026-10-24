"use client";

import { useState } from "react";
import { Sliders, RotateCcw, AlertTriangle, Check, Info, Shield, X, EyeOff } from "lucide-react";
import { RecommendationControlTopic } from "@/data/insights-demo-data";

interface ManageRecommendationsSectionProps {
  initialTopics: RecommendationControlTopic[];
}

export function ManageRecommendationsSection({ initialTopics }: ManageRecommendationsSectionProps) {
  const [topics, setTopics] = useState<RecommendationControlTopic[]>(initialTopics);
  const [activeInterests, setActiveInterests] = useState<Record<string, boolean>>({
    tech: true,
    music: true,
    education: true,
    gaming: false,
    nature: true,
  });

  const [showResetModal, setShowResetModal] = useState(false);
  const [demoNotice, setDemoNotice] = useState<string | null>(null);

  const toggleInterest = (id: string, name: string) => {
    setActiveInterests((prev) => {
      const next = !prev[id];
      showToast(`Demo Preview: "${name}" ${next ? "enabled" : "disabled"} in local UI preview. (Not saved to database)`);
      return { ...prev, [id]: next };
    });
  };

  const setTopicLevel = (topicId: string, level: "normal" | "reduced" | "hidden", name: string) => {
    setTopics((prev) =>
      prev.map((t) => (t.id === topicId ? { ...t, currentLevel: level } : t))
    );
    showToast(`Demo Preview: "${name}" set to ${level.toUpperCase()}. (Illustrative only)`);
  };

  const handleConfirmReset = () => {
    // Reset to defaults
    setTopics(initialTopics);
    setActiveInterests({
      tech: true,
      music: true,
      education: true,
      gaming: true,
      nature: true,
    });
    setShowResetModal(false);
    showToast("Demo Preview: Recommendation profile reset simulated. No database records were affected.");
  };

  const showToast = (message: string) => {
    setDemoNotice(message);
    setTimeout(() => {
      setDemoNotice(null);
    }, 4500);
  };

  return (
    <div className="insights-card manage-section">
      <div className="section-header">
        <div>
          <div className="title-row">
            <Sliders size={20} className="icon-sliders" />
            <h2 className="section-title">Manage Recommendations</h2>
            <span className="demo-chip">Presentational Controls</span>
          </div>
          <p className="section-subtitle">
            Fine-tune recommendation algorithms by managing topic weights, reducing unwanted subjects, or resetting profile embeddings.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowResetModal(true)}
          className="btn btn-outline btn-sm reset-profile-btn"
          title="Reset your simulated recommendation profile"
        >
          <RotateCcw size={14} />
          <span>Reset Profile</span>
        </button>
      </div>

      {/* Floating Demo Notice Banner */}
      {demoNotice && (
        <div className="floating-toast">
          <Info size={16} className="toast-icon" />
          <span className="toast-text">{demoNotice}</span>
          <button
            type="button"
            onClick={() => setDemoNotice(null)}
            className="toast-close"
            aria-label="Dismiss notice"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Control Area 1: Interest Toggles */}
      <div className="control-block">
        <h3 className="block-title">1. Content Affinity Toggles</h3>
        <p className="block-desc">
          Toggle interest preferences on or off to simulate how the discovery feed refines topic distribution:
        </p>

        <div className="interest-toggles-row">
          {[
            { id: "tech", label: "Technology & Coding" },
            { id: "music", label: "Music & Live Sessions" },
            { id: "education", label: "Science & Education" },
            { id: "gaming", label: "Gaming Highlights" },
            { id: "nature", label: "Nature & Documentaries" },
          ].map((item) => {
            const isActive = Boolean(activeInterests[item.id]);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleInterest(item.id, item.label)}
                className={`interest-toggle-pill ${isActive ? "active" : "inactive"}`}
              >
                {isActive ? <Check size={14} /> : <X size={14} />}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Control Area 2: Reduce Unwanted Topics */}
      <div className="control-block">
        <h3 className="block-title">2. Reduce or Hide Unwanted Topics</h3>
        <p className="block-desc">
          Specify topics you prefer to see less frequently or hide completely from home recommendations:
        </p>

        <div className="topics-control-list">
          {topics.map((topic) => (
            <div key={topic.id} className="topic-control-item">
              <div className="topic-info">
                <span className="topic-name">{topic.name}</span>
                <span className="topic-desc">{topic.description}</span>
              </div>

              <div className="level-buttons-group">
                <button
                  type="button"
                  onClick={() => setTopicLevel(topic.id, "normal", topic.name)}
                  className={`level-btn ${topic.currentLevel === "normal" ? "active-normal" : ""}`}
                >
                  Normal
                </button>
                <button
                  type="button"
                  onClick={() => setTopicLevel(topic.id, "reduced", topic.name)}
                  className={`level-btn ${topic.currentLevel === "reduced" ? "active-reduced" : ""}`}
                >
                  Show Less
                </button>
                <button
                  type="button"
                  onClick={() => setTopicLevel(topic.id, "hidden", topic.name)}
                  className={`level-btn ${topic.currentLevel === "hidden" ? "active-hidden" : ""}`}
                >
                  Hide
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Honest Backend Disclaimer */}
      <div className="backend-disclaimer-strip">
        <Shield size={16} className="shield-icon" />
        <div className="disclaimer-text-group">
          <strong>Backend Integration Milestone:</strong>
          <span>
            These recommendation controls are presentational demo controls. Changes update the local interactive preview only. When the future backend recommendation profile sync is connected, preferences will securely persist to your authenticated database record.
          </span>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div className="modal-backdrop" onClick={() => setShowResetModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-icon-wrap">
                <RotateCcw size={20} />
              </div>
              <h3 className="modal-title">Reset Recommendation Profile?</h3>
            </div>

            <p className="modal-body">
              In production, resetting your profile recalibrates ranking vectors back to neutral baselines while retaining your 30-day raw activity logs. This demo action will restore preview sliders to default states without modifying any server records.
            </p>

            <div className="modal-actions">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="btn btn-outline btn-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="btn btn-primary btn-sm"
              >
                Confirm Demo Reset
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .insights-card {
          background-color: var(--bg-surface);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: 1.5rem;
          margin-bottom: 2rem;
          box-shadow: var(--shadow-sm);
        }

        .section-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .title-row {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          margin-bottom: 0.35rem;
        }

        .icon-sliders {
          color: var(--primary);
        }

        .section-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-main);
          margin: 0;
        }

        .demo-chip {
          display: inline-block;
          font-size: 0.6875rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 0.15rem 0.5rem;
          border-radius: var(--radius-full);
          background: rgba(56, 189, 248, 0.12);
          color: var(--primary);
          border: 1px solid rgba(56, 189, 248, 0.3);
        }

        .section-subtitle {
          font-size: 0.875rem;
          color: var(--text-muted);
          margin: 0;
          max-width: 620px;
        }

        .reset-profile-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.8125rem;
        }

        /* Floating Toast */
        .floating-toast {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          background-color: rgba(56, 189, 248, 0.15);
          border: 1px solid var(--primary);
          border-radius: var(--radius-md);
          margin-bottom: 1.5rem;
          animation: slideDown 0.2s ease-out;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .toast-icon {
          color: var(--primary);
          flex-shrink: 0;
        }

        .toast-text {
          font-size: 0.8125rem;
          color: var(--text-main);
          font-weight: 500;
          flex: 1;
        }

        .toast-close {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 0.2rem;
          display: flex;
          align-items: center;
        }

        .toast-close:hover {
          color: var(--text-main);
        }

        /* Control Blocks */
        .control-block {
          background-color: var(--bg-surface-elevated);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 1.25rem;
          margin-bottom: 1.25rem;
        }

        .block-title {
          font-size: 0.9375rem;
          font-weight: 600;
          color: var(--text-main);
          margin: 0 0 0.25rem;
        }

        .block-desc {
          font-size: 0.8125rem;
          color: var(--text-muted);
          margin: 0 0 1rem;
        }

        /* Interest Toggles */
        .interest-toggles-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.625rem;
        }

        .interest-toggle-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.4rem 0.875rem;
          border-radius: var(--radius-full);
          font-size: 0.8125rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 1px solid var(--border-color);
        }

        .interest-toggle-pill.active {
          background-color: rgba(56, 189, 248, 0.15);
          border-color: var(--primary);
          color: var(--primary);
          font-weight: 600;
        }

        .interest-toggle-pill.inactive {
          background-color: var(--bg-base);
          color: var(--text-dim);
          border-style: dashed;
        }

        .interest-toggle-pill:hover {
          filter: brightness(1.1);
        }

        /* Topics List */
        .topics-control-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .topic-control-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 0.75rem;
          padding: 0.75rem;
          background-color: var(--bg-base);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
        }

        .topic-info {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
          max-width: 480px;
        }

        .topic-name {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-main);
        }

        .topic-desc {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .level-buttons-group {
          display: inline-flex;
          background-color: var(--bg-surface-elevated);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          padding: 2px;
        }

        .level-btn {
          background: transparent;
          border: none;
          padding: 0.3rem 0.625rem;
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--text-muted);
          border-radius: 4px;
          cursor: pointer;
          transition: var(--transition);
        }

        .level-btn:hover {
          color: var(--text-main);
        }

        .level-btn.active-normal {
          background-color: var(--bg-base);
          color: var(--primary);
          font-weight: 600;
        }

        .level-btn.active-reduced {
          background-color: rgba(245, 158, 11, 0.2);
          color: #f59e0b;
          font-weight: 600;
        }

        .level-btn.active-hidden {
          background-color: rgba(244, 63, 94, 0.2);
          color: #f43f5e;
          font-weight: 600;
        }

        /* Disclaimer Strip */
        .backend-disclaimer-strip {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 0.875rem 1rem;
          background-color: rgba(16, 185, 129, 0.08);
          border: 1px solid rgba(16, 185, 129, 0.25);
          border-radius: var(--radius-md);
          font-size: 0.75rem;
          color: var(--text-muted);
          line-height: 1.5;
        }

        .shield-icon {
          color: #10b981;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .disclaimer-text-group {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }

        .disclaimer-text-group strong {
          color: #10b981;
        }

        /* Modal */
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background-color: rgba(0, 0, 0, 0.65);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.25rem;
          z-index: 100;
          backdrop-filter: blur(4px);
        }

        .modal-dialog {
          background-color: var(--bg-surface);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: 1.5rem;
          max-width: 460px;
          width: 100%;
          box-shadow: var(--shadow-lg);
        }

        .modal-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
        }

        .modal-icon-wrap {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background-color: rgba(56, 189, 248, 0.15);
          color: var(--primary);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .modal-title {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--text-main);
          margin: 0;
        }

        .modal-body {
          font-size: 0.875rem;
          color: var(--text-muted);
          line-height: 1.5;
          margin: 0 0 1.25rem;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
        }
      `}</style>
    </div>
  );
}
