import React from 'react';
import styles from './DashboardPanel.module.css';

const METERS = [
  { key: 'formality', label: 'Formality' },
  { key: 'warmth', label: 'Warmth' },
  { key: 'brevity', label: 'Brevity' },
  { key: 'assertiveness', label: 'Assertiveness' },
];

const PLATFORM_DETAILS = {
  email: { label: 'Email', icon: 'ti-mail', color: '#7F77DD', gradient: 'linear-gradient(90deg, #5c52c7, #9f97f7)' },
  whatsapp: { label: 'WhatsApp', icon: 'ti-brand-whatsapp', color: '#1D9E75', gradient: 'linear-gradient(90deg, #128c7e, #25d366)' },
  slack: { label: 'Slack', icon: 'ti-brand-slack', color: '#E2a82b', gradient: 'linear-gradient(90deg, #de4b83, #f5bc51)' },
  x: { label: 'X / Twitter', icon: 'ti-brand-x', color: '#eceae4', gradient: 'linear-gradient(90deg, #44444c, #ffffff)' },
  linkedin: { label: 'LinkedIn', icon: 'ti-brand-linkedin', color: '#0077b5', gradient: 'linear-gradient(90deg, #005a9c, #00a0dc)' },
};

function formatTime(mins) {
  if (mins < 60) return `${mins} mins`;
  const hrs = (mins / 60).toFixed(1);
  return `${hrs} hours`;
}

export default function DashboardPanel({ drafts, voiceProfile }) {
  const handleCardMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
  };

  // 1. Calculate stats
  const totalDrafts = drafts.length;
  const timeSavedMins = totalDrafts * 3; // Assume 3 mins saved per draft
  const voiceTraitsCount = voiceProfile?.tags?.length || 0;
  const samplesTrained = voiceProfile?.sampleCount || 0;

  // 2. Calculate platform distribution
  const platformCounts = { email: 0, whatsapp: 0, slack: 0, x: 0, linkedin: 0 };
  drafts.forEach(d => {
    if (platformCounts[d.platform] !== undefined) {
      platformCounts[d.platform]++;
    }
  });

  const platformData = Object.keys(PLATFORM_DETAILS).map(key => {
    const count = platformCounts[key];
    const percentage = totalDrafts > 0 ? Math.round((count / totalDrafts) * 100) : 0;
    return {
      key,
      count,
      percentage,
      ...PLATFORM_DETAILS[key],
    };
  }).sort((a, b) => b.count - a.count); // Show most popular platforms first

  return (
    <div className={styles.layout}>
      {/* Cards Row */}
      <div className={styles.gridRow}>
        {[
          { num: totalDrafts, label: 'Drafts generated', desc: 'Total replies written by Ghost', icon: 'ti-sparkles' },
          { num: formatTime(timeSavedMins), label: 'Typing time saved', desc: 'Based on 3 min/draft estimate', icon: 'ti-alarm' },
          { num: samplesTrained, label: 'Voice samples trained', desc: 'Writing samples analyzed', icon: 'ti-microphone' },
          { num: voiceTraitsCount, label: 'Active voice traits', desc: 'Keywords in your fingerprint', icon: 'ti-wand' },
        ].map(s => (
          <div key={s.label} className={styles.statCard} onMouseMove={handleCardMouseMove}>
            <div className={styles.statHeader}>
              <i className={`ti ${s.icon}`} aria-hidden="true"></i>
              <span className={styles.statDesc}>{s.desc}</span>
            </div>
            <div className={styles.statNum}>{s.num}</div>
            <div className={styles.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className={styles.doubleCol}>
        {/* Platform distribution */}
        <div className={styles.card} onMouseMove={handleCardMouseMove}>
          <h3 className={styles.cardTitle}>Platform usage</h3>
          <p className={styles.cardDesc}>Distribution of drafts generated across channels</p>
          <div className={styles.platformList}>
            {totalDrafts === 0 ? (
              <div className={styles.emptyUsage}>No drafts generated yet. Start writing replies to see stats!</div>
            ) : (
              platformData.map(p => (
                <div key={p.key} className={styles.platformRow}>
                  <div className={styles.platformHeader}>
                    <i className={`ti ${p.icon}`} style={{color: p.color}} aria-hidden="true"></i>
                    <span className={styles.platformName}>{p.label}</span>
                    <span className={styles.platformCount}>{p.count} draft{p.count !== 1 ? 's' : ''} ({p.percentage}%)</span>
                  </div>
                  <div className={styles.track}>
                    <div 
                      className={styles.fill} 
                      style={{ 
                        width: `${p.percentage}%`, 
                        background: p.gradient || p.color,
                        boxShadow: `0 0 10px ${p.color}50`
                      }}
                    ></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Voice Fingerprint metrics */}
        <div className={styles.card} onMouseMove={handleCardMouseMove}>
          <h3 className={styles.cardTitle}>Voice profile parameters</h3>
          <p className={styles.cardDesc}>Current metrics active in your AI writing model</p>
          <div className={styles.meters}>
            {METERS.map(m => {
              const val = voiceProfile?.[m.key] || 50;
              return (
                <div key={m.key} className={styles.meterRow}>
                  <div className={styles.meterLabel}>{m.label}</div>
                  <div className={styles.meterTrack}>
                    <div className={styles.meterFill} style={{width: `${val}%`}}></div>
                  </div>
                  <div className={styles.meterVal}>{val}%</div>
                </div>
              );
            })}
          </div>
          <div className={styles.tagsContainer}>
            <div className={styles.tagsLabel}>Trained traits:</div>
            <div className={styles.tags}>
              {voiceProfile?.tags?.map(t => (
                <span key={t} className={styles.tag}>{t}</span>
              )) || <span className={styles.emptyTags}>No traits analyzed.</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
