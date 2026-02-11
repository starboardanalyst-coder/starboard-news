# Starboard News Subscription API

Public API for subscribing to Starboard newsletters from external websites.

## Base URL

```
https://news.starboard.to
```

---

## Public Endpoints

### GET /api/newsletters

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

### GET /api/content/today

Get today's newsletter content for a specific feed.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `feed` | string | Yes | Newsletter ID (`minor_news`, `into_crypto_cn`, `into_crypto_en`) |

**Example:**
```
GET /api/content/today?feed=minor_news
```

**Success Response (200):**
```json
{
  "date": "2026-02-11",
  "title": "Minor News",
  "emoji": "⚡",
  "content": "Markdown content...",
  "html": "Rendered HTML...",
  "generated_at": "2026-02-11T07:00:00Z"
}
```

**Error Responses:**

| Status | Response | Cause |
|--------|----------|-------|
| 400 | `{ "error": "Missing or invalid feed..." }` | Invalid or missing feed parameter |
| 404 | `{ "error": "No content available" }` | No content for today |

---

### GET /api/unsubscribe

Unsubscribe via token (used in email unsubscribe links).

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `token` | string | Yes | Unsubscribe token from email |

---

## Private Endpoints

The following endpoints require authentication via `Authorization: Bearer <CRON_SECRET>` header.

### POST /api/content/ingest

Write content directly to the database (bypasses content generation).

**Request Body:**
```json
{
  "type": "daily",
  "date": "2026-02-11",
  "content": "Markdown newsletter content..."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | Yes | Report type: `daily`, `into_crypto_cn`, `into_crypto_en` |
| `date` | string | Yes | Date in `YYYY-MM-DD` format |
| `content` | string | Yes | Newsletter content in markdown |

---

### POST /api/content/generate

Generate content via Claude API (requires Anthropic API credits on server).

**Request Body:**
```json
{
  "type": "daily",
  "date": "2026-02-11",
  "sources": "News source material..."
}
```

---

### GET /api/cron/send

Trigger batch email sending for all feeds. Checks for today's reports and sends to all active subscribers.

---

## Code Examples

### JavaScript (Fetch)

```javascript
// 1. Get available newsletters
const newslettersRes = await fetch('https://news.starboard.to/api/newsletters');
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
    fetch('https://news.starboard.to/api/newsletters')
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

      {status === 'success' && <p>Subscribed! Check your inbox.</p>}
      {status && status !== 'success' && status !== 'loading' && (
        <p>{status}</p>
      )}
    </form>
  );
}
```

### cURL

```bash
# Get newsletters
curl https://news.starboard.to/api/newsletters

# Subscribe
curl -X POST https://news.starboard.to/api/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","feeds":["minor_news"]}'

# Get today's content
curl "https://news.starboard.to/api/content/today?feed=minor_news"
```

---

## Notes

- **CORS**: Enabled for all origins (`Access-Control-Allow-Origin: *`) on public endpoints
- **Welcome Email**: New subscribers automatically receive the latest issue
- **Idempotent**: Re-subscribing merges new feeds with existing subscriptions
- **No Auth**: Public endpoints require no authentication

---

## Newsletter IDs Reference

| ID | Name | Language |
|----|------|----------|
| `minor_news` | Minor News | English |
| `into_crypto_cn` | Into Crypto 中文版 | Chinese |
| `into_crypto_en` | Into Crypto | English |
