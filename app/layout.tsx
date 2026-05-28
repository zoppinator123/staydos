import type { Metadata } from "next";
import { Jost, Raleway } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";

const fontDisplay = Jost({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const fontBody = Raleway({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Staydos",
  description: "Task management for Stayd.co",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fontDisplay.variable} ${fontBody.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
