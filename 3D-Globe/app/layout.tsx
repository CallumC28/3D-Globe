import type { Metadata } from "next";
import "./globals.css";
import { ReactNode } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "Globe Facts",
  description:
    "Click any country on a 3D globe to get crisp facts, landmarks, and basics — powered by OpenAI & Google Maps."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <Providers>
          <div className="fixed right-4 top-4 z-50">
            <ThemeToggle />
          </div>
          {children}
        </Providers>
      </body>
    </html>
  );
}
