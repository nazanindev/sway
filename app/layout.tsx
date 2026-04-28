import type { Metadata } from "next";
import "./globals.css";
import NavBar from "./NavBar";

export const metadata: Metadata = {
  title: "Sway — don't decide alone",
  description: "Stop arguing in group chats. Share a Sway, let your friends pick for you.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <NavBar />
        {children}
      </body>
    </html>
  );
}
