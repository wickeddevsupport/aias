
import React, { useContext, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AppContext } from '../contexts/AppContext';
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon } from './icons/EditorIcons';

const Notification: React.FC = () => {
  const { state, dispatch } = useContext(AppContext);
  const { notification } = state;

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        dispatch({ type: 'HIDE_NOTIFICATION' });
      }, 5000); // Auto-hide after 5 seconds

      return () => clearTimeout(timer);
    }
  }, [notification, dispatch]);

  if (!notification) {
    return null;
  }
  
  const iconMap = {
    success: <CheckCircleIcon className="h-6 w-6 text-green-400" />,
    error: <XCircleIcon className="h-6 w-6 text-red-400" />,
    info: <InformationCircleIcon className="h-6 w-6 text-sky-400" />,
  };

  const bgColorMap = {
    success: 'bg-green-800/50 border-green-600/70',
    error: 'bg-red-800/50 border-red-600/70',
    info: 'bg-sky-800/50 border-sky-600/70',
  };
  
  const notificationComponent = (
    <div 
        className={`fixed bottom-5 right-5 z-[50000] transition-all duration-300 ease-in-out transform ${notification ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}
        role="alert"
        aria-live="assertive"
    >
        <div className={`flex items-center space-x-3 p-4 rounded-lg shadow-2xl backdrop-blur-md border ${bgColorMap[notification.type]}`}>
            {iconMap[notification.type]}
            <p className="text-sm text-text-primary">{notification.message}</p>
            <button onClick={() => dispatch({ type: 'HIDE_NOTIFICATION' })} className="absolute top-1 right-1 p-1 text-text-secondary hover:text-text-primary rounded-full">
                &times;
            </button>
        </div>
    </div>
  );

  return createPortal(notificationComponent, document.body);
};

export default Notification;
