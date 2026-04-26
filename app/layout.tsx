import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sway — decide together",
  description: "Share a board of options with friends and collect reactions in seconds.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
