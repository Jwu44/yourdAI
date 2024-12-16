import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from '@/lib/AuthContext';
import { RouteGuard } from '@/components/parts/RouteGuard';
import { OnboardingLayout } from '@/components/parts/OnboardingLayout';
import { FormProvider } from "@/lib/FormContext";

export const metadata: Metadata = {
  title: "yourdAI",
  description: "your personalised and automated to do list",
  icons: {
    icon: '/yourdai.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <FormProvider>
            <RouteGuard>
              <OnboardingLayout>
                {children}
              </OnboardingLayout>
            </RouteGuard>
          </FormProvider>
        </AuthProvider>
      </body>
    </html>
  );
}