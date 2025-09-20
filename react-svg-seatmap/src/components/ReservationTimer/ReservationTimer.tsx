import React, { useState, useEffect } from 'react';
import './ReservationTimer.scss';

interface ReservationTimerProps {
  initialTime: number; // время в секундах
  onTimeExpired?: () => void;
}

export const ReservationTimer: React.FC<ReservationTimerProps> = ({
  initialTime,
  onTimeExpired
}) => {
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setIsExpired(true);
          if (onTimeExpired) {
            onTimeExpired();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onTimeExpired]);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = (): number => {
    return ((initialTime - timeLeft) / initialTime) * 100;
  };

  return (
    <div className={`reservation-timer ${isExpired ? 'expired' : ''}`}>
      <div className="reservation-timer__header">
        <div className="reservation-timer__icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
            <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <div className="reservation-timer__text">
          <div className="reservation-timer__title">Ваши билеты забронированы</div>
          <div className="reservation-timer__subtitle">До окончания бронирования</div>
        </div>
      </div>
      
      <div className="reservation-timer__countdown">
        <div className="reservation-timer__time">
          {formatTime(timeLeft)}
        </div>
        <div className="reservation-timer__progress">
          <div 
            className="reservation-timer__progress-bar"
            style={{ width: `${getProgressPercentage()}%` }}
          />
        </div>
      </div>
      
      {isExpired && (
        <div className="reservation-timer__expired">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
            <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" strokeWidth="2"/>
            <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" strokeWidth="2"/>
          </svg>
          <span>Время бронирования истекло</span>
        </div>
      )}
    </div>
  );
};
