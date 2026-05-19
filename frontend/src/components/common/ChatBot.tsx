import { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, X, Bot, User, Shield, Navigation, AlertCircle, Phone } from "lucide-react";

interface Message {
  id: string;
  content: string;
  sender: "user" | "bot";
  timestamp: Date;
  type?: "text" | "safety-tip" | "emergency" | "location";
}

interface ChatBotProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChatBot({ isOpen, onClose }: ChatBotProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "Hi! I'm SafeBot, your personal safety assistant. I can help you with safety tips, navigation advice, emergency procedures, and general women's safety information. How can I assist you today?",
      sender: "bot",
      timestamp: new Date(),
      type: "text"
    }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const quickResponses = [
    { text: "Emergency procedures", type: "emergency" },
    { text: "Safe navigation tips", type: "navigation" },
    { text: "Safety tips for night", type: "safety-tip" },
    { text: "Report an incident", type: "text" }
  ];

  const generateBotResponse = (userMessage: string): Message => {
    const lowerMessage = userMessage.toLowerCase();
    let response = "";
    let type: "text" | "safety-tip" | "emergency" | "location" = "text";

    if (lowerMessage.includes("emergency") || lowerMessage.includes("help") || lowerMessage.includes("danger")) {
      response = "🚨 If you're in immediate danger, call emergency services right away. You can also use the Emergency SOS button on the homepage. For non-immediate threats, consider sharing your location with trusted contacts and moving to a safe, well-lit area.";
      type = "emergency";
    } else if (lowerMessage.includes("navigation") || lowerMessage.includes("route") || lowerMessage.includes("directions")) {
      response = "🗺️ For safe navigation: Use well-lit main roads, avoid isolated areas, share your route with trusted contacts, and check our safety heatmap before traveling. The 'Plan Safe Route' feature can help you find the safest path to your destination.";
      type = "location";
    } else if (lowerMessage.includes("night") || lowerMessage.includes("dark") || lowerMessage.includes("evening")) {
      response = "🌙 Night safety tips: Stay in well-lit areas, walk confidently, keep your phone charged, use headphones sparingly, trust your instincts, and consider using our live location sharing with trusted contacts. Avoid shortcuts through dark or isolated areas.";
      type = "safety-tip";
    } else if (lowerMessage.includes("transport") || lowerMessage.includes("bus") || lowerMessage.includes("taxi")) {
      response = "🚌 Public transport safety: Sit near the driver/conductor, stay alert, have your exit planned, trust your instincts about fellow passengers, and share your journey details with someone you trust. Use official ride-sharing apps when possible.";
      type = "safety-tip";
    } else if (lowerMessage.includes("report") || lowerMessage.includes("incident")) {
      response = "📝 You can report incidents or safety concerns using the Reports tab. All reports can be made anonymously. Your reports help keep our community safe by identifying danger zones and safe spots.";
      type = "text";
    } else if (lowerMessage.includes("safe place") || lowerMessage.includes("safe spot")) {
      response = "🏢 Safe spots include police stations, hospitals, fire stations, 24/7 businesses, schools, and verified SafeHer partner locations. Check the Location tab to find the nearest safe spots with ratings and directions.";
      type = "location";
    } else if (lowerMessage.includes("trust") || lowerMessage.includes("contact")) {
      response = "👥 Trusted contacts should be people who can respond quickly if needed - family, close friends, or roommates. Keep their contact info easily accessible and make sure they know how to use the location sharing features.";
      type = "text";
    } else if (lowerMessage.includes("phone") || lowerMessage.includes("call")) {
      response = "📱 Keep your phone charged and consider carrying a portable charger. Set up emergency contacts in your phone, learn how to quickly dial emergency services, and consider using our fake call feature if you need to appear busy.";
      type = "text";
    } else {
      const responses = [
        "I understand you're looking for safety advice. Could you be more specific about what type of help you need? I can assist with emergency procedures, navigation, safety tips, or reporting incidents.",
        "I'm here to help with your safety concerns. Would you like information about safe navigation, emergency procedures, or general safety tips?",
        "Let me help you stay safe! I can provide guidance on emergency situations, safe travel routes, reporting incidents, or general women's safety advice. What would be most helpful right now?"
      ];
      response = responses[Math.floor(Math.random() * responses.length)];
    }

    return {
      id: Date.now().toString(),
      content: response,
      sender: "bot",
      timestamp: new Date(),
      type
    };
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: "user",
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsTyping(true);

    // Simulate typing delay
    setTimeout(() => {
      const botResponse = generateBotResponse(inputMessage);
      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
    }, 1000);
  };

  const handleQuickResponse = (quickResponse: typeof quickResponses[0]) => {
    setInputMessage(quickResponse.text);
  };

  const getMessageIcon = (type?: string) => {
    switch (type) {
      case "emergency":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "location":
        return <Navigation className="h-4 w-4 text-blue-500" />;
      case "safety-tip":
        return <Shield className="h-4 w-4 text-green-500" />;
      default:
        return <Bot className="h-4 w-4 text-purple-500" />;
    }
  };

  const getMessageBorderColor = (type?: string) => {
    switch (type) {
      case "emergency":
        return "border-red-200 bg-red-50";
      case "location":
        return "border-blue-200 bg-blue-50";
      case "safety-tip":
        return "border-green-200 bg-green-50";
      default:
        return "border-gray-200 bg-white";
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end justify-center">
      <div className="bg-white rounded-t-2xl shadow-2xl w-full max-w-md h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold">SafeBot</h3>
              <p className="text-xs opacity-90">Your Safety Assistant</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.sender === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                message.sender === "user" 
                  ? "bg-gray-200" 
                  : "bg-purple-100"
              }`}>
                {message.sender === "user" ? (
                  <User className="h-4 w-4 text-gray-600" />
                ) : (
                  getMessageIcon(message.type)
                )}
              </div>
              <div
                className={`max-w-[75%] p-3 rounded-2xl border ${
                  message.sender === "user"
                    ? "bg-gray-100 border-gray-200"
                    : getMessageBorderColor(message.type)
                } ${message.sender === "user" ? "rounded-br-sm" : "rounded-bl-sm"}`}
              >
                <p className="text-sm">{message.content}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <Bot className="h-4 w-4 text-purple-500" />
              </div>
              <div className="bg-gray-100 border border-gray-200 p-3 rounded-2xl rounded-bl-sm">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Responses */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
            {quickResponses.map((response, index) => (
              <button
                key={index}
                onClick={() => handleQuickResponse(response)}
                className="flex-shrink-0 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-xs transition-colors"
              >
                {response.text}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask me about safety..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim()}
              className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-full flex items-center justify-center transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}