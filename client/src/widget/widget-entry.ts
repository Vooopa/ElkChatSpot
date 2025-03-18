import ChatWidget from './embed';

// Make ChatWidget available globally
declare global {
  interface Window { 
    ChatWidget: typeof ChatWidget;
  }
}

window.ChatWidget = ChatWidget;

// Auto-initialize if the script is loaded with data attribute
const autoInit = document.querySelector('[data-chat-widget-auto="true"]');
if (autoInit) {
  const config = {};
  
  // Read data attributes
  if (autoInit.hasAttribute('data-chat-widget-position')) {
    const position = autoInit.getAttribute('data-chat-widget-position');
    if (position === 'bottom-right' || position === 'bottom-left' || position === 'top-right' || position === 'top-left') {
      Object.assign(config, { position });
    }
  }
  
  if (autoInit.hasAttribute('data-chat-widget-title')) {
    const title = autoInit.getAttribute('data-chat-widget-title');
    Object.assign(config, { title });
  }

  if (autoInit.hasAttribute('data-chat-widget-open')) {
    const initiallyOpen = autoInit.getAttribute('data-chat-widget-open') === 'true';
    Object.assign(config, { initiallyOpen });
  }

  if (autoInit.hasAttribute('data-chat-widget-width')) {
    const width = autoInit.getAttribute('data-chat-widget-width');
    Object.assign(config, { width });
  }

  if (autoInit.hasAttribute('data-chat-widget-height')) {
    const height = autoInit.getAttribute('data-chat-widget-height');
    Object.assign(config, { height });
  }

  if (autoInit.hasAttribute('data-chat-widget-host')) {
    const host = autoInit.getAttribute('data-chat-widget-host');
    Object.assign(config, { host });
  }

  // Initialize with the config
  new ChatWidget(config);
}

// Export default for bundling
export default ChatWidget;