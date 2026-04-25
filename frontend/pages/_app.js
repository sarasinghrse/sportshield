import "@/styles/globals.css";
import '../styles/sportshield.css';
import Head from 'next/head';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <link rel="icon" href="/images/sportshield-logo-transparent.png" />
        <link rel="apple-touch-icon" href="/images/sportshield-logo-transparent.png" />
        <meta name="theme-color" content="#0a1210" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
