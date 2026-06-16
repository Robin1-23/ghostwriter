import React, { useState } from 'react';
import { useVoiceProfile } from '../hooks/useFirestore';
import { analyzeVoice } from '../lib/api';
import styles from './VoicePanel.module.css';

const METERS = [
  { key: 'formality', label: 'Formality' },
  { key: 'warmth', label: 'Warmth' },
  { key: 'brevity', label: 'Brevity' },
  { key: 'assertiveness', label: 'Assertiveness' },
];

function VoiceRadar({ profile }) {
  const f = profile.formality !== undefined ? profile.formality : 50;
  const w = profile.warmth !== undefined ? profile.warmth : 50;
  const b = profile.brevity !== undefined ? profile.brevity : 50;
  const a = profile.assertiveness !== undefined ? profile.assertiveness : 50;

  // Calculate polygon points based on 0-100 values
  const p0 = { x: 50, y: 50 - 0.4 * f };
  const p1 = { x: 50 + 0.4 * w, y: 50 };
  const p2 = { x: 50, y: 50 + 0.4 * b };
  const p3 = { x: 50 - 0.4 * a, y: 50 };

  const pointsString = `${p0.x},${p0.y} ${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`;

  return (
    <div className={styles.radarWrapper}>
      <svg viewBox="0 0 100 100" className={styles.radarSvg}>
        {/* Grid lines (Cross axes) */}
        <line x1="50" y1="10" x2="50" y2="90" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="0.5" />
        <line x1="10" y1="50" x2="90" y2="50" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="0.5" />
        
        {/* Background concentric squares or webs */}
        <polygon points="50,10 90,50 50,90 10,50" fill="none" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="0.5" />
        <polygon points="50,20 80,50 50,80 20,50" fill="none" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="0.5" />
        <polygon points="50,30 70,50 50,70 30,50" fill="none" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="0.5" />
        <polygon points="50,40 60,50 50,60 40,50" fill="none" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="0.5" />

        {/* Dynamic active polygon representing values */}
        <polygon 
          points={pointsString} 
          fill="rgba(127, 119, 221, 0.2)" 
          stroke="var(--purple-light)" 
          strokeWidth="1.2"
          style={{ transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />

        {/* Concentric points */}
        <circle cx={p0.x} cy={p0.y} r="2.2" fill="var(--purple-light)" style={{ transition: 'all 0.6s' }} />
        <circle cx={p1.x} cy={p1.y} r="2.2" fill="var(--purple-light)" style={{ transition: 'all 0.6s' }} />
        <circle cx={p2.x} cy={p2.y} r="2.2" fill="var(--purple-light)" style={{ transition: 'all 0.6s' }} />
        <circle cx={p3.x} cy={p3.y} r="2.2" fill="var(--purple-light)" style={{ transition: 'all 0.6s' }} />

        {/* Labels */}
        <text x="50" y="7" textAnchor="middle" fontSize="4.5" fill="rgba(255,255,255,0.4)" fontWeight="600" fontFamily="Inter, sans-serif">FORMALITY</text>
        <text x="93" y="51.5" textAnchor="start" fontSize="4.5" fill="rgba(255,255,255,0.4)" fontWeight="600" fontFamily="Inter, sans-serif">WARMTH</text>
        <text x="50" y="97.5" textAnchor="middle" fontSize="4.5" fill="rgba(255,255,255,0.4)" fontWeight="600" fontFamily="Inter, sans-serif">BREVITY</text>
        <text x="7" y="51.5" textAnchor="end" fontSize="4.5" fill="rgba(255,255,255,0.4)" fontWeight="600" fontFamily="Inter, sans-serif">ASSERTIVENESS</text>
      </svg>
    </div>
  );
}

const TRAIN_PLATFORMS = [
  { id: 'global', label: 'Global', icon: 'ti-world' },
  { id: 'email', label: 'Email', icon: 'ti-mail' },
  { id: 'whatsapp', label: 'WhatsApp', icon: 'ti-brand-whatsapp' },
  { id: 'slack', label: 'Slack', icon: 'ti-brand-slack' },
  { id: 'x', label: 'X / Twitter', icon: 'ti-brand-x' },
  { id: 'linkedin', label: 'LinkedIn', icon: 'ti-brand-linkedin' },
];

export default function VoicePanel({ userSettings, uid }) {
  const [activePlatform, setActivePlatform] = useState('global');
  const [samples, setSamples] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Fetch the profile for the selected platform independently
  const { profile, saveProfile, loading: profileLoading } = useVoiceProfile(uid, activePlatform);

  const handlePlatformChange = (platformId) => {
    if (platformId !== 'global' && !userSettings?.platformSpecificVoices) {
      alert("Platform-specific voices are disabled. Please enable 'Platform-specific voices' in the Settings panel first.");
      return;
    }
    setActivePlatform(platformId);
  };

  const handleAnalyze = async () => {
    if (!samples.trim() || loading) return;
    setLoading(true);
    setError('');
    setSuccess(false);
    try {
      const result = await analyzeVoice(samples, userSettings);
      await saveProfile({
        ...result,
        sampleCount: (profile.sampleCount || 0) + 1,
      });
      setSamples('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      console.error(e);
      setError('Analysis failed. Try again.');
    }
    setLoading(false);
  };

  if (profileLoading) {
    return (
      <div className={styles.loading}>
        <i className="ti ti-loader-2" style={{animation: 'spin 1s linear infinite', fontSize: 24, color: 'var(--purple)'}}></i>
        <span>Loading voice model...</span>
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      {/* Platform Selector Tabs */}
      <div className={styles.tabsRow}>
        {TRAIN_PLATFORMS.map(p => {
          const isDisabled = p.id !== 'global' && !userSettings?.platformSpecificVoices;
          return (
            <button
              key={p.id}
              className={`${styles.tabBtn} ${activePlatform === p.id ? styles.tabBtnActive : ''} ${isDisabled ? styles.tabBtnDisabled : ''}`}
              onClick={() => handlePlatformChange(p.id)}
            >
              <i className={`ti ${p.icon}`} aria-hidden="true"></i>
              <span>{p.label}</span>
              {isDisabled && <i className="ti ti-lock" style={{marginLeft: 4, fontSize: 10, opacity: 0.6}}></i>}
            </button>
          );
        })}
      </div>

      {/* Stats row */}
      <div className={styles.statsRow}>
        {[
          { num: profile.sampleCount || 0, label: 'Samples trained' },
          { num: Math.round(((profile.formality || 50) + (profile.warmth || 50) + (profile.brevity || 50) + (profile.assertiveness || 50)) / 4) + '%', label: 'Avg score' },
          { num: profile.tags?.length || 0, label: 'Voice traits' },
        ].map(s => (
          <div key={s.label} className={styles.statCard}>
            <div className={styles.statNum}>{s.num}</div>
            <div className={styles.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Fingerprint */}
      <div className={styles.fingerprint}>
        <div className={styles.fpHeader}>
          <i className="ti ti-wand" style={{color:'#AFA9EC', fontSize:16}} aria-hidden="true"></i>
          <span className={styles.fpTitle}>
            {activePlatform === 'global' ? 'Global' : TRAIN_PLATFORMS.find(p => p.id === activePlatform)?.label} Voice fingerprint
          </span>
        </div>
        <div className={styles.tags}>
          {(profile.tags && profile.tags.length > 0) ? (
            profile.tags.map(t => (
              <span key={t} className={styles.tag}>{t}</span>
            ))
          ) : (
            <span className={styles.emptyTags}>No traits analyzed yet. Add writing samples below to extract traits.</span>
          )}
        </div>
        <div className={styles.fpBody}>
          <div className={styles.meters}>
            {METERS.map(m => (
              <div key={m.key} className={styles.meterRow}>
                <div className={styles.meterLabel}>{m.label}</div>
                <div className={styles.meterTrack}>
                  <div className={styles.meterFill} style={{width: `${profile[m.key] || 0}%`}}></div>
                </div>
                <div className={styles.meterVal}>{profile[m.key] || 0}%</div>
              </div>
            ))}
          </div>
          <VoiceRadar profile={profile} />
        </div>
      </div>

      {/* Sample input */}
      <div className={styles.sampleCard}>
        <div className={styles.sampleHeader}>
          <i className="ti ti-file-text" style={{color:'rgba(255,255,255,0.35)', fontSize:15}} aria-hidden="true"></i>
          <div>
            <div className={styles.sampleTitle}>Add writing samples ({activePlatform === 'global' ? 'Global' : TRAIN_PLATFORMS.find(p => p.id === activePlatform)?.label})</div>
            <div className={styles.sampleSub}>Paste sent messages, emails, or replies. Claude will analyze vocabulary, tone, and traits.</div>
          </div>
        </div>
        <textarea
          className={styles.sampleTextarea}
          placeholder="Paste 5–10 messages you've sent before. Ghost will learn your tone, vocabulary, and style."
          value={samples}
          onChange={e => setSamples(e.target.value)}
          rows={7}
        />
        <div className={styles.sampleFooter}>
          {error && <span className={styles.errorMsg}><i className="ti ti-alert-circle"></i> {error}</span>}
          {success && <span className={styles.successMsg}><i className="ti ti-check"></i> Voice updated</span>}
          <button
            className={styles.analyzeBtn}
            onClick={handleAnalyze}
            disabled={!samples.trim() || loading}
          >
            {loading
              ? <><i className="ti ti-loader-2" style={{animation:'spin 1s linear infinite'}}></i> Analyzing…</>
              : <><i className="ti ti-brain"></i> Analyze & update voice</>
            }
          </button>
        </div>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
