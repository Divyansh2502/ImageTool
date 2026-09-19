import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ImageTools — private image utilities",
  description: "Compress, resize, and create PDFs from images locally in your browser.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
