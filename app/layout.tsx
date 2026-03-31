import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import sql from "@/lib/db";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  let academyName = "ReviewHive";
  try {
    const rows = await sql`
      SELECT key, value FROM system_config
      WHERE key IN ('academy_name')
    `;
    for (const row of rows) {
      if (row.key === "academy_name" && row.value) academyName = row.value;
    }
  } catch {
    // fallback to defaults
  }

  return {
    title: academyName,
    description: `Share your experience with ${academyName}`,
    icons: {
      icon: [{ url: "/api/logo", type: "image/png" }],
      apple: [{ url: "/api/logo", type: "image/png" }],
    },
    openGraph: {
      title: academyName,
      description: `Share your experience with ${academyName}`,
      images: [{ url: "/api/logo", width: 512, height: 512 }],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
