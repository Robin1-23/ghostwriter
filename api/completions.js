// api/completions.js
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

export default async function handler(req, res) {
  // 1. Enable CORS for development and frontend routing
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 2. Resolve Authorization Header (Firebase ID Token)
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }
  const idToken = authHeader.split('Bearer ')[1];

  // 3. Verify Firebase ID Token through lightweight Google toolkit API
  try {
    const firebaseApiKey = process.env.FIREBASE_API_KEY;
    if (!firebaseApiKey) {
      return res.status(500).json({ error: 'Server misconfiguration: Missing FIREBASE_API_KEY' });
    }

    const verifyResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    });

    if (!verifyResponse.ok) {
      return res.status(401).json({ error: 'Unauthorized: Invalid Firebase Token' });
    }
  } catch (err) {
    console.error('Token verification error:', err);
    return res.status(401).json({ error: 'Unauthorized: Token verification failed' });
  }

  // 4. Forward the completions request to OpenAI with the secure server-side key
  try {
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return res.status(500).json({ error: 'Server misconfiguration: Missing OPENAI_API_KEY' });
    }

    const response = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      },
      body: JSON.stringify(req.body)
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: `OpenAI error: ${errText}` });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error('Proxy error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
