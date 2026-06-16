import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useVoiceProfile, useDraftHistory, useUserSettings, clearAllProfiles } from '../hooks/useFirestore';
import DraftPanel from '../components/DraftPanel';
import VoicePanel from '../components/VoicePanel';
import HistoryPanel from '../components/HistoryPanel';
import SettingsPanel from '../components/SettingsPanel';
import DashboardPanel from '../components/DashboardPanel';
import TourGuide from '../components/TourGuide';
import styles from './AppShell.module.css';

const PLATFORMS = [
  { id: 'email', label: 'Email', icon: 'ti-mail' },
  { id: 'whatsapp', label: 'WhatsApp', icon: 'ti-brand-whatsapp' },
  { id: 'slack', label: 'Slack', icon: 'ti-brand-slack' },
  { id: 'x', label: 'X', icon: 'ti-brand-x' },
  { id: 'linkedin', label: 'LinkedIn', icon: 'ti-brand-linkedin' },
];

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: 'ti-layout-dashboard' },
  { id: 'draft', label: 'Draft reply', icon: 'ti-edit' },
  { id: 'voice', label: 'My voice', icon: 'ti-microphone' },
  { id: 'history', label: 'History', icon: 'ti-history' },
  { id: 'settings', label: 'Settings', icon: 'ti-settings' },
];

const PANEL_META = {
  dashboard: { title: 'Dashboard', sub: 'Your writing performance and productivity metrics' },
  draft: { title: 'Draft a reply', sub: 'Paste the message you received — Ghost replies in your voice' },
  voice: { title: 'My voice', sub: 'Train Ghost with samples of your own writing' },
  history: { title: 'History', sub: 'Your recent ghostwritten drafts' },
  settings: { title: 'Settings', sub: 'Customize how Ghost writes for you' },
};

export default function AppShell() {
  const { user, logout } = useAuth();
  const [panel, setPanel] = useState('draft');
  const [platform, setPlatform] = useState('email');
  const [tone, setTone] = useState('auto');
  const [preloadMsg, setPreloadMsg] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Load user settings
  const { settings, saveSettings } = useUserSettings(user?.uid);

  // Fetch voice profile based on active persona and platform settings
  const activePersona = settings?.selectedPersona || 'default';
  const activeVoicePlatform = settings?.platformSpecificVoices ? `${activePersona}_${platform}` : activePersona;
  const { profile, saveProfile } = useVoiceProfile(user?.uid, activeVoicePlatform);

  // History & deletion
  const { drafts, saveDraft, updateDraft, deleteHistory } = useDraftHistory(user?.uid);

  const handleLogout = () => logout();

  const handlePersonaChange = async (personaId) => {
    await saveSettings({
      ...settings,
      selectedPersona: personaId
    });
  };

  const loadFromHistory = (draft) => {
    setPreloadMsg(draft);
    setPanel('draft');
    setIsSidebarOpen(false); // Close sidebar drawer on mobile
  };

  const handleClearProfile = () => clearAllProfiles(user?.uid);

  const [runTourKey, setRunTourKey] = useState(0);

  const restartTour = () => {
    localStorage.removeItem('ghost_tour_completed');
    setPanel('draft');
    setRunTourKey(prev => prev + 1);
  };

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
  };

  return (
    <div className={`${styles.shell} ${isSidebarOpen ? styles.sidebarOpen : ''}`} onMouseMove={handleMouseMove}>
      {/* Sidebar Overlay backdrop for mobile */}
      {isSidebarOpen && (
        <div className={styles.sidebarOverlay} onClick={() => setIsSidebarOpen(false)}></div>
      )}

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${isSidebarOpen ? styles.sidebarVisible : ''}`}>
        <div className={styles.logo}>
          <span className={styles.logoDot}></span>
          Ghost
          {/* Close button for mobile */}
          <button className={styles.closeSidebarBtn} onClick={() => setIsSidebarOpen(false)} title="Close menu">
            <i className="ti ti-x" aria-hidden="true"></i>
          </button>
        </div>

        {/* Persona Selector section */}
        <div className={styles.personaSection} id="tour-persona">
          <div className={styles.navLabel}>Active Persona</div>
          <div className={styles.personaDropdownWrapper}>
            <select
              className={styles.personaSelect}
              value={settings?.selectedPersona || 'default'}
              onChange={(e) => handlePersonaChange(e.target.value)}
              title="Select Persona Profile"
            >
              {settings?.personas?.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              )) || (
                <>
                  <option value="default">Standard</option>
                  <option value="ceo">Executive</option>
                  <option value="casual">Friend / Casual</option>
                </>
              )}
            </select>
          </div>
        </div>

        <div className={styles.navSection}>
          <div className={styles.navLabel}>Workspace</div>
          {NAV.map(n => (
            <button
              key={n.id}
              id={n.id === 'voice' ? 'tour-voice-nav' : undefined}
              className={`${styles.navItem} ${panel === n.id ? styles.navActive : ''}`}
              onClick={() => {
                setPanel(n.id);
                setIsSidebarOpen(false); // Close sidebar drawer on mobile
              }}
            >
              <i className={`ti ${n.icon}`} aria-hidden="true"></i>
              {n.label}
              {n.id === 'history' && drafts.length > 0 && (
                <span className={styles.badge}>{drafts.length}</span>
              )}
            </button>
          ))}
        </div>

        <div className={styles.platformSection}>
          <div className={styles.navLabel}>Platform</div>
          <div className={styles.platforms} id="tour-platforms">
            {PLATFORMS.map(p => (
              <button
                key={p.id}
                className={`${styles.platformChip} ${platform === p.id ? styles.platformActive : ''}`}
                onClick={() => {
                  setPlatform(p.id);
                  setIsSidebarOpen(false); // Close sidebar drawer on mobile
                }}
                title={p.label}
              >
                <i className={`ti ${p.icon}`} aria-hidden="true"></i>
                <span>{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* User */}
        <div className={styles.userRow}>
          {user?.photoURL && <img src={user.photoURL} alt="avatar" className={styles.avatar} />}
          <div className={styles.userInfo}>
            <div className={styles.userName}>{user?.displayName?.split(' ')[0] || 'You'}</div>
            <div className={styles.userEmail}>{user?.email}</div>
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout} title="Sign out">
            <i className="ti ti-logout" aria-hidden="true"></i>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className={styles.main}>
        <header className={styles.topbar}>
          <div className={styles.topbarMainRow}>
            {/* Mobile hamburger menu toggle */}
            <button className={styles.menuBtn} onClick={() => setIsSidebarOpen(true)} title="Open menu">
              <i className="ti ti-menu-2" aria-hidden="true"></i>
            </button>
            <div>
              <h1 className={styles.topTitle}>{PANEL_META[panel].title}</h1>
              <p className={styles.topSub}>{PANEL_META[panel].sub}</p>
            </div>
          </div>
          {panel === 'draft' && (
            <div className={styles.toneTabs}>
              {['auto', 'professional', 'casual', 'brief'].map(t => (
                <button
                  key={t}
                  className={`${styles.toneTab} ${tone === t ? styles.toneTabActive : ''}`}
                  onClick={() => setTone(t)}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          )}
        </header>

        <div className={styles.content}>
          {panel === 'dashboard' && (
            <DashboardPanel drafts={drafts} voiceProfile={profile} />
          )}
          {panel === 'draft' && (
            <DraftPanel
              platform={platform}
              tone={tone}
              voiceProfile={profile}
              saveProfile={saveProfile}
              saveDraft={saveDraft}
              updateDraft={updateDraft}
              preloadMsg={preloadMsg}
              onPreloadConsumed={() => setPreloadMsg(null)}
              settings={settings}
            />
          )}
          {panel === 'voice' && (
            <VoicePanel
              userSettings={settings}
              uid={user?.uid}
            />
          )}
          {panel === 'history' && (
            <HistoryPanel drafts={drafts} onLoad={loadFromHistory} />
          )}
          {panel === 'settings' && (
            <SettingsPanel
              settings={settings}
              saveSettings={saveSettings}
              clearProfile={handleClearProfile}
              deleteHistory={deleteHistory}
              restartTour={restartTour}
            />
          )}
        </div>
      </main>
      <TourGuide key={runTourKey} />
    </div>
  );
}
