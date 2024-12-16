'use client';
import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { TypographyH1, TypographyH2, TypographyH3, TypographyH4, TypographyP } from '../fonts/text';
import { Laptop, Brain, Calendar } from 'lucide-react';

const HomePage: React.FC = () => {
  const { user, signIn, signOut } = useAuth(); 
  const API_BASE_URL = 'http://localhost:8000/api';
  const handleGetStarted = async () => {
    try {
        if (user) {
            // First verify if user exists in MongoDB
            const userResponse = await fetch(`${API_BASE_URL}/user/${user.googleId}`, {
                headers: {
                    'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`
                }
            });

            // If user doesn't exist in MongoDB, sign them out first
            if (userResponse.status === 404) {
                console.log('User not found in MongoDB, signing out...');
                await signOut();
                // After signout, trigger sign in
                await signIn();
                return;
            }

            // User exists, let AuthContext handle schedule check and redirection
            await signIn();
        } else {
            // Use the AuthContext's signIn function
            await signIn();
            // The redirect will be handled by AuthContext after sign-in
        }
    } catch (error) {
        console.error('Failed to start authentication:', error);
        // If there's an error, attempt to sign out and clean up
        try {
            await signOut();
        } catch (signOutError) {
            console.error('Failed to sign out after error:', signOutError);
        }
    }
};

  return (
    <div className="min-h-screen bg-[hsl(248,18%,4%)] text-white">
      <header className="w-full max-w-4xl mx-auto p-6 flex justify-between items-center">
        <TypographyH3>yourdAI</TypographyH3>
        <nav>
          <Button variant="link" className="text-white">Features</Button>
          <Button variant="link" className="text-white">Pricing</Button>
          <Button variant="link" className="text-white">Support</Button>
          <Button 
            variant="outline"
            onClick={handleGetStarted}
          >
            Get Started
          </Button>
        </nav>
      </header>

      <main className="w-full max-w-4xl mx-auto p-6">
        <section className="text-center py-20">
          <TypographyH1 className="mb-4">Your AI-Powered Personal Task Assistant</TypographyH1>
          <TypographyP className="mb-8">Intelligent to-do lists that adapt to your work style</TypographyP>
          <Button size="lg" onClick={handleGetStarted}>
            Start Organizing
          </Button>
        </section>

        <section className="py-16">
          <TypographyH2 className="text-center mb-12">Key Features</TypographyH2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: "Personalized Task Management", description: "Lists that evolve with your habits", icon: Laptop },
              { title: "AI-Suggested Priorities", description: "Focus on what matters most", icon: Brain },
              { title: "Automatic Daily Planning", description: "Wake up to an optimized schedule", icon: Calendar },
            ].map((feature, index) => (
              <Card key={index} className="bg-[hsl(248,18%,6%)] border-none">
                <CardHeader>
                  <feature.icon className="w-12 h-12 mb-4 text-blue-500" />
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <TypographyP>{feature.description}</TypographyP>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="py-16">
          <TypographyH2 className="text-center mb-12">How It Works</TypographyH2>
          <div className="flex flex-col md:flex-row justify-around items-center">
            {['Sign Up', 'Input Your Preferences', 'Receive Tailored To-Do Lists'].map((step, index) => (
              <div key={index} className="text-center mb-8 md:mb-0">
                <div className="w-16 h-16 rounded-full bg-blue-500 text-white text-2xl flex items-center justify-center mx-auto mb-4">{index + 1}</div>
                <TypographyP>{step}</TypographyP>
              </div>
            ))}
          </div>
        </section>

        <section className="py-16">
          <TypographyH2 className="text-center mb-12">Pricing</TypographyH2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {['Basic', 'Pro', 'Enterprise'].map((plan, index) => (
              <Card key={index} className={`bg-[hsl(248,18%,6%)] border-none ${index === 1 ? 'border-2 border-blue-500' : ''}`}>
                <CardHeader>
                  <CardTitle>{plan}</CardTitle>
                  <CardDescription>Perfect for {plan.toLowerCase()} users</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc list-inside">
                    <li>Feature 1</li>
                    <li>Feature 2</li>
                    <li>Feature 3</li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button className="w-full">{index === 1 ? 'Recommended' : `Choose ${plan}`}</Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="bg-[hsl(248,18%,6%)] py-8">
        <div className="w-full max-w-4xl mx-auto p-6 flex justify-between items-center">
          <div>
            <TypographyH4 className="mb-2">yourdAI</TypographyH4>
            <TypographyP>&copy; 2023 yourdAI. All rights reserved.</TypographyP>
          </div>
          <nav>
            <Button variant="link" className="text-white">Features</Button>
            <Button variant="link" className="text-white">Pricing</Button>
            <Button variant="link" className="text-white">Support</Button>
          </nav>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;