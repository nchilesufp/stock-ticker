export const metadata = {
  title: 'Stock Ticker',
  description: 'Stock ticker component',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
