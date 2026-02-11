import React, { useState, useEffect } from 'react';
import { X, Key, ExternalLink, Check, AlertCircle } from 'lucide-react';
import { MODEL_LIST } from '../constants';
import { getApiKey, setApiKey, getSelectedModel, setSelectedModel, hasApiKey } from '../services/geminiService';

interface ApiKeyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    forceOpen?: boolean; // Bắt buộc mở khi chưa có key
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onSave, forceOpen = false }) => {
    const [apiKey, setApiKeyState] = useState('');
    const [selectedModel, setSelectedModelState] = useState(MODEL_LIST[0]);
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const savedKey = getApiKey() || '';
            const savedModel = getSelectedModel();
            setApiKeyState(savedKey);
            setSelectedModelState(savedModel);
            setError('');
        }
    }, [isOpen]);

    const handleSave = () => {
        if (!apiKey.trim()) {
            setError('Vui lòng nhập API Key');
            return;
        }

        setIsSaving(true);
        try {
            setApiKey(apiKey.trim());
            setSelectedModel(selectedModel);
            onSave();
            if (!forceOpen) {
                onClose();
            }
        } catch (e) {
            setError('Có lỗi khi lưu cấu hình');
        } finally {
            setIsSaving(false);
        }
    };

    const handleClose = () => {
        if (!forceOpen || hasApiKey()) {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4">
            <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] md:max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-gradient-to-r from-emerald-500 to-teal-600">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                            <Key className="text-white" size={22} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Thiết lập API Key</h2>
                            <p className="text-emerald-100 text-sm">Cấu hình Gemini AI</p>
                        </div>
                    </div>
                    {(!forceOpen || hasApiKey()) && (
                        <button
                            onClick={handleClose}
                            className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>

                {/* Content */}
                <div className="p-5 space-y-5">
                    {/* API Key Input */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                            API Key <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => {
                                setApiKeyState(e.target.value);
                                setError('');
                            }}
                            placeholder="Nhập API Key của bạn..."
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-slate-800"
                        />
                        {error && (
                            <div className="flex items-center gap-2 mt-2 text-red-600 text-sm">
                                <AlertCircle size={16} />
                                {error}
                            </div>
                        )}
                    </div>

                    {/* Links */}
                    <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                        <a
                            href="https://aistudio.google.com/api-keys"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium text-sm"
                        >
                            <ExternalLink size={16} />
                            Lấy API Key tại Google AI Studio
                        </a>
                        <a
                            href="https://tinyurl.com/hdsdpmTHT"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm"
                        >
                            <ExternalLink size={16} />
                            Xem hướng dẫn chi tiết (Video)
                        </a>
                    </div>

                    {/* Model Selection */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-3">
                            Chọn Model AI
                        </label>
                        <div className="space-y-2">
                            {MODEL_LIST.map((model, index) => (
                                <button
                                    key={model}
                                    onClick={() => setSelectedModelState(model)}
                                    className={`w-full p-3 rounded-xl border-2 text-left transition-all flex items-center justify-between ${selectedModel === model
                                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${index === 0 ? 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white' :
                                            index === 1 ? 'bg-gradient-to-br from-purple-400 to-indigo-500 text-white' :
                                                'bg-gradient-to-br from-orange-400 to-amber-500 text-white'
                                            }`}>
                                            {index + 1}
                                        </div>
                                        <div>
                                            <div className="font-medium">{model}</div>
                                            <div className="text-xs text-slate-500">
                                                {index === 0 && 'Mặc định - Nhanh & cân bằng'}
                                                {index === 1 && 'Mạnh hơn - Phù hợp bài toán phức tạp'}
                                                {index === 2 && 'Ổn định - Tốc độ cao'}
                                            </div>
                                        </div>
                                    </div>
                                    {selectedModel === model && (
                                        <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                                            <Check size={14} className="text-white" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Info Note */}
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
                        <strong>Lưu ý:</strong> Nếu model gặp lỗi (hết quota), hệ thống sẽ tự động chuyển sang model dự phòng.
                    </div>
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg hover:shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isSaving ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Đang lưu...
                            </>
                        ) : (
                            <>
                                <Check size={18} />
                                Lưu cấu hình
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ApiKeyModal;
