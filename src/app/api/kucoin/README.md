# KuCoin API Routes

Backend proxy routes for KuCoin exchange API integration.

## Routes

### GET /api/kucoin/ticker

Fetches market statistics for a trading pair.

**Query Parameters:**
- `symbol` (required): Trading pair symbol in our format (e.g., `BTC-USDT`)

**Note:** The API route automatically converts the symbol from our format (`BTC-USDT`) to KuCoin format (`BTCUSDT`).

**Response:**
```json
{
  "code": "200000",
  "data": {
    "symbol": "BTC-USDT",
    "high": "72000",
    "low": "68000",
    "last": "70000",
    "vol": "28500",
    "volValue": "1950000000",
    "changeRate": "0.0334",
    "changePrice": "2267.46"
  }
}
```

**Example:**
```typescript
const response = await fetch('/api/kucoin/ticker?symbol=BTC-USDT');
const data = await response.json();
```

---

### GET /api/kucoin/trades

Fetches recent trade history for a trading pair.

**Query Parameters:**
- `symbol` (required): Trading pair symbol in our format (e.g., `BTC-USDT`)

**Note:** The API route automatically converts the symbol from our format (`BTC-USDT`) to KuCoin format (`BTCUSDT`).

**Response:**
```json
{
  "code": "200000",
  "data": [
    {
      "sequence": "21639360946913280",
      "tradeId": "21639360946913280",
      "price": "72825.7",
      "size": "0.00374524",
      "side": "buy",
      "time": 1772676853088000000
    }
  ]
}
```

**Example:**
```typescript
const response = await fetch('/api/kucoin/trades?symbol=BTC-USDT');
const data = await response.json();
```

---

### GET /api/kucoin/websocket-token

Fetches a WebSocket connection token and server endpoints.

**Query Parameters:** None

**Response:**
```json
{
  "code": "200000",
  "data": {
    "token": "2neAiuYvAU61ZDXANAGAsiL4-iAExhsBXZxftpOeh_55i3Ysy2q2LEsEWU64mdzUOPusi34M_wGoSf7iNyEWJ1UQy47YbpY4zVdzilNP-Bj3iXzrjjGlWtiYB9J6i9GjsxUuhPw3BlrzazF6ghq4Lzf7scStOz3KkxjwpsOBCH4=.WNQmhZQeUKIkh97KYgU0Lg==",
    "instanceServers": [
      {
        "endpoint": "wss://ws-api-spot.kucoin.com/",
        "encrypt": true,
        "protocol": "websocket",
        "pingInterval": 18000,
        "pingTimeout": 10000
      }
    ]
  }
}
```

**Example:**
```typescript
const response = await fetch('/api/kucoin/websocket-token');
const { data } = await response.json();
const { token, instanceServers } = data;
const wsUrl = `${instanceServers[0].endpoint}?token=${token}`;
const ws = new WebSocket(wsUrl);
```

---

## Error Handling

All routes return consistent error responses:

```json
{
  "error": "Error message description"
}
```

**HTTP Status Codes:**
- `200`: Success
- `400`: Bad Request (missing parameters)
- `500`: Internal Server Error (KuCoin API error or network issue)

---

## Usage in Components

### REST API Example (MarketTicker)

```typescript
// Frontend sends symbol in our format (BTC-USDT)
const response = await fetch(`/api/kucoin/ticker?symbol=BTC-USDT`);
const result = await response.json();

if (result.code === '200000' && result.data) {
  const price = parseFloat(result.data.last);
  const change24h = parseFloat(result.data.changeRate) * 100;
}
```

**Note:** The API route handles the conversion from `BTC-USDT` to `BTCUSDT` internally.

### WebSocket Example (OrderBook)

```typescript
// 1. Get token
const tokenResponse = await fetch('/api/kucoin/websocket-token');
const tokenResult = await tokenResponse.json();
const { token, instanceServers } = tokenResult.data;

// 2. Connect
const wsUrl = `${instanceServers[0].endpoint}?token=${token}`;
const ws = new WebSocket(wsUrl);

// 3. Subscribe
ws.onopen = () => {
  ws.send(JSON.stringify({
    id: Date.now().toString(),
    type: 'subscribe',
    topic: '/spotMarket/level2Depth50:BTC-USDT',
    privateChannel: false,
    response: true
  }));
};

// 4. Handle messages
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'message') {
    // Process order book update
  }
};
```

---

## Security Considerations

1. **No API Keys Exposed**: All KuCoin calls are made from the server
2. **Rate Limiting**: Can be implemented at the route level
3. **Input Validation**: All parameters are validated before proxying
4. **Error Sanitization**: Internal errors are not exposed to clients

---

## Future Enhancements

1. **Caching**: Add Redis caching for frequently requested data
2. **Rate Limiting**: Implement per-IP rate limiting
3. **Monitoring**: Add request/response logging
4. **Fallbacks**: Support multiple data providers
5. **Authentication**: Add user-specific rate limits
