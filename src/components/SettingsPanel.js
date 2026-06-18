import React, { useState } from 'react';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { analyzeWritingStyle } from '../lib/api';
import styles from './SettingsPanel.module.css';

function Toggle({ checked = false, onChange }) {
  return (
    <div
      className={`${styles.toggle} ${checked ? styles.toggleOn : ''}`}
      onClick={() => onChange?.(!checked)}
      role="switch"
      aria-checked={checked}
    >
      <div className={styles.toggleThumb} />
    </div>
  );
}

export default function SettingsPanel({ settings, saveSettings, clearProfile, deleteHistory, restartTour, uid }) {
  const [clearing, setClearing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [newPersonaName, setNewPersonaName] = useState('');
  const [showCloner, setShowCloner] = useState(false);
  const [sampleText, setSampleText] = useState('');
  const [fileName, setFileName] = useState('');
  const [cloning, setCloning] = useState(false);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      setSampleText(evt.target.result);
      setFileName(file.name);
    };
    reader.readAsText(file);
  };

  const [canInstall, setCanInstall] = React.useState(!!window.deferredInstallPrompt);

  React.useEffect(() => {
    const handler = () => setCanInstall(true);
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallApp = () => {
    const promptEvent = window.deferredInstallPrompt;
    if (!promptEvent) return;
    
    promptEvent.prompt();
    promptEvent.userChoice.then((choice) => {
      if (choice.outcome === 'accepted') {
        console.log('User accepted the PWA install prompt');
      }
      window.deferredInstallPrompt = null;
      setCanInstall(false);
    });
  };

  const handleAddPersona = async (e) => {
    e.preventDefault();
    if (!newPersonaName.trim()) return;
    const cleanName = newPersonaName.trim();
    const id = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    if (!id) return;
    
    // Check if ID already exists
    if (settings.personas?.some(p => p.id === id)) {
      alert("A persona with a similar name already exists.");
      return;
    }

    setCloning(true);
    try {
      let profileData = null;
      if (showCloner && sampleText.trim()) {
        const analysis = await analyzeWritingStyle(sampleText, settings);
        profileData = {
          tags: analysis.tags || [],
          formality: analysis.formality !== undefined ? analysis.formality : 50,
          warmth: analysis.warmth !== undefined ? analysis.warmth : 50,
          brevity: analysis.brevity !== undefined ? analysis.brevity : 50,
          assertiveness: analysis.assertiveness !== undefined ? analysis.assertiveness : 50,
          sampleCount: 1,
        };
      }

      const updatedPersonas = [
        ...(settings.personas || []),
        { id, name: cleanName }
      ];

      // Save persona metadata to settings
      await saveSettings({
        ...settings,
        personas: updatedPersonas
      });

      // Save analyzed voice profile to Firestore if sample was provided
      if (profileData && uid) {
        const ref = doc(db, 'users', uid, 'data', `voiceProfile_${id}`);
        await setDoc(ref, profileData);
      }

      setNewPersonaName('');
      setSampleText('');
      setFileName('');
      setShowCloner(false);
      alert(`Persona "${cleanName}" added successfully!`);
    } catch (err) {
      console.error("Failed to add persona", err);
      alert("Error adding persona: " + err.message);
    } finally {
      setCloning(false);
    }
  };

  const handleDeletePersona = async (id) => {
    if (id === 'default') {
      alert("The Standard persona cannot be deleted.");
      return;
    }
    if (!window.confirm("Are you sure you want to delete this writing persona? All voice parameters and configurations associated with it will be archived.")) return;

    const updatedPersonas = (settings.personas || []).filter(p => p.id !== id);
    let newSelected = settings.selectedPersona;
    if (settings.selectedPersona === id) {
      newSelected = 'default';
    }

    try {
      await saveSettings({
        ...settings,
        personas: updatedPersonas,
        selectedPersona: newSelected
      });
    } catch (err) {
      console.error("Failed to delete persona", err);
    }
  };

  const handleToggle = async (key, val) => {
    if (!settings) return;
    try {
      await saveSettings({
        ...settings,
        [key]: val,
      });
    } catch (e) {
      console.error("Failed to save setting", e);
    }
  };

  const handleClearProfile = async () => {
    if (!window.confirm("Are you sure you want to clear your voice profile? This will reset all platform tone fingerprints and cannot be undone.")) return;
    setClearing(true);
    try {
      await clearProfile();
      alert("Voice profile cleared successfully.");
    } catch (e) {
      alert("Failed to clear voice profile.");
    }
    setClearing(false);
  };

  const handleDeleteHistory = async () => {
    if (!window.confirm("Are you sure you want to delete all saved drafts? This will permanently wipe your history and cannot be undone.")) return;
    setDeleting(true);
    try {
      await deleteHistory();
      alert("Draft history deleted successfully.");
    } catch (e) {
      alert("Failed to delete draft history.");
    }
    setDeleting(false);
  };

  if (!settings) {
    return (
      <div className={styles.loading}>
        <i className="ti ti-loader-2" style={{animation: 'spin 1s linear infinite', fontSize: 24, color: 'var(--purple)'}}></i>
        <span>Loading preferences...</span>
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      <div className={styles.grid}>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Reply behaviour</h3>
          <p className={styles.cardDesc}>Control how Ghost handles your drafts by default</p>
          <div className={styles.rows}>
            <div className={styles.row}>
              <span>Always match their tone</span>
              <Toggle checked={settings.alwaysMatchTone} onChange={(val) => handleToggle('alwaysMatchTone', val)} />
            </div>
            <div className={styles.row}>
              <span>Avoid filler phrases</span>
              <Toggle checked={settings.avoidFillerPhrases} onChange={(val) => handleToggle('avoidFillerPhrases', val)} />
            </div>
            <div className={styles.row}>
              <span>Generate 3 variants always</span>
              <Toggle checked={settings.generate3Variants} onChange={(val) => handleToggle('generate3Variants', val)} />
            </div>
            <div className={styles.row}>
              <span>Auto-detect platform</span>
              <Toggle checked={settings.autoDetectPlatform} onChange={(val) => handleToggle('autoDetectPlatform', val)} />
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Voice learning</h3>
          <p className={styles.cardDesc}>How Ghost builds and updates your voice model</p>
          <div className={styles.rows}>
            <div className={styles.row}>
              <span>Learn from every draft</span>
              <Toggle checked={settings.learnFromDrafts} onChange={(val) => handleToggle('learnFromDrafts', val)} />
            </div>
            <div className={styles.row}>
              <span>Learn from your edits</span>
              <Toggle checked={settings.learnFromEdits} onChange={(val) => handleToggle('learnFromEdits', val)} />
            </div>
            <div className={styles.row}>
              <span>Platform-specific voices</span>
              <Toggle checked={settings.platformSpecificVoices} onChange={(val) => handleToggle('platformSpecificVoices', val)} />
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Privacy</h3>
          <p className={styles.cardDesc}>Your messages are never stored as raw text — only the voice fingerprint.</p>
          <div className={styles.rows}>
            <div className={styles.row}>
              <span>Save draft history</span>
              <Toggle checked={settings.saveDraftHistory} onChange={(val) => handleToggle('saveDraftHistory', val)} />
            </div>
            <div className={styles.row}>
              <span>Share usage analytics</span>
              <Toggle checked={settings.shareAnalytics} onChange={(val) => handleToggle('shareAnalytics', val)} />
            </div>
          </div>
        </div>

        {/* Developer credentials card linked directly to settings */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Developer credentials</h3>
          <p className={styles.cardDesc}>Run client-side requests using your custom keys (Saved to profile)</p>
          <div className={styles.inputs}>
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>OpenAI API Key</label>
              <input
                type="password"
                className={styles.textInput}
                placeholder="sk-..."
                value={settings.openaiApiKey || ''}
                onChange={e => handleToggle('openaiApiKey', e.target.value)}
              />
            </div>
            <div className={styles.inputGroup} style={{marginTop: 10}}>
              <label className={styles.inputLabel}>Custom Proxy URL (Optional)</label>
              <input
                type="text"
                className={styles.textInput}
                placeholder="https://..."
                value={settings.apiProxyUrl || ''}
                onChange={e => handleToggle('apiProxyUrl', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Persona Manager card */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Persona manager</h3>
          <p className={styles.cardDesc}>Create and delete custom writing alter-egos (Isolation profiles)</p>
          <div className={styles.personaList}>
            {(settings.personas || []).map(p => (
              <div key={p.id} className={styles.personaRow}>
                <div className={styles.personaInfo}>
                  <i className="ti ti-user-pentagon" style={{ color: p.id === settings.selectedPersona ? 'var(--purple-light)' : 'rgba(255, 255, 255, 0.35)' }}></i>
                  <span className={p.id === settings.selectedPersona ? styles.personaActiveName : ''}>{p.name}</span>
                  {p.id === settings.selectedPersona && <span className={styles.activeLabel}>Active</span>}
                </div>
                {p.id !== 'default' && (
                  <button
                    type="button"
                    className={styles.deletePersonaBtn}
                    onClick={() => handleDeletePersona(p.id)}
                    title={`Delete ${p.name}`}
                  >
                    <i className="ti ti-trash"></i>
                  </button>
                )}
              </div>
            ))}
          </div>
          <form onSubmit={handleAddPersona} className={styles.addPersonaForm}>
            <div className={styles.addPersonaInputRow}>
              <input
                type="text"
                className={styles.textInput}
                placeholder="Persona name (e.g. Support)..."
                value={newPersonaName}
                onChange={e => setNewPersonaName(e.target.value)}
                maxLength={25}
                disabled={cloning}
              />
              <button 
                type="submit" 
                className={styles.addPersonaBtn} 
                disabled={!newPersonaName.trim() || cloning}
              >
                {cloning ? (
                  <><i className="ti ti-loader-2" style={{ animation: 'spin 1s linear infinite' }}></i> Cloning...</>
                ) : (
                  <>
                    <i className="ti ti-plus" aria-hidden="true"></i>
                    <span>{sampleText.trim() ? 'Add & Clone' : 'Add'}</span>
                  </>
                )}
              </button>
            </div>

            <div className={styles.clonerToggleRow}>
              <button
                type="button"
                className={styles.clonerToggleBtn}
                onClick={() => setShowCloner(!showCloner)}
                disabled={cloning}
              >
                <i className={`ti ${showCloner ? 'ti-chevron-up' : 'ti-chevron-down'}`} aria-hidden="true" style={{ marginRight: 6 }}></i>
                <span>Clone style from writing sample (AI analysis)</span>
              </button>
            </div>

            {showCloner && (
              <div className={styles.clonerContent}>
                <textarea
                  className={styles.clonerTextarea}
                  placeholder="Paste a writing sample of this style here (e.g. emails, posts, or articles) so AI can analyze the tone fingerprint..."
                  value={sampleText}
                  onChange={e => setSampleText(e.target.value)}
                  rows={4}
                  disabled={cloning}
                />
                <div className={styles.clonerFileRow}>
                  <label className={styles.fileUploadLabel}>
                    <i className="ti ti-file-upload" aria-hidden="true" style={{ marginRight: 6 }}></i>
                    {fileName ? `File: ${fileName}` : "Upload .txt sample file"}
                    <input
                      type="file"
                      accept=".txt"
                      onChange={handleFileUpload}
                      style={{ display: 'none' }}
                      disabled={cloning}
                    />
                  </label>
                  {fileName && (
                    <button
                      type="button"
                      className={styles.clearFileBtn}
                      onClick={() => {
                        setFileName('');
                        setSampleText('');
                      }}
                      disabled={cloning}
                    >
                      Clear file
                    </button>
                  )}
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Help & Onboarding card */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Help & onboarding</h3>
          <p className={styles.cardDesc}>Need a quick guide on how Ghost works?</p>
          <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              className={styles.restartTourBtn}
              onClick={restartTour}
            >
              <i className="ti ti-help" style={{ marginRight: 6 }}></i> Restart onboarding tour
            </button>

            {canInstall && (
              <button
                type="button"
                className={styles.restartTourBtn}
                onClick={handleInstallApp}
                style={{ background: 'rgba(127, 119, 221, 0.1)', borderColor: 'rgba(127, 119, 221, 0.35)', color: 'var(--purple-light)' }}
              >
                <i className="ti ti-download" style={{ marginRight: 6 }}></i> Install Ghost App
              </button>
            )}
          </div>
        </div>
      </div>

      <div className={styles.dangerZone}>
        <h3 className={styles.dangerTitle}>Danger zone</h3>
        <div className={styles.dangerRow}>
          <div>
            <div className={styles.dangerLabel}>Clear voice profile</div>
            <div className={styles.dangerSub}>Resets all platform tone fingerprints. Can't be undone.</div>
          </div>
          <button className={styles.dangerBtn} onClick={handleClearProfile} disabled={clearing}>
            {clearing ? "Clearing..." : "Clear profile"}
          </button>
        </div>
        <div className={styles.dangerRow}>
          <div>
            <div className={styles.dangerLabel}>Delete all history</div>
            <div className={styles.dangerSub}>Permanently deletes all saved drafts.</div>
          </div>
          <button className={styles.dangerBtn} onClick={handleDeleteHistory} disabled={deleting}>
            {deleting ? "Deleting..." : "Delete history"}
          </button>
        </div>
      </div>
    </div>
  );
}
