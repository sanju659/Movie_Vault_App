import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "WatchVault", template: "%s · WatchVault" },
  description: "Your Personal Cinema Diary.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${geist.className} min-h-screen bg-neutral-950 text-neutral-100 antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
