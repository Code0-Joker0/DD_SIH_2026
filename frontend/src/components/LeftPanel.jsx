import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/useTheme';

const SpacetimeAnimation = () => {
  const [phase, setPhase] = useState('idle');

  useEffect(() => {
    let timers = [];

    const runSequence = () => {
      setPhase('idle');
      
      // Phase 1: Blackhole starts falling
      timers.push(setTimeout(() => setPhase('falling'), 1000));
      
      // Phase 2: Grid warps as mass approaches
      timers.push(setTimeout(() => setPhase('warping'), 2400));
      
      // Phase 3: Mass crosses event horizon
      timers.push(setTimeout(() => setPhase('crossing'), 3400));
      
      // Phase 4: Golden splash explodes
      timers.push(setTimeout(() => setPhase('exploding'), 4100));
      
      // Phase 5: Logo is revealed and expands to full block size
      timers.push(setTimeout(() => setPhase('revealed'), 4400));
    };

    runSequence();
    
    // Loop the entire sequence every 12 seconds
    const loopInterval = setInterval(runSequence, 12000);

    return () => {
      timers.forEach(clearTimeout);
      clearInterval(loopInterval);
    };
  }, []);

  return (
    <div className="spacetime-container">
      {/* 3D Spacetime Grid */}
      <div className={`spacetime-grid ${(phase === 'warping' || phase === 'crossing' || phase === 'exploding') ? 'warping' : ''} ${phase === 'revealed' ? 'revealed' : ''}`}>
        <div className="grid-circle" style={{ width: '80px', height: '80px' }}></div>
        <div className="grid-circle" style={{ width: '160px', height: '160px' }}></div>
        <div className="grid-circle" style={{ width: '240px', height: '240px' }}></div>
        <div className="grid-circle" style={{ width: '320px', height: '320px' }}></div>
        <div className="grid-circle" style={{ width: '400px', height: '400px' }}></div>
      </div>

      {/* Descending Blackhole Mass */}
      <div className={`blackhole-mass 
        ${(phase === 'falling' || phase === 'warping') ? 'falling' : ''} 
        ${(phase === 'crossing' || phase === 'exploding' || phase === 'revealed') ? 'crossing' : ''}`}
      ></div>

      {/* The Event Horizon Splash */}
      <div className={`golden-splash ${(phase === 'exploding' || phase === 'revealed') ? 'exploding' : ''}`}></div>

      {/* Generated Logo - Expands to Authentication Block Length */}
      <div className={`generated-logo ${phase === 'revealed' ? 'revealed' : ''}`}>
        <img
          src="/assets/singularity_logo.png"
          alt="Singularity Logo"
          className="singularity-generated-img"
        />
      </div>
    </div>
  );
};

export default function LeftPanel() {
  const { effectiveTheme } = useTheme();

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

        <div className="illustration-card" style={{ background: 'transparent', boxShadow: 'none', border: 'none', padding: 0 }}>
          <SpacetimeAnimation />
        </div>
      </div>

      <footer className="left-footer">
        <span className="compliance-text">
          Confidential Environment • End-to-End Encrypted
        </span>
      </footer>
    </section>
  );
}
