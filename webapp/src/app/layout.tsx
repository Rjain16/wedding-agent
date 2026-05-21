import type { Metadata } from "next";
import "./globals.css";

const eventName = process.env.NEXT_PUBLIC_EVENT_NAME ?? "Wedding Photos";

export const metadata: Metadata = {
  title: eventName,
  description: "Find all your photos from the wedding in seconds.",
  openGraph: {
    title: eventName,
    description: "Upload a selfie to instantly find your wedding photos.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
