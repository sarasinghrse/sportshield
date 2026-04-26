import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Dark mode — original logo on transparent background */}
        <link rel="icon" type="image/x-icon" href="/favicon.ico" media="(prefers-color-scheme: dark)" />
        <link rel="icon" type="image/png" href="/images/sportshield-logo-transparent.png" media="(prefers-color-scheme: dark)" />
        {/* Light mode — black logo so it's visible on white tab background */}
        <link rel="icon" type="image/x-icon" href="/favicon-light.ico" media="(prefers-color-scheme: light)" />
        <link rel="icon" type="image/png" href="/images/sportshield-logo-dark.png" media="(prefers-color-scheme: light)" />
        <link rel="apple-touch-icon" href="/images/sportshield-logo-transparent.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&family=Barlow:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}