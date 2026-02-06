# Starboard News Subscription API

Public API for subscribing to Starboard newsletters from external websites.

## Base URL

```
https://news.starboard.to/api/subscribe
```

---

## Endpoints

### GET /api/subscribe

Returns available newsletters.

**Response:**
```json
{
  "newsletters": [
    {
      "id": "minor_news",
      "name": "Minor News",
      "description": "Daily crypto & energy infrastructure news digest",
      "emoji": "⚡",
      "language": "en"
    },
    {
      "id": "into_crypto_cn",
      "name": "Into Crypto 中文版",
      "description": "每日加密货币深度分析",
      "emoji": "🪙",
      "language": "zh"
    },
    {
      "id": "into_crypto_en",
      "name": "Into Crypto",
      "description": "Daily crypto analysis and insights",
      "emoji": "🪙",
      "language": "en"
    }
  ]
}
```

---

### POST /api/subscribe

Subscribe an email to one or more newsletters.

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "feeds": ["minor_news", "into_crypto_cn"]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | Valid email address |
| `feeds` | string[] | Yes | Array of newsletter IDs (see GET response) |

**Success Response (200):**
```json
{
  "success": true,
  "message": "Subscribed! Check your inbox.",
  "feeds": ["minor_news", "into_crypto_cn"]
}
```

**Error Responses:**

| Status | Response | Cause |
|--------|----------|-------|
| 400 | `{ "error": "Please enter a valid email address" }` | Invalid email format |
| 400 | `{ "error": "Please select at least one newsletter" }` | Empty or missing feeds array |
| 400 | `{ "error": "Invalid newsletter selection" }` | Unknown feed ID |
| 500 | `{ "error": "Server error, please try again" }` | Internal error |

---

## Code Examples

### JavaScript (Fetch)

```javascript
// 1. Get available newsletters
const newslettersRes = await fetch('https://news.starboard.to/api/subscribe');
const { newsletters } = await newslettersRes.json();
console.log(newsletters);

// 2. Subscribe a user
const subscribeRes = await fetch('https://news.starboard.to/api/subscribe', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'user@example.com',
    feeds: ['minor_news', 'into_crypto_en']
  })
});

const result = await subscribeRes.json();

if (result.success) {
  console.log('Subscribed!', result.feeds);
} else {
  console.error('Error:', result.error);
}
```

### React Example

```jsx
import { useState, useEffect } from 'react';

function SubscribeForm() {
  const [newsletters, setNewsletters] = useState([]);
  const [email, setEmail] = useState('');
  const [selected, setSelected] = useState([]);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    fetch('https://news.starboard.to/api/subscribe')
      .then(res => res.json())
      .then(data => setNewsletters(data.newsletters));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');

    const res = await fetch('https://news.starboard.to/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, feeds: selected })
    });

    const result = await res.json();
    setStatus(result.success ? 'success' : result.error);
  };

  const toggleFeed = (id) => {
    setSelected(prev => 
      prev.includes(id) 
        ? prev.filter(f => f !== id)
        : [...prev, id]
    );
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        required
      />

      <div>
        {newsletters.map(n => (
          <label key={n.id}>
            <input
              type="checkbox"
              checked={selected.includes(n.id)}
              onChange={() => toggleFeed(n.id)}
            />
            {n.emoji} {n.name}
          </label>
        ))}
      </div>

      <button type="submit" disabled={status === 'loading'}>
        Subscribe
      </button>

      {status === 'success' && <p>✅ Subscribed! Check your inbox.</p>}
      {status && status !== 'success' && status !== 'loading' && (
        <p>❌ {status}</p>
      )}
    </form>
  );
}
```

### cURL

```bash
# Get newsletters
curl https://news.starboard.to/api/subscribe

# Subscribe
curl -X POST https://news.starboard.to/api/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","feeds":["minor_news"]}'
```

---

## Notes

- **CORS**: Enabled for all origins (`Access-Control-Allow-Origin: *`)
- **Welcome Email**: New subscribers automatically receive the latest issue
- **Idempotent**: Re-subscribing merges new feeds with existing subscriptions
- **No Auth**: Public API, no authentication required

---

## Newsletter IDs Reference

| ID | Name | Language |
|----|------|----------|
| `minor_news` | Minor News | English |
| `into_crypto_cn` | Into Crypto 中文版 | Chinese |
| `into_crypto_en` | Into Crypto | English |
