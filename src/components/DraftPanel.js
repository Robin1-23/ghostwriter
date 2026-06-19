import React, { useState, useEffect, useRef } from 'react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { generateReplies, shortenDraft, elaborateDraft, suggestIntents, analyzeEdits, modifyDraft } from '../lib/api';
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

const ALL_VARIANTS = [
  { id: 'a', label: 'Variant A — Standard' },
  { id: 'b', label: 'Variant B — Casual' },
  { id: 'c', label: 'Variant C — Brief' },
];

const PRESETS = [
  { 
    id: 'nudge', 
    label: 'Gentle Nudge', 
    icon: 'ti-bell',
    formality: 40, warmth: 75, brevity: 65,
    context: 'Politely follow up on the previous message without sounding pushy.'
  },
  { 
    id: 'decline', 
    label: 'Diplomatic No', 
    icon: 'ti-circle-x',
    formality: 65, warmth: 45, brevity: 55,
    context: 'Politely but firmly decline the invitation, request, or proposal.'
  },
  { 
    id: 'urgent', 
    label: 'Urgent Ask', 
    icon: 'ti-alert-octagon',
    formality: 50, warmth: 55, brevity: 70,
    context: 'Clearly request immediate action or a response by EOD.'
  },
  { 
    id: 'accept', 
    label: 'Warm Accept', 
    icon: 'ti-circle-check',
    formality: 35, warmth: 90, brevity: 60,
    context: 'Enthusiastically accept and express excitement.'
  },
];

const TONE_RULES = [
  {
    phrase: "hope this email finds you well",
    type: "robotic",
    label: "AI Cliché / Greeting",
    desc: "Overused generic corporate greeting that sounds robotic.",
    alternatives: ["How are you doing?", "Hope your week is going great!", "(Omit greeting)"]
  },
  {
    phrase: "delighted to connect",
    type: "robotic",
    label: "AI Greeting Cliché",
    desc: "Common AI email opener; sounds artificial.",
    alternatives: ["Great connecting with you", "Nice to meet you", "Thanks for reaching out"]
  },
  {
    phrase: "delighted to assist",
    type: "robotic",
    label: "Chatbot Phrasing",
    desc: "Sounds like a customer service virtual assistant.",
    alternatives: ["Happy to help with this", "Glad to help", "Sure thing!"]
  },
  {
    phrase: "delve",
    type: "robotic",
    label: "AI Buzzword",
    desc: "Highly overused AI term; rarely used by humans.",
    alternatives: ["look into", "explore", "examine", "go deep into"]
  },
  {
    phrase: "tapestry",
    type: "robotic",
    label: "AI Buzzword",
    desc: "Highly overused AI metaphor.",
    alternatives: ["mix", "combination", "network", "ecosystem"]
  },
  {
    phrase: "testament",
    type: "robotic",
    label: "AI Cliché",
    desc: "Overused word in LLM output representing proof.",
    alternatives: ["proof", "shows", "demonstrates"]
  },
  {
    phrase: "furthermore",
    type: "robotic",
    label: "Formal AI Transition",
    desc: "Too academic or formal for standard chats/emails.",
    alternatives: ["Also", "In addition", "Plus"]
  },
  {
    phrase: "moreover",
    type: "robotic",
    label: "Formal AI Transition",
    desc: "Too academic/formal for general communication.",
    alternatives: ["Also", "Additionally"]
  },
  {
    phrase: "please do not hesitate",
    type: "robotic",
    label: "Robotic Cliché",
    desc: "Passive corporate boilerplate.",
    alternatives: ["Let me know", "Reach out anytime", "Feel free to ask"]
  },
  {
    phrase: "per my last",
    type: "stiff",
    label: "Passive-Aggressive Trigger",
    desc: "Usually sounds highly irritated, defensive, or accusatory.",
    alternatives: ["As mentioned earlier,", "Just to recap,", "Like we discussed,"]
  },
  {
    phrase: "as stated",
    type: "stiff",
    label: "Stiff / Impatient",
    desc: "Can sound impatient or defensive.",
    alternatives: ["As mentioned,", "Like we discussed,"]
  },
  {
    phrase: "obviously",
    type: "stiff",
    label: "Condescending Word",
    desc: "Can sound dismissive or condescending.",
    alternatives: ["Indeed", "Naturally", "(Omit word)"]
  },
  {
    phrase: "actually",
    type: "stiff",
    label: "Defensive Trigger",
    desc: "Often sounds corrective, pedantic, or defensive.",
    alternatives: ["Indeed,", "In fact,", "(Omit word)"]
  },
  {
    phrase: "clearly",
    type: "stiff",
    label: "Stiff / Dismissive",
    desc: "Suggests the recipient is failing to see something obvious.",
    alternatives: ["Naturally,", "It seems that,", "(Omit word)"]
  },
  {
    phrase: "to clarify",
    type: "stiff",
    label: "Condescending Transition",
    desc: "Can imply the recipient has difficulty understanding.",
    alternatives: ["To make sure we're on the same page,", "Just to explain,"]
  },
  {
    phrase: "as per",
    type: "stiff",
    label: "Bureaucratic Stiff",
    desc: "Formal, dry, and overly legalistic.",
    alternatives: ["According to", "Following", "Based on"]
  },
  {
    phrase: "thanks for",
    type: "warm",
    label: "Gratitude / Warmth",
    desc: "Friendly acknowledgment and appreciation.",
    alternatives: []
  },
  {
    phrase: "appreciate",
    type: "warm",
    label: "Warm Appreciation",
    desc: "Shows respect and active gratitude.",
    alternatives: []
  },
  {
    phrase: "great to",
    type: "warm",
    label: "Welcoming Tone",
    desc: "Positive, welcoming, and open tone.",
    alternatives: []
  },
  {
    phrase: "excited",
    type: "warm",
    label: "Enthusiasm",
    desc: "Enthusiastic and engaged tone.",
    alternatives: []
  },
  {
    phrase: "looking forward",
    type: "warm",
    label: "Constructive & Warm",
    desc: "Forward-looking and relationship-building.",
    alternatives: []
  },
  {
    phrase: "happy to help",
    type: "warm",
    label: "Helpful & Warm",
    desc: "Friendly and approachable helper tone.",
    alternatives: []
  },
  {
    phrase: "thank you",
    type: "warm",
    label: "Gratitude / Polite",
    desc: "Classic polite appreciation.",
    alternatives: []
  },
  {
    phrase: "congratulations",
    type: "warm",
    label: "Supportive / Warm",
    desc: "Celebratory and highly positive.",
    alternatives: []
  }
];

const renderHighlightedText = (text, onReplace, styles) => {
  if (!text) return null;
  const regexParts = TONE_RULES.map(r => r.phrase.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));
  const toneRegex = new RegExp(`\\b(${regexParts.join('|')})\\b`, 'gi');

  const matches = [...text.matchAll(toneRegex)];
  if (matches.length === 0) return text;

  const result = [];
  let lastIndex = 0;

  matches.forEach((match, idx) => {
    const matchedText = match[0];
    const matchIndex = match.index;
    
    if (matchIndex > lastIndex) {
      result.push(text.substring(lastIndex, matchIndex));
    }

    const rule = TONE_RULES.find(r => r.phrase.toLowerCase() === matchedText.toLowerCase());

    if (rule) {
      result.push(
        <span key={idx} className={`${styles.heatmapSpan} ${styles[rule.type]}`}>
          {matchedText}
          <span className={styles.tooltip}>
            <strong className={styles.tooltipLabel}>{rule.label}</strong>
            <span className={styles.tooltipDesc}>{rule.desc}</span>
            {rule.alternatives && rule.alternatives.length > 0 && (
              <div className={styles.tooltipAlts}>
                <span>Suggested Replacements:</span>
                <div className={styles.altButtons}>
                  {rule.alternatives.map((alt, aIdx) => (
                    <button
                      key={aIdx}
                      type="button"
                      className={styles.altBtn}
                      onClick={() => onReplace(matchedText, alt)}
                    >
                      {alt}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </span>
        </span>
      );
    } else {
      result.push(matchedText);
    }

    lastIndex = matchIndex + matchedText.length;
  });

  if (lastIndex < text.length) {
    result.push(text.substring(lastIndex));
  }

  return result;
};

const getPersonaMetrics = (p) => {
  const defaults = {
    default: { formality: 35, warmth: 72, brevity: 68 },
    ceo: { formality: 80, warmth: 40, brevity: 55 },
    casual: { formality: 20, warmth: 85, brevity: 75 },
  };
  return {
    formality: p.formality !== undefined ? p.formality : (defaults[p.id]?.formality || 50),
    warmth: p.warmth !== undefined ? p.warmth : (defaults[p.id]?.warmth || 50),
    brevity: p.brevity !== undefined ? p.brevity : (defaults[p.id]?.brevity || 50),
  };
};

const interpolateTraits = (x, y, personasList) => {
  let totalWeight = 0;
  let weights = [];
  let exactMatch = null;

  personasList.forEach((p) => {
    const metrics = getPersonaMetrics(p);
    const px = metrics.warmth;
    const py = 100 - metrics.formality;
    const dist = Math.sqrt((x - px) ** 2 + (y - py) ** 2);

    if (dist < 1.5) {
      exactMatch = metrics;
    }

    const w = 1 / (dist ** 2 || 0.01);
    weights.push({ metrics, w });
    totalWeight += w;
  });

  if (exactMatch) {
    return {
      formality: Math.round(exactMatch.formality),
      warmth: Math.round(exactMatch.warmth),
      brevity: Math.round(exactMatch.brevity),
    };
  }

  let formality = 0;
  let warmth = 0;
  let brevity = 0;

  weights.forEach(item => {
    const norm = item.w / totalWeight;
    formality += norm * item.metrics.formality;
    warmth += norm * item.metrics.warmth;
    brevity += norm * item.metrics.brevity;
  });

  return {
    formality: Math.round(Math.min(100, Math.max(0, formality))),
    warmth: Math.round(Math.min(100, Math.max(0, warmth))),
    brevity: Math.round(Math.min(100, Math.max(0, brevity))),
  };
};

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

export default function DraftPanel({ platform, tone, voiceProfile, saveProfile, saveDraft, updateDraft, preloadMsg, onPreloadConsumed, settings, vault }) {
  const [mode, setMode] = useState('reply'); // 'reply' or 'compose'
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('input');
  const [context, setContext] = useState('');

  // Speech Recognition hook instances
  const speechMain = useSpeechRecognition((text) => {
    setMessage((prev) => (prev ? prev + ' ' + text : text));
  });

  const speechContext = useSpeechRecognition((text) => {
    setContext((prev) => (prev ? prev + ' ' + text : text));
  });
  const [chip, setChip] = useState('match');
  const [loading, setLoading] = useState(false);
  const [shortening, setShortening] = useState(false);
  const [elaborating, setElaborating] = useState(false);
  const [threadContext, setThreadContext] = useState('');
  const [showThread, setShowThread] = useState(false);
  const [language, setLanguage] = useState('English');
  const [drafts, setDrafts] = useState({ a: '', b: '', c: '' });
  const [subjects, setSubjects] = useState({ a: '', b: '', c: '' });
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

  // Chat Co-Pilot editor state
  const [copilotInstructions, setCopilotInstructions] = useState('');
  const [modifying, setModifying] = useState(false);

  const speechCopilot = useSpeechRecognition((text) => {
    setCopilotInstructions((prev) => (prev ? prev + ' ' + text : text));
  });

  // Tone Heatmap view mode state
  const [viewMode, setViewMode] = useState('text');

  const handleReplacePhrase = (originalText, replacementText) => {
    let finalReplacement = replacementText;
    if (replacementText === "(Omit word)" || replacementText === "(Omit greeting)") {
      finalReplacement = "";
    }
    const escaped = originalText.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'g');
    const newText = drafts[active].replace(regex, finalReplacement).replace(/\s+/g, ' ').trim();
    
    setDrafts(prev => ({ ...prev, [active]: newText }));
    setOriginalDrafts(prev => ({ ...prev, [active]: newText }));
    
    if (activeDocId) {
      updateDraft?.(activeDocId, {
        drafts: { ...drafts, [active]: newText },
        originalDrafts: { ...drafts, [active]: newText },
        reply: newText,
      });
    }
  };

  const handleModifyDraft = async () => {
    const current = drafts[active];
    if (!current || !copilotInstructions.trim() || modifying) return;
    setModifying(true);
    setError('');
    try {
      const modified = await modifyDraft(current, copilotInstructions.trim(), settings);
      setDrafts(prev => ({ ...prev, [active]: modified }));
      setOriginalDrafts(prev => ({ ...prev, [active]: modified }));
      setCopilotInstructions('');
      setHasSavedProfile(false);

      if (activeDocId) {
        await updateDraft?.(activeDocId, {
          drafts: { ...drafts, [active]: modified },
          originalDrafts: { ...drafts, [active]: modified },
          reply: modified,
        });
      }
    } catch (e) {
      console.error(e);
      setError('Co-Pilot failed to refine draft. Please try again.');
    }
    setModifying(false);
  };

  const handleCopilotKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleModifyDraft();
    }
  };

  // Advanced Tone Overrides State
  const [showSliders, setShowSliders] = useState(false);
  const [overrideMode, setOverrideMode] = useState('manual'); // 'manual' or 'blend'
  const svgRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const [formalityOverride, setFormalityOverride] = useState(50);
  const [warmthOverride, setWarmthOverride] = useState(50);
  const [brevityOverride, setBrevityOverride] = useState(50);

  const handlePointerDown = (e) => {
    setIsDragging(true);
    updatePositionFromEvent(e);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    updatePositionFromEvent(e);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const updatePositionFromEvent = (e) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    
    // Get client coordinates depending on mouse or touch
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    const xRaw = ((clientX - rect.left) / rect.width) * 100;
    const yRaw = ((clientY - rect.top) / rect.height) * 100;
    
    const x = Math.min(100, Math.max(0, xRaw));
    const y = Math.min(100, Math.max(0, yRaw));

    // Interpolate metrics
    const list = settings?.personas || [
      { id: 'default', name: 'Standard' },
      { id: 'ceo', name: 'Executive' },
      { id: 'casual', name: 'Friend / Casual' },
    ];
    
    const traits = interpolateTraits(x, y, list);
    
    setFormalityOverride(traits.formality);
    setWarmthOverride(traits.warmth);
    setBrevityOverride(traits.brevity);
  };

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
      setMode(preloadMsg.mode || 'reply');
      setViewMode('text');

      if (preloadMsg.drafts) {
        setDrafts(preloadMsg.drafts);
        setOriginalDrafts(preloadMsg.originalDrafts || preloadMsg.drafts);
      } else {
        setDrafts({ a: preloadMsg.reply || '', b: '', c: '' });
        setOriginalDrafts({ a: preloadMsg.reply || '', b: '', c: '' });
      }

      if (preloadMsg.subjects) {
        setSubjects(preloadMsg.subjects);
      } else {
        setSubjects({ a: '', b: '', c: '' });
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
    if (mode !== 'reply' || !message.trim() || message.trim().length < 15) {
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
  }, [message, mode]);

  const handleGenerate = async () => {
    if (!message.trim() || loading) return;
    setLoading(true);
    setError('');
    setDrafts({ a: '', b: '', c: '' });
    setOriginalDrafts({ a: '', b: '', c: '' });
    setSubjects({ a: '', b: '', c: '' });
    setPerceptions({ a: '', b: '', c: '' });
    setHasSavedProfile(false);
    setActive('a');
    setActiveDocId(null);
    setActiveTab('output'); // Auto-switch to response tab on mobile
    setViewMode('text');
    try {
      const vaultContext = vault && vault.length > 0
        ? vault.map(v => `[${v.title}]: ${v.content}`).join('\n\n')
        : '';

      const result = await generateReplies({
        mode,
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
        vaultContext,
      });

      const cleanResult = {
        a: result.a?.text || '',
        b: result.b?.text || '',
        c: result.c?.text || '',
      };
      const cleanSubjects = {
        a: result.a?.subject || '',
        b: result.b?.subject || '',
        c: result.c?.subject || '',
      };
      const cleanPerceptions = {
        a: result.a?.perception || 'Polite & direct',
        b: result.b?.perception || 'Casual & warm',
        c: result.c?.perception || 'Concise & brief',
      };

      setDrafts(cleanResult);
      setOriginalDrafts(cleanResult);
      setSubjects(cleanSubjects);
      setPerceptions(cleanPerceptions);

      if (settings?.saveDraftHistory !== false) {
        const id = await saveDraft?.({
          mode,
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
          subjects: cleanSubjects,
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
          {/* Mode Selector Segment Control */}
          <div className={styles.modeToggleRow}>
            <button
              type="button"
              className={`${styles.modeTab} ${mode === 'reply' ? styles.modeTabActive : ''}`}
              onClick={() => {
                setMode('reply');
                setMessage('');
                setDrafts({ a: '', b: '', c: '' });
                setSubjects({ a: '', b: '', c: '' });
              }}
            >
              <i className="ti ti-arrow-back-up" aria-hidden="true"></i>
              Reply to message
            </button>
            <button
              type="button"
              className={`${styles.modeTab} ${mode === 'compose' ? styles.modeTabActive : ''}`}
              onClick={() => {
                setMode('compose');
                setMessage('');
                setDrafts({ a: '', b: '', c: '' });
                setSubjects({ a: '', b: '', c: '' });
              }}
            >
              <i className="ti ti-edit" aria-hidden="true"></i>
              Write from scratch
            </button>
          </div>

          {/* Thread Context Section (Replies only) */}
          {mode === 'reply' && (
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
          )}

          {/* Main Input Prompt */}
          <div className={styles.mainInputSection}>
            <div className={styles.inputHeaderRow}>
              <label className={styles.innerLabel}>
                {mode === 'compose' ? 'Describe the message you want to write' : 'Message received'}
              </label>
              {speechMain.isSupported && (
                <button
                  type="button"
                  className={`${styles.micBtn} ${speechMain.isListening ? styles.micActive : ''}`}
                  onClick={speechMain.isListening ? speechMain.stopListening : speechMain.startListening}
                  title={speechMain.isListening ? "Stop listening" : "Dictate message"}
                >
                  <i className={`ti ${speechMain.isListening ? 'ti-microphone-off' : 'ti-microphone'}`}></i>
                  {speechMain.isListening && <span className={styles.listeningPulse}></span>}
                </button>
              )}
            </div>
            <textarea
              ref={textareaRef}
              className={styles.mainTextarea}
              placeholder={mode === 'compose'
                ? 'What do you want this message to be about? (e.g. "Request Prince to send the Q3 design deck by Friday")'
                : 'Paste the message you need to reply to…'
              }
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={6}
            />
          </div>

          {/* Intent Suggestions Chips (Replies only) */}
          {mode === 'reply' && (intents.length > 0 || loadingIntents) && (
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

          {/* Extra Context / Custom Guidance */}
          <div className={styles.contextSection}>
            <div className={styles.inputHeaderRow}>
              <label className={styles.innerLabel}>
                {mode === 'compose' ? 'Custom instructions (Optional)' : 'How do you want to reply? (Optional)'}
              </label>
              {speechContext.isSupported && (
                <button
                  type="button"
                  className={`${styles.micBtn} ${speechContext.isListening ? styles.micActive : ''}`}
                  onClick={speechContext.isListening ? speechContext.stopListening : speechContext.startListening}
                  title={speechContext.isListening ? "Stop listening" : "Dictate instructions"}
                >
                  <i className={`ti ${speechContext.isListening ? 'ti-microphone-off' : 'ti-microphone'}`}></i>
                  {speechContext.isListening && <span className={styles.listeningPulse}></span>}
                </button>
              )}
            </div>
            <textarea
              className={styles.contextTextarea}
              placeholder={mode === 'compose'
                ? 'Any extra style instructions — e.g. "Keep it highly polite", "Use bullet points for the main details"'
                : "Tell Ghost what you want to say — e.g. 'Reject the offer politely', 'Accept and ask for schedule'"
              }
              value={context}
              onChange={e => setContext(e.target.value)}
              rows={2}
            />
          </div>

          {/* Tone Preset Macros */}
          <div className={styles.presetsRow}>
            {PRESETS.map(p => (
              <button
                key={p.id}
                type="button"
                className={styles.presetChip}
                onClick={() => {
                  setFormalityOverride(p.formality);
                  setWarmthOverride(p.warmth);
                  setBrevityOverride(p.brevity);
                  setContext(p.context);
                  setShowSliders(true);
                  setOverrideMode('manual'); // Reset blending mode to manual
                }}
              >
                <i className={`ti ${p.icon}`} aria-hidden="true"></i>
                <span>{p.label}</span>
              </button>
            ))}
          </div>

          {/* Style Overrides Collapsible */}
          <div id="tour-overrides" className={`${styles.collapsibleSection} ${styles.overridesSection}`}>
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
                <div className={styles.slidersControls}>
                  {/* Override Modes Segment Control */}
                  <div className={styles.overrideModes}>
                    <button 
                      type="button" 
                      className={`${styles.overrideModeTab} ${overrideMode === 'manual' ? styles.overrideModeTabActive : ''}`}
                      onClick={() => setOverrideMode('manual')}
                    >
                      Manual Sliders
                    </button>
                    <button 
                      type="button" 
                      className={`${styles.overrideModeTab} ${overrideMode === 'blend' ? styles.overrideModeTabActive : ''}`}
                      onClick={() => setOverrideMode('blend')}
                    >
                      Persona Blender
                    </button>
                  </div>

                  {overrideMode === 'manual' ? (
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
                  ) : (
                    <div className={styles.blenderContainer}>
                      <div className={styles.blenderHeader}>
                        <span>Drag cursor to blend writing alter-egos</span>
                        <span className={styles.blenderCoords}>Formality: {formalityOverride}% · Warmth: {warmthOverride}%</span>
                      </div>
                      <div className={styles.blenderCanvasWrapper}>
                        <svg
                          ref={svgRef}
                          className={styles.blenderSvg}
                          viewBox="0 0 100 100"
                          onMouseDown={handlePointerDown}
                          onMouseMove={handlePointerMove}
                          onMouseUp={handlePointerUp}
                          onMouseLeave={handlePointerUp}
                          onTouchStart={handlePointerDown}
                          onTouchMove={handlePointerMove}
                          onTouchEnd={handlePointerUp}
                        >
                          {/* Grid Axes lines */}
                          <line x1="50" y1="0" x2="50" y2="100" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="0.5" strokeDasharray="2" />
                          <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="0.5" strokeDasharray="2" />
                          
                          {/* Axes Labels */}
                          <text x="50" y="4.5" textAnchor="middle" fontSize="3.2" fill="rgba(255,255,255,0.25)" fontWeight="700">FORMAL</text>
                          <text x="50" y="98.5" textAnchor="middle" fontSize="3.2" fill="rgba(255,255,255,0.25)" fontWeight="700">CASUAL</text>
                          <text x="1.5" y="51.5" textAnchor="start" fontSize="3.2" fill="rgba(255,255,255,0.25)" fontWeight="700">COOL</text>
                          <text x="98.5" y="51.5" textAnchor="end" fontSize="3.2" fill="rgba(255,255,255,0.25)" fontWeight="700">WARM</text>
  
                          {/* Plot Persona Nodes */}
                          {(settings?.personas || [
                            { id: 'default', name: 'Standard' },
                            { id: 'ceo', name: 'Executive' },
                            { id: 'casual', name: 'Friend / Casual' },
                          ]).map(p => {
                            const m = getPersonaMetrics(p);
                            const px = m.warmth;
                            const py = 100 - m.formality;
                            return (
                              <g key={p.id}>
                                <circle cx={px} cy={py} r="2.5" fill="rgba(127, 119, 221, 0.4)" stroke="var(--purple-light)" strokeWidth="0.6" />
                                <text x={px} y={py - 4.5} textAnchor="middle" fontSize="3" fill="rgba(255, 255, 255, 0.85)" fontWeight="600">{p.name}</text>
                              </g>
                            );
                          })}
  
                          {/* Interactive Selector Crosshair */}
                          <circle cx={warmthOverride} cy={100 - formalityOverride} r="4" fill="rgba(175, 169, 236, 0.2)" stroke="var(--purple-light)" strokeWidth="1" />
                          <circle cx={warmthOverride} cy={100 - formalityOverride} r="1.2" fill="var(--purple-light)" />
                        </svg>
                      </div>
                    </div>
                  )}
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
        <div className={styles.sectionLabel}>{mode === 'compose' ? 'Your message' : 'Your reply'}</div>
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

          {hasResult && (
            <div className={styles.viewToggleRow}>
              <button
                type="button"
                className={`${styles.viewToggleBtn} ${viewMode === 'text' ? styles.viewToggleActive : ''}`}
                onClick={() => setViewMode('text')}
              >
                <i className="ti ti-edit"></i> Text Editor
              </button>
              <button
                type="button"
                className={`${styles.viewToggleBtn} ${viewMode === 'heatmap' ? styles.viewToggleActive : ''}`}
                onClick={() => setViewMode('heatmap')}
              >
                <i className="ti ti-activity"></i> Tone Heatmap
              </button>
            </div>
          )}

          {mode === 'compose' && platform === 'email' && subjects[active] && (
            <div className={styles.subjectWrapper}>
              <div className={styles.subjectHeader}>
                <span className={styles.subjectLabel}>Subject Line</span>
                <button 
                  type="button" 
                  className={styles.subjectCopyBtn}
                  onClick={() => {
                    navigator.clipboard.writeText(subjects[active]).catch(() => {});
                    alert("Subject line copied to clipboard!");
                  }}
                  title="Copy subject line"
                >
                  <i className="ti ti-copy"></i> Copy
                </button>
              </div>
              <input 
                type="text" 
                readOnly 
                value={subjects[active]} 
                className={styles.subjectInput} 
              />
            </div>
          )}

          <div className={styles.draftTextContainer}>
            {loading ? (
              <div className={styles.draftTextPlaceholder}>
                <span className={styles.thinking}>Crafting your reply<span className={styles.dots}>...</span></span>
              </div>
            ) : activeDraft ? (
              viewMode === 'heatmap' ? (
                <div className={styles.heatmapContainer}>
                  {renderHighlightedText(activeDraft, handleReplacePhrase, styles)}
                </div>
              ) : (
                <textarea
                  className={styles.draftTextarea}
                  value={activeDraft}
                  onChange={e => setDrafts(prev => ({ ...prev, [active]: e.target.value }))}
                  onBlur={handleDraftBlur}
                  placeholder="Your ghostwritten reply will appear here."
                />
              )
            ) : (
              <div className={styles.draftTextPlaceholder}>
                Your ghostwritten reply will appear here.
              </div>
            )}
          </div>

          {/* Chat Co-Pilot editor */}
          {activeDraft && (
            <div className={styles.copilotRow}>
              <div className={styles.copilotInputWrapper}>
                <i className="ti ti-wand" aria-hidden="true"></i>
                <input
                  type="text"
                  className={styles.copilotInput}
                  placeholder="Ask Ghost to refine this draft (e.g. 'Make it more eager', 'Suggest Tuesday 2pm')..."
                  value={copilotInstructions}
                  onChange={e => setCopilotInstructions(e.target.value)}
                  onKeyDown={handleCopilotKeyDown}
                />
                {speechCopilot.isSupported && (
                  <button
                    type="button"
                    className={`${styles.micBtnInline} ${speechCopilot.isListening ? styles.micActiveInline : ''}`}
                    onClick={speechCopilot.isListening ? speechCopilot.stopListening : speechCopilot.startListening}
                    title={speechCopilot.isListening ? "Stop listening" : "Dictate modification"}
                  >
                    <i className={`ti ${speechCopilot.isListening ? 'ti-microphone-off' : 'ti-microphone'}`}></i>
                  </button>
                )}
                <button
                  type="button"
                  className={styles.copilotBtn}
                  onClick={handleModifyDraft}
                  disabled={!copilotInstructions.trim() || modifying}
                  title="Modify draft"
                >
                  {modifying ? (
                    <i className="ti ti-loader-2" style={{ animation: 'spin 1s linear infinite' }}></i>
                  ) : (
                    <i className="ti ti-send"></i>
                  )}
                </button>
              </div>
            </div>
          )}

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
              {ALL_VARIANTS.filter(v => v.id !== active).map(v => (
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
