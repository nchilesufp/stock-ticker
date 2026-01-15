/**
 * Stock Ticker Client Script for Webflow
 * 
 * This script should be embedded in Webflow via a Code Embed element.
 * It fetches stock data from the backend API and updates the Webflow Designer elements.
 * 
 * Required Webflow Designer elements:
 * - Container: id="stock-ticker-container"
 * - Symbol: id="stock-symbol"
 * - Price: id="stock-price"
 * - Change: id="stock-change"
 * - Last Refreshed: id="last-refreshed"
 * - Error Message: id="stock-error"
 */

(function() {
  'use strict';

  // Configuration
  const API_URL = '/api/stock-ticker'; // Adjust if your app is mounted at a different path
  const POLL_INTERVAL = 15000; // 15 seconds (slightly above 12s cache)

  // Get DOM elements
  const container = document.getElementById('stock-ticker-container');
  const symbolEl = document.getElementById('stock-symbol');
  const priceEl = document.getElementById('stock-price');
  const changeEl = document.getElementById('stock-change');
  const lastRefreshedEl = document.getElementById('last-refreshed');
  const errorEl = document.getElementById('stock-error');

  // Check if required elements exist
  if (!container || !symbolEl || !priceEl || !changeEl || !lastRefreshedEl || !errorEl) {
    console.error('Stock ticker: Required DOM elements not found. Please check element IDs.');
    return;
  }

  // Initially hide widget
  container.style.display = 'none';
  errorEl.style.display = 'none';

  /**
   * Format relative time (e.g., "5 minutes ago", "2 hours ago")
   */
  function formatRelativeTime(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 60) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    } else {
      return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    }
  }

  /**
   * Update the UI with stock data
   */
  function updateUI(data) {
    if (data.status !== 'success') {
      // Hide widget, show error
      container.style.display = 'none';
      errorEl.textContent = data.message || 'Service not available';
      errorEl.style.display = 'block';
      return;
    }

    // Update elements
    symbolEl.textContent = data.symbol;
    priceEl.textContent = `$${data.price}`;
    
    // Format change with +/- and color
    const change = parseFloat(data.change);
    const changeText = `${change >= 0 ? '+' : ''}${data.change} (${data.changePercent})`;
    changeEl.textContent = changeText;
    
    // Remove existing classes
    changeEl.classList.remove('positive', 'negative', 'neutral');
    
    // Add appropriate class
    if (change > 0) {
      changeEl.classList.add('positive');
    } else if (change < 0) {
      changeEl.classList.add('negative');
    } else {
      changeEl.classList.add('neutral');
    }

    // Update last refreshed
    const relativeTime = formatRelativeTime(data.lastRefreshed || data.timestamp);
    lastRefreshedEl.textContent = `Last refreshed: ${relativeTime}`;

    // Show widget, hide error
    container.style.display = '';
    errorEl.style.display = 'none';
  }

  /**
   * Fetch stock data from API
   */
  async function fetchStockData() {
    try {
      const response = await fetch(API_URL);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      updateUI(data);

    } catch (error) {
      console.error('Stock ticker fetch error:', error);
      updateUI({
        status: 'error',
        message: 'Service not available'
      });
    }
  }

  // Initial fetch
  fetchStockData();

  // Poll for updates
  setInterval(fetchStockData, POLL_INTERVAL);
})();
