import React, { useState } from "react";
import { Header } from "./components/Header";
import { BottomNavigation } from "./components/BottomNavigation";
import { SafetyFeatures } from "./components/SafetyFeatures";
import { LocationView } from "./components/LocationView";
import { ReportsView } from "./components/ReportsView";
import Auth  from "./components/login";


export default function App() {
  const [activeTab, setActiveTab] = useState("login");

  const renderContent = () => {
    switch (activeTab) {
      case "login":
        return <Auth />;
      case "home":
        return <SafetyFeatures onNavigate={setActiveTab} />;
      case "location":
        return <LocationView />;
      case "reports":
        return <ReportsView />;
      default:
        return <SafetyFeatures />;
    }
  };


  


  return (
    <div className="min-h-screen bg-white flex flex-col max-w-md mx-auto relative">
      {/* Header */}
      <Header />
      
      {/* Main Content */}
      <main className="flex-1 overflow-auto px-4 py-6 pb-24">
        {renderContent()}
      </main>
      
      {/* Bottom Navigation */}
      <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
