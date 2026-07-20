import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Plinth — See the decision before you make it",
  description: "Turn a consequential decision into defensible postures, explicit trade-offs, and the questions that matter next.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
