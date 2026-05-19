import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { ChatBot } from "./ChatBot";

export function ChatBotButton() {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-20 right-4 w-14 h-14 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-full shadow-lg hover:shadow-xl flex items-center justify-center transition-all duration-300 z-40 animate-pulse hover:animate-none"
        aria-label="Open Safety Assistant"
      >
        <MessageCircle className="h-6 w-6" />
        
        {/* Notification Indicator */}
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs font-semibold rounded-full flex items-center justify-center">
          !
        </div>
      </button>

      {/* Chat Interface */}
      <ChatBot isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </>
  );
}