import React from 'react';
import { useTheme } from '../context/useTheme';

export default function LeftPanel() {
  const { effectiveTheme } = useTheme();

  const diagramSrc = effectiveTheme === 'light' 
    ? '/assets/diagram_light.jpg' 
    : '/assets/diagram.png';

  return (
    <section className="left-panel">
      <div className="left-content">
        <div className="badge-tag">
          <span className="dot-indicator"></span>
          SECURE & CONFIDENTIAL
        </div>

        <h1 className="main-heading">
          Singularity AI Workbench
        </h1>

        <div className="illustration-card">
          <img 
            src={diagramSrc} 
            alt="Singularity AI Workbench Architecture Diagram" 
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
