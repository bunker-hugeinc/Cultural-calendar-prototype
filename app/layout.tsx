import type { Metadata } from "next";
import { Nav } from "@/components/nav";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Cultural Calendar", template: "%s — Cultural Calendar" },
  description: "Campaign planning intelligence for Apple Pay Partner Marketing",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col">
        <Nav />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
