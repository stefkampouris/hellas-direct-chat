"use client";

import { useEffect } from 'react';
import Script from 'next/script';

const DialogflowMessenger = () => {
  useEffect(() => {
    // Add custom styles for the Dialogflow Messenger
    const style = document.createElement('style');
    style.textContent = `
      df-messenger {
        z-index: 999;
        position: fixed;
        --df-messenger-font-color: #000;
        --df-messenger-font-family: 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        --df-messenger-chat-background: #f3f6fc;
        --df-messenger-message-user-background: #d3e3fd;
        --df-messenger-message-bot-background: #fff;
        --df-messenger-border-radius: 8px;
        --df-messenger-send-icon-color: #1976d2;
        bottom: 20px;
        right: 20px;
      }
      
      /* Hide the Dialogflow widget on mobile when our custom chat is visible */
      @media (max-width: 768px) {
        df-messenger {
          display: none;
        }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      // Cleanup function
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);

  useEffect(() => {
    // Add the Dialogflow Messenger widget after the script loads
    const addDialogflowWidget = () => {
      if (typeof window !== 'undefined' && !document.querySelector('df-messenger')) {
        const dfMessenger = document.createElement('df-messenger');
        dfMessenger.setAttribute('location', 'europe-west3');
        dfMessenger.setAttribute('project-id', 'hellas-direct-chat');
        dfMessenger.setAttribute('agent-id', '553895be-d1c0-4729-b0d0-0fc81714b2bd');
        dfMessenger.setAttribute('language-code', 'el');
        dfMessenger.setAttribute('max-query-length', '-1');
        
        const chatBubble = document.createElement('df-messenger-chat-bubble');
        chatBubble.setAttribute('chat-title', 'Hellas Direct Assistant');
        
        dfMessenger.appendChild(chatBubble);
        document.body.appendChild(dfMessenger);
        
        console.log('✅ Dialogflow Messenger widget added to DOM');
      }
    };

    // Check if the script is already loaded
    if (typeof window !== 'undefined' && window.customElements && window.customElements.get('df-messenger')) {
      addDialogflowWidget();
    } else {
      // Wait for the script to load
      const checkForScript = setInterval(() => {
        if (typeof window !== 'undefined' && window.customElements && window.customElements.get('df-messenger')) {
          addDialogflowWidget();
          clearInterval(checkForScript);
        }
      }, 100);
      
      // Clean up interval after 10 seconds
      setTimeout(() => clearInterval(checkForScript), 10000);
    }
  }, []);

  return (
    <>
      {/* Dialogflow Messenger CSS */}
      <link 
        rel="stylesheet" 
        href="https://www.gstatic.com/dialogflow-console/fast/df-messenger/prod/v1/themes/df-messenger-default.css"
      />
      
      {/* Dialogflow Messenger Script */}
      <Script 
        src="https://www.gstatic.com/dialogflow-console/fast/df-messenger/prod/v1/df-messenger.js"
        strategy="afterInteractive"
        onLoad={() => {
          console.log('✅ Dialogflow Messenger script loaded');
        }}
        onError={(e) => {
          console.error('❌ Failed to load Dialogflow Messenger script:', e);
        }}
      />
    </>
  );
};

export default DialogflowMessenger;
