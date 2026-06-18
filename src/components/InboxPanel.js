import React, { useState, useEffect, useRef } from 'react';
import { generateReplies } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../lib/firebase';
import styles from './InboxPanel.module.css';

// Decode Base64URL to UTF-8 string
function decodeBase64URL(str) {
  if (!str) return '';
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  try {
    return decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
  } catch (e) {
    try {
      return atob(base64);
    } catch (err) {
      console.warn("Failed base64 decoding:", err);
      return '';
    }
  }
}

// Encode UTF-8 string to Base64URL
function encodeBase64URL(str) {
  const utf8Bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < utf8Bytes.length; i++) {
    binary += String.fromCharCode(utf8Bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Extract body text from Gmail message payload
function getBodyText(payload) {
  if (!payload) return '';
  
  if (payload.body && payload.body.data) {
    return decodeBase64URL(payload.body.data);
  }
  
  if (payload.parts && payload.parts.length > 0) {
    const plainPart = payload.parts.find(p => p.mimeType === 'text/plain');
    if (plainPart && plainPart.body && plainPart.body.data) {
      return decodeBase64URL(plainPart.body.data);
    }
    
    for (const part of payload.parts) {
      const body = getBodyText(part);
      if (body) return body;
    }
  }
  
  return '';
}

// Format Gmail internalDate to user-friendly string
function formatGmailDate(internalDate) {
  if (!internalDate) return '';
  const date = new Date(parseInt(internalDate, 10));
  const now = new Date();
  
  const diffTime = Math.abs(now - date);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
}

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
  const { user } = useAuth();
  const [emails, setEmails] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [activeVariant, setActiveVariant] = useState('a');
  const [copied, setCopied] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [accessToken, setAccessToken] = useState(null);
  const [exportingId, setExportingId] = useState(null);
  const [toast, setToast] = useState(null);
  const inFlightRef = useRef(new Set());

  // Show Toast Notifications
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Handle Unauthorized Session Expiration
  const handleUnauthorized = () => {
    if (user?.uid) {
      localStorage.removeItem(`gmail_access_token_${user.uid}`);
    }
    setAccessToken(null);
    setEmails([]);
    showToast("Gmail session expired. Please connect again.", "error");
  };

  // Fetch unread messages from Gmail API
  const fetchGmailMessages = async (token) => {
    setIsSyncing(true);
    try {
      const listRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?q=is:unread&maxResults=8', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (listRes.status === 401) {
        handleUnauthorized();
        return;
      }
      
      if (!listRes.ok) {
        throw new Error(`Failed to fetch message list: ${listRes.statusText}`);
      }
      
      const listData = await listRes.json();
      if (!listData.messages || listData.messages.length === 0) {
        setEmails([]);
        setSelectedId(null);
        setIsSyncing(false);
        return;
      }
      
      // Fetch details for each message in parallel
      const details = await Promise.all(
        listData.messages.map(async (msg) => {
          const detailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (!detailRes.ok) {
            throw new Error(`Failed to fetch message details for ${msg.id}`);
          }
          
          return detailRes.json();
        })
      );
      
      // Map details to internal schema
      const mappedEmails = details.map((msg) => {
        const payload = msg.payload || {};
        const headers = payload.headers || [];
        
        const subjectHeader = headers.find(h => h.name.toLowerCase() === 'subject');
        const subject = subjectHeader ? subjectHeader.value : '(No Subject)';
        
        const fromHeader = headers.find(h => h.name.toLowerCase() === 'from');
        const from = fromHeader ? fromHeader.value : 'Unknown';
        
        let sender = from;
        let email = '';
        const emailMatch = from.match(/(.*)<(.*?@.*?)>/) || from.match(/<(.*?@.*?)>/);
        if (emailMatch) {
          if (emailMatch[2]) {
            sender = emailMatch[1] ? emailMatch[1].trim().replace(/^["']|["']$/g, '') : emailMatch[2];
            email = emailMatch[2].trim();
          } else {
            sender = '';
            email = emailMatch[1].trim();
          }
        } else {
          email = from;
        }
        if (!sender) sender = email.split('@')[0];
        
        const receivedText = getBodyText(payload) || msg.snippet || '';
        const formattedTime = formatGmailDate(msg.internalDate);
        const messageIdVal = headers.find(h => h.name.toLowerCase() === 'message-id')?.value || null;
        
        return {
          id: msg.id,
          threadId: msg.threadId,
          sender: sender,
          email: email,
          subject: subject,
          received: receivedText,
          timestamp: formattedTime,
          status: 'Drafting...', // triggers background worker
          messageId: messageIdVal
        };
      });
      
      setEmails(mappedEmails);
      if (mappedEmails.length > 0) {
        setSelectedId(mappedEmails[0].id);
        setActiveVariant('a');
      }
    } catch (error) {
      console.error("Error fetching Gmail messages:", error);
      showToast("Error syncing inbox: " + error.message, "error");
    } finally {
      setIsSyncing(false);
    }
  };

  // Connect to Google Gmail via OAuth Popup
  const handleConnectGmail = async () => {
    if (!user) return;
    setIsSyncing(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/gmail.readonly');
      provider.addScope('https://www.googleapis.com/auth/gmail.compose');
      
      provider.setCustomParameters({
        prompt: 'consent'
      });
      
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential && credential.accessToken) {
        localStorage.setItem(`gmail_access_token_${user.uid}`, credential.accessToken);
        setAccessToken(credential.accessToken);
        showToast("Connected to Gmail successfully!");
        fetchGmailMessages(credential.accessToken);
      } else {
        throw new Error("No access token returned from Google Auth popup.");
      }
    } catch (error) {
      console.error("Failed to connect to Gmail via OAuth:", error);
      showToast("Connection failed: " + error.message, "error");
    } finally {
      setIsSyncing(false);
    }
  };

  // Disconnect Gmail Account
  const handleDisconnectGmail = () => {
    if (user?.uid) {
      localStorage.removeItem(`gmail_access_token_${user.uid}`);
    }
    setAccessToken(null);
    setEmails([]);
    setSelectedId(null);
    showToast("Gmail account disconnected.");
  };

  // Sync / Reload Messages
  const handleSync = () => {
    if (accessToken) {
      fetchGmailMessages(accessToken);
    }
  };

  // Load access token and fetch messages on mount / user change
  useEffect(() => {
    if (user?.uid) {
      const token = localStorage.getItem(`gmail_access_token_${user.uid}`);
      setAccessToken(token);
      if (token) {
        fetchGmailMessages(token);
      }
    } else {
      setAccessToken(null);
    }
  }, [user]);

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
    setExportingId(emailItem.id);
    
    try {
      // 1. Attempt client-side Firebase draft save for history/analytics
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

      // 2. Export direct draft via Gmail REST API
      if (accessToken) {
        let subject = emailItem.subjects?.[activeVariant] || emailItem.subject || 'Re:';
        if (subject && !subject.toLowerCase().startsWith('re:')) {
          subject = 'Re: ' + subject;
        }

        const originalMessageId = emailItem.messageId;
        const originalEmail = emailItem.email;
        
        let rawEmail = `To: ${originalEmail}\n`;
        rawEmail += `Subject: ${subject}\n`;
        if (originalMessageId) {
          rawEmail += `In-Reply-To: ${originalMessageId}\n`;
          rawEmail += `References: ${originalMessageId}\n`;
        }
        rawEmail += `Content-Type: text/plain; charset=UTF-8\n\n`;
        rawEmail += text;

        const base64Raw = encodeBase64URL(rawEmail);

        const draftBody = {
          message: {
            threadId: emailItem.threadId,
            raw: base64Raw
          }
        };

        const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(draftBody)
        });

        if (res.status === 401) {
          handleUnauthorized();
          return;
        }

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error?.message || `Failed to create draft: ${res.statusText}`);
        }

        showToast("Draft created in your Gmail!");
      } else {
        // Fallback to mailto link
        const mailtoUrl = `mailto:${emailItem.email}?subject=${encodeURIComponent(
          emailItem.subjects?.[activeVariant] || emailItem.subject
        )}&body=${encodeURIComponent(text)}`;
        window.location.href = mailtoUrl;
        showToast("Opened draft in mail client");
      }
    } catch (err) {
      console.error("Failed to export draft to Gmail:", err);
      showToast("Draft creation failed: " + err.message, "error");
    } finally {
      setExportingId(null);
    }
  };

  if (!accessToken) {
    return (
      <div className={styles.connectContainer}>
        <div className={styles.connectCard}>
          <div className={styles.connectIcon}>
            <i className="ti ti-mail-fast" aria-hidden="true"></i>
          </div>
          <h2 className={styles.connectTitle}>Connect Inbox Co-Pilot</h2>
          <p className={styles.connectDesc}>
            Connect your Gmail inbox to let Ghost automatically pre-draft context-aware replies using your voice persona. Drafts are sent directly back to your Gmail Drafts folder.
          </p>
          
          <button
            type="button"
            className={styles.connectBtn}
            onClick={handleConnectGmail}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <><i className="ti ti-loader-2" style={{ animation: 'spin 1s linear infinite' }}></i> Connecting...</>
            ) : (
              <><i className="ti ti-brand-google" aria-hidden="true"></i> Connect Google Gmail</>
            )}
          </button>
          
          <div className={styles.privacyNote}>
            <i className="ti ti-shield-check"></i>
            <span>Privacy First: All operations run client-side. Ghost never stores or transfers your email data.</span>
          </div>
        </div>
        
        {toast && (
          <div className={`${styles.toast} ${toast.type === 'error' ? styles.toastError : ''}`}>
            <i className={`ti ${toast.type === 'error' ? 'ti-alert-circle' : 'ti-circle-check'}`}></i>
            <span>{toast.message}</span>
          </div>
        )}
      </div>
    );
  }

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
        <div className={styles.bannerActions}>
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
          
          <button
            type="button"
            className={styles.disconnectBtn}
            onClick={handleDisconnectGmail}
            title="Disconnect Gmail"
          >
            <i className="ti ti-logout"></i> Disconnect
          </button>
        </div>
      </div>

      <div className={styles.grid}>
        {/* Left Side List */}
        <div className={styles.listCard}>
          <div className={styles.listHeader}>Incoming Messages</div>
          <div className={styles.listContent}>
            {emails.length === 0 ? (
              <div className={styles.emptyInboxState}>
                <i className="ti ti-circle-check-filled"></i>
                <span>All caught up! No unread emails.</span>
              </div>
            ) : (
              emails.map(email => {
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
              })
            )}
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
                        disabled={exportingId !== null}
                      >
                        {exportingId === selectedEmail.id ? (
                          <><i className="ti ti-loader-2" style={{ animation: 'spin 1s linear infinite' }}></i> Exporting...</>
                        ) : (
                          <><i className="ti ti-mail" aria-hidden="true"></i> Export to Gmail</>
                        )}
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

      {toast && (
        <div className={`${styles.toast} ${toast.type === 'error' ? styles.toastError : ''}`}>
          <i className={`ti ${toast.type === 'error' ? 'ti-alert-circle' : 'ti-circle-check'}`}></i>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}

