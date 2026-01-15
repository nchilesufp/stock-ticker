# Stock Ticker for Webflow - Alpha Vantage API

A production-ready stock ticker component for Webflow Cloud using Alpha Vantage API. Displays real-time stock data for NASDAQ:UFPI with secure API key handling.

## Features

- ✅ **Secure API Key Handling** - API key stored server-side in Webflow Cloud environment variables
- ✅ **Alpha Vantage Integration** - Official, compliant data source
- ✅ **Smart Caching** - 12-second cache to respect free tier rate limits (5 calls/min)
- ✅ **Auto-refresh** - Updates every 15 seconds
- ✅ **Error Handling** - Graceful degradation with "Service not available" message
- ✅ **Relative Timestamps** - Shows "X minutes/hours/days ago"
- ✅ **Compliance Ready** - Includes last refreshed timestamp

## Architecture

- **Backend**: Next.js API route (`/api/stock-ticker`) with server-side caching
- **Frontend**: Client-side script that updates Webflow Designer elements
- **Security**: API key stored in Webflow Cloud environment variables (never exposed to client)

## Setup Instructions

### 1. Get Alpha Vantage API Key

1. Visit https://www.alphavantage.co/support/#api-key
2. Sign up for a free API key
3. Copy your API key

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Webflow Cloud Environment Variables

1. Open your Webflow Cloud project dashboard
2. Navigate to **Environment Variables** (or **Settings** → **Environment Variables**)
3. Add a new environment variable:
   - **Name**: `ALPHA_VANTAGE_API_KEY`
   - **Value**: Your Alpha Vantage API key
   - **Mark as Secret**: ✅ Yes (this encrypts the value)
4. Save the environment variable

### 4. Deploy to Webflow Cloud

1. Push your code to the connected GitHub repository
2. Webflow Cloud will automatically build and deploy your Next.js app
3. Your API route will be available at: `https://yourdomain.com/api/stock-ticker`

### 5. Set Up Webflow Designer Elements

In your Webflow Designer, create the following elements with these exact IDs:

1. **Container** (Div Block)
   - ID: `stock-ticker-container`
   - Initially hidden (will be shown when data loads)

2. **Symbol** (Text/Heading)
   - ID: `stock-symbol`
   - Will display: "UFPI"

3. **Price** (Text/Heading)
   - ID: `stock-price`
   - Will display: "$123.45"

4. **Change** (Text)
   - ID: `stock-change`
   - Will display: "+1.23 (1.01%)"
   - Add custom classes for styling:
     - `.positive` (green for gains)
     - `.negative` (red for losses)
     - `.neutral` (gray for no change)

5. **Last Refreshed** (Text)
   - ID: `last-refreshed`
   - Will display: "Last refreshed: 5 minutes ago"

6. **Error Message** (Text)
   - ID: `stock-error`
   - Will display: "Service not available"
   - Initially hidden (shown only on errors)

### 6. Add Client Script to Webflow

1. In Webflow Designer, add a **Code Embed** element to your page
2. Add it near your stock ticker container (or in the page footer)
3. Choose one of these options:

   **Option A: Inline Script** (Recommended)
   - Copy the contents of `public/ticker-script.js`
   - Paste into the Code Embed, wrapped in `<script>` tags:
   ```html
   <script>
   // Paste ticker-script.js contents here
   </script>
   ```

   **Option B: External Script** (If your app is deployed)
   - Add this to your Code Embed:
   ```html
   <script src="/ticker-script.js"></script>
   ```
   - Note: Adjust the path if your Next.js app is mounted at a different route

4. **Important**: Update the `API_URL` in the script if your Next.js app is mounted at a different path in Webflow Cloud. For example:
   - If mounted at `/app`, use: `const API_URL = '/app/api/stock-ticker';`
   - If mounted at root, use: `const API_URL = '/api/stock-ticker';`

### 7. Style Your Components

Add custom CSS in Webflow Designer for:
- `.positive` - Green styling for positive changes
- `.negative` - Red styling for negative changes
- `.neutral` - Gray styling for neutral/no change

Example CSS:
```css
.positive {
  color: #10b981;
  background-color: rgba(16, 185, 129, 0.1);
}

.negative {
  color: #ef4444;
  background-color: rgba(239, 68, 68, 0.1);
}

.neutral {
  color: #9ca3af;
  background-color: rgba(156, 163, 175, 0.1);
}
```

## API Endpoint

### GET `/api/stock-ticker`

Returns stock data for UFPI.

**Response (Success):**
```json
{
  "status": "success",
  "symbol": "UFPI",
  "price": "123.45",
  "change": "1.23",
  "changePercent": "1.01%",
  "lastTradingDay": "2024-01-15",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "lastRefreshed": "2024-01-15T10:30:00.000Z"
}
```

**Response (Error):**
```json
{
  "status": "error",
  "message": "Service not available"
}
```

## Rate Limiting

- **Free Tier**: 5 API calls per minute, 500 per day
- **Cache Duration**: 12 seconds (ensures we stay within limits)
- **Client Polling**: Every 15 seconds
- **Result**: Maximum 4-5 API calls per minute, well within free tier limits

## Error Handling

- If API is unavailable: Widget is hidden (`display: none`), error message shown
- If rate limit hit: Returns cached data if available, otherwise shows error
- If network error: Shows "Service not available" message
- Widget remains hidden until first successful data fetch

## Customization

### Change Stock Symbol

Edit `app/api/stock-ticker/route.js`:
```javascript
const STOCK_SYMBOL = 'UFPI'; // Change to your desired symbol
```

### Change Update Frequency

Edit `public/ticker-script.js`:
```javascript
const POLL_INTERVAL = 15000; // Change to desired milliseconds
```

**Note**: Must be greater than cache TTL (12 seconds) to be effective.

### Change Cache Duration

Edit `app/api/stock-ticker/route.js`:
```javascript
const CACHE_TTL = 12; // Change to desired seconds
```

**Note**: Must respect Alpha Vantage rate limits (5 calls/min = 12 seconds minimum).

## Development

### Local Development

1. Create `.env.local` file:
   ```
   ALPHA_VANTAGE_API_KEY=your_api_key_here
   ```

2. Run development server:
   ```bash
   npm run dev
   ```

3. Test API endpoint:
   ```
   http://localhost:3000/api/stock-ticker
   ```

### Build for Production

```bash
npm run build
npm start
```

## Troubleshooting

### Widget Not Showing

1. Check browser console for errors
2. Verify all required element IDs exist in Webflow Designer
3. Check that API route is accessible (test `/api/stock-ticker` directly)
4. Verify environment variable is set in Webflow Cloud

### API Key Not Working

1. Verify `ALPHA_VANTAGE_API_KEY` is set in Webflow Cloud environment variables
2. Check that it's marked as "Secret"
3. Redeploy after adding environment variable

### Rate Limit Errors

- Free tier allows 5 calls/min
- Cache is set to 12 seconds (5 calls/min)
- If you see rate limit errors, increase cache TTL or upgrade Alpha Vantage plan

## Compliance Notes

- Data source: Alpha Vantage (official API)
- Last refreshed timestamp displayed for transparency
- Suitable for investor-facing, compliance-sensitive applications
- Always verify specific compliance requirements with your legal team

## Support

- Alpha Vantage Documentation: https://www.alphavantage.co/documentation/
- Alpha Vantage Support: https://www.alphavantage.co/support/
- Webflow Cloud Docs: https://developers.webflow.com/webflow-cloud/
