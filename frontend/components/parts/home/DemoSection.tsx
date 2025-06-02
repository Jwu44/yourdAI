import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Image from "next/image"; 

const DemoSection = () => {
  return (
    <section id="demo" className="py-24 md:py-32 relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-muted/20 -z-10"></div>
      
      <div className="container max-w-7xl mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">          
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-6 animate-fade-in animate-delay-100 text-balance">
            Experience task management that <span className="text-yourdai-purple">adapts to you</span>
          </h2>
          
          <p className="text-muted-foreground text-lg mb-12 animate-fade-in animate-delay-200 text-balance">
            yourdai&apos;s AI adapts to your unique productivity patterns, continuously optimizing your 
            schedule based on when and how you work best.
          </p>
        </div>
        
        <Tabs defaultValue="decomposition" className="w-full animate-fade-in animate-delay-300">
          <TabsList className="w-full max-w-lg mx-auto grid grid-cols-3 mb-10">
            <TabsTrigger value="rhythm">Finding Rhythm</TabsTrigger>
            <TabsTrigger value="decomposition">Breakdown Tasks</TabsTrigger>
            <TabsTrigger value="suggestions">Evolving Suggestions</TabsTrigger>
          </TabsList>
          
          <TabsContent value="decomposition">
            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
              {/* Demo visuals */}
              <div className="w-full lg:w-3/5 relative">
                <div className="relative rounded-2xl overflow-hidden glass-panel-dark shadow-xl">
                  <Image 
                    src="/task-decomp.png"
                    alt="yourdai task decomposition" 
                    className="w-full rounded-xl"
                    width={800}
                    height={600}
                  />
                  
                  {/* Overlay info */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                    <div className="flex items-start gap-3">
                      <div className="bg-yourdai-purple/90 text-white p-1 rounded text-xs font-semibold">
                        AI
                      </div>
                      <div>
                        <h4 className="text-white text-sm font-medium mb-1">Smart Decomposition</h4>
                        <p className="text-white/80 text-xs">
                          Breaking complex goals into bite-sized, achievable tasks
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Glow effect */}
                <div className="absolute -inset-4 bg-gradient-to-r from-yourdai-purple/20 to-yourdai-blue/20 rounded-[22px] blur-xl -z-10 opacity-50"></div>
              </div>
              
              {/* Feature details */}
              <div className="w-full lg:w-2/5">
                <h3 className="text-2xl md:text-3xl font-display font-bold mb-6 animate-fade-in animate-delay-100">
                  Turn overwhelming tasks into 
                  <span className="text-yourdai-purple"> achievable steps</span>
                </h3>
                
                <p className="text-muted-foreground text-lg mb-8 animate-fade-in animate-delay-200">
                  yourdai&apos;s task decomposition intelligence breaks down complex goals into manageable microsteps, 
                  helping you overcome procrastination and maintain momentum.
                </p>
                
                <div className="space-y-4 mb-8 animate-fade-in animate-delay-300">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full p-1 bg-yourdai-green/20 text-green-600 dark:text-green-400">
                      <Check size={16} />
                    </div>
                    <p className="text-muted-foreground">
                      <span className="font-medium text-foreground">Automatic subtask generation</span> creates 
                      a clear path forward for complex projects
                    </p>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="rounded-full p-1 bg-yourdai-green/20 text-green-600 dark:text-green-400">
                      <Check size={16} />
                    </div>
                    <p className="text-muted-foreground">
                      <span className="font-medium text-foreground">Time estimates for each microstep</span> make 
                      planning your day more accurate
                    </p>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="rounded-full p-1 bg-yourdai-green/20 text-green-600 dark:text-green-400">
                      <Check size={16} />
                    </div>
                    <p className="text-muted-foreground">
                      <span className="font-medium text-foreground">Adaptive recommendations</span> adjust based on 
                      your actual completion times
                    </p>
                  </div>
                </div>
                
                <Button className="bg-yourdai-purple hover:bg-yourdai-purple/90 text-white px-8 py-6 rounded-xl font-medium transition-all duration-300 animate-fade-in animate-delay-400">
                  Start Breaking Down Tasks
                </Button>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="rhythm">
            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
              {/* Demo visuals */}
              <div className="w-full lg:w-3/5 relative">
                <div className="relative rounded-2xl overflow-hidden glass-panel-dark shadow-xl">
                  <Image 
                    src="/dashboard-crossed.png" 
                    alt="yourdai energy-aware scheduling" 
                    className="w-full rounded-xl"
                    width={800}
                    height={600}
                  />
                  
                  {/* Overlay info */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                    <div className="flex items-start gap-3">
                      <div className="bg-yourdai-purple/90 text-white p-1 rounded text-xs font-semibold">
                        AI
                      </div>
                      <div>
                        <h4 className="text-white text-sm font-medium mb-1">Energy Pattern</h4>
                        <p className="text-white/80 text-xs">
                          Optimizing your schedule based on your natural energy levels
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Glow effect */}
                <div className="absolute -inset-4 bg-gradient-to-r from-yourdai-blue/20 to-yourdai-purple/20 rounded-[22px] blur-xl -z-10 opacity-50"></div>
              </div>
              
              {/* Feature details */}
              <div className="w-full lg:w-2/5">
                <h3 className="text-2xl md:text-3xl font-display font-bold mb-6 animate-fade-in animate-delay-100">
                  Schedule tasks when you&apos;re at your 
                  <span className="text-yourdai-purple"> peak performance</span>
                </h3>
                
                <p className="text-muted-foreground text-lg mb-8 animate-fade-in animate-delay-200">
                  yourdai maps your natural energy fluctuations throughout the day and schedules high-focus tasks
                  during your peak productivity hours.
                </p>
                
                <div className="space-y-4 mb-8 animate-fade-in animate-delay-300">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full p-1 bg-yourdai-green/20 text-green-600 dark:text-green-400">
                      <Check size={16} />
                    </div>
                    <p className="text-muted-foreground">
                      <span className="font-medium text-foreground">Energy pattern analysis</span> learns your 
                      unique daily productivity rhythm
                    </p>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="rounded-full p-1 bg-yourdai-green/20 text-green-600 dark:text-green-400">
                      <Check size={16} />
                    </div>
                    <p className="text-muted-foreground">
                      <span className="font-medium text-foreground">Task-energy matching</span> aligns 
                      difficult tasks with your high-energy periods
                    </p>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="rounded-full p-1 bg-yourdai-green/20 text-green-600 dark:text-green-400">
                      <Check size={16} />
                    </div>
                    <p className="text-muted-foreground">
                      <span className="font-medium text-foreground">Continuous optimization</span> refines your 
                      schedule as it learns from your habits
                    </p>
                  </div>
                </div>
                
                <Button className="bg-yourdai-purple hover:bg-yourdai-purple/90 text-white px-8 py-6 rounded-xl font-medium transition-all duration-300 animate-fade-in animate-delay-400">
                  Optimize Your Schedule
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="suggestions">
            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
              {/* Demo visuals */}
              <div className="w-full lg:w-3/5 relative">
                <div className="relative rounded-2xl overflow-hidden glass-panel-dark shadow-xl">
                  <Image 
                    src="/suggestions.png" 
                    alt="yourdai energy-aware scheduling" 
                    className="w-full rounded-xl"
                    width={800}
                    height={600}
                  />
                  
                  {/* Overlay info */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                    <div className="flex items-start gap-3">
                      <div className="bg-yourdai-purple/90 text-white p-1 rounded text-xs font-semibold">
                        AI
                      </div>
                      <div>
                        <h4 className="text-white text-sm font-medium mb-1">Energy Pattern</h4>
                        <p className="text-white/80 text-xs">
                          Optimizing your schedule based on your natural energy levels
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Glow effect */}
                <div className="absolute -inset-4 bg-gradient-to-r from-yourdai-blue/20 to-yourdai-purple/20 rounded-[22px] blur-xl -z-10 opacity-50"></div>
              </div>
              
              {/* Feature details */}
              <div className="w-full lg:w-2/5">
                <h3 className="text-2xl md:text-3xl font-display font-bold mb-6 animate-fade-in animate-delay-100">
                  Schedule tasks when you&apos;re at your 
                  <span className="text-yourdai-purple"> peak performance</span>
                </h3>
                
                <p className="text-muted-foreground text-lg mb-8 animate-fade-in animate-delay-200">
                  yourdai maps your natural energy fluctuations throughout the day and schedules high-focus tasks
                  during your peak productivity hours.
                </p>
                
                <div className="space-y-4 mb-8 animate-fade-in animate-delay-300">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full p-1 bg-yourdai-green/20 text-green-600 dark:text-green-400">
                      <Check size={16} />
                    </div>
                    <p className="text-muted-foreground">
                      <span className="font-medium text-foreground">Energy pattern analysis</span> learns your 
                      unique daily productivity rhythm
                    </p>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="rounded-full p-1 bg-yourdai-green/20 text-green-600 dark:text-green-400">
                      <Check size={16} />
                    </div>
                    <p className="text-muted-foreground">
                      <span className="font-medium text-foreground">Task-energy matching</span> aligns 
                      difficult tasks with your high-energy periods
                    </p>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="rounded-full p-1 bg-yourdai-green/20 text-green-600 dark:text-green-400">
                      <Check size={16} />
                    </div>
                    <p className="text-muted-foreground">
                      <span className="font-medium text-foreground">Continuous optimization</span> refines your 
                      schedule as it learns from your habits
                    </p>
                  </div>
                </div>
                
                <Button className="bg-yourdai-purple hover:bg-yourdai-purple/90 text-white px-8 py-6 rounded-xl font-medium transition-all duration-300 animate-fade-in animate-delay-400">
                  Optimize Your Schedule
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
};

export default DemoSection;
