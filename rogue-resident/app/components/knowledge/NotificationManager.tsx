'use client';
import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import KnowledgeToast from './KnowledgeToast';
import KnowledgeUpdate from './KnowledgeUpdate';

// Define notification types
type NotificationType = 'toast' | 'update';

// Define notification data structure
interface NotificationBase {
  id: string;
  type: NotificationType;
}

interface ToastNotification extends NotificationBase {
  type: 'toast';
  concept: {
    id: string;
    name: string;
    category: string;
    description?: string;
  };
}

interface UpdateNotification extends NotificationBase {
  type: 'update';
  conceptName: string;
  domainName: string;
  domainColor: string;
  gainAmount: number;
}

type Notification = ToastNotification | UpdateNotification;

// Context interface
interface NotificationContextType {
  addToast: (concept: ToastNotification['concept']) => void;
  addUpdate: (data: Omit<UpdateNotification, 'id' | 'type'>) => void;
  clearAll: () => void;
}

// Create context
const NotificationContext = createContext<NotificationContextType>({
  addToast: () => {},
  addUpdate: () => {},
  clearAll: () => {}
});

// Custom hook
export const useNotifications = () => useContext(NotificationContext);

// Provider component
export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeNotification, setActiveNotification] = useState<Notification | null>(null);

  // Process the notification queue when there are notifications or active notification changes
  useEffect(() => {
    // If there's an active notification, don't do anything
    if (activeNotification) return;
    
    // If there are notifications in the queue, set the first one as active
    if (notifications.length > 0) {
      setActiveNotification(notifications[0]);
      // Remove this notification from the queue
      setNotifications(prev => prev.slice(1));
    }
  }, [notifications, activeNotification]);

  // Add a toast notification to the queue
  const addToast = (concept: ToastNotification['concept']) => {
    const newNotification: ToastNotification = {
      id: `toast-${Date.now()}`,
      type: 'toast',
      concept
    };
    
    setNotifications(prev => [...prev, newNotification]);
  };

  // Add an update notification to the queue
  const addUpdate = (data: Omit<UpdateNotification, 'id' | 'type'>) => {
    const newNotification: UpdateNotification = {
      id: `update-${Date.now()}`,
      type: 'update',
      ...data
    };
    
    setNotifications(prev => [...prev, newNotification]);
  };

  // Clear all notifications
  const clearAll = () => {
    setNotifications([]);
    setActiveNotification(null);
  };

  // Handle notification completion
  const handleComplete = () => {
    setActiveNotification(null);
  };

  return (
    <NotificationContext.Provider value={{ addToast, addUpdate, clearAll }}>
      {children}
      
      {/* Render the active notification */}
      {activeNotification && (
        activeNotification.type === 'toast' ? (
          <KnowledgeToast 
            concept={activeNotification.concept} 
            onComplete={handleComplete} 
          />
        ) : (
          <KnowledgeUpdate 
            conceptName={activeNotification.conceptName}
            domainName={activeNotification.domainName}
            domainColor={activeNotification.domainColor}
            gainAmount={activeNotification.gainAmount}
            onComplete={handleComplete}
          />
        )
      )}
      
      {/* Notification count indicator */}
      {notifications.length > 0 && (
        <div className="fixed top-4 right-4 z-50 px-2 py-1 bg-educational text-white rounded-md text-sm">
          +{notifications.length} updates queued
        </div>
      )}
    </NotificationContext.Provider>
  );
}