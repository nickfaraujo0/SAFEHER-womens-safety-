import { Home, MapPin, FileText } from "lucide-react";

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function BottomNavigation({ activeTab, onTabChange }: BottomNavigationProps) {
  const navItems = [
    { id: "home", icon: Home, label: "Home" },
    { id: "location", icon: MapPin, label: "Location", isCenter: true },
    { id: "reports", icon: FileText, label: "Reports" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 max-w-md mx-auto">
      <div className="flex items-center justify-around px-4 py-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`flex flex-col items-center gap-1 py-3 px-6 rounded-full transition-colors ${
              item.isCenter 
                ? "bg-gradient-to-br from-pink-500 to-purple-600 text-white" 
                : activeTab === item.id 
                  ? "text-pink-500" 
                  : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => onTabChange(item.id)}
          >
            <item.icon className={`${item.isCenter ? "h-6 w-6" : "h-5 w-5"}`} />
            <span className="text-xs font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}