import Head from 'next/head';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/useAuth';
import Navbar         from '../components/landing/Navbar';
import Hero           from '../components/landing/Hero';
import HowItWorks     from '../components/landing/HowItWorks';
import ImportSection  from '../components/landing/ImportSection';
import MonitorSection from '../components/landing/MonitorSection';
import TakeAction     from '../components/landing/TakeAction';
import MediaTypes     from '../components/landing/MediaTypes';
import Community      from '../components/landing/Community';
import Footer         from '../components/landing/Footer';
import { CTABanner, Mission, MoreInfo, FAQ } from '../components/landing/Sections';

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // If already logged in, send straight to dashboard
  useEffect(() => {
    if (!loading && user) router.replace('/');
  }, [user, loading]);

  if (loading) return null; // avoid flash

  return (
    <>
      <Head>
        <title>SportShield — Find and Fight Sport Theft</title>
        <meta name="description" content="Take back control of your sports media. SportShield uses AI-powered fingerprinting to find unauthorized use of your sports images and videos online." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Navbar />
      <main>
        <Hero />
        <HowItWorks />
        <ImportSection />
        <MonitorSection />
        <TakeAction />
        <MediaTypes />
        <Community />
        <CTABanner />
        <Mission />
        <MoreInfo />
        <FAQ />
      </main>
      <Footer />
    </>
  );
}