import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Network Scanner",
  description: "Advanced network discovery and port scanning tool",
  keywords: ["network", "scanner", "port", "discovery", "security", "tools"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <div className="min-h-screen bg-background text-foreground">
            <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="container mx-auto px-4 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">NS</span>
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
                        Network Scanner
                      </h1>
                      <p className="text-sm text-muted-foreground">
                        Advanced network discovery and port scanning
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="px-3 py-1 bg-green-500/10 text-green-500 rounded-full text-xs font-medium">
                      Active
                    </div>
                  </div>
                </div>
              </div>
            </header>
            <main className="container mx-auto px-4 py-8">
              {children}
            </main>
            <footer className="border-t border-border/40 mt-16">
              <div className="container mx-auto px-4 py-6">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <p>© 2024 Network Scanner. Built with Next.js and shadcn/ui.</p>
                  <p>Secure • Fast • Reliable</p>
                </div>
              </div>
            </footer>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}