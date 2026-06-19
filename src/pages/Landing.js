import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithPopup, signInWithRedirect } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import styles from './Landing.module.css';

const DEMO_MESSAGES = [
  { platform: 'Gmail', icon: 'ti-mail', received: 'Hey, are you free for a call tomorrow at 3pm to discuss the Q3 numbers?', reply: 'Tomorrow 3pm works. Send over the agenda beforehand so I can prep.' },
  { platform: 'WhatsApp', icon: 'ti-brand-whatsapp', received: 'bro you coming to the meetup this saturday or nah', reply: 'yeah should be there, what time does it start?' },
  { platform: 'Slack', icon: 'ti-brand-slack', received: 'Hey, the client wants the revised deck by EOD Friday. Is that doable?', reply: "Doable. I'll need the updated metrics from you by Thursday noon — can you make that work?" },
  { platform: 'X', icon: 'ti-brand-x', received: 'Your product sounds interesting. How is it different from existing tools?', reply: 'We learn your voice, not just your tone. Every draft sounds like YOU wrote it.' },
];

export default function Landing() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [activeDemo, setActiveDemo] = useState(0);
  const [authError, setAuthError] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setAuthError(false);
    try {
      await signInWithPopup(auth, googleProvider);
      navigate('/app');
    } catch (e) {
      console.warn("signInWithPopup blocked or failed, attempting signInWithRedirect:", e);
      try {
        await signInWithRedirect(auth, googleProvider);
      } catch (redirectErr) {
        console.error("Firebase Authentication failed:", redirectErr);
        setLoading(false);
        setAuthError(true);
      }
    }
  };

  return (
    <div className={styles.page}>
      {/* Nav */}
      <nav className={styles.nav}>
        <div className={styles.navLogo}>
          <span className={styles.logoDot}></span>
          Ghost
        </div>
        <div className={styles.navRight}>
          <button className={styles.navCta} onClick={handleGoogleLogin}>
            {loading ? 'Signing in…' : 'Get started free'}
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroBadge}>
          <i className="ti ti-sparkles" aria-hidden="true"></i>
          AI-powered · Voice-matched · Zero cringe
        </div>
        <h1 className={styles.heroH1}>
          Replies in <span className={styles.heroAccent}>your voice.</span>
          <br />Not some robot's.
        </h1>
        <p className={styles.heroSub}>
          Ghost learns how you write and drafts replies for Gmail, WhatsApp, Slack and X — in seconds.
          Stop staring at blank compose boxes.
        </p>
        <div className={styles.heroCtas}>
          <button className={styles.ctaPrimary} onClick={handleGoogleLogin} disabled={loading}>
            <i className="ti ti-brand-google" aria-hidden="true"></i>
            {loading ? 'Signing in…' : 'Continue with Google'}
          </button>

          {authError && (
            <div 
              style={{
                marginTop: '16px',
                padding: '12px 16px',
                background: 'rgba(226, 75, 74, 0.08)',
                border: '1px solid rgba(226, 75, 74, 0.2)',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#ff5b5b',
                maxWidth: '380px'
              }}
            >
              Google Login failed. Please check your network or try again.
            </div>
          )}

          <p className={styles.ctaNote}>No credit card · 10 free drafts/day</p>
        </div>
      </section>

      {/* Demo */}
      <section className={styles.demo}>
        <div className={styles.demoTabs}>
          {DEMO_MESSAGES.map((m, i) => (
            <button
              key={m.platform}
              className={`${styles.demoTab} ${activeDemo === i ? styles.demoTabActive : ''}`}
              onClick={() => setActiveDemo(i)}
            >
              <i className={`ti ${m.icon}`} aria-hidden="true"></i>
              {m.platform}
            </button>
          ))}
        </div>
        <div className={styles.demoCard}>
          <div className={styles.demoRow}>
            <div className={styles.demoCol}>
              <div className={styles.demoLabel}>Message received</div>
              <div className={styles.demoBubble + ' ' + styles.demoBubbleIn}>
                {DEMO_MESSAGES[activeDemo].received}
              </div>
            </div>
            <div className={styles.demoArrow}>
              <i className="ti ti-arrow-right" aria-hidden="true"></i>
            </div>
            <div className={styles.demoCol}>
              <div className={styles.demoLabel}>Ghost drafts</div>
              <div className={styles.demoBubble + ' ' + styles.demoBubbleOut}>
                {DEMO_MESSAGES[activeDemo].reply}
                <div className={styles.demoVoiceBadge}>
                  <i className="ti ti-wand" aria-hidden="true"></i> In your voice
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className={styles.features}>
        <h2 className={styles.featuresH2}>Built for people who hate writing replies</h2>
        <div className={styles.featuresGrid}>
          {[
            { icon: 'ti-microphone', title: 'Learns your voice', desc: 'Paste 5 messages you\'ve sent. Ghost extracts your tone fingerprint — how formal, warm, brief, or punchy you are.' },
            { icon: 'ti-devices', title: 'Every platform', desc: 'Email, WhatsApp, Slack, X, LinkedIn. Each draft is tuned to the platform\'s vibe — not just copy-pasted.' },
            { icon: 'ti-adjustments', title: 'Instant tweaks', desc: 'Too long? Hit shorten. Too stiff? Hit warmer. Need 3 options? Get variants A, B, C in one click.' },
            { icon: 'ti-history', title: 'Full history', desc: 'Every draft saved. Search, reload, and reuse your best replies — your ghostwriter never forgets.' },
            { icon: 'ti-lock', title: 'Privacy first', desc: 'Your messages train your local voice profile. We never read your inbox or store originals.' },
            { icon: 'ti-bolt', title: 'Seconds, not minutes', desc: 'Paste → click → copy. The average Ghost draft takes 4 seconds. Stop wasting brainpower on replies.' },
          ].map(f => (
            <div key={f.title} className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <i className={`ti ${f.icon}`} aria-hidden="true"></i>
              </div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Premium Power Features */}
      <section className={styles.premium}>
        <h2 className={styles.premiumH2}>Next-Level Workspace Upgrades</h2>
        <p className={styles.premiumSub}>Evolve from simple replies to a complete, proactive writing alter-ego cockpit.</p>
        <div className={styles.premiumGrid}>
          {[
            { icon: 'ti-database', title: 'Contextual Knowledge Vault', desc: 'Securely upload price sheets, FAQ notes, or bios. Ghost automatically retrieves facts to draft replies with absolute accuracy.' },
            { icon: 'ti-speakerphone', title: 'Multi-Channel Composer', desc: 'Announce updates on all platforms. Enter your overview once to draft tailored messages for Email, Slack, LinkedIn, and WhatsApp side-by-side.' },
            { icon: 'ti-list-check', title: 'Outreach Sequencer', desc: 'Create progressive multi-stage cold outreach email campaigns that build warm rapport and schedule meetings automatically.' },
            { icon: 'ti-wand', title: 'Interactive Chat Co-Pilot', desc: 'Chat directly with your writing persona to edit your drafts in real-time. Say "Suggest Wednesday afternoon at 2pm" to update copies instantly.' },
            { icon: 'ti-users', title: 'Team Brand Book', desc: 'Publish and sync custom brand personas with your organization. Keep support, sales, and executives writing in one unified voice.' },
            { icon: 'ti-trending-up', title: 'Vibe & Risk Forecasting', desc: 'Evaluate recipient sentiment outcome ratings, relationship style vibes, and passive-aggressive writing risks before sending.' },
          ].map(p => (
            <div key={p.title} className={styles.premiumCard}>
              <div className={styles.premiumIcon}>
                <i className={`ti ${p.icon}`} aria-hidden="true"></i>
              </div>
              <h3>{p.title}</h3>
              <p>{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Social proof */}
      <section className={styles.proof}>
        <h2 className={styles.proofH2}>The burnout is real. So is the fix.</h2>
        <div className={styles.proofGrid}>
          {[
            { quote: 'I spend 2 hours a day on emails alone. I just needed someone to write the first draft.', handle: '@productmanager', label: 'Product Manager' },
            { quote: 'Inbox zero used to feel impossible. Now I clear it in 20 mins. Ghost is the reason.', handle: '@startupcto', label: 'Startup CTO' },
            { quote: 'My WhatsApp replies sounded corporate. Ghost figured out I\'m actually pretty casual. Game changer.', handle: '@marketinghead', label: 'Marketing Lead' },
          ].map(p => (
            <div key={p.handle} className={styles.proofCard}>
              <p className={styles.proofQuote}>"{p.quote}"</p>
              <div className={styles.proofMeta}>
                <div className={styles.proofAvatar}>{p.label[0]}</div>
                <div>
                  <div className={styles.proofHandle}>{p.handle}</div>
                  <div className={styles.proofRole}>{p.label}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className={styles.finalCta}>
        <h2>Start ghostwriting in 30 seconds.</h2>
        <p>Free forever for 10 drafts/day. No card needed.</p>
        <button className={styles.ctaPrimary} onClick={handleGoogleLogin} disabled={loading}>
          <i className="ti ti-brand-google" aria-hidden="true"></i>
          {loading ? 'Signing in…' : 'Continue with Google'}
        </button>
      </section>

      <footer className={styles.footer} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className={styles.logoDot}></span> Ghost · Built by Elvyen
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <Link to="/privacy" style={{ color: 'rgba(255, 255, 255, 0.35)', textDecoration: 'none', fontSize: '12px', fontWeight: '500' }}>
            Privacy Policy
          </Link>
          <Link to="/terms" style={{ color: 'rgba(255, 255, 255, 0.35)', textDecoration: 'none', fontSize: '12px', fontWeight: '500' }}>
            Terms of Service
          </Link>
        </div>
      </footer>
    </div>
  );
}
