/**
 * Chat Widget Embed Script
 * 
 * This script creates an embeddable chat widget that can be included on any website
 * to provide real-time chat functionality specific to the current page URL.
 */

interface ChatWidgetConfig {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  title?: string;
  initiallyOpen?: boolean;
  width?: string;
  height?: string;
  host?: string;
}

class ChatWidget {
  private config: ChatWidgetConfig;
  private container: HTMLElement | null = null;
  private iframe: HTMLIFrameElement | null = null;
  private currentUrl: string;
  private isOpen: boolean;
  private host: string;

  constructor(config: ChatWidgetConfig = {}) {
    // Set default configuration
    this.config = {
      position: config.position || 'bottom-right',
      title: config.title || 'Chat',
      initiallyOpen: config.initiallyOpen || false,
      width: config.width || '350px',
      height: config.height || '500px',
      host: config.host || window.location.origin
    };

    this.currentUrl = window.location.href;
    this.isOpen = this.config.initiallyOpen || false;
    this.host = this.config.host || window.location.origin;

    // Initialize the widget
    this.init();
  }

  private init(): void {
    // Create container element
    this.container = document.createElement('div');
    this.container.id = 'chat-widget-container';
    this.container.style.position = 'fixed';
    
    // Position the container based on config
    switch (this.config.position) {
      case 'bottom-right':
        this.container.style.bottom = '20px';
        this.container.style.right = '20px';
        break;
      case 'bottom-left':
        this.container.style.bottom = '20px';
        this.container.style.left = '20px';
        break;
      case 'top-right':
        this.container.style.top = '20px';
        this.container.style.right = '20px';
        break;
      case 'top-left':
        this.container.style.top = '20px';
        this.container.style.left = '20px';
        break;
    }

    this.container.style.zIndex = '9999';
    this.container.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.1)';
    this.container.style.borderRadius = '8px';
    this.container.style.overflow = 'hidden';
    this.container.style.width = this.config.width || '350px';
    this.container.style.display = this.isOpen ? 'block' : 'none';

    // Create button
    const button = document.createElement('div');
    button.id = 'chat-widget-button';
    button.style.position = 'fixed';
    button.style.width = '60px';
    button.style.height = '60px';
    button.style.borderRadius = '50%';
    button.style.backgroundColor = '#4f46e5';
    button.style.color = 'white';
    button.style.display = 'flex';
    button.style.alignItems = 'center';
    button.style.justifyContent = 'center';
    button.style.cursor = 'pointer';
    button.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
    button.style.zIndex = '9998';
    
    // Position the button
    switch (this.config.position) {
      case 'bottom-right':
        button.style.bottom = '20px';
        button.style.right = '20px';
        break;
      case 'bottom-left':
        button.style.bottom = '20px';
        button.style.left = '20px';
        break;
      case 'top-right':
        button.style.top = '20px';
        button.style.right = '20px';
        break;
      case 'top-left':
        button.style.top = '20px';
        button.style.left = '20px';
        break;
    }

    // Chat icon (simple text for now)
    button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';

    // Event listener to toggle widget
    button.addEventListener('click', () => {
      this.toggle();
    });

    // Create iframe for the chat
    this.iframe = document.createElement('iframe');
    this.iframe.style.width = '100%';
    this.iframe.style.height = this.config.height || '500px';
    this.iframe.style.border = 'none';
    
    // Encode the current URL to pass as a parameter
    const encodedUrl = encodeURIComponent(this.currentUrl);
    this.iframe.src = `${this.host}/widget/chat/${encodedUrl}`;
    
    // Append elements to the container
    this.container.appendChild(this.iframe);
    
    // Append to body
    document.body.appendChild(button);
    document.body.appendChild(this.container);

    // Set up message passing for page title
    window.addEventListener('message', (event) => {
      if (event.data?.type === 'REQUEST_PAGE_TITLE') {
        // Send page title to iframe
        const iframe = document.getElementById('chat-widget-container')?.querySelector('iframe');
        if (iframe) {
          iframe.contentWindow?.postMessage({
            type: 'PAGE_TITLE',
            title: document.title
          }, '*');
        }
      }
    });
  }

  toggle(): void {
    this.isOpen = !this.isOpen;
    if (this.container) {
      this.container.style.display = this.isOpen ? 'block' : 'none';
    }
  }

  open(): void {
    this.isOpen = true;
    if (this.container) {
      this.container.style.display = 'block';
    }
  }

  close(): void {
    this.isOpen = false;
    if (this.container) {
      this.container.style.display = 'none';
    }
  }
}

export default ChatWidget;