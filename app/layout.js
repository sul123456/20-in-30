import { Inter } from "next/font/google";
import "../globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });

export const metadata = {
  icons: { icon: "/300-in-30-header.jpg", apple: "/300-in-30-header.jpg" },
  openGraph: { title: "300 in 30 Project Tracker", description: "300 in 30 video production tracker", images: ["/300-in-30-header.jpg"] },
  twitter: { card: "summary_large_image", title: "300 in 30 Project Tracker", description: "300 in 30 video production tracker", images: ["/300-in-30-header.jpg"] },
  title: "300 in 30 Project Tracker",
  description: "300 in 30 video production tracker",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FFFFFF",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
