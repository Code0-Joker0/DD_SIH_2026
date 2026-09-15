import React from 'react';

export default function LeftPanel() {
  return (
    <section className="left-panel">
      <div className="left-content">
        <div className="badge-tag">
          <span className="dot-indicator"></span>
          AIR-GAPPED APPLIANCE
        </div>

        <h1 className="main-heading">
          Confidential AI runtime for air-gapped critical infrastructure.
        </h1>

        <p className="main-subtitle">
          Orchestrate autonomous agents, proprietary engineering blueprints, and SCADA telemetry strictly within internal physical boundaries.
        </p>

        <div className="illustration-card">
          <img 
            src="/assets/diagram.png" 
            alt="Sovereign AI Workbench Architecture Diagram" 
            className="diagram-image"
          />
        </div>
      </div>

      <footer className="left-footer">
        <span className="compliance-text">
          SOC 2 Type II &middot; ISO 27001 &middot; FIPS 140-3 Compliant
        </span>
        <span className="environment-text">
          Isolated Environment
        </span>
      </footer>
    </section>
  );
}
