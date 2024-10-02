// src/components/Layout.tsx
import React from 'react';
import Head from 'next/head';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}

const Layout: React.FC<{ children: React.ReactNode; title?: string }> = ({ 
  children, 
  title = 'Next.js Code Agent' 
}) => {
  return (
    <div className="min-h-screen bg-gray-100">
      <Head>
        <title>{title}</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        {children}
      </main>

      <footer className="bg-gray-200 py-4 text-center">
        <p>&copy; 2024 Next.js Code Agent</p>
      </footer>
    </div>
  );
};

export default Layout;