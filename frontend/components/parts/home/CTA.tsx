import { Button } from "@/components/ui/button";
import { Check, Star } from "lucide-react";
import { WithHandleGetStarted } from '@/lib/types';

const CTA = ({ handleGetStarted }: WithHandleGetStarted) => {
  return (
    <section id="pricing" className="py-24 md:py-32 relative overflow-hidden bg-yourdai-dark/95">
      {/* Background elements */}
      <div className="absolute inset-0 bg-[url('/lovable-uploads/c5624cbe-d4c1-4dc3-9667-f8290cd104c4.png')] bg-cover bg-center opacity-30 -z-20"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-yourdai-dark/90 to-yourdai-dark/90 -z-10"></div>
      
      {/* Decorative elements */}
      <div className="absolute top-1/3 left-10 w-64 h-64 bg-yourdai-blue/20 rounded-full blur-3xl -z-10 animate-pulse-slow"></div>
      <div className="absolute top-1/4 right-10 w-80 h-80 bg-yourdai-purple/20 rounded-full blur-3xl -z-10 animate-pulse-slow animate-delay-500"></div>
      
      <div className="container max-w-6xl mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-6 animate-fade-in animate-delay-100 text-white text-balance">
            Transform your productivity with <span className="text-yourdai-purple">yourdai</span>
          </h2>
          
          <p className="text-white/70 text-lg mb-10 max-w-3xl mx-auto animate-fade-in animate-delay-200 text-balance">
            Join thousands of users who have transformed their daily productivity with personalized, 
            AI-powered scheduling that adapts to their unique energy patterns and priorities.
          </p>
        </div>
        
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Free tier */}
          <div className="flex-1 glass-panel-dark border border-white/10 rounded-2xl p-8 animate-fade-in animate-delay-300">
            <div className="mb-4">
              <h3 className="text-white text-xl font-bold mb-2">Free Trial</h3>
              <p className="text-white/60 text-sm mb-6">Experience the basics</p>
              
              <div className="flex items-end gap-1 mb-6">
                <span className="text-white text-4xl font-bold">$0</span>
                <span className="text-white/60 text-sm mb-1">/14 days</span>
              </div>
              
              <Button 
                className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/20"
                onClick={handleGetStarted}
              >
                Start Free Trial
              </Button>
            </div>
            
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Check size={16} className="text-white/60" />
                <span className="text-white/80">Basic task management</span>
              </div>
              <div className="flex items-center gap-2">
                <Check size={16} className="text-white/60" />
                <span className="text-white/80">Simple scheduling tools</span>
              </div>
              <div className="flex items-center gap-2">
                <Check size={16} className="text-white/60" />
                <span className="text-white/80">Limited AI suggestions</span>
              </div>
              <div className="flex items-center gap-2">
                <Check size={16} className="text-white/60" />
                <span className="text-white/80">Up to 10 tasks</span>
              </div>
            </div>
          </div>
          
          {/* Pro tier */}
          <div className="flex-1 glass-panel-dark border-2 border-yourdai-purple/50 rounded-2xl p-8 relative animate-fade-in animate-delay-400">
            {/* Popular badge */}
            <div className="absolute -top-4 right-8 py-1 px-3 bg-yourdai-purple text-white text-xs font-bold rounded-full">
              MOST POPULAR
            </div>
            
            <div className="mb-4">
              <h3 className="text-white text-xl font-bold mb-2">Pro</h3>
              <p className="text-white/60 text-sm mb-6">Personalized productivity</p>
              
              <div className="flex items-end gap-1 mb-6">
                <span className="text-white text-4xl font-bold">$9</span>
                <span className="text-white/60 text-sm mb-1">/month</span>
              </div>
              
              <Button 
                className="w-full bg-yourdai-purple hover:bg-yourdai-purple/90 text-white"
                onClick={handleGetStarted}
              >
                Get Started
              </Button>
            </div>
            
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Star size={16} className="text-amber-400" />
                <span className="text-white font-medium">Energy-aware scheduling</span>
              </div>
              <div className="flex items-center gap-2">
                <Star size={16} className="text-amber-400" />
                <span className="text-white font-medium">Task decomposition</span>
              </div>
              <div className="flex items-center gap-2">
                <Star size={16} className="text-amber-400" />
                <span className="text-white font-medium">Values-based prioritization</span>
              </div>
              <div className="flex items-center gap-2">
                <Star size={16} className="text-amber-400" />
                <span className="text-white font-medium">Unlimited tasks & projects</span>
              </div>
              <div className="flex items-center gap-2">
                <Star size={16} className="text-amber-400" />
                <span className="text-white font-medium">Advanced AI insights</span>
              </div>
              <div className="flex items-center gap-2">
                <Star size={16} className="text-amber-400" />
                <span className="text-white font-medium">Priority support</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;