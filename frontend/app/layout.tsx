import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import { ErrorBoundary } from "@/components/error";
import {
  AuthProvider,
  QueryProvider,
  SonnerProvider,
} from "@/components/providers";
import { OG_IMAGE_URL, SEO_IMAGE_URL } from "@/lib/seo";
import { getSiteOrigin } from "@/lib/site";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700", "800"],
});

const siteOrigin = getSiteOrigin();

export const metadata: Metadata = {
  title: {
    default: "Convot - Embed Intelligent Chatbots on Your Website",
    template: "%s | Convot - AI Assistant Platform",
  },
  description:
    "Convot lets you embed intelligent chatbots on your website powered by your own documents, PDFs, URLs, or custom text. Train your bot with custom knowledge bases, choose OpenAI or Gemini, get insights on user questions, and embed with one line of code. No backend required.",
  keywords: [
    "AI chatbot",
    "chatbot builder",
    "document chatbot",
    "PDF chatbot",
    "website chatbot",
    "OpenAI chatbot",
    "Gemini chatbot",
    "knowledge base chatbot",
    "customer support chatbot",
    "AI assistant",
    "conversational AI",
    "embed chatbot",
    "no-code chatbot",
    "document Q&A",
    "intelligent chatbot",
    "chatbot analytics",
    "custom chatbot",
    "AI assistant platform",
  ],
  authors: [
    { name: "Naman Barkiya", url: "https://github.com/singlebitxyz/convot" },
  ],
  creator: "Naman Barkiya",
  publisher: "Naman Barkiya",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: siteOrigin,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteOrigin,
    title: "Convot - Embed Intelligent Chatbots on Your Website",
    description:
      "Embed intelligent chatbots on your website powered by your own documents, PDFs, URLs, or custom text. Train your bot with custom knowledge bases, choose OpenAI or Gemini, get insights on user questions, and embed with one line of code. No backend required.",
    siteName: "Convot",
    images: [
      {
        url: OG_IMAGE_URL,
        alt: "Convot - AI Assistant Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Convot - Embed Intelligent Chatbots on Your Website",
    description:
      "Embed intelligent chatbots on your website powered by your own documents, PDFs, URLs, or custom text. Train your bot with custom knowledge bases, choose OpenAI or Gemini, and embed with one line of code.",
    creator: "@namanbarkiya",
    images: [OG_IMAGE_URL],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    // Add your actual verification codes here when you have them
    // google: "your-google-verification-code",
    // yandex: "your-yandex-verification-code",
    // yahoo: "your-yahoo-verification-code",
  },
  category: "technology",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* THEME FIX: Prevent FOUC by setting theme before React loads */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function() {
  try {
    var theme = localStorage.getItem('theme');
    if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (e) {}
})();
                        `,
          }}
        />
        {/* Structured Data for Software Application */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "Convot",
              description:
                "Embed intelligent chatbots on your website powered by your own documents, PDFs, URLs, or custom text. Train your bot with custom knowledge bases, choose OpenAI or Gemini, get insights on user questions, and embed with one line of code.",
              url: siteOrigin.toString(),
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web Browser",
              author: {
                "@type": "Person",
                name: "Naman Barkiya",
                url: "https://github.com/singlebitxyz/convot",
              },
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
              softwareVersion: "1.0.0",
              datePublished: "2025-01-01",
              image: SEO_IMAGE_URL,
              featureList: [
                "Upload PDFs, DOCX files, or website URLs",
                "Train bots with custom knowledge bases",
                "Choose between OpenAI or Gemini",
                "One-line embed script",
                "Analytics and insights on user questions",
                "No backend code required",
                "24/7 automated support",
                "Secure and compliant",
              ],
            }),
          }}
        />
        {/* Structured Data for Website */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Convot - AI Assistant Platform",
              url: siteOrigin.toString(),
              description:
                "Embed intelligent chatbots on your website powered by your own documents, PDFs, URLs, or custom text. No backend code required.",
              publisher: {
                "@type": "Person",
                name: "Naman Barkiya",
                url: "https://github.com/namanbarkiya",
              },
              logo: SEO_IMAGE_URL,
            }),
          }}
        />
        {/* Additional SEO Meta Tags */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#16171B" />
        <meta name="msapplication-TileColor" content="#16171B" />
        <link rel="icon" href="/logo/logo-white.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/logo/logo-white.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={`${dmSans.className} antialiased`}>
        <ErrorBoundary>
          <QueryProvider>
            <AuthProvider>
              <div className="flex flex-col min-h-screen">
                <main className="flex-grow">{children}</main>
              </div>
              <SonnerProvider />
            </AuthProvider>
          </QueryProvider>
        </ErrorBoundary>
        <Analytics />
      </body>
    </html>
  );
}
