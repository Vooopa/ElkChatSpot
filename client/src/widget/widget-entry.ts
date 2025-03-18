/**
 * Widget Entry Point
 * 
 * This file serves as the entry point for the widget script.
 * It initializes the ChatWidget class and makes it globally available.
 */

import { ChatWidget } from './embed';

// Extend Window interface to include our ChatWidget
// We're defining this as a module to fix the TypeScript error
export {};

declare global {
  interface Window { 
    ChatWidget: typeof ChatWidget;
  }
}

// Make ChatWidget available globally
window.ChatWidget = ChatWidget;

// Auto-initialize if script has data-chat-widget-auto="true"
document.addEventListener('DOMContentLoaded', () => {
  const scriptTag = document.querySelector('script[data-chat-widget-auto="true"]');
  if (scriptTag && !document.querySelector('iframe[src*="/widget?url="]')) {
    // Only initialize if it hasn't been initialized yet
    new ChatWidget();
  }
});