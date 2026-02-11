import React from 'react';
import { SupportMode } from '../types';
import { MODE_DESCRIPTIONS } from '../constants';
import { Lightbulb, Navigation, CheckCircle } from 'lucide-react';

interface ModeSelectorProps {
  currentMode: SupportMode;
  onSelectMode: (mode: SupportMode) => void;
  disabled?: boolean;
}

const ModeSelector: React.FC<ModeSelectorProps> = ({ currentMode, onSelectMode, disabled }) => {

  const getIcon = (mode: SupportMode) => {
    switch (mode) {
      case SupportMode.HINT: return <Lightbulb size={14} />;
      case SupportMode.GUIDE: return <Navigation size={14} />;
      case SupportMode.SOLVE: return <CheckCircle size={14} />;
    }
  };

  return (
    <div className="flex items-center gap-2 mb-3 md:mb-4 p-2 md:p-3 bg-slate-50 rounded-xl border border-slate-200">
      <span className="text-xs md:text-sm font-medium text-slate-500 flex-shrink-0 hidden sm:flex items-center mr-1">
        Chế độ:
      </span>
      <div className="flex flex-1 gap-1.5 md:gap-2 overflow-x-auto scrollbar-hide">
        {Object.values(SupportMode).map((mode) => {
          const info = MODE_DESCRIPTIONS[mode];
          const isSelected = currentMode === mode;

          return (
            <button
              key={mode}
              onClick={() => onSelectMode(mode)}
              disabled={disabled}
              className={`
                flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-all whitespace-nowrap
                border flex-1 justify-center md:flex-none md:justify-start
                ${isSelected
                  ? `${info.color} ring-1 ring-offset-1 ring-offset-slate-50 ring-slate-300 shadow-sm`
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {getIcon(mode)}
              <span className="hidden xs:inline sm:inline">{info.label}</span>
              <span className="xs:hidden sm:hidden">{info.icon}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ModeSelector;