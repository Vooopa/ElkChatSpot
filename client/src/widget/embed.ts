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
    // Read configuration from data attributes if available
    const scriptTag = document.currentScript as HTMLScriptElement;
    const autoInit = scriptTag?.getAttribute('data-chat-widget-auto') === 'true';
    
    this.config = {
      position: config.position || scriptTag?.getAttribute('data-chat-widget-position') as any || 'bottom-right',
      title: config.title || scriptTag?.getAttribute('data-chat-widget-title') || 'Chat',
      initiallyOpen: config.initiallyOpen || scriptTag?.getAttribute('data-chat-widget-open') === 'true' || false,
      width: config.width || scriptTag?.getAttribute('data-chat-widget-width') || '350px',
      height: config.height || scriptTag?.getAttribute('data-chat-widget-height') || '500px',
      host: config.host || scriptTag?.getAttribute('data-chat-widget-host') || ''
    };

    // Get current URL
    this.currentUrl = encodeURIComponent(window.location.href);
    this.isOpen = this.config.initiallyOpen || false;
    
    // Determine host
    if (!this.config.host) {
      const scriptSrc = scriptTag?.src || '';
      const srcUrl = new URL(scriptSrc, window.location.origin);
      this.host = srcUrl.origin;
    } else {
      this.host = this.config.host;
    }

    // Initialize if auto-init is enabled
    if (autoInit) {
      this.init();
    }
  }

  private init(): void {
    // Create container element
    this.container = document.createElement('div');
    this.container.style.position = 'fixed';
    this.container.style.zIndex = '9999';
    this.container.style.width = '60px';
    this.container.style.height = '60px';
    
    // Set position based on configuration
    switch (this.config.position) {
      case 'top-left':
        this.container.style.top = '20px';
        this.container.style.left = '20px';
        break;
      case 'top-right':
        this.container.style.top = '20px';
        this.container.style.right = '20px';
        break;
      case 'bottom-left':
        this.container.style.bottom = '20px';
        this.container.style.left = '20px';
        break;
      case 'bottom-right':
      default:
        this.container.style.bottom = '20px';
        this.container.style.right = '20px';
        break;
    }
    
    // Create chat button
    const chatButton = document.createElement('div');
    chatButton.style.width = '60px';
    chatButton.style.height = '60px';
    chatButton.style.borderRadius = '30px';
    chatButton.style.backgroundColor = '#4f46e5';
    chatButton.style.display = 'flex';
    chatButton.style.alignItems = 'center';
    chatButton.style.justifyContent = 'center';
    chatButton.style.cursor = 'pointer';
    chatButton.style.boxShadow = '0 4px 14px rgba(0, 0, 0, 0.25)';
    chatButton.style.transition = 'transform 0.3s ease';
    chatButton.innerHTML = `
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M21 11.5C21 16.1944 16.9706 20 12 20C10.2126 20 8.54587 19.5217 7.10975 18.6782L3 20L4.3387 16.4895C3.49994 15.1203 3 13.5591 3 11.9C3 7.30558 7.02944 3.5 12 3.5C16.9706 3.5 21 7.30558 21 11.5Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
    
    chatButton.addEventListener('mouseover', () => {
      chatButton.style.transform = 'scale(1.1)';
    });
    
    chatButton.addEventListener('mouseout', () => {
      chatButton.style.transform = 'scale(1)';
    });
    
    chatButton.addEventListener('click', () => {
      this.toggle();
    });
    
    this.container.appendChild(chatButton);
    
    // Create iframe container (initially hidden)
    const iframeContainer = document.createElement('div');
    iframeContainer.style.position = 'absolute';
    iframeContainer.style.width = this.config.width || '350px';
    iframeContainer.style.height = this.config.height || '500px';
    iframeContainer.style.backgroundColor = '#fff';
    iframeContainer.style.borderRadius = '8px';
    iframeContainer.style.overflow = 'hidden';
    iframeContainer.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.2)';
    iframeContainer.style.display = this.isOpen ? 'block' : 'none';
    
    // Adjust position based on configuration
    switch (this.config.position) {
      case 'top-left':
        iframeContainer.style.top = '0';
        iframeContainer.style.left = '0';
        break;
      case 'top-right':
        iframeContainer.style.top = '0';
        iframeContainer.style.right = '0';
        break;
      case 'bottom-left':
        iframeContainer.style.bottom = '70px';
        iframeContainer.style.left = '0';
        break;
      case 'bottom-right':
      default:
        iframeContainer.style.bottom = '70px';
        iframeContainer.style.right = '0';
        break;
    }
    
    // Create iframe
    this.iframe = document.createElement('iframe');
    this.iframe.style.width = '100%';
    this.iframe.style.height = '100%';
    this.iframe.style.border = 'none';
    
    // Set iframe source to our widget URL with the current page URL as a parameter
    this.iframe.src = `${this.host}/widget?url=${this.currentUrl}`;
    
    iframeContainer.appendChild(this.iframe);
    this.container.appendChild(iframeContainer);
    
    // Add to document
    document.body.appendChild(this.container);
    
    // Set up communication with iframe
    window.addEventListener('message', (event) => {
      // Handle messages from the iframe
      if (event.data && event.data.type === 'REQUEST_PAGE_TITLE') {
        // Send page title to iframe
        const pageTitle = document.title;
        this.iframe!.contentWindow!.postMessage({ 
          type: 'PAGE_TITLE', 
          title: pageTitle 
        }, '*');
      }
    });
  }

  toggle(): void {
    const iframeContainer = this.container?.querySelector('div:nth-child(2)');
    if (!iframeContainer) return;
    
    this.isOpen = !this.isOpen;
    iframeContainer.style.display = this.isOpen ? 'block' : 'none';
  }

  open(): void {
    const iframeContainer = this.container?.querySelector('div:nth-child(2)');
    if (!iframeContainer) return;
    
    this.isOpen = true;
    iframeContainer.style.display = 'block';
  }

  close(): void {
    const iframeContainer = this.container?.querySelector('div:nth-child(2)');
    if (!iframeContainer) return;
    
    this.isOpen = false;
    iframeContainer.style.display = 'none';
  }
}