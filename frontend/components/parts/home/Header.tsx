import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Moon, Sun, Menu, X } from "lucide-react";
import { WithHandleGetStarted } from '@/lib/types';

const Header = ({ handleGetStarted }: WithHandleGetStarted) => {
  const [darkMode, setDarkMode] = useState(true); // Default to dark mode
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Set dark mode by default
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  // Handle scroll events
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out ${scrolled ? 'py-3 bg-yourdai-dark/80 backdrop-blur-md shadow-sm' : 'py-5 bg-transparent'}`}>
      <div className="container max-w-7xl mx-auto px-4 flex items-center justify-between">
        <div className="flex items-center">
          <a href="#" className="text-2xl font-display font-bold text-white flex items-center">
            <span className="bg-yourdai-purple text-white p-1 rounded-md mr-2 text-sm">YD</span>
            your<span className="text-yourdai-purple">dai</span>
          </a>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-8">
          <a href="#features" className="text-sm font-medium text-white/70 hover:text-white transition-colors">Features</a>
          <a href="#demo" className="text-sm font-medium text-white/70 hover:text-white transition-colors">Demo</a>
          <a href="#pricing" className="text-sm font-medium text-white/70 hover:text-white transition-colors">Pricing</a>
          <Button variant="ghost" size="icon" onClick={toggleDarkMode} className="ml-2 text-white/70 hover:text-white">
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </Button>
          <Button 
            className="bg-yourdai-purple hover:bg-yourdai-purple/90 text-white ml-4"
            onClick={handleGetStarted}
          >
            Start for free
          </Button>
        </nav>

        {/* Mobile Menu Button */}
        <div className="flex md:hidden items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={toggleDarkMode} className="text-white/70 hover:text-white">
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-white/70 hover:text-white">
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-yourdai-dark/98 backdrop-blur-sm pt-20 px-4">
          <nav className="flex flex-col items-center space-y-8 pt-10">
            <a href="#features" 
              className="text-lg font-medium text-white/80 hover:text-white transition-colors"
              onClick={() => setMobileMenuOpen(false)}>
              Features
            </a>
            <a href="#demo" 
              className="text-lg font-medium text-white/80 hover:text-white transition-colors"
              onClick={() => setMobileMenuOpen(false)}>
              Demo
            </a>
            <a href="#pricing" 
              className="text-lg font-medium text-white/80 hover:text-white transition-colors"
              onClick={() => setMobileMenuOpen(false)}>
              Pricing
            </a>
            <Button 
              className="bg-yourdai-purple hover:bg-yourdai-purple/90 text-white w-full mt-6"
              onClick={handleGetStarted}
            >
              Start for free
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;