// lib/api.js — all OpenAI API completions calls
import { auth } from './firebase';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

async function callOpenAI(system, userMsg, maxTokens = 1000, jsonMode = false, settings = null) {
  const localKey = settings?.openaiApiKey || localStorage.getItem('ghost_openai_api_key') || '';
  const localProxy = settings?.apiProxyUrl || localStorage.getItem('ghost_api_proxy_url') || '';
  
  let url;
  const headers = { 
    'Content-Type': 'application/json',
  };
  
  if (localKey) {
    url = localProxy || OPENAI_URL;
    headers['Authorization'] = `Bearer ${localKey}`;
  } else {
    // Fallback to central proxy API
    url = '/api/completions';
    
    // Retrieve Firebase Auth ID Token
    let token = null;
    if (auth.currentUser) {
      token = await auth.currentUser.getIdToken();
    }
    
    if (!token) {
      throw new Error('No API key found in Settings. Please sign in or configure your API key to continue.');
    }
    
    headers['Authorization'] = `Bearer ${token}`;
  }

  const body = {
    model: 'gpt-4o', // Using GPT-4o as the premium default
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: userMsg }
    ]
  };

  if (jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  
  if (!response.ok) {
    let errMsg = `API error: ${response.status}`;
    try {
      const errData = await response.json();
      if (errData?.error) {
        errMsg = errData.error;
      }
    } catch (_) {
      // ignore JSON parse failure
    }
    throw new Error(errMsg);
  }
  
  const data = await response.json();
  return data.choices[0].message.content.trim();
}

function cleanJson(raw) {
  return raw.replace(/```json|```/g, '').trim();
}

// Generate 3 reply variants with support for tone overrides
export async function generateReplies({ message, context, platform, tone, chip, voiceTags, settings, overrides, threadContext, language }) {
  const platformInstr = {
    email: 'Format as a short email reply. No subject line needed.',
    whatsapp: 'Format as a WhatsApp message — casual, conversational, no subject line.',
    slack: 'Format as a Slack message — concise, professional-casual. Use line breaks, not paragraphs.',
    x: 'Format as an X/Twitter reply — punchy, max 260 characters.',
    linkedin: 'Format as a LinkedIn message — professional but personable.',
  }[platform] || 'Format as a short reply.';

  const useAutoTone = tone === 'auto' || (settings?.alwaysMatchTone);
  
  const toneInstr = {
    auto: `Match the user's natural voice. Their voice traits: ${voiceTags?.join(', ') || 'direct, warm, low-fluff'}.`,
    professional: 'Write in a polished, professional tone.',
    casual: 'Write in a relaxed, casual tone.',
    brief: 'Write a very brief reply — 1-2 sentences max.',
  }[useAutoTone ? 'auto' : tone] || '';

  const chipInstr = {
    shorter: 'Keep the reply short.',
    formal: 'Use a more formal register.',
    warm: 'Be warmer and more empathetic.',
    match: '',
  }[chip] || '';

  const avoidFillerInstr = settings?.avoidFillerPhrases 
    ? 'AVOID filler phrases, corporate speak, and robotic transitions (e.g. "I hope this email finds you well", "Delighted to connect").' 
    : '';

  const langInstr = language && language !== 'English'
    ? `Write/Translate the replies strictly in ${language}.`
    : '';

  // Inject manual slider adjustments if user has modified them
  let overrideInstr = '';
  if (overrides) {
    overrideInstr = `Adjust generation styling metrics strictly to:
- Formality Level: ${overrides.formality}/100 (higher means more formal, professional; lower means casual, slang, loose).
- Warmth Level: ${overrides.warmth}/100 (higher means highly empathetic, friendly; lower means direct, cool, businesslike).
- Brevity Level: ${overrides.brevity}/100 (higher means extremely short, 1 sentence max; lower means descriptive, longer detail).`;
  }

  const system = `You are an AI ghostwriter. Write replies that sound like the user, not like an assistant.
${toneInstr}
${platformInstr}
${chipInstr}
${avoidFillerInstr}
${overrideInstr}
${langInstr}
${context ? `Extra context from user: ${context}` : ''}

Return ONLY valid JSON (no markdown wrapping, no backticks, no markdown blocks) with this format:
{
  "a": {"text": "main reply — most natural", "perception": "Concise 2-3 word description of the emotional/tone perception, e.g. 'Warm & friendly' or 'Polite & direct'"},
  "b": {"text": "casual/relaxed version", "perception": "Concise description"},
  "c": {"text": "very brief 1-2 sentence version", "perception": "Concise description"}
}`;

  const userMsg = `${threadContext ? `Previous thread history for context:\n${threadContext}\n\n` : ''}Message I received:\n\n${message}`;

  const raw = await callOpenAI(system, userMsg, 1000, true, settings);
  return JSON.parse(cleanJson(raw));
}

// Shorten a draft
export async function shortenDraft(text, settings) {
  const system = 'You are an editor. Make the reply shorter. Keep the same voice and meaning. Return only the shortened reply, no explanation.';
  return await callOpenAI(system, text, 400, false, settings);
}

// Elaborate/Expand a draft
export async function elaborateDraft(text, settings) {
  const system = 'You are an editor. Elaborate and expand the reply with professional, natural details while retaining the tone fingerprint. Make it more descriptive and polished. Return only the expanded reply, no explanation.';
  return await callOpenAI(system, text, 1000, false, settings);
}

// Analyze voice from samples
export async function analyzeVoice(samples, settings) {
  const system = `Analyze these writing samples and return a JSON object with:
- "tags": array of 5-7 short voice/tone keywords (e.g. "Direct", "Warm", "Emoji-heavy", "Formal", "Punchy")
- "formality": number 0-100
- "warmth": number 0-100
- "brevity": number 0-100
- "assertiveness": number 0-100

Return ONLY valid JSON (no markdown wrapping, no backticks, no markdown blocks).`;
  const raw = await callOpenAI(system, `Writing samples:\n\n${samples}`, 400, true, settings);
  return JSON.parse(cleanJson(raw));
}

// Suggest 3 reply intents/directions based on an incoming message
export async function suggestIntents(message, settings) {
  const system = `Analyze the incoming message and suggest exactly 3 short, logical, active-verb intents/directions for a reply (e.g. "Politely decline", "Accept & request time slots", "Ask for pricing details").
Return ONLY a valid JSON string array of length 3: ["Suggestion 1", "Suggestion 2", "Suggestion 3"]`;
  try {
    const raw = await callOpenAI(system, message, 300, true, settings);
    return JSON.parse(cleanJson(raw));
  } catch (e) {
    console.error("Failed to suggest intents:", e);
    return ["Acknowledge receipt", "Polite reply", "Request more info"];
  }
}

// Compare original draft vs manual edits, returning updated profile scores and tags
export async function analyzeEdits(originalText, editedText, currentProfile, settings) {
  const system = `Compare the original AI-generated reply against the user's manual edits.
Analyze the user's stylistic choices (e.g. did they make it shorter, more formal, warmer, more assertive, change specific vocabulary).
Based on this, adjust their current writing profile metrics.
Current metrics:
- formality: ${currentProfile?.formality || 50} (0-100)
- warmth: ${currentProfile?.warmth || 50} (0-100)
- brevity: ${currentProfile?.brevity || 50} (0-100)
- assertiveness: ${currentProfile?.assertiveness || 50} (0-100)
- tags: ${JSON.stringify(currentProfile?.tags || [])}

Return a JSON object containing:
- "formality": updated number (0-100)
- "warmth": updated number (0-100)
- "brevity": updated number (0-100)
- "assertiveness": updated number (0-100)
- "tags": updated array of 5-7 keyword tags reflecting their traits

Return ONLY valid JSON (no markdown wrapping, no backticks, no markdown blocks).`;

  const userMsg = `Original AI Draft:\n${originalText}\n\nUser's Edited Version:\n${editedText}`;
  const raw = await callOpenAI(system, userMsg, 600, true, settings);
  return JSON.parse(cleanJson(raw));
}
