import React, { useState, useEffect, useRef } from 'react';
import { generateReplies, shortenDraft, elaborateDraft, suggestIntents, analyzeEdits } from '../lib/api';
import styles from './DraftPanel.module.css';

const PLATFORM_ICONS = {
  email: 'ti-mail', whatsapp: 'ti-brand-whatsapp',
  slack: 'ti-brand-slack', x: 'ti-brand-x', linkedin: 'ti-brand-linkedin',
};
const PLATFORM_NAMES = {
  email: 'Email', whatsapp: 'WhatsApp',
  slack: 'Slack', x: 'X / Twitter', linkedin: 'LinkedIn',
};
const LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Japanese', 'Chinese', 'Hindi'];

function calculateForecast(text, variantId) {
  if (!text || text.trim().length < 5) return null;
  const words = text.split(/\s+/).length;
  
  // Set defaults based on standard variants
  const warmth = variantId === 'b' ? 85 : (variantId === 'c' ? 48 : 65);
  const formality = variantId === 'a' ? 78 : (variantId === 'b' ? 40 : 58);
  
  let sentiment = 72 + (warmth * 0.18) + (formality * 0.04);
  if (words < 12) sentiment -= 8; // too brief can sound curt
  
  // Scan for common passive-aggressive triggers
  const passiveAggressiveKeywords = ['per my last', 'as stated', 'actually', 'regards', 'clarify', 'please note', 'obviously'];
  let passAggScore = 6;
  const lowerText = text.toLowerCase();
  passiveAggressiveKeywords.forEach(kw => {
    if (lowerText.includes(kw)) passAggScore += 24;
  });

  return {
    positiveOutlook: Math.min(99, Math.max(45, Math.round(sentiment))),
    passiveAggressiveness: Math.min(95, passAggScore),
    relationshipVibe: passAggScore > 25 ? 'Stiff' : (warmth > 75 ? 'Warm' : 'Professional'),
  };
}

function VoiceRadar({ formality, warmth, brevity, assertiveness }) {
  // Calculate polygon points based on 0-100 values
  const p0 = { x: 50, y: 50 - 0.4 * formality };
  const p1 = { x: 50 + 0.4 * warmth, y: 50 };
  const p2 = { x: 50, y: 50 + 0.4 * brevity };
  const p3 = { x: 50 - 0.4 * assertiveness, y: 50 };

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

        {/* Dynamic active polygon representing values */}
        <polygon 
          points={pointsString} 
          fill="rgba(127, 119, 221, 0.2)" 
          stroke="var(--purple-light)" 
          strokeWidth="1.2"
          style={{ transition: 'all 0.4s ease-out' }}
        />

        {/* Concentric points */}
        <circle cx={p0.x} cy={p0.y} r="2.2" fill="var(--purple-light)" style={{ transition: 'all 0.4s' }} />
        <circle cx={p1.x} cy={p1.y} r="2.2" fill="var(--purple-light)" style={{ transition: 'all 0.4s' }} />
        <circle cx={p2.x} cy={p2.y} r="2.2" fill="var(--purple-light)" style={{ transition: 'all 0.4s' }} />
        <circle cx={p3.x} cy={p3.y} r="2.2" fill="var(--purple-light)" style={{ transition: 'all 0.4s' }} />

        {/* Labels */}
        <text x="50" y="7" textAnchor="middle" fontSize="4.5" fill="rgba(255,255,255,0.4)" fontWeight="600" fontFamily="Inter, sans-serif">FORMALITY</text>
        <text x="93" y="51.5" textAnchor="start" fontSize="4.5" fill="rgba(255,255,255,0.4)" fontWeight="600" fontFamily="Inter, sans-serif">WARMTH</text>
        <text x="50" y="97.5" textAnchor="middle" fontSize="4.5" fill="rgba(255,255,255,0.4)" fontWeight="600" fontFamily="Inter, sans-serif">BREVITY</text>
        <text x="7" y="51.5" textAnchor="end" fontSize="4.5" fill="rgba(255,255,255,0.4)" fontWeight="600" fontFamily="Inter, sans-serif">ASSERTIVENESS</text>
      </svg>
    </div>
  );
}

function calculateHumanScore(text) {
  if (!text || text.trim().length < 10) return 100;
  
  const aiClichés = [
    'hope this email finds you well', 'delighted to connect', 'delighted to assist',
    'leverage', 'synergy', 'synergies', 'testament', 'tapestry', 'delve',
    'furthermore', 'moreover', 'in conclusion', 'robust', 'cutting-edge',
    'comprehensive', 'it is important to note', 'please do not hesitate to'
  ];
  
  let penalty = 0;
  const lowerText = text.toLowerCase();
  aiClichés.forEach(cliché => {
    if (lowerText.includes(cliché)) {
      penalty += 12;
    }
  });
  
  const words = lowerText.match(/\b\w+\b/g) || [];
  if (words.length > 0) {
    const uniqueWords = new Set(words);
    const ratio = uniqueWords.size / words.length;
    if (ratio < 0.5) {
      penalty += (0.5 - ratio) * 40;
    }
  }
  
  return Math.max(45, Math.min(100, Math.round(100 - penalty)));
}

export default function DraftPanel({ platform, tone, voiceProfile, saveProfile, saveDraft, updateDraft, preloadMsg, onPreloadConsumed, settings }) {
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('input');
  const [context, setContext] = useState('');
  const [chip, setChip] = useState('match');
  const [loading, setLoading] = useState(false);
  const [shortening, setShortening] = useState(false);
  const [elaborating, setElaborating] = useState(false);
  const [threadContext, setThreadContext] = useState('');
  const [showThread, setShowThread] = useState(false);
  const [language, setLanguage] = useState('English');
  const [drafts, setDrafts] = useState({ a: '', b: '', c: '' });
  const [originalDrafts, setOriginalDrafts] = useState({ a: '', b: '', c: '' });
  const [perceptions, setPerceptions] = useState({ a: '', b: '', c: '' });
  const [intents, setIntents] = useState([]);
  const [loadingIntents, setLoadingIntents] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [hasSavedProfile, setHasSavedProfile] = useState(false);
  const [active, setActive] = useState('a');
  const [activeDocId, setActiveDocId] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const textareaRef = useRef(null);

  // Advanced Tone Overrides State
  const [showSliders, setShowSliders] = useState(false);
  const [formalityOverride, setFormalityOverride] = useState(50);
  const [warmthOverride, setWarmthOverride] = useState(50);
  const [brevityOverride, setBrevityOverride] = useState(50);

  // Sync sliders with voice profile when it loads
  useEffect(() => {
    if (voiceProfile) {
      setFormalityOverride(voiceProfile.formality !== undefined ? voiceProfile.formality : 50);
      setWarmthOverride(voiceProfile.warmth !== undefined ? voiceProfile.warmth : 50);
      setBrevityOverride(voiceProfile.brevity !== undefined ? voiceProfile.brevity : 50);
    }
  }, [voiceProfile]);

  // Preload from history
  useEffect(() => {
    if (preloadMsg) {
      setMessage(preloadMsg.receivedMsg || '');
      setActiveDocId(preloadMsg.id || null);

      if (preloadMsg.drafts) {
        setDrafts(preloadMsg.drafts);
        setOriginalDrafts(preloadMsg.originalDrafts || preloadMsg.drafts);
      } else {
        setDrafts({ a: preloadMsg.reply || '', b: '', c: '' });
        setOriginalDrafts({ a: preloadMsg.reply || '', b: '', c: '' });
      }

      if (preloadMsg.perceptions) {
        setPerceptions(preloadMsg.perceptions);
      } else {
        setPerceptions({ a: 'Loaded from history', b: '', c: '' });
      }

      if (preloadMsg.active) {
        setActive(preloadMsg.active);
      } else {
        setActive('a');
      }

      setContext(preloadMsg.context || '');
      setChip(preloadMsg.chip || 'match');
      setLanguage(preloadMsg.language || 'English');

      if (preloadMsg.threadContext) {
        setThreadContext(preloadMsg.threadContext);
        setShowThread(true);
      } else {
        setThreadContext('');
        setShowThread(false);
      }

      if (preloadMsg.overrides) {
        setShowSliders(true);
        setFormalityOverride(preloadMsg.overrides.formality || 50);
        setWarmthOverride(preloadMsg.overrides.warmth || 50);
        setBrevityOverride(preloadMsg.overrides.brevity || 50);
      } else {
        setShowSliders(false);
      }

      onPreloadConsumed?.();
    }
  }, [preloadMsg]);

  // Debounced auto-suggestions for intents
  useEffect(() => {
    if (!message.trim() || message.trim().length < 15) {
      setIntents([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoadingIntents(true);
      try {
        const suggestions = await suggestIntents(message, settings);
        setIntents(suggestions || []);
      } catch (e) {
        console.error(e);
      }
      setLoadingIntents(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, [message]);

  const handleGenerate = async () => {
    if (!message.trim() || loading) return;
    setLoading(true);
    setError('');
    setDrafts({ a: '', b: '', c: '' });
    setOriginalDrafts({ a: '', b: '', c: '' });
    setPerceptions({ a: '', b: '', c: '' });
    setHasSavedProfile(false);
    setActive('a');
    setActiveDocId(null);
    setActiveTab('output'); // Auto-switch to response tab on mobile
    try {
      const result = await generateReplies({
        message,
        context,
        platform,
        tone,
        chip,
        voiceTags: voiceProfile?.tags,
        settings,
        overrides: showSliders ? {
          formality: formalityOverride,
          warmth: warmthOverride,
          brevity: brevityOverride,
        } : null,
        threadContext: showThread ? threadContext : '',
        language,
      });

      const cleanResult = {
        a: result.a?.text || '',
        b: result.b?.text || '',
        c: result.c?.text || '',
      };
      const cleanPerceptions = {
        a: result.a?.perception || 'Polite & direct',
        b: result.b?.perception || 'Casual & warm',
        c: result.c?.perception || 'Concise & brief',
      };

      setDrafts(cleanResult);
      setOriginalDrafts(cleanResult);
      setPerceptions(cleanPerceptions);

      if (settings?.saveDraftHistory !== false) {
        const id = await saveDraft?.({
          receivedMsg: message,
          reply: cleanResult.a,
          platform,
          tone,
          threadContext: showThread ? threadContext : '',
          context,
          chip,
          language,
          drafts: cleanResult,
          originalDrafts: cleanResult,
          perceptions: cleanPerceptions,
          active: 'a',
          overrides: showSliders ? {
            formality: formalityOverride,
            warmth: warmthOverride,
            brevity: brevityOverride,
          } : null,
        });
        setActiveDocId(id || null);
      }
    } catch (e) {
      console.error(e);
      setError('Something went wrong. Check your connection and try again.');
    }
    setLoading(false);
  };

  const handleShorten = async () => {
    const current = drafts[active];
    if (!current || shortening) return;
    setShortening(true);
    try {
      const shorter = await shortenDraft(current, settings);
      setDrafts(prev => ({ ...prev, [active]: shorter }));
      setOriginalDrafts(prev => ({ ...prev, [active]: shorter }));
      setHasSavedProfile(false);

      if (activeDocId) {
        await updateDraft?.(activeDocId, {
          drafts: { ...drafts, [active]: shorter },
          originalDrafts: { ...drafts, [active]: shorter },
          reply: shorter,
        });
      }
    } catch (e) {
      console.error(e);
    }
    setShortening(false);
  };

  const handleElaborate = async () => {
    const current = drafts[active];
    if (!current || elaborating) return;
    setElaborating(true);
    try {
      const expanded = await elaborateDraft(current, settings);
      setDrafts(prev => ({ ...prev, [active]: expanded }));
      setOriginalDrafts(prev => ({ ...prev, [active]: expanded }));
      setHasSavedProfile(false);

      if (activeDocId) {
        await updateDraft?.(activeDocId, {
          drafts: { ...drafts, [active]: expanded },
          originalDrafts: { ...drafts, [active]: expanded },
          reply: expanded,
        });
      }
    } catch (e) {
      console.error(e);
    }
    setElaborating(false);
  };

  const handleSaveEditToProfile = async () => {
    const original = originalDrafts[active];
    const edited = drafts[active];
    if (!original || !edited || savingProfile) return;
    setSavingProfile(true);
    try {
      const updatedProfile = await analyzeEdits(original, edited, voiceProfile, settings);
      await saveProfile?.(updatedProfile);
      setHasSavedProfile(true);
      setOriginalDrafts(prev => ({ ...prev, [active]: edited }));
    } catch (e) {
      console.error(e);
      setError('Failed to update voice profile from edits.');
    }
    setSavingProfile(false);
  };

  const handleSelectVariant = async (variantId) => {
    setActive(variantId);
    if (activeDocId) {
      try {
        await updateDraft?.(activeDocId, {
          active: variantId,
          reply: drafts[variantId],
        });
      } catch (e) {
        console.error("Failed to sync variant selection", e);
      }
    }
  };

  const handleDraftBlur = async () => {
    if (activeDocId) {
      try {
        await updateDraft?.(activeDocId, {
          drafts,
          reply: drafts[active],
        });
      } catch (e) {
        console.error("Failed to sync draft edits", e);
      }
    }
  };

  const handleCopy = () => {
    const text = drafts[active];
    if (!text) return;
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendEmail = () => {
    const text = drafts[active];
    if (!text) return;
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&tf=1&body=${encodeURIComponent(text)}`;
    const w = window.open(gmailUrl, '_blank');
    if (!w) {
      window.location.href = `mailto:?body=${encodeURIComponent(text)}`;
    }
  };

  const handleSendWhatsApp = () => {
    const text = drafts[active];
    if (!text) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleGenerate();
  };

  const handleSelectIntent = (intentText) => {
    setContext(intentText);
  };

  const activeDraft = drafts[active] || '';
  const hasResult = !!drafts.a;
  const isDraftEdited = activeDraft && originalDrafts[active] && activeDraft !== originalDrafts[active];
  const forecast = calculateForecast(activeDraft, active);

  return (
    <div className={styles.layout}>
      {/* Mobile Tab Switcher */}
      <div className={styles.mobileTabs}>
        <button
          type="button"
          className={`${styles.mobileTab} ${activeTab === 'input' ? styles.mobileTabActive : ''}`}
          onClick={() => setActiveTab('input')}
        >
          <i className="ti ti-edit"></i> Write
        </button>
        <button
          type="button"
          className={`${styles.mobileTab} ${activeTab === 'output' ? styles.mobileTabActive : ''}`}
          onClick={() => setActiveTab('output')}
        >
          <i className="ti ti-mail-opened"></i> Response
        </button>
      </div>

      {/* Input column */}
      <div className={`${styles.inputCol} ${activeTab === 'input' ? styles.tabVisible : styles.tabHidden}`}>
        <div className={styles.sectionLabel}>Drafting Workshop</div>
        <div className={styles.inputCard}>
          {/* Thread Context Section */}
          <div className={styles.collapsibleSection}>
            <button 
              type="button"
              className={styles.sectionToggle}
              onClick={() => setShowThread(!showThread)}
            >
              <span>Conversational History</span>
              <i className={`ti ${showThread ? 'ti-chevron-up' : 'ti-chevron-down'}`}></i>
            </button>
            {showThread && (
              <textarea
                className={styles.threadTextarea}
                placeholder="Paste previous back-and-forth messages here to give Ghost conversation history context…"
                value={threadContext}
                onChange={e => setThreadContext(e.target.value)}
                rows={3}
              />
            )}
          </div>

          {/* Main Message Received */}
          <div className={styles.mainInputSection}>
            <label className={styles.innerLabel}>Message received</label>
            <textarea
              ref={textareaRef}
              className={styles.mainTextarea}
              placeholder="Paste the message you need to reply to…"
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={6}
            />
          </div>

          {/* Intent Suggestions Chips */}
          {(intents.length > 0 || loadingIntents) && (
            <div className={styles.intentSuggestionsSection}>
              <span className={styles.innerLabel} style={{ fontSize: 10 }}>Suggested Intent Replies:</span>
              <div className={styles.intentChipsRow}>
                {loadingIntents ? (
                  <span className={styles.suggestionsLoading}>
                    <i className="ti ti-loader-2" style={{ animation: 'spin 1s linear infinite' }}></i> Suggesting...
                  </span>
                ) : (
                  intents.map((intent, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={styles.intentChip}
                      onClick={() => handleSelectIntent(intent)}
                    >
                      {intent}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* How do you want to reply? */}
          <div className={styles.contextSection}>
            <label className={styles.innerLabel}>How do you want to reply? (Optional)</label>
            <textarea
              className={styles.contextTextarea}
              placeholder="Tell Ghost what you want to say — e.g. 'Reject the offer politely', 'Accept and ask for schedule'"
              value={context}
              onChange={e => setContext(e.target.value)}
              rows={2}
            />
          </div>

          {/* Style Overrides Collapsible */}
          <div id="tour-overrides" className={styles.collapsibleSection} style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>
            <button 
              type="button"
              className={styles.sectionToggle}
              onClick={() => setShowSliders(!showSliders)}
            >
              <span>Style Overrides</span>
              <i className={`ti ${showSliders ? 'ti-chevron-up' : 'ti-chevron-down'}`}></i>
            </button>
            {showSliders && (
              <div className={styles.slidersWrapper}>
                <div className={styles.slidersGrid}>
                  <div className={styles.sliderGroup}>
                    <div className={styles.sliderLabelRow}>
                      <span>Formality</span>
                      <span>{formalityOverride}%</span>
                    </div>
                    <input 
                      type="range"
                      min="0"
                      max="100"
                      value={formalityOverride}
                      onChange={e => setFormalityOverride(parseInt(e.target.value))}
                      className={styles.sliderInput}
                    />
                  </div>
                  <div className={styles.sliderGroup}>
                    <div className={styles.sliderLabelRow}>
                      <span>Warmth</span>
                      <span>{warmthOverride}%</span>
                    </div>
                    <input 
                      type="range"
                      min="0"
                      max="100"
                      value={warmthOverride}
                      onChange={e => setWarmthOverride(parseInt(e.target.value))}
                      className={styles.sliderInput}
                    />
                  </div>
                  <div className={styles.sliderGroup}>
                    <div className={styles.sliderLabelRow}>
                      <span>Brevity (Length)</span>
                      <span>{brevityOverride}%</span>
                    </div>
                    <input 
                      type="range"
                      min="0"
                      max="100"
                      value={brevityOverride}
                      onChange={e => setBrevityOverride(parseInt(e.target.value))}
                      className={styles.sliderInput}
                    />
                  </div>
                </div>
                <VoiceRadar 
                  formality={formalityOverride}
                  warmth={warmthOverride}
                  brevity={brevityOverride}
                  assertiveness={voiceProfile?.assertiveness || 50}
                />
              </div>
            )}
          </div>

          {/* Bottom Toolbar */}
          <div className={styles.toolbar}>
            <div className={styles.toolbarChips}>
              {[
                { id: 'match', label: 'Match tone' },
                { id: 'shorter', label: 'Shorter' },
                { id: 'formal', label: 'More formal' },
                { id: 'warm', label: 'Warmer' },
              ].map(c => (
                <button
                  key={c.id}
                  type="button"
                  className={`${styles.chip} ${chip === c.id ? styles.chipActive : ''}`}
                  onClick={() => setChip(c.id)}
                >
                  {c.label}
                </button>
              ))}

              <div className={styles.selectWrapper}>
                <select
                  className={styles.langSelect}
                  value={language}
                  onChange={e => setLanguage(e.target.value)}
                  title="Target Language"
                >
                  {LANGUAGES.map(lang => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="button"
              className={styles.genBtn}
              onClick={handleGenerate}
              disabled={!message.trim() || loading}
            >
              {loading
                ? <><i className="ti ti-loader-2" style={{animation:'spin 1s linear infinite'}}></i> Writing…</>
                : <><i className="ti ti-sparkles"></i> Draft reply</>
              }
            </button>
          </div>
          <div className={styles.hint}>⌘↵ to generate</div>
        </div>

        {error && <div className={styles.error}><i className="ti ti-alert-circle"></i> {error}</div>}
      </div>

      {/* Output column */}
      <div className={`${styles.outputCol} ${activeTab === 'output' ? styles.tabVisible : styles.tabHidden}`}>
        <div className={styles.sectionLabel}>Your reply</div>
        <div className={styles.draftCard}>
          <div className={styles.draftMeta}>
            <div className={styles.draftPlatform}>
              <i className={`ti ${PLATFORM_ICONS[platform]}`} aria-hidden="true"></i>
              {PLATFORM_NAMES[platform]}
            </div>

            {hasResult && (
              <div className={styles.detectorShield} title="AI Writing Detection Guard Score">
                <i className="ti ti-shield-check" aria-hidden="true"></i>
                <span>{calculateHumanScore(activeDraft)}% Human</span>
              </div>
            )}

            <div className={styles.draftVariant}>Variant {active.toUpperCase()}</div>
          </div>

          <div className={styles.draftTextContainer}>
            {loading ? (
              <div className={styles.draftTextPlaceholder}>
                <span className={styles.thinking}>Crafting your reply<span className={styles.dots}>...</span></span>
              </div>
            ) : activeDraft ? (
              <textarea
                className={styles.draftTextarea}
                value={activeDraft}
                onChange={e => setDrafts(prev => ({ ...prev, [active]: e.target.value }))}
                onBlur={handleDraftBlur}
                placeholder="Your ghostwritten reply will appear here."
              />
            ) : (
              <div className={styles.draftTextPlaceholder}>
                Your ghostwritten reply will appear here.
              </div>
            )}
          </div>

          {perceptions[active] && (
            <div className={styles.draftFeedbackRow}>
              <div className={styles.feedbackGauges}>
                <div className={styles.perceptionBadge}>
                  <i className="ti ti-messages" aria-hidden="true"></i>
                  <span>Perception: <strong>{perceptions[active]}</strong></span>
                </div>
                {forecast && (
                  <div className={styles.forecastContainer}>
                    <div className={styles.forecastItem} title="Recipient Outcome Outlook">
                      <i className="ti ti-target" aria-hidden="true"></i>
                      <span>Outlook: <strong>{forecast.positiveOutlook}%</strong></span>
                    </div>
                    <div className={`${styles.forecastItem} ${forecast.passiveAggressiveness > 25 ? styles.riskHigh : styles.riskLow}`} title="Passive-Aggressive Risk">
                      <i className="ti ti-alert-triangle" aria-hidden="true"></i>
                      <span>PA Risk: <strong>{forecast.passiveAggressiveness}%</strong></span>
                    </div>
                    <div className={styles.forecastItem} title="Relationship Vibe">
                      <i className="ti ti-heart" aria-hidden="true"></i>
                      <span>Vibe: <strong>{forecast.relationshipVibe}</strong></span>
                    </div>
                  </div>
                )}
              </div>
              
              {isDraftEdited && (
                <button
                  type="button"
                  className={`${styles.learnBtn} ${hasSavedProfile ? styles.learnBtnSaved : ''}`}
                  onClick={handleSaveEditToProfile}
                  disabled={savingProfile || hasSavedProfile}
                >
                  <i className={`ti ${hasSavedProfile ? 'ti-circle-check' : (savingProfile ? 'ti-loader-2' : 'ti-brain')}`} style={{ animation: savingProfile ? 'spin 1s linear infinite' : 'none' }} aria-hidden="true"></i>
                  <span>{hasSavedProfile ? 'Voice Updated!' : (savingProfile ? 'Learning...' : 'Save edits to voice')}</span>
                </button>
              )}
            </div>
          )}

          <div className={styles.draftActions}>
            <div className={styles.actionGroup}>
              <button className={`${styles.actionBtn} ${styles.actionPrimary}`} onClick={handleCopy} disabled={!activeDraft}>
                <i className={`ti ${copied ? 'ti-check' : 'ti-copy'}`} aria-hidden="true"></i>
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
              <button className={styles.actionBtn} onClick={handleSendEmail} disabled={!activeDraft} title="Send via Gmail">
                <i className="ti ti-mail" aria-hidden="true"></i>
                <span>Gmail</span>
              </button>
              <button className={styles.actionBtn} onClick={handleSendWhatsApp} disabled={!activeDraft} title="Send via WhatsApp">
                <i className="ti ti-brand-whatsapp" aria-hidden="true"></i>
                <span>WhatsApp</span>
              </button>
            </div>

            <div className={styles.actionGroup}>
              <button className={styles.actionBtn} onClick={handleShorten} disabled={!activeDraft || shortening} title="Make reply shorter">
                <i className="ti ti-arrows-minimize" aria-hidden="true"></i>
                <span>{shortening ? 'Shortening…' : 'Shorten'}</span>
              </button>
              <button className={styles.actionBtn} onClick={handleElaborate} disabled={!activeDraft || elaborating} title="Elaborate reply">
                <i className="ti ti-arrows-maximize" aria-hidden="true"></i>
                <span>{elaborating ? 'Elaborating…' : 'Elaborate'}</span>
              </button>
              <button className={styles.actionBtn} onClick={handleGenerate} disabled={!message.trim() || loading} title="Regenerate variants">
                <i className="ti ti-refresh" aria-hidden="true"></i>
                <span>Regenerate</span>
              </button>
            </div>
          </div>
        </div>

        {/* Variants */}
        {hasResult && (
          <>
            <div className={styles.sectionLabel} style={{marginTop: 16}}>Other variants</div>
            <div className={styles.variantsGrid}>
              {[
                { id: 'b', label: 'Variant B — Casual' },
                { id: 'c', label: 'Variant C — Brief' },
              ].map(v => (
                <div
                  key={v.id}
                  className={`${styles.variantCard} ${active === v.id ? styles.variantActive : ''}`}
                  onClick={() => handleSelectVariant(v.id)}
                >
                  <div className={styles.variantLabel}>{v.label}</div>
                  <div className={styles.variantText}>{drafts[v.id] || '—'}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
