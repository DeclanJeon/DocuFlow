import React from "react";
import { Link } from "react-router-dom";
import { FileText, ChevronLeft, Loader2 } from "lucide-react";

export const Navbar = () => (
  <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between h-16">
        <div className="flex items-center">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white">
              <FileText size={20} strokeWidth={3} />
            </div>
            <span className="text-xl font-bold text-gray-900 tracking-tight">
              DocuFlow
            </span>
          </Link>
        </div>
        <div className="flex items-center space-x-4">
          <a
            href="#"
            className="text-sm font-medium text-gray-500 hover:text-brand-600 transition-colors"
          >
            Documentation
          </a>
          <a
            href="#"
            className="text-sm font-medium text-gray-500 hover:text-brand-600 transition-colors"
          >
            Pricing
          </a>
        </div>
      </div>
    </div>
  </nav>
);

export const Footer = () => (
  <footer className="bg-white border-t border-gray-200 mt-auto py-12">
    <div className="max-w-7xl mx-auto px-4 text-center">
      <p className="text-gray-500 text-sm">
        © 2025 DocuFlow. All rights reserved.
      </p>
    </div>
  </footer>
);

export const ToolLayout = ({
  title,
  children,
  isProcessing,
}: {
  title: string;
  children: React.ReactNode;
  isProcessing?: boolean;
}) => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <div className="flex-1 max-w-5xl w-full mx-auto px-4 py-12">
        <div className="flex items-center mb-8">
          <Link
            to="/"
            className="p-2 rounded-full hover:bg-gray-200 transition-colors mr-4"
          >
            <ChevronLeft size={24} className="text-gray-600" />
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
        </div>

        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8 min-h-[500px] relative">
          {isProcessing && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center rounded-3xl">
              <Loader2 size={48} className="text-brand-600 animate-spin mb-4" />
              <p className="text-lg font-medium text-gray-700">Processing...</p>
            </div>
          )}
          {children}
        </div>
      </div>
      <Footer />
    </div>
  );
};
