import React, { useState, useEffect } from 'react';
import styles from './TourGuide.module.css';

const STEPS = [
  {
    title: "✨ Welcome to Ghost!",
    description: "Your new AI writing alter-ego cockpit is ready. Let's take a 30-second tour to understand how it adapts to your personal style.",
    targetId: null,
    placement: "center"
  },
  {
    title: "🎭 Multi-Persona Alter-Egos",
    description: "Switch your active persona on the fly here (e.g. Standard, Executive, Friend). Ghost maintains completely isolated voice profiles and parameters for each alter-ego.",
    targetId: "tour-persona",
    placement: "right"
  },
  {
    title: "📱 Platform Adapters",
    description: "Select which platform you are writing for. Ghost dynamically optimizes formatting, lengths, and layout rules to fit the platform's specific communication vibe.",
    targetId: "tour-platforms",
    placement: "right"
  },
  {
    title: "🎛️ Style Overrides & Radar",
    description: "Adjust manual tone sliders to override your default style. The vector SVG Radar Web morphs dynamically in real-time as you slide.",
    targetId: "tour-overrides",
    placement: "top"
  },
  {
    title: "🎙️ My Voice Fingerprint",
    description: "Train Ghost's AI by pasting examples of your past writing here. Ghost will extract your natural formality, warmth, and brevity rules.",
    targetId: "tour-voice-nav",
    placement: "right"
  }
];

export default function TourGuide({ onComplete }) {
  const [step, setStep] = useState(0);
  const [popoverStyle, setPopoverStyle] = useState({});
  const [visible, setVisible] = useState(false);

  // Check if tour should run
  useEffect(() => {
    const isCompleted = localStorage.getItem('ghost_tour_completed');
    if (!isCompleted) {
      // Start tour after a brief delay so page layout fully stabilizes
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;

    const currentStepConfig = STEPS[step];
    
    // Welcome step - absolute center layout
    if (!currentStepConfig || !currentStepConfig.targetId) {
      setPopoverStyle({
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1000,
      });
      return;
    }

    const targetEl = document.getElementById(currentStepConfig.targetId);
    if (!targetEl) {
      // Fallback to center if element is not rendered
      setPopoverStyle({
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1000,
      });
      return;
    }

    // Scroll view window to target area safely
    targetEl.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });

    // Auto-open overrides panel if it is closed
    if (currentStepConfig.targetId === 'tour-overrides') {
      const toggleBtn = targetEl.querySelector('button');
      const isClosed = !targetEl.querySelector('[class*="slidersWrapper"]');
      if (isClosed && toggleBtn) {
        toggleBtn.click();
      }
    }

    const updatePosition = () => {
      const rect = targetEl.getBoundingClientRect();
      const isMobile = window.innerWidth <= 768;
      
      let top = rect.top + window.scrollY;
      let left = rect.right + 16 + window.scrollX;
      let transform = 'none';

      if (currentStepConfig.placement === 'top') {
        top = rect.top - 12 + window.scrollY;
        left = rect.left + (rect.width / 2) + window.scrollX;
        transform = 'translate(-50%, -100%)';
      } else if (currentStepConfig.placement === 'bottom') {
        top = rect.bottom + 12 + window.scrollY;
        left = rect.left + (rect.width / 2) + window.scrollX;
        transform = 'translateX(-50%)';
      } else if (isMobile || rect.right > window.innerWidth - 300) {
        // Fallback to stack below on small screens or when aligned right
        top = rect.bottom + 12 + window.scrollY;
        left = Math.max(16, Math.min(window.innerWidth - 320, rect.left + window.scrollX));
        transform = 'none';
      }

      setPopoverStyle({
        position: 'absolute',
        top: `${top}px`,
        left: `${left}px`,
        transform,
        zIndex: 1000,
      });
    };

    updatePosition();
    
    // Listen to resize to keep overlays matching layout
    window.addEventListener('resize', updatePosition);

    // Apply glowing spotlight border to target element
    targetEl.classList.add(styles.targetPulse);

    return () => {
      window.removeEventListener('resize', updatePosition);
      targetEl.classList.remove(styles.targetPulse);
    };
  }, [step, visible]);

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(prev => prev + 1);
    } else {
      handleClose();
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(prev => prev - 1);
    }
  };

  const handleClose = () => {
    localStorage.setItem('ghost_tour_completed', 'true');
    setVisible(false);
    onComplete?.();
  };

  if (!visible) return null;

  const current = STEPS[step];

  return (
    <div className={styles.container}>
      {/* Dimmed Backdrop */}
      <div className={styles.backdrop} onClick={handleClose} />

      {/* Popover Bubble */}
      <div className={styles.popover} style={popoverStyle} role="dialog" aria-modal="true">
        {current.targetId && <div className={styles.arrow} data-placement={current.placement} />}
        
        <h4 className={styles.title}>{current.title}</h4>
        <p className={styles.description}>{current.description}</p>
        
        <div className={styles.footer}>
          <div className={styles.stepper}>
            {STEPS.map((_, idx) => (
              <span 
                key={idx} 
                className={`${styles.dot} ${idx === step ? styles.dotActive : ''}`} 
                onClick={() => setStep(idx)}
                aria-label={`Go to step ${idx + 1}`}
              />
            ))}
          </div>

          <div className={styles.buttons}>
            {step > 0 && (
              <button type="button" className={styles.btnBack} onClick={handleBack}>
                Back
              </button>
            )}
            <button type="button" className={styles.btnNext} onClick={handleNext}>
              {step === STEPS.length - 1 ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>

        <button type="button" className={styles.btnSkip} onClick={handleClose}>
          Skip tour
        </button>
      </div>
    </div>
  );
}
