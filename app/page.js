'use client';

export default function Home() {
  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1 style={{ marginBottom: '2rem' }}>UFP Apps</h1>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
        gap: '1.5rem'
      }}>
        <a
          href="/app/stock-ticker"
          style={{
            display: 'block',
            padding: '2rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.5rem',
            textDecoration: 'none',
            color: 'inherit',
            textAlign: 'center',
            transition: 'box-shadow 0.2s',
            cursor: 'pointer'
          }}
          onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'}
          onMouseOut={(e) => e.currentTarget.style.boxShadow = 'none'}
        >
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>Stock Ticker</h2>
        </a>
      </div>
    </div>
  )
}
