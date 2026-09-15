import React, { useState, useEffect } from 'react';
import { Check, Loader2, Circle, ArrowRight } from 'lucide-react';

const STAGES = [
  { key: 'understanding', label: 'Understanding request' },
  { key: 'reading', label: 'Reading documents' },
  { key: 'searching', label: 'Searching knowledge' },
  { key: 'calculating', label: 'Performing calculation' },
  { key: 'generating', label: 'Generating result' },
];

export default function TaskProgressView({ taskData, onComplete, onCancel }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    // Simulate progress through human-readable stages
    const timer = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < STAGES.length - 1) {
          return prev + 1;
        } else {
          clearInterval(timer);
          setTimeout(() => {
            if (onComplete) onComplete();
          }, 800);
          return prev;
        }
      });
    }, 1200);

    return () => clearInterval(timer);
  }, [onComplete]);

  const taskTitle = taskData?.query || 'Analyze Inspection Report & Safety Criteria';
  const isFinished = currentStepIndex === STAGES.length - 1;

  return (
    <div className="task-progress-container">
      <div className="progress-card">
        {/* Header */}
        <div className="progress-header font-sans">
          <div className="progress-badge font-mono">
            <span className="live-pulse-dot"></span>
            <span>{isFinished ? 'Task completed' : 'Task in progress'}</span>
          </div>

          <h2 className="progress-title-text">{taskTitle}</h2>
          <p className="progress-subtitle-text font-mono">
            AI Mode: {taskData?.aiMode || 'Auto'} &middot; Scope: {taskData?.knowledgeScope || 'All authorized sources'}
          </p>
        </div>

        {/* Stepper List */}
        <div className="stages-list">
          {STAGES.map((stage, idx) => {
            const isCompleted = idx < currentStepIndex || isFinished;
            const isCurrent = idx === currentStepIndex && !isFinished;

            return (
              <div key={stage.key} className={`stage-row ${isCompleted ? 'done' : isCurrent ? 'active' : 'pending'}`}>
                <div className="stage-indicator font-mono">
                  {isCompleted ? (
                    <div className="indicator-circle circle-check">
                      <Check size={13} strokeWidth={2.5} />
                    </div>
                  ) : isCurrent ? (
                    <div className="indicator-circle circle-active">
                      <Loader2 size={13} className="animate-spin" />
                    </div>
                  ) : (
                    <div className="indicator-circle circle-pending">
                      <Circle size={10} />
                    </div>
                  )}
                </div>

                <div className="stage-label-text font-sans">
                  {stage.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="progress-actions-row">
          {isFinished ? (
            <button className="primary-action-btn" onClick={onComplete}>
              <span>View Result</span>
              <ArrowRight size={15} />
            </button>
          ) : (
            <button className="secondary-cancel-btn font-mono" onClick={onCancel}>
              <span>Cancel Task</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
