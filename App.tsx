import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { Message, Role, SupportMode } from './types';
import { INITIAL_GREETING } from './constants';
import { sendMessageToGemini, generateDailyReport, initializeChat, hasApiKey } from './services/geminiService';
import ChatMessage from './components/ChatMessage';
import ModeSelector from './components/ModeSelector';
import TeacherProfile from './components/TeacherProfile';
import ApiKeyModal from './components/ApiKeyModal';
import { Send, Paperclip, Menu, X, Image as ImageIcon, Trash2, ArrowDown, Settings } from 'lucide-react';

function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init-1',
      role: Role.MODEL,
      text: INITIAL_GREETING,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentMode, setCurrentMode] = useState<SupportMode>(SupportMode.HINT);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [isApiKeyConfigured, setIsApiKeyConfigured] = useState(false);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check API key on mount
  useEffect(() => {
    const hasKey = hasApiKey();
    setIsApiKeyConfigured(hasKey);
    if (!hasKey) {
      setShowApiKeyModal(true);
    } else {
      initializeChat().catch(console.error);
    }
  }, []);

  const handleApiKeySaved = () => {
    setIsApiKeyConfigured(true);
    setShowApiKeyModal(false);
    initializeChat().catch(console.error);
  };

  // Handle scroll logic
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (chatContainerRef.current) {
      const { scrollHeight, clientHeight } = chatContainerRef.current;
      chatContainerRef.current.scrollTo({
        top: scrollHeight - clientHeight,
        behavior,
      });
    }
  }, []);

  // Auto scroll on new messages
  useLayoutEffect(() => {
    scrollToBottom('smooth');
  }, [messages, isLoading, scrollToBottom]);

  // Show/hide scroll to bottom button
  const handleScroll = useCallback(() => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isNearBottom);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Ảnh quá lớn! Vui lòng chọn ảnh dưới 5MB.");
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImage(event.target?.result as string);
        setTimeout(() => inputRef.current?.focus(), 100);
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const textarea = e.target;
    textarea.style.height = '48px';
    textarea.style.height = Math.min(textarea.scrollHeight, window.innerWidth < 768 ? 100 : 150) + 'px';
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!input.trim() && !selectedImage) || isLoading) return;

    const userText = input;
    const userImage = selectedImage;

    setInput('');
    setSelectedImage(null);
    // Reset textarea height
    if (inputRef.current) inputRef.current.style.height = '48px';

    const userMessage: Message = {
      id: Date.now().toString(),
      role: Role.USER,
      text: userText,
      image: userImage || undefined,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const responseText = await sendMessageToGemini(userText || "Gửi một ảnh bài tập", currentMode, messages, userImage || undefined);

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: Role.MODEL,
        text: responseText,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("Failed to send message", error);
      setMessages((prev) => [...prev, {
        id: Date.now().toString(),
        role: Role.MODEL,
        text: "Xin lỗi, thầy gặp chút trục trặc khi gửi tin nhắn. Em thử lại nhé!",
        timestamp: new Date(),
        isError: true
      }]);
    } finally {
      setIsLoading(false);
      if (window.innerWidth > 768) {
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    }
  };

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    const report = await generateDailyReport(messages);

    const reportMessage: Message = {
      id: Date.now().toString(),
      role: Role.MODEL,
      text: `📊 **BÁO CÁO TỰ ĐỘNG:**\n\n${report}`,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, reportMessage]);
    setIsGeneratingReport(false);
    setIsSidebarOpen(false);
  };

  return (
    <div className="flex h-full bg-slate-50 overflow-hidden relative">

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar (Desktop & Mobile) */}
      <aside className={`
        fixed md:relative z-30 h-full transition-transform duration-300 ease-in-out
        w-[85vw] max-w-[320px] md:w-80 md:max-w-none
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        md:block md:p-6 p-0 bg-white md:bg-transparent shadow-2xl md:shadow-none
      `}>
        <div className="h-full md:h-full bg-white md:rounded-2xl md:shadow-sm md:border md:border-slate-200 overflow-hidden flex flex-col">
          <div className="h-full p-4 md:p-0 overflow-y-auto custom-scrollbar">
            <TeacherProfile
              onGenerateReport={handleGenerateReport}
              isGeneratingReport={isGeneratingReport}
            />
          </div>
          {/* Close button for mobile */}
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="absolute top-3 right-3 md:hidden text-slate-400 hover:text-slate-600 bg-white/80 backdrop-blur-sm rounded-full p-2 shadow-sm"
          >
            <X size={20} />
          </button>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col h-full relative w-full bg-white md:bg-slate-50">

        {/* Header (Mobile Only) */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 shadow-sm z-10 sticky top-0 safe-top">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm">TH</div>
            <div>
              <h1 className="font-bold text-slate-800 text-sm leading-tight">Thầy Trần Hoài Thanh</h1>
              <p className="text-xs text-emerald-600">Trợ lý Toán học</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowApiKeyModal(true)}
              className="flex items-center justify-center w-10 h-10 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
              title="Cài đặt API"
            >
              <Settings size={20} />
            </button>
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="flex items-center justify-center w-10 h-10 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              title="Menu"
            >
              <Menu size={22} />
            </button>
          </div>
        </header>

        {/* Desktop Settings Bar */}
        <div className="hidden md:flex items-center justify-end gap-3 px-6 py-2 bg-white border-b border-slate-100">
          <button
            onClick={() => setShowApiKeyModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 transition-colors text-sm"
          >
            <Settings size={16} />
            <span>Settings (API Key)</span>
          </button>
          {!isApiKeyConfigured && (
            <span className="text-red-500 text-sm font-medium animate-pulse">
              ⚠️ Lấy API key để sử dụng app
            </span>
          )}
        </div>

        {/* Chat Messages Container */}
        <div className="flex-1 relative flex flex-col min-h-0">
          <div
            ref={chatContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto px-3 py-4 md:px-8 md:py-6 space-y-2 custom-scrollbar scroll-smooth"
          >
            <div className="max-w-3xl mx-auto w-full pb-4">
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}

              {isLoading && (
                <div className="flex w-full mb-4 justify-start animate-fade-in">
                  <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    <span className="text-sm text-slate-500 font-medium">Thầy đang giải...</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Scroll to bottom button */}
          {showScrollButton && (
            <button
              onClick={() => scrollToBottom('smooth')}
              className="absolute bottom-3 right-3 md:bottom-4 md:right-8 bg-white border border-slate-200 text-emerald-600 p-2.5 rounded-full shadow-lg hover:bg-slate-50 transition-all z-20"
            >
              <ArrowDown size={18} />
            </button>
          )}
        </div>

        {/* Input Area */}
        <div className="px-3 py-2 md:px-6 md:py-4 bg-white border-t border-slate-200 z-10 safe-bottom">
          <div className="max-w-3xl mx-auto w-full">

            <ModeSelector
              currentMode={currentMode}
              onSelectMode={setCurrentMode}
              disabled={isLoading}
            />

            {/* Image Preview Area */}
            {selectedImage && (
              <div className="mb-3 relative inline-block animate-fade-in">
                <div className="relative group">
                  <img
                    src={selectedImage}
                    alt="Preview"
                    className="h-20 md:h-24 w-auto rounded-xl border border-slate-200 shadow-md object-contain bg-slate-50"
                  />
                  <button
                    onClick={() => setSelectedImage(null)}
                    className="absolute -top-2 -right-2 bg-white text-slate-500 border border-slate-200 rounded-full p-1 shadow-sm hover:text-red-500 hover:border-red-200 transition-colors"
                    type="button"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleSendMessage} className="relative flex items-end gap-1.5 md:gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`
                      p-3 rounded-xl transition-all border flex-shrink-0
                      ${selectedImage
                    ? 'text-emerald-600 bg-emerald-50 border-emerald-200 shadow-sm'
                    : 'text-slate-500 bg-white border-slate-200 hover:bg-slate-50 hover:text-emerald-600'
                  }
                    `}
                title="Gửi ảnh bài tập"
                disabled={isLoading}
              >
                {selectedImage ? <ImageIcon size={20} /> : <Paperclip size={20} />}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </button>

              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={selectedImage ? "Thêm ghi chú cho ảnh này..." : "Nhập câu hỏi hoặc bài toán..."}
                className="flex-1 py-3 px-4 bg-slate-100 border-0 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-slate-800 placeholder:text-slate-400 resize-none text-[15px] md:text-base leading-relaxed"
                style={{ height: '48px', maxHeight: window.innerWidth < 768 ? '100px' : '150px' }}
                disabled={isLoading}
                rows={1}
              />

              <button
                type="submit"
                disabled={(!input.trim() && !selectedImage) || isLoading}
                className={`
                    p-3 rounded-xl flex items-center justify-center transition-all flex-shrink-0
                    ${(!input.trim() && !selectedImage) || isLoading
                    ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md hover:shadow-emerald-200'
                  }
                  `}
              >
                <Send size={20} />
              </button>
            </form>
            <div className="text-center mt-2 hidden md:block">
              <p className="text-[10px] text-slate-400">
                Trợ lý ảo có thể mắc lỗi. Hãy luôn kiểm tra lại kết quả.
              </p>
            </div>
          </div>
        </div>

      </main>

      {/* API Key Modal */}
      <ApiKeyModal
        isOpen={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
        onSave={handleApiKeySaved}
        forceOpen={!isApiKeyConfigured}
      />
    </div>
  );
}

export default App;