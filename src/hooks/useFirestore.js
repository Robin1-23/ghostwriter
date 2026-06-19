// hooks/useFirestore.js
import { useState, useEffect } from 'react';
import {
  doc, getDoc, setDoc, collection,
  addDoc, query, orderBy, limit,
  onSnapshot, serverTimestamp, getDocs, writeBatch,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';

// Default voice profile
const DEFAULT_VOICE = {
  tags: ['Direct', 'Warm', 'Low fluff', 'Clear', 'Concise'],
  formality: 35,
  warmth: 72,
  brevity: 68,
  assertiveness: 80,
  sampleCount: 0,
};

// Default user settings
const DEFAULT_SETTINGS = {
  alwaysMatchTone: true,
  avoidFillerPhrases: true,
  generate3Variants: false,
  autoDetectPlatform: true,
  learnFromDrafts: true,
  learnFromEdits: true,
  platformSpecificVoices: false,
  saveDraftHistory: true,
  shareAnalytics: false,
  openaiApiKey: '',
  apiProxyUrl: '',
  selectedPersona: 'default',
  personas: [
    { id: 'default', name: 'Standard' },
    { id: 'ceo', name: 'Executive' },
    { id: 'casual', name: 'Friend / Casual' },
  ],
};

// Voice profile — read/write from Firestore
export function useVoiceProfile(uid, platform = 'global') {
  const [profile, setProfile] = useState(DEFAULT_VOICE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    setLoading(true);

    const docId = platform === 'global' ? 'voiceProfile' : `voiceProfile_${platform}`;
    const ref = doc(db, 'users', uid, 'data', docId);
    getDoc(ref).then((snap) => {
      if (snap.exists()) {
        setProfile(snap.data());
      } else {
        setProfile({
          ...DEFAULT_VOICE,
          tags: platform === 'global' ? DEFAULT_VOICE.tags : [],
          sampleCount: 0,
        });
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [uid, platform]);

  const saveProfile = async (newProfile) => {
    setProfile(newProfile);
    if (!uid) return;

    const docId = platform === 'global' ? 'voiceProfile' : `voiceProfile_${platform}`;
    const ref = doc(db, 'users', uid, 'data', docId);
    await setDoc(ref, newProfile);
  };

  const clearProfile = async () => {
    const emptyProfile = {
      ...DEFAULT_VOICE,
      tags: platform === 'global' ? DEFAULT_VOICE.tags : [],
      sampleCount: 0,
    };
    setProfile(emptyProfile);
    if (!uid) return;

    const docId = platform === 'global' ? 'voiceProfile' : `voiceProfile_${platform}`;
    const ref = doc(db, 'users', uid, 'data', docId);
    await setDoc(ref, emptyProfile);
  };

  return { profile, saveProfile, clearProfile, loading };
}

// Bulk clear all voice profiles
export async function clearAllProfiles(uid) {
  if (!uid) return;
  const platforms = ['global', 'email', 'whatsapp', 'slack', 'x', 'linkedin'];

  const batch = writeBatch(db);
  platforms.forEach(platform => {
    const docId = platform === 'global' ? 'voiceProfile' : `voiceProfile_${platform}`;
    const ref = doc(db, 'users', uid, 'data', docId);
    batch.set(ref, {
      ...DEFAULT_VOICE,
      tags: platform === 'global' ? DEFAULT_VOICE.tags : [],
      sampleCount: 0,
    });
  });
  await batch.commit();
}

// User settings — read/write from Firestore
export function useUserSettings(uid) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    setLoading(true);

    const ref = doc(db, 'users', uid, 'data', 'settings');
    getDoc(ref).then((snap) => {
      if (snap.exists()) setSettings(snap.data());
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [uid]);

  const saveSettings = async (newSettings) => {
    setSettings(newSettings);
    if (!uid) return;

    const ref = doc(db, 'users', uid, 'data', 'settings');
    await setDoc(ref, newSettings);
  };

  return { settings, saveSettings, loading };
}

// Draft history — real-time listener
export function useDraftHistory(uid) {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) { setLoading(false); return; }
    setLoading(true);

    const q = query(
      collection(db, 'users', uid, 'drafts'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const unsub = onSnapshot(q, (snap) => {
      setDrafts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [uid]);

  const saveDraft = async (draft) => {
    if (!uid) return;

    const docRef = await addDoc(collection(db, 'users', uid, 'drafts'), {
      ...draft,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  };

  const updateDraft = async (docId, updatedFields) => {
    if (!uid || !docId) return;
    const ref = doc(db, 'users', uid, 'drafts', docId);
    await setDoc(ref, updatedFields, { merge: true });
  };

  const deleteHistory = async () => {
    setDrafts([]);
    if (!uid) return;

    const q = query(collection(db, 'users', uid, 'drafts'));
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.docs.forEach((d) => {
      batch.delete(d.ref);
    });
    await batch.commit();
  };

  return { drafts, saveDraft, updateDraft, deleteHistory, loading };
}

export function useKnowledgeVault(uid) {
  const [vault, setVault] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) { setLoading(false); return; }
    setLoading(true);

    const q = query(
      collection(db, 'users', uid, 'vault'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setVault(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [uid]);

  const addVaultItem = async (title, content) => {
    if (!uid) return;
    const docRef = await addDoc(collection(db, 'users', uid, 'vault'), {
      title,
      content,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  };

  const deleteVaultItem = async (docId) => {
    if (!uid || !docId) return;
    const ref = doc(db, 'users', uid, 'vault', docId);
    await deleteDoc(ref);
  };

  return { vault, addVaultItem, deleteVaultItem, loading };
}
