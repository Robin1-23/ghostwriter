import React, { useState, useEffect, useRef } from 'react';
import { generateReplies } from '../lib/api';
import styles from './InboxPanel.module.css';

const MOCK_EMAILS = [
  {
    id: 'msg_1',
    sender: 'Sarah Jenkins (Apex Global)',
    email: 'sarah.j@apex-global.com',
    subject: 'Partnership proposal discussion',
    received: "Hey! Loved your post on LinkedIn about AI workflows. We'd love to chat about a potential partnership for our Q3 marketing push. Are you free for a 15-minute sync this Thursday at 2 PM EST?",
    timestamp: '10:32 AM',
    status: 'Drafting...',
  },
  {
    id: 'msg_2',
    sender: 'David Chen (CTO)',
    email: 'd.chen@apex-global.com',
    subject: 'Urgent: Q3 Launch Deck review',
    received: "Hi, I just pushed the new design slides to our shared workspace. Could you review the pricing slide and let me know if the tiers make sense by EOD? We need to lock it down before the client call tomorrow morning.",
    timestamp: '9:15 AM',
    status: 'Drafting...',
  },
  {
    id: 'msg_3',
    sender: 'Emma Watson',
    email: 'emma.w@gmail.com',
    subject: 'Question about pricing plans',
    received: "Hi Ghost team, I'm looking to buy the Pro plan for my writing business, but I wanted to check if there is an annual discount available. We have 5 writers who will need access.",
    timestamp: 'Yesterday',
    status: 'Drafting...',
  },
  {
    id: 'msg_4',
    sender: 'Robert Downey',
    email: 'robert@stark-industries.com',
    subject: 'Quick catch-up next week?',
    received: "Hey Prince, hope all is well! It's been a while since we chatted about the extension integration. Let me know if you have some cycles next Tuesday afternoon for a quick coffee catch-up.",
    timestamp: '2 days ago',
    status: 'Drafting...',
  }
];

function calculateForecast(text, variantId) {
  if (!text || text.trim().length < 5) return null;
  const words = text.split(/\s+/).length;
  
  const warmth = variantId === 'b' ? 85 : (variantId === 'c' ? 48 : 65);
  const formality = variantId === 'a' ? 78 : (variantId === 'b' ? 40 : 58);
  
  let sentiment = 72 + (warmth * 0.18) + (formality * 0.04);
  if (words < 12) sentiment -= 8;
  
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

export default function InboxPanel({ settings, voiceProfile, saveDraft }) {
  const [emails, setEmails] = useState(MOCK_EMAILS);
  const [selectedId, setSelectedId] = useState('msg_1');
  const [activeVariant, setActiveVariant] = useState('a');
  const [copied, setCopied] = useState(false);
  const [exported, setExported] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const inFlightRef = useRef(new Set());

  // Background Pre-Drafting worker
  useEffect(() => {
    let active = true;

    const draftResponses = async () => {
      const draftingList = emails.filter(e => e.status === 'Drafting...' && !inFlightRef.current.has(e.id));
      if (draftingList.length === 0) return;

      // Mark emails as in-flight so duplicate effects don't call them in parallel
      draftingList.forEach(e => inFlightRef.current.add(e.id));

      const results = await Promise.all(
        draftingList.map(async (email) => {
          try {
            const result = await generateReplies({
              mode: 'reply',
              message: email.received,
              context: '',
              platform: 'email',
              tone: 'auto',
              voiceTags: voiceProfile?.tags || ['direct', 'warm'],
              settings,
            });
            return {
              id: email.id,
              status: 'Drafted',
              drafts: {
                a: result.a?.text || '',
                b: result.b?.text || '',
                c: result.c?.text || '',
              },
              subjects: {
                a: result.a?.subject || '',
                b: result.b?.subject || '',
                c: result.c?.subject || '',
              },
              perceptions: {
                a: result.a?.perception || 'Polite & direct',
                b: result.b?.perception || 'Casual & warm',
                c: result.c?.perception || 'Concise & brief',
              }
            };
          } catch (err) {
            console.error(`Failed background pre-drafting for ${email.id}:`, err);
            return { id: email.id, status: 'Failed' };
          } finally {
            inFlightRef.current.delete(email.id);
          }
        })
      );

      if (!active) return;

      setEmails(prev =>
        prev.map(email => {
          const match = results.find(r => r.id === email.id);
          if (match) {
            return {
              ...email,
              status: match.status,
              drafts: match.drafts,
              subjects: match.subjects,
              perceptions: match.perceptions,
            };
          }
          return email;
        })
      );
    };

    draftResponses();

    return () => {
      active = false;
    };
  }, [emails, voiceProfile, settings]);

  const handleSync = () => {
    setIsSyncing(true);
    // Reset status to Drafting... to trigger the useEffect worker
    setTimeout(() => {
      setEmails(prev =>
        prev.map(e => ({
          ...e,
          status: 'Drafting...',
          drafts: undefined,
          subjects: undefined,
          perceptions: undefined,
        }))
      );
      setIsSyncing(false);
    }, 1200);
  };

  const handleTextChange = (newText) => {
    setEmails(prev =>
      prev.map(e => {
        if (e.id === selectedId) {
          return {
            ...e,
            drafts: {
              ...e.drafts,
              [activeVariant]: newText,
            }
          };
        }
        return e;
      })
    );
  };

  const handleCopy = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = async (emailItem, text) => {
    if (!text) return;
    
    // Attempt client-side Firebase draft save for extension sync
    if (saveDraft && settings?.saveDraftHistory !== false) {
      try {
        await saveDraft({
          mode: 'reply',
          receivedMsg: emailItem.received,
          reply: text,
          platform: 'email',
          tone: 'auto',
          context: 'Inbox Co-Pilot Sync',
          chip: 'match',
          language: 'English',
          drafts: emailItem.drafts,
          subjects: emailItem.subjects || { a: '', b: '', c: '' },
          perceptions: emailItem.perceptions || { a: '', b: '', c: '' },
          active: activeVariant,
        });
      } catch (err) {
        console.warn("Failed to save co-pilot draft to database:", err);
      }
    }

    const mailtoUrl = `mailto:${emailItem.email}?subject=${encodeURIComponent(
      emailItem.subjects?.[activeVariant] || emailItem.subject
    )}&body=${encodeURIComponent(text)}`;
    window.location.href = mailtoUrl;

    setExported(true);
    setTimeout(() => setExported(false), 3000);
  };

  const selectedEmail = emails.find(e => e.id === selectedId);
  const activeDraft = selectedEmail?.drafts?.[activeVariant] || '';
  const activeSubject = selectedEmail?.subjects?.[activeVariant] || selectedEmail?.subject || '';
  const activePerception = selectedEmail?.perceptions?.[activeVariant] || '';
  const forecast = calculateForecast(activeDraft, activeVariant);

  return (
    <div className={styles.layout}>
      {/* Control Banner */}
      <div className={styles.banner}>
        <div className={styles.bannerLeft}>
          <i className="ti ti-mail-fast" aria-hidden="true"></i>
          <div>
            <div className={styles.bannerTitle}>Inbox Co-Pilot Active</div>
            <div className={styles.bannerSub}>Ghost is monitoring your inbox and drafting responses in the background.</div>
          </div>
        </div>
        <button
          type="button"
          className={styles.syncBtn}
          onClick={handleSync}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <><i className="ti ti-loader-2" style={{ animation: 'spin 1s linear infinite' }}></i> Syncing...</>
          ) : (
            <><i className="ti ti-refresh"></i> Sync Inbox</>
          )}
        </button>
      </div>

      <div className={styles.grid}>
        {/* Left Side List */}
        <div className={styles.listCard}>
          <div className={styles.listHeader}>Incoming Messages</div>
          <div className={styles.listContent}>
            {emails.map(email => {
              const isSelected = email.id === selectedId;
              const hasDraft = email.status === 'Drafted';
              return (
                <div
                  key={email.id}
                  className={`${styles.emailRow} ${isSelected ? styles.emailRowSelected : ''}`}
                  onClick={() => {
                    setSelectedId(email.id);
                    setActiveVariant('a');
                  }}
                >
                  <div className={styles.rowTop}>
                    <span className={styles.senderName}>{email.sender}</span>
                    <span className={styles.timestamp}>{email.timestamp}</span>
                  </div>
                  <div className={styles.subjectText}>{email.subject}</div>
                  <div className={styles.snippetText}>{email.received}</div>
                  <div className={styles.rowBottom}>
                    <span
                      className={`${styles.statusBadge} ${
                        hasDraft ? styles.statusDrafted : styles.statusDrafting
                      }`}
                    >
                      <i className={`ti ${hasDraft ? 'ti-sparkles' : 'ti-loader-2'}`} style={{ animation: !hasDraft ? 'spin 1.2s linear infinite' : 'none' }}></i>
                      {email.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side Review/Edit Pane */}
        <div className={styles.reviewCard}>
          {selectedEmail ? (
            <div className={styles.paneContent}>
              <div className={styles.paneSection}>
                <div className={styles.paneLabel}>Received message</div>
                <div className={styles.receivedBubble}>
                  <div className={styles.bubbleMeta}>
                    <strong>{selectedEmail.sender}</strong> &lt;{selectedEmail.email}&gt;
                  </div>
                  <div className={styles.bubbleBody}>{selectedEmail.received}</div>
                </div>
              </div>

              <div className={styles.paneSection}>
                <div className={styles.paneLabel}>Pre-drafted response variants</div>
                
                {selectedEmail.status === 'Drafted' && selectedEmail.drafts ? (
                  <>
                    {/* Variants Tabs */}
                    <div className={styles.variantTabs}>
                      {[
                        { id: 'a', label: 'Variant A — Standard' },
                        { id: 'b', label: 'Variant B — Casual' },
                        { id: 'c', label: 'Variant C — Brief' },
                      ].map(v => (
                        <button
                          key={v.id}
                          type="button"
                          className={`${styles.variantTab} ${activeVariant === v.id ? styles.variantTabActive : ''}`}
                          onClick={() => setActiveVariant(v.id)}
                        >
                          {v.label}
                        </button>
                      ))}
                    </div>

                    {/* Subject line box */}
                    <div className={styles.subjectContainer}>
                      <span className={styles.subjectLabel}>Subject</span>
                      <div className={styles.subjectTextVal}>{activeSubject}</div>
                    </div>

                    {/* Editor Textarea */}
                    <div className={styles.editorContainer}>
                      <textarea
                        className={styles.editTextarea}
                        value={activeDraft}
                        onChange={e => handleTextChange(e.target.value)}
                        placeholder="Ghost's pre-drafted reply will appear here."
                        rows={6}
                      />
                    </div>

                    {/* Feedback row */}
                    <div className={styles.feedbackRow}>
                      <div className={styles.perceptionBadge}>
                        <i className="ti ti-messages" aria-hidden="true"></i>
                        <span>Perception: <strong>{activePerception}</strong></span>
                      </div>
                      
                      {forecast && (
                        <div className={styles.forecastContainer}>
                          <div className={styles.forecastItem} title="Outcome Outlook">
                            <i className="ti ti-target" aria-hidden="true"></i>
                            <span>Outlook: <strong>{forecast.positiveOutlook}%</strong></span>
                          </div>
                          <div className={`${styles.forecastItem} ${forecast.passiveAggressiveness > 25 ? styles.riskHigh : styles.riskLow}`} title="PA Risk">
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

                    {/* Action buttons */}
                    <div className={styles.actionsRow}>
                      <button
                        type="button"
                        className={styles.actionBtn}
                        onClick={() => handleCopy(activeDraft)}
                      >
                        <i className={`ti ${copied ? 'ti-check' : 'ti-copy'}`} aria-hidden="true"></i>
                        {copied ? 'Copied!' : 'Copy response'}
                      </button>
                      <button
                        type="button"
                        className={`${styles.actionBtn} ${styles.actionPrimary}`}
                        onClick={() => handleExport(selectedEmail, activeDraft)}
                      >
                        <i className="ti ti-mail" aria-hidden="true"></i>
                        {exported ? 'Exporting...' : 'Export to Gmail'}
                      </button>
                    </div>
                  </>
                ) : selectedEmail.status === 'Failed' ? (
                  <div className={styles.errorBanner}>
                    <i className="ti ti-alert-circle"></i>
                    <span>Background pre-drafting failed for this email. Click Sync above to retry.</span>
                  </div>
                ) : (
                  <div className={styles.loadingPlaceholder}>
                    <i className="ti ti-loader-2" style={{ animation: 'spin 1s linear infinite' }}></i>
                    <span>Ghost is running voice fingerprinting simulations and pre-drafting responses...</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className={styles.emptyState}>
              <i className="ti ti-mail" aria-hidden="true"></i>
              <span>Select an email from the list to review pre-drafts.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
