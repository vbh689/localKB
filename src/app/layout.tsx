import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "LocalKB",
  description:
    "Wiki, knowledge base và FAQ nội bộ với instant search cho doanh nghiệp.",
};

const accentBackground = {
  background:
    "radial-gradient(circle at top, rgba(252, 194, 63, 0.24), transparent 30%), linear-gradient(180deg, #f8f3e8 0%, #fffdf8 54%, #f4efe2 100%)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body
        className={`${spaceGrotesk.variable} ${ibmPlexMono.variable} antialiased`}
        style={accentBackground}
      >
        {children}
      </body>
    </html>
  );
}
