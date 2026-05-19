import React, { useState } from "react";
import { Header } from "./components/layout/Header";
import { BottomNavigation } from "./components/layout/BottomNavigation";
import { SafetyFeatures } from "./pages/Home";
import { LocationView } from "./pages/Location";
import { ReportsView } from "./pages/Reports";
import Auth  from "./pages/Login";


export default function App() {
  const [activeTab, setActiveTab] = useState("login");

  const renderContent = () => {
    switch (activeTab) {
      case "login":
        return <Auth onLoginSuccess={() => setActiveTab("home")} />;
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
      {activeTab !== "login" && <Header />}
      
      {/* Main Content */}
      <main className="flex-1 overflow-auto px-4 py-6 pb-24">
        {renderContent()}
      </main>
      
      {/* Bottom Navigation */}
      {activeTab !== "login" && <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />}
    </div>
  );
}
