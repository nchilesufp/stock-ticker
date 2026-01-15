// This page is not required for the API route to work
// It's here to satisfy Next.js requirements
// Your API route will be available at /api/stock-ticker

export default function Home() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Stock Ticker API</h1>
      <p>API endpoint available at: <code>/api/stock-ticker</code></p>
      <p>This page is not used in Webflow. The API route is what matters.</p>
    </div>
  )
}
