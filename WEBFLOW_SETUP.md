# Webflow Cloud Setup Guide

## Step 3: Configure Environment Variables

1. Open your Webflow Cloud project dashboard
2. Navigate to **Settings** → **Environment Variables** (or look for "Environment Variables" in the project settings)
3. Click **Add Environment Variable** or **New Variable**

4. Add the required API key:
   - **Name**: `ALPHA_VANTAGE_API_KEY`
   - **Value**: [Paste your Alpha Vantage API key here]
   - **Mark as Secret**: ✅ **Yes** (this encrypts and hides the value - critical for security)
   - Save the variable

5. Add the stock symbol (optional, defaults to AAPL if not set):
   - **Name**: `STOCK_SYMBOL`
   - **Value**: [Your desired stock symbol, e.g., `AAPL`, `GOOGL`, `MSFT`]
   - **Mark as Secret**: Optional (not sensitive data)
   - Save the variable

6. Repeat for each environment (staging, production) if you have multiple environments

## Step 4: Configure Deployment

1. In Webflow Cloud, ensure your GitHub repository is connected:
   - Go to **Settings** → **Git** (or **Deployments**)
   - Verify `https://github.com/nchilesufp/stock-ticker.git` is connected
   - If not connected, connect it now

2. Configure the deployment settings:
   - **Framework**: Next.js (should auto-detect)
   - **Build Command**: `npm run build` (or auto-detected)
   - **Start Command**: `npm start` (or auto-detected)
   - **Root Directory**: `/` (project root)
   - **Node Version**: Use the latest LTS version (or let Webflow Cloud auto-detect)

3. Trigger deployment:
   - If auto-deploy is enabled, it should deploy automatically after the push
   - Otherwise, manually trigger a deployment from the Webflow Cloud dashboard

## Step 5: Verify Deployment

1. Wait for the deployment to complete (first deploy may take 3-5 minutes)

2. Check the deployment logs to ensure:
   - Build completed successfully
   - No errors related to missing environment variables
   - Next.js app built and started correctly

3. Test the API endpoint:
   - Open: `https://yourdomain.com/api/stock-ticker`
   - You should see JSON response with stock data OR an error message
   - If you see "API key not configured", verify the environment variable is set correctly
   - If you see "Service not available", check:
     - API key is correct
     - Alpha Vantage API is accessible
     - Rate limits haven't been exceeded

4. Check the response format:
   ```json
   {
     "status": "success",
     "symbol": "AAPL",
     "price": "123.45",
     "change": "1.23",
     "changePercent": "1.01%",
     ...
   }
   ```

## Troubleshooting

### API Key Not Working
- Verify the environment variable name is exactly: `ALPHA_VANTAGE_API_KEY`
- Check that it's marked as "Secret"
- Redeploy after adding/changing the environment variable
- Check deployment logs for any errors

### API Route Not Found
- Verify the deployment path - if your Next.js app is mounted at `/app`, the route will be `/app/api/stock-ticker`
- Update `API_URL` in `public/ticker-script.js` if needed
- Check Webflow Cloud routing configuration

### Build Errors
- Check that `package.json` has all required dependencies
- Verify Node.js version compatibility
- Review build logs in Webflow Cloud dashboard

## Next Steps

After successful deployment:
1. Create Webflow Designer elements with required IDs (see README.md)
2. Add the client script to Webflow via Code Embed
3. Test the stock ticker widget on your live site
