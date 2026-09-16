import React from 'react';

export default function LeftPanel() {
  return (
    <section className="left-panel">
      <div className="left-content">
        <div className="badge-tag">
          <span className="dot-indicator"></span>
          SECURE & CONFIDENTIAL
        </div>

        <h1 className="main-heading">
          Singularity
        </h1>

        <div className="illustration-card">
          <img 
            src="/assets/diagram.png" 
            alt="Singularity Architecture Diagram" 
            className="diagram-image"
          />
        </div>
      </div>

      <footer className="left-footer">
        <span className="compliance-text">
          Confidential Environment
        </span>
      </footer>
    </section>
  );
}
