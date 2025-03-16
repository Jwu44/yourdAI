import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { WithHandleGetStarted } from '@/lib/types';

const Hero = ({ handleGetStarted }: WithHandleGetStarted) => {
  return (
    <section className="pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden relative">
      {/* Dark gradient background with stars effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-yourdai-dark/90 via-yourdai-dark/80 to-background -z-10"></div>
      <div className="absolute inset-0 bg-[url('/lovable-uploads/d84a38cb-1e85-404b-8d12-19dded0eb863.png')] bg-cover bg-center opacity-40 -z-20"></div>
      
      {/* Animated decorative elements */}
      <div className="absolute top-20 left-10 w-64 h-64 bg-yourdai-purple/20 rounded-full blur-3xl -z-10 animate-pulse-slow"></div>
      <div className="absolute bottom-20 right-10 w-80 h-80 bg-yourdai-blue/20 rounded-full blur-3xl -z-10 animate-pulse-slow animate-delay-500"></div>
      
      <div className="container max-w-7xl mx-auto px-4 relative z-10">
        <div className="text-center max-w-4xl mx-auto">
          {/* Announcement badge */}
          <div className="mb-6 inline-block">
            <span className="py-1.5 px-4 bg-yourdai-purple/30 text-white/90 font-medium text-sm rounded-full animate-fade-in">
              Now in Public Beta
            </span>
          </div>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold mb-6 tracking-tight animate-fade-in animate-delay-100 text-balance text-white">
            Powerful planning for 
            <span className="text-yourdai-purple"> your daily life</span>
          </h1>
          
          <p className="text-lg md:text-xl text-white/80 mb-8 max-w-3xl mx-auto animate-fade-in animate-delay-200 text-balance">
            yourdai learns your unique energy patterns and aligns tasks with your productivity windows, 
            breaking down complex goals into manageable steps while balancing work and personal values.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-fade-in animate-delay-300">
            <Button 
              className="bg-yourdai-purple hover:bg-yourdai-purple/90 text-white px-8 py-6 rounded-xl font-medium text-lg transition-all duration-300 transform hover:scale-105 w-full sm:w-auto"
              onClick={handleGetStarted}
            >
              Start Free Trial
            </Button>
            <Button variant="outline" className="group px-8 py-6 rounded-xl font-medium text-lg border-white/20 text-white hover:border-white/40 hover:bg-white/5 transition-all duration-300 w-full sm:w-auto">
              See How It Works
              <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
          
          {/* App Preview with improved styling */}
          <div className="relative max-w-5xl mx-auto animate-fade-in animate-delay-500">
            <div className="neo-blur overflow-hidden rounded-2xl shadow-2xl">
              <img 
                src="/dashboard-crossed.png" 
                alt="yourdai app interface" 
                className="w-full rounded-xl transform hover:scale-[1.02] transition-all duration-700 ease-in-out"
              />
            </div>
            {/* Glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-yourdai-purple/40 to-yourdai-blue/40 rounded-[22px] blur-xl -z-10 opacity-70"></div>
            
            {/* Small floating UI element */}
            <div className="absolute -bottom-10 -right-4 w-56 glass-panel-dark p-3 rounded-lg shadow-lg border border-white/10 transform rotate-2 animate-fade-in animate-delay-700">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-yourdai-purple/90 rounded-md flex items-center justify-center">
                  <span className="text-white text-xs font-bold">AI</span>
                </div>
                <div className="text-left">
                  <p className="text-white text-xs">Energy peak detected at 10am</p>
                  <p className="text-white/60 text-xs">Scheduling high-focus tasks</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;