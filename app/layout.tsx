import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Test App",
  description: "Minimal Next.js 15 deployment test",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
