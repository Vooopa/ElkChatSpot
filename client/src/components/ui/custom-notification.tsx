import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CustomNotificationProps {
  isOpen: boolean;
  message: string;
  onClose: () => void;
  autoCloseTime?: number; // in milliseconds
}

export const CustomNotification: React.FC<CustomNotificationProps> = ({
  isOpen,
  message,
  onClose,
  autoCloseTime = 5000 // Default 5 seconds
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      
      // Play notification sound if available
      const audio = document.getElementById('notification-sound') as HTMLAudioElement;
      if (audio) {
        audio.currentTime = 0;
        audio.play().catch(err => console.error('Errore audio:', err));
      }
      
      // Auto close after specified time
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Allow animation to complete
      }, autoCloseTime);
      
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [isOpen, autoCloseTime, onClose]);

  if (!isOpen && !isVisible) return null;

  return (
    <div
      className={`fixed z-50 top-4 right-4 max-w-sm bg-white rounded-lg border border-gray-200 shadow-lg transform transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
      }`}
    >
      <div className="p-4 flex items-start">
        <div className="flex-1 mr-4">
          <p className="font-medium text-gray-900">{message}</p>
        </div>
        <Button
          variant="ghost" 
          size="icon"
          className="h-6 w-6 -mt-1 -mr-1" 
          onClick={() => {
            setIsVisible(false);
            setTimeout(onClose, 300);
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default CustomNotification;