import React, { useState, useRef, MouseEvent as ReactMouseEvent } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface ImageZoomModalProps {
  imageUrl: string;
  title: string;
  subtitle?: string;
  onClose: () => void;
}

export const ImageZoomModal: React.FC<ImageZoomModalProps> = ({ imageUrl, title, subtitle, onClose }) => {
  const { isDark } = useTheme();
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({x: 0, y: 0});
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({x: 0, y: 0});

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.5, 4));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.5, 0.5));
  const handleReset = () => {
    setScale(1);
    setPosition({x: 0, y: 0});
  };

  const handleMouseDown = (e: ReactMouseEvent<HTMLImageElement>) => {
    if (scale <= 1) return;
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  const handleMouseMove = (e: ReactMouseEvent<HTMLImageElement>) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    });
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 md:p-8"
      onClick={onClose}
    >
   <div
        className={`rounded-xl border w-full max-w-4xl max-h-full flex flex-col shadow-2xl ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex items-center justify-between px-4 py-3 border-b shrink-0 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <div>
            <div className={`text-sm font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              {title}
            </div>
            {subtitle && (
              <div className={`text-[11px] font-mono mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                {subtitle}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <div className={`flex items-center rounded-lg border p-1 mr-2 ${isDark ? 'border-slate-700 bg-slate-950' : 'border-slate-300 bg-slate-50'}`}>
              <button onClick={handleZoomOut} className={`p-1.5 rounded cursor-pointer ${isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-600 hover:text-slate-900'}`} title="Zoom Out">
                <ZoomOut className="w-4 h-4" />
              </button>
              <button onClick={handleReset} className={`p-1.5 rounded cursor-pointer ${isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-600 hover:text-slat-900'}`} title="Reset Zoom">
                <RotateCcw className="w-4 h-4" />
              </button>
              <button onClick={handleZoomIn} className={`p-1.5 rounded cursor-pointer ${isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-600 hover:text-slate-900'}`} title="Zoom In">
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
            <button onClick={onClose} className={`p-1.5 rounded-lg cursor-pointer ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`} title="Tutup">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className={`relative overflow-hidden p-4 flex-1 min-h-0 h-full flex items-center justify-center ${isDark ? 'bg-slate-950' : 'bg-slate-100'}`}>
          <img 
            src={imageUrl} 
            alt="Foto Capture" 
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            draggable={false}
            style={{ 
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`, 
              transition: isDragging ? 'none' : 'transform 0.2s ease-out', 
              transformOrigin: 'center center',
              cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
            }}
            className="max-w-full max-h-full rounded shadow-lg object-contain select-none" 
          />
        </div>
      </div>
    </div>
  );
};