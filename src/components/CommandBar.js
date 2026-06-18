import React, { useState, useEffect, useRef } from 'react';
import { generateReplies } from '../lib/api';
import styles from './CommandBar.module.css';

const PLATFORM_OPTIONS = [
  { id: 'email', label: 'Email', icon: 'ti-mail' },
  { id: 'whatsapp', label: 'WhatsApp', icon: 'ti-brand-whatsapp' },
  { id: 'slack', label: 'Slack', icon: 'ti-brand-slack' },
  { id: 'x', label: 'X / Twitter', icon: 'ti-brand-x' },
  { id: 'linkedin', label: 'LinkedIn', icon: 'ti-brand-linkedin' },
];

const TONE_OPTIONS = [
  { id: 'auto', label: 'Auto (Voice Profile)' },
  { id: 'professional', label: 'Professional' },
  { id: 'casual', label: 'Casual' },
  { id: 'brief', label: 'Brief' },
];

export default function CommandBar({ settings, voiceProfile }) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [platform, setPlatform] = useState('email');
  const [tone, setTone] = useState('auto');
  const [loading, setLoading] = useState(false);
  
  const [drafts, setDrafts] = useState(null);
  const [activeVariant, setActiveVariant] = useState('a');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const inputRef = useRef(null);
  const overlayRef = useRef(null);

  // Global keyboard listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Toggle on Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      
      // Close on Escape
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus input when CommandBar opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      // Reset inputs & results
      setMessage('');
      setDrafts(null);
      setActiveVariant('a');
      setError('');
    }
  }, [isOpen]);

  const handleGenerate = async (e) => {
    if (e) e.preventDefault();
    if (!message.trim() || loading) return;

    setLoading(true);
    setError('');
    setDrafts(null);
    try {
      const result = await generateReplies({
        mode: 'compose',
        message,
        context: '',
        platform,
        tone,
        voiceTags: voiceProfile?.tags || ['direct', 'warm'],
        settings,
      });

      setDrafts({
        a: result.a?.text || '',
        b: result.b?.text || '',
        c: result.c?.text || '',
        perceptions: {
          a: result.a?.perception || 'Polite & direct',
          b: result.b?.perception || 'Casual',
          c: result.c?.perception || 'Brief',
        }
      });
    } catch (err) {
      console.error(err);
      setError('Drafting failed. Verify your OpenAI credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOverlayClick = (e) => {
    if (overlayRef.current && e.target === overlayRef.current) {
      setIsOpen(false);
    }
  };

  if (!isOpen) {
    // Hidden hint for developer discoverability in DOM
    return <div style={{ display: 'none' }}>Command Bar: Press ⌘K to open</div>;
  }

  const activeDraft = drafts?.[activeVariant] || '';
  const activePerception = drafts?.perceptions?.[activeVariant] || '';

  return (
    <div 
      className={styles.overlay} 
      ref={overlayRef} 
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
    >
      <div className={styles.spotlightContainer}>
        {/* Input Bar */}
        <form onSubmit={handleGenerate} className={styles.spotlightForm}>
          <div className={styles.inputWrapper}>
            <i className="ti ti-sparkles" aria-hidden="true"></i>
            <input
              ref={inputRef}
              type="text"
              className={styles.spotlightInput}
              placeholder="What do you want to write? (e.g. Follow up on Q3 deliverables)"
              value={message}
              onChange={e => setMessage(e.target.value)}
              disabled={loading}
            />
            {loading ? (
              <span className={styles.loaderBadge}>
                <i className="ti ti-loader-2" style={{ animation: 'spin 1s linear infinite' }}></i> Drafting...
              </span>
            ) : (
              <button 
                type="submit" 
                className={styles.submitBtn} 
                disabled={!message.trim()}
              >
                Draft <kbd>↵</kbd>
              </button>
            )}
          </div>

          {/* Config row */}
          <div className={styles.configRow}>
            {/* Platforms */}
            <div className={styles.platformSelector}>
              {PLATFORM_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  className={`${styles.platformChip} ${platform === opt.id ? styles.platformActive : ''}`}
                  onClick={() => setPlatform(opt.id)}
                  title={opt.label}
                  disabled={loading}
                >
                  <i className={`ti ${opt.icon}`}></i>
                </button>
              ))}
            </div>

            {/* Tones dropdown */}
            <div className={styles.selectWrapper}>
              <select
                className={styles.toneSelect}
                value={tone}
                onChange={e => setTone(e.target.value)}
                disabled={loading}
                title="Tone register"
              >
                {TONE_OPTIONS.map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </form>

        {error && (
          <div className={styles.errorRow}>
            <i className="ti ti-alert-circle"></i> {error}
          </div>
        )}

        {/* Results Card */}
        {drafts && (
          <div className={styles.resultsCard}>
            {/* Tabs */}
            <div className={styles.tabsRow}>
              {[
                { id: 'a', label: 'Variant A' },
                { id: 'b', label: 'Variant B' },
                { id: 'c', label: 'Variant C' },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  className={`${styles.tabBtn} ${activeVariant === tab.id ? styles.tabActive : ''}`}
                  onClick={() => setActiveVariant(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
              {activePerception && (
                <span className={styles.perceptionLabel}>
                  <i className="ti ti-messages"></i> {activePerception}
                </span>
              )}
            </div>

            {/* Content text */}
            <div className={styles.editorArea}>
              <textarea
                className={styles.draftTextarea}
                value={activeDraft}
                onChange={e => {
                  const val = e.target.value;
                  setDrafts(prev => ({
                    ...prev,
                    [activeVariant]: val
                  }));
                }}
                rows={5}
              />
            </div>

            {/* Toolbar */}
            <div className={styles.resultsToolbar}>
              <button
                type="button"
                className={styles.copyBtn}
                onClick={() => handleCopy(activeDraft)}
              >
                <i className={`ti ${copied ? 'ti-check' : 'ti-copy'}`} aria-hidden="true"></i>
                {copied ? 'Copied!' : 'Copy to clipboard'}
              </button>
              <span className={styles.escHint}>Press <kbd>ESC</kbd> to close</span>
            </div>
          </div>
        )}
      </div>
      
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
