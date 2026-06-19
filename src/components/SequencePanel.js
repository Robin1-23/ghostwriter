import React, { useState } from 'react';
import { generateSequence } from '../lib/api';
import styles from './SequencePanel.module.css';

export default function SequencePanel({ voiceProfile, settings }) {
  const [objective, setObjective] = useState('');
  const [audience, setAudience] = useState('');
  const [stagesCount, setStagesCount] = useState(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sequence, setSequence] = useState(null);
  const [copiedStage, setCopiedStage] = useState(null);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!objective.trim() || !audience.trim()) return;

    setLoading(true);
    setError('');
    setSequence(null);

    try {
      const data = await generateSequence({
        objective: objective.trim(),
        audience: audience.trim(),
        stagesCount,
        voiceTags: voiceProfile?.tags,
        settings,
      });
      setSequence(data.stages || []);
    } catch (err) {
      console.error(err);
      setError('Failed to generate outreach sequence. Please check settings and retry.');
    }
    setLoading(false);
  };

  const handleCopy = (text, stageIndex) => {
    if (!text) return;
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedStage(stageIndex);
    setTimeout(() => setCopiedStage(null), 2000);
  };

  return (
    <div className={styles.layout}>
      {/* Configuration Form */}
      <div className={styles.formCol}>
        <div className={styles.sectionLabel}>Sequence Planner</div>
        <form className={styles.card} onSubmit={handleGenerate}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Outreach Objective</label>
            <textarea
              className={styles.textarea}
              placeholder="e.g. Introduce our central OpenAI proxy solution to startup CTOs and invite them to schedule a brief 10-minute demo session..."
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              rows={4}
              required
            />
          </div>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Target Audience</label>
            <input
              type="text"
              className={styles.textInput}
              placeholder="e.g. Tech Founders, Sales Managers, Marketing Agencies"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              required
            />
          </div>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Number of Stages</label>
            <div className={styles.rangeRow}>
              {[2, 3].map((num) => (
                <button
                  key={num}
                  type="button"
                  className={`${styles.numBtn} ${stagesCount === num ? styles.numActive : ''}`}
                  onClick={() => setStagesCount(num)}
                >
                  {num} Stages
                </button>
              ))}
            </div>
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? (
              <><i className="ti ti-loader-2" style={{ animation: 'spin 1s linear infinite' }}></i> Mapping Sequence...</>
            ) : (
              <><i className="ti ti-list-check"></i> Generate Sequence</>
            )}
          </button>
          {error && <div className={styles.error}><i className="ti ti-alert-circle"></i> {error}</div>}
        </form>
      </div>

      {/* Generated Sequence Output */}
      <div className={styles.resultsCol}>
        <div className={styles.sectionLabel}>Sequential Outreach Funnel</div>
        {loading ? (
          <div className={styles.loadingPlaceholder}>
            <span className={styles.thinking}>
              Designing a custom outreach funnel in your voice ({voiceProfile?.tags?.slice(0, 3).join(', ') || 'personal'})
              <span className={styles.dots}>...</span>
            </span>
          </div>
        ) : sequence ? (
          <div className={styles.sequenceList}>
            {sequence.map((stage, idx) => {
              const fullText = `Subject: ${stage.subject}\n\n${stage.body}`;
              return (
                <div key={idx} className={styles.stageCard}>
                  <div className={styles.stageHeader}>
                    <div className={styles.stageTitle}>
                      <span className={styles.badge}>{stage.stage || idx + 1}</span>
                      <span>{stage.title || `Stage ${idx + 1}`}</span>
                    </div>
                    <button
                      type="button"
                      className={styles.copyBtn}
                      onClick={() => handleCopy(fullText, idx)}
                    >
                      <i className={`ti ${copiedStage === idx ? 'ti-check' : 'ti-copy'}`}></i>
                      <span>{copiedStage === idx ? 'Copied!' : 'Copy Stage'}</span>
                    </button>
                  </div>
                  <div className={styles.stageContent}>
                    <div className={styles.subjectBox}>
                      <strong>Subject:</strong> {stage.subject}
                    </div>
                    <div className={styles.bodyBox}>{stage.body}</div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <i className="ti ti-list-check"></i>
            <p>Outbox sequence is empty</p>
            <span>Define your goal, select stage lengths, and generate your custom automated email sequence.</span>
          </div>
        )}
      </div>
    </div>
  );
}
