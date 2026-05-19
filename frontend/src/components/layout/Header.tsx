import React from "react";
import { Bell } from "lucide-react";

export function Header() {
  return (
    <header className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl flex items-center justify-center">
          <span className="text-white text-lg">🛡️</span>
        </div>
        <div>
          <h1 className="text-lg font-semibold text-gray-900">SafeHer</h1>
          <p className="text-xs text-gray-500">Women's Safety Community</p>
        </div>
      </div>

      {/* Right side - Notifications */}
      <div className="flex items-center gap-3 relative">
        {/* Notifications */}
        <button className="relative p-2 hover:bg-gray-100 rounded-lg">
          <Bell className="h-5 w-5 text-gray-600" />
          <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs font-semibold rounded-full flex items-center justify-center">
            3
          </span>
        </button>
      </div>
    </header>
  );
}