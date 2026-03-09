## Local & Custom AI Model Support

## Overview

Vibe Framework supports **local and custom AI model endpoints**, allowing you to use:
- 🏠 **Localhost models** (http://localhost:8000)
- ☁️ **Cloudflare tunnels** (https://xyz.trycloudflare.com)
- 🌐 **ngrok tunnels** (https://xyz.ngrok.io)
- 📓 **Google Colab** endpoints (exposed via cloudflare)
- 🔧 **Any custom OpenAI-compatible API**

---

## Quick Start

### Your Cloudflare Tunnel Endpoint

```typescript
const vibeSession = vibe()
  .withPage(page)
  .withLocalModel('https://princess-practices-carey-terms.trycloudflare.com')
  .build();

await vibeSession.do('click the login button');
```

**That's it!** The framework will use your local model for parsing.

---

## Setup Options

### Option 1: Localhost

```typescript
const session = vibe()
  .withPage(page)
  .withLocalModel('http://localhost:8000')
  .build();
```

**Default settings:**
- API path: `/chat`
- Format: OpenAI-compatible
- Timeout: 30 seconds

### Option 2: Cloudflare Tunnel (from Colab, local, etc.)

```typescript
const session = vibe()
  .withPage(page)
  .withLocalModel('https://princess-practices-carey-terms.trycloudflare.com', {
    apiPath: '/chat',
    timeout: 60000 // Cloudflare tunnels can be slower
  })
  .build();
```

### Option 3: ngrok Tunnel

```typescript
const session = vibe()
  .withPage(page)
  .withLocalModel('https://abc123.ngrok.io', {
    apiPath: '/api/chat',
    timeout: 45000
  })
  .build();
```

### Option 4: Custom Endpoint with Authentication

```typescript
const session = vibe()
  .withPage(page)
  .withLocalModel('https://api.example.com', {
    apiPath: '/v1/chat/completions',
    headers: {
      'Authorization': 'Bearer sk-custom-token',
      'X-Custom-Header': 'value'
    },
    format: 'openai',
    timeout: 45000
  })
  .build();
```

---

## Configuration Options

```typescript
.withLocalModel(baseUrl, {
  // API path (default: '/chat')
  apiPath?: string;

  // Request format: 'openai' | 'custom' (default: 'openai')
  format?: 'openai' | 'custom';

  // Custom headers (authentication, etc.)
  headers?: Record<string, string>;

  // Model name (optional)
  model?: string;

  // Temperature (default: 0.1)
  temperature?: number;

  // Max tokens (default: 200)
  maxTokens?: number;

  // Timeout in ms (default: 30000)
  timeout?: number;
})
```

---

## Request Formats

### OpenAI Format (Default)

Your endpoint should accept:

```json
POST /chat
{
  "model": "local-model",
  "messages": [
    {
      "role": "system",
      "content": "You are a test automation parser..."
    },
    {
      "role": "user",
      "content": "Parse this command: click login button"
    }
  ],
  "temperature": 0.1,
  "max_tokens": 200,
  "response_format": { "type": "json_object" }
}
```

Your endpoint should return:

```json
{
  "choices": [
    {
      "message": {
        "content": "{\"action\":\"CLICK\",\"element\":\"login button\",\"confidence\":0.95}"
      }
    }
  ]
}
```

### Custom Format

Set `format: 'custom'` for simpler API:

**Request:**
```json
POST /chat
{
  "message": "Parse this command: click login button",
  "temperature": 0.1,
  "max_tokens": 200,
  "model": "local-model"
}
```

**Response (any of these fields):**
```json
{
  "response": "{\"action\":\"CLICK\",\"element\":\"login button\"}"
}

// OR
{
  "content": "{\"action\":\"CLICK\",\"element\":\"login button\"}"
}

// OR
{
  "message": "{\"action\":\"CLICK\",\"element\":\"login button\"}"
}

// OR
{
  "text": "{\"action\":\"CLICK\",\"element\":\"login button\"}"
}
```

The response must be valid JSON with these fields:
```json
{
  "action": "CLICK",
  "element": "login button",
  "confidence": 0.95,
  "parameters": {},
  "reasoning": "User wants to click login button"
}
```

---

## Running Local Model Servers

### Option 1: Python Flask Server (Localhost)

```python
from flask import Flask, request, jsonify
import json

app = Flask(__name__)

@app.route('/chat', methods=['POST'])
def chat():
    data = request.json

    # Extract the user message
    if 'messages' in data:
        # OpenAI format
        user_msg = data['messages'][-1]['content']
    else:
        # Custom format
        user_msg = data.get('message', '')

    # TODO: Your model inference here
    result = your_model.parse(user_msg)

    # Return OpenAI format
    return jsonify({
        "choices": [{
            "message": {
                "content": json.dumps(result)
            }
        }]
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000)
```

**Run:**
```bash
python server.py
# Server at: http://localhost:8000
```

**Use in Vibe:**
```typescript
.withLocalModel('http://localhost:8000')
```

### Option 2: Google Colab with Cloudflare Tunnel

**In Colab Notebook:**

```python
# Install cloudflared
!wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
!chmod +x cloudflared-linux-amd64

# Start your Flask server (in background)
from flask import Flask, request, jsonify
app = Flask(__name__)

@app.route('/chat', methods=['POST'])
def chat():
    # Your model code here
    pass

# Run flask in thread
import threading
def run_server():
    app.run(host='0.0.0.0', port=8000)

thread = threading.Thread(target=run_server)
thread.start()

# Start cloudflare tunnel
!./cloudflared-linux-amd64 tunnel --url http://localhost:8000
```

**Output:**
```
https://princess-practices-carey-terms.trycloudflare.com
```

**Use in Vibe:**
```typescript
.withLocalModel('https://princess-practices-carey-terms.trycloudflare.com')
```

### Option 3: FastAPI Server

```python
from fastapi import FastAPI
from pydantic import BaseModel
import uvicorn

app = FastAPI()

class ChatRequest(BaseModel):
    messages: list
    temperature: float = 0.1
    max_tokens: int = 200

@app.post("/chat")
async def chat(request: ChatRequest):
    user_msg = request.messages[-1]['content']

    # Your model inference
    result = {
        "action": "CLICK",
        "element": "login button",
        "confidence": 0.95
    }

    return {
        "choices": [{
            "message": {
                "content": json.dumps(result)
            }
        }]
    }

if __name__ == '__main__':
    uvicorn.run(app, host='0.0.0.0', port=8000)
```

---

## Complete Example

### Full Test with Cloudflare Tunnel

```typescript
import { test, expect } from '@playwright/test';
import { vibe } from 'vibe-framework';

test('Login with local model via Cloudflare', async ({ page }) => {
  await page.goto('https://www.saucedemo.com');

  const session = vibe()
    .withPage(page)
    .withMode('smart-cache')
    .withLocalModel('https://princess-practices-carey-terms.trycloudflare.com', {
      apiPath: '/chat',
      format: 'openai',
      timeout: 60000
    })
    .withReporting({
      colors: true,
      verbose: true,
      html: true
    })
    .build();

  session.startTest('Login Test');

  // Natural language commands parsed by your local model
  await session.do('type standard_user into username field');
  await session.do('type secret_sauce into password field');
  await session.do('click the login button');

  // Verify success
  await expect(page).toHaveURL(/.*inventory.html/);

  session.endTest('passed');
  await session.shutdown();
});
```

---

## Troubleshooting

### Error: Connection refused

**Cause:** Server not running or wrong URL

**Fix:**
```bash
# Check if server is running
curl http://localhost:8000/chat

# Or for cloudflare tunnel
curl https://your-url.trycloudflare.com/chat
```

### Error: Timeout after 30000ms

**Cause:** Server is slow or not responding

**Fix:** Increase timeout
```typescript
.withLocalModel('...', {
  timeout: 90000 // 90 seconds
})
```

### Error: Could not extract content from response

**Cause:** Response format doesn't match expected structure

**Fix:** Check your server response. Must have:
- OpenAI format: `response.choices[0].message.content`
- OR custom format: `response.response` / `response.content` / `response.message` / `response.text`

### Error: Invalid action type

**Cause:** Your model returned invalid action

**Fix:** Ensure your model returns one of:
- `CLICK`, `FILL`, `SELECT`, `VERIFY`, `CHECK`, `WAIT`, `HOVER`, `EXTRACT`

---

## Performance Comparison

| Endpoint Type | Latency | Cost | Use Case |
|---------------|---------|------|----------|
| **Localhost** | 10-100ms | Free | Development, fast iteration |
| **Cloudflare Tunnel** | 200-1000ms | Free | Remote access to local model |
| **ngrok** | 100-500ms | Free/Paid | Quick demos, testing |
| **Cloud API** | 50-2000ms | Varies | Production deployment |

---

## Security Considerations

### Localhost
✅ **Secure** - No external network exposure
❌ **Limited** - Only accessible from same machine

### Cloudflare Tunnel
⚠️ **Public URL** - Anyone with URL can access
✅ **Temporary** - URL changes on restart
💡 **Add auth headers** for security:

```typescript
.withLocalModel('https://xyz.trycloudflare.com', {
  headers: {
    'Authorization': 'Bearer your-secret-token'
  }
})
```

Then validate in your server:
```python
@app.route('/chat', methods=['POST'])
def chat():
    auth = request.headers.get('Authorization')
    if auth != 'Bearer your-secret-token':
        return jsonify({'error': 'Unauthorized'}), 401
    # ... rest of code
```

---

## Model Requirements

Your local model must be able to parse natural language commands into this JSON structure:

```json
{
  "action": "CLICK" | "FILL" | "SELECT" | "VERIFY" | "CHECK" | "WAIT" | "HOVER" | "EXTRACT",
  "element": "description of element to interact with",
  "parameters": {
    "text": "optional text to type",
    "value": "optional value to select",
    ...
  },
  "confidence": 0.0 to 1.0,
  "reasoning": "optional explanation"
}
```

### Example Commands to Support

| Command | Expected Output |
|---------|----------------|
| "click login button" | `{action: "CLICK", element: "login button", confidence: 0.95}` |
| "type john@test.com into email" | `{action: "FILL", element: "email", parameters: {text: "john@test.com"}, confidence: 0.95}` |
| "select USA from dropdown" | `{action: "SELECT", element: "dropdown", parameters: {value: "USA"}, confidence: 0.90}` |

---

## Advanced: Testing Local Model

```typescript
import { LocalModelService } from 'vibe-framework/utils/LocalModelService';

// Test connection to your endpoint
const service = new LocalModelService({
  baseUrl: 'https://your-url.trycloudflare.com',
  apiPath: '/chat',
  format: 'openai'
});

// Test connectivity
const isConnected = await service.testConnection();
console.log(`Connected: ${isConnected}`);

// Test parsing
const result = await service.parseCommand({
  command: 'click the login button'
});

console.log(result);
// {
//   action: 'CLICK',
//   element: 'login button',
//   confidence: 0.95,
//   ...
// }
```

---

## Benefits of Local Models

✅ **Free** - No API costs
✅ **Private** - Data stays on your machine
✅ **Fast** - No internet latency (localhost)
✅ **Customizable** - Use any model you want
✅ **Offline** - Works without internet (localhost)

---

## When to Use

**Use Local Models When:**
- 💰 Minimizing costs
- 🔒 Data privacy is critical
- 🚀 Experimenting with custom models
- 📊 Need full control over inference
- 🏠 Working offline

**Use Cloud APIs When:**
- ⚡ Need highest accuracy (GPT-4, Claude, etc.)
- 🌐 Need reliability and uptime
- 🔧 Don't want to manage infrastructure
- 📈 Need automatic scaling

---

## Summary

**Local model support is fully implemented!** ✅

**Quick Recap:**
1. **Localhost:** `.withLocalModel('http://localhost:8000')`
2. **Cloudflare:** `.withLocalModel('https://xyz.trycloudflare.com')`
3. **Custom:** Add headers, auth, custom paths as needed

**Example:**
```typescript
vibe()
  .withPage(page)
  .withLocalModel('https://princess-practices-carey-terms.trycloudflare.com')
  .build();
```

**That's it!** Your tests will now use your local model for natural language parsing.

**Questions?** See `tests/local-model-test.spec.ts` for more examples!
