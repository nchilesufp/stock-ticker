export const metadata = {
  title: 'Stock Ticker',
  description: 'Stock ticker for UFPI',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
