import React, { useState } from 'react';
import { generateCampaign } from '../lib/api';
import styles from './CampaignPanel.module.css';

export default function CampaignPanel({ voiceProfile, settings }) {
  const [overview, setOverview] = useState('');
  const [points, setPoints] = useState('');
  const [channels, setChannels] = useState({
    email: true,
    slack: true,
    linkedin: true,
    whatsapp: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState(null);
  const [copiedChannel, setCopiedChannel] = useState('');

  const toggleChannel = (ch) => {
    setChannels(prev => ({ ...prev, [ch]: !prev[ch] }));
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!overview.trim()) return;

    const activeChannels = Object.keys(channels).filter(ch => channels[ch]);
    if (activeChannels.length === 0) {
      setError('Please select at least one channel to generate.');
      return;
    }

    setLoading(true);
    setError('');
    setResults(null);

    try {
      const data = await generateCampaign({
        overview: overview.trim(),
        points: points.trim(),
        channels: activeChannels,
        voiceTags: voiceProfile?.tags,
        settings,
      });
      setResults(data);
    } catch (err) {
      console.error(err);
      setError('Failed to generate outreach campaign. Please check settings and retry.');
    }
    setLoading(false);
  };

  const handleCopy = (text, ch) => {
    if (!text) return;
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedChannel(ch);
    setTimeout(() => setCopiedChannel(''), 2000);
  };

  const getChannelIcon = (ch) => {
    return {
      email: 'ti-mail',
      slack: 'ti-brand-slack',
      linkedin: 'ti-brand-linkedin',
      whatsapp: 'ti-brand-whatsapp',
    }[ch] || 'ti-message';
  };

  return (
    <div className={styles.layout}>
      {/* Campaign Configuration Form */}
      <div className={styles.formCol}>
        <div className={styles.sectionLabel}>Campaign Planner</div>
        <form className={styles.card} onSubmit={handleGenerate}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Campaign Overview / Announcement</label>
            <textarea
              className={styles.textarea}
              placeholder="e.g. Announcing the launch of Ghost App v2.0 with Gmail REST OAuth Sync and a multi-persona engine..."
              value={overview}
              onChange={(e) => setOverview(e.target.value)}
              rows={4}
              required
            />
          </div>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Key Value Points (Optional)</label>
            <textarea
              className={styles.textarea}
              placeholder="e.g. - Gmail drafts created natively in the inbox\n- Translucent radar graph\n- Installable PWA"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              rows={3}
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Select Channels</label>
            <div className={styles.checkboxRow}>
              {Object.keys(channels).map((ch) => (
                <button
                  key={ch}
                  type="button"
                  className={`${styles.channelSelectBtn} ${channels[ch] ? styles.channelActive : ''}`}
                  onClick={() => toggleChannel(ch)}
                >
                  <i className={`ti ${getChannelIcon(ch)}`}></i>
                  <span>{ch.charAt(0).toUpperCase() + ch.slice(1)}</span>
                </button>
              ))}
            </div>
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? (
              <><i className="ti ti-loader-2" style={{ animation: 'spin 1s linear infinite' }}></i> Composing...</>
            ) : (
              <><i className="ti ti-speakerphone"></i> Compose Campaign</>
            )}
          </button>
          {error && <div className={styles.error}><i className="ti ti-alert-circle"></i> {error}</div>}
        </form>
      </div>

      {/* Generated Outputs Grid */}
      <div className={styles.resultsCol}>
        <div className={styles.sectionLabel}>Multi-Channel Outputs</div>
        {loading ? (
          <div className={styles.loadingPlaceholder}>
            <span className={styles.thinking}>
              Composing adapted drafts in your voice ({voiceProfile?.tags?.slice(0, 3).join(', ') || 'personal'})
              <span className={styles.dots}>...</span>
            </span>
          </div>
        ) : results ? (
          <div className={styles.grid}>
            {Object.keys(results).map((ch) => {
              const res = results[ch];
              const displayBody = ch === 'email' ? `${res.subject ? `Subject: ${res.subject}\n\n` : ''}${res.body || ''}` : res.body;
              return (
                <div key={ch} className={styles.resultCard}>
                  <div className={styles.resultHeader}>
                    <div className={styles.resultLabel}>
                      <i className={`ti ${getChannelIcon(ch)}`}></i>
                      <span>{ch.toUpperCase()}</span>
                    </div>
                    <button
                      type="button"
                      className={styles.copyBtn}
                      onClick={() => handleCopy(displayBody, ch)}
                    >
                      <i className={`ti ${copiedChannel === ch ? 'ti-check' : 'ti-copy'}`}></i>
                      <span>{copiedChannel === ch ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>
                  <div className={styles.resultBody}>
                    {ch === 'email' && res.subject && (
                      <div className={styles.subjectBox}>
                        <strong>Subject:</strong> {res.subject}
                      </div>
                    )}
                    <div className={styles.bodyBox}>{res.body}</div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <i className="ti ti-speakerphone"></i>
            <p>Ready to compose outreach</p>
            <span>Enter a campaign topic and click "Compose Campaign" to view multi-channel adapted drafts tailored in your voice.</span>
          </div>
        )}
      </div>
    </div>
  );
}
