import './globals.css';

export const metadata = {
  title: 'Survival of the Fittest',
  description: '',
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#ececec',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#ECECEC" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>{children}</body>
    </html>
  );
}