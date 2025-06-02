'use client';
import { useEffect } from "react";
import { useAuth } from '@/auth/AuthContext';
import Header from "@/components/parts/home/Header";
import Hero from "@/components/parts/home/Hero";
import DemoSection from "@/components/parts/home/DemoSection";
import CTA from "@/components/parts/home/CTA";
import Footer from "@/components/parts/home/Footer";

const HomePage = () => {
  const { signIn } = useAuth();

  // Handle sign in and redirect to priorities page
  const handleGetStarted = async () => {
    try {
      await signIn('/priorities');
    } catch (error) {
      console.error('Sign in error:', error);
    }
  };

  // Add smooth scroll effect for navigation
  useEffect(() => {
    // Set dark mode by default
    document.documentElement.classList.add('dark');
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', (e) => {
        e.preventDefault();
        
        const targetId = (e.target as HTMLAnchorElement).getAttribute('href')?.substring(1);
        if (!targetId) return;
        
        const targetElement = document.getElementById(targetId);
        if (!targetElement) return;
        
        window.scrollTo({
          top: targetElement.offsetTop - 80, // Offset for header
          behavior: 'smooth'
        });
      });
    });
    
    // Animation on scroll
    const handleScroll = () => {
      const elements = document.querySelectorAll('.animate-on-scroll');
      
      elements.forEach(element => {
        const elementTop = element.getBoundingClientRect().top;
        const windowHeight = window.innerHeight;
        
        if (elementTop < windowHeight * 0.85) {
          element.classList.add('animate-fade-in');
        }
      });
    };
    
    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initialize on load
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  return (
    <div className="min-h-screen bg-background text-foreground dark:bg-yourdai-dark dark:text-white">
      <Header handleGetStarted={handleGetStarted} />
      <main>
        <Hero handleGetStarted={handleGetStarted} />
        <DemoSection />
        <CTA handleGetStarted={handleGetStarted} />
      </main>
      <Footer />
    </div>
  );
};

export default HomePage;