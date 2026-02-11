import { GoogleGenAI, Chat, Part } from "@google/genai";
import { Message, Role, SupportMode } from "../types";
import { SYSTEM_INSTRUCTION, MODEL_LIST, STORAGE_KEYS } from "../constants";

let chatSession: Chat | null = null;
let genAI: GoogleGenAI | null = null;
let currentModelIndex = 0;

// ========== API Key Management ==========
export const getApiKey = (): string | null => {
  return localStorage.getItem(STORAGE_KEYS.API_KEY);
};

export const setApiKey = (key: string): void => {
  localStorage.setItem(STORAGE_KEYS.API_KEY, key);
  // Reset genAI instance to use new key
  genAI = null;
  chatSession = null;
};

export const hasApiKey = (): boolean => {
  const key = getApiKey();
  return key !== null && key.trim() !== '';
};

// ========== Model Management ==========
export const getSelectedModel = (): string => {
  return localStorage.getItem(STORAGE_KEYS.SELECTED_MODEL) || MODEL_LIST[0];
};

export const setSelectedModel = (model: string): void => {
  localStorage.setItem(STORAGE_KEYS.SELECTED_MODEL, model);
  // Reset chat session to use new model
  chatSession = null;
};

export const getCurrentModel = (): string => {
  return MODEL_LIST[currentModelIndex] || MODEL_LIST[0];
};

// ========== GenAI Instance ==========
const getGenAI = (): GoogleGenAI => {
  if (!genAI) {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error("API Key chưa được cấu hình. Vui lòng nhập API Key trong Settings.");
    }
    genAI = new GoogleGenAI({ apiKey });
  }
  return genAI;
};

// ========== Chat Session with Fallback ==========
const initializeChatWithModel = (modelName: string) => {
  const ai = getGenAI();
  return ai.chats.create({
    model: modelName,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.4,
      maxOutputTokens: 65536,
    },
    history: [],
  });
};

export const initializeChat = async () => {
  currentModelIndex = 0;
  const selectedModel = getSelectedModel();
  // Tìm index của model được chọn
  const idx = MODEL_LIST.indexOf(selectedModel);
  if (idx !== -1) {
    currentModelIndex = idx;
  }
  chatSession = initializeChatWithModel(MODEL_LIST[currentModelIndex]);
};

// Retry với model tiếp theo
const tryNextModel = (): boolean => {
  if (currentModelIndex < MODEL_LIST.length - 1) {
    currentModelIndex++;
    chatSession = initializeChatWithModel(MODEL_LIST[currentModelIndex]);
    return true;
  }
  return false;
};

export const sendMessageToGemini = async (
  text: string,
  currentMode: SupportMode,
  history: Message[],
  image?: string
): Promise<string> => {
  if (!hasApiKey()) {
    throw new Error("API Key chưa được cấu hình");
  }

  if (!chatSession) {
    await initializeChat();
  }

  if (!chatSession) {
    throw new Error("Không thể khởi tạo chat session");
  }

  const contextAwareMessage = `[CHẾ ĐỘ HIỆN TẠI: ${currentMode.toUpperCase()}]
  
  Câu hỏi/Trả lời của học sinh:
  ${text}`;

  const attemptSend = async (): Promise<string> => {
    try {
      let messageContent: string | Part[] = contextAwareMessage;

      if (image) {
        const parts: Part[] = [];
        parts.push({ text: contextAwareMessage });

        const [mimeTypeHeader, base64Data] = image.split(';base64,');
        const mimeType = mimeTypeHeader.split(':')[1];

        parts.push({
          inlineData: {
            mimeType: mimeType,
            data: base64Data
          }
        });

        messageContent = parts;
      }

      const response = await chatSession!.sendMessage({ message: messageContent });
      return response.text || "Thầy đang suy nghĩ, em đợi chút nhé...";

    } catch (error: any) {
      console.error(`Gemini API Error with model ${MODEL_LIST[currentModelIndex]}:`, error);

      // Lấy thông tin lỗi chi tiết
      const errorMessage = error?.message || error?.toString() || "Unknown error";
      const isRateLimitError = errorMessage.includes('429') ||
        errorMessage.includes('RESOURCE_EXHAUSTED') ||
        errorMessage.includes('quota');
      const isModelError = errorMessage.includes('model') ||
        errorMessage.includes('not found') ||
        errorMessage.includes('unavailable');

      // Thử model tiếp theo nếu có lỗi rate limit hoặc model error
      if ((isRateLimitError || isModelError) && tryNextModel()) {
        console.log(`Đang thử với model: ${MODEL_LIST[currentModelIndex]}`);
        return await attemptSend(); // Retry với model mới
      }

      // Nếu không thể retry, throw lỗi với thông tin chi tiết
      throw new Error(`Lỗi API: ${errorMessage}`);
    }
  };

  return await attemptSend();
};

export const generateDailyReport = async (messages: Message[]): Promise<string> => {
  if (!hasApiKey()) {
    return "Vui lòng nhập API Key để sử dụng tính năng này.";
  }

  const ai = getGenAI();
  const conversationText = messages.map(m => `${m.role}: ${m.text}`).join('\n');

  const prompt = `Dựa trên đoạn hội thoại sau, hãy lập "BÁO CÁO HỖ TRỢ HỌC SINH" theo mẫu đã quy định trong System Instruction. 
  Chỉ trích xuất thông tin từ cuộc hội thoại này.
  
  Hội thoại:
  ${conversationText}`;

  // Thử với từng model
  for (let i = currentModelIndex; i < MODEL_LIST.length; i++) {
    try {
      const response = await ai.models.generateContent({
        model: MODEL_LIST[i],
        contents: prompt
      });
      return response.text || "Không thể tạo báo cáo lúc này.";
    } catch (e: any) {
      console.error(`Report generation failed with ${MODEL_LIST[i]}:`, e);
      if (i === MODEL_LIST.length - 1) {
        return `Lỗi khi tạo báo cáo: ${e?.message || 'Unknown error'}`;
      }
    }
  }

  return "Lỗi khi tạo báo cáo.";
};