// Popup script for WhatsApp AI Assistant
/* global LLMProviders, AISettings */
document.addEventListener('DOMContentLoaded', function() {
  const openWhatsAppBtn = document.getElementById('openWhatsApp');
  const openSettingsBtn = document.getElementById('openSettings');
  const viewHelpBtn = document.getElementById('viewHelp');
  const statusDiv = document.getElementById('status');

  // Check if we're already on WhatsApp Web
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    const currentTab = tabs[0];
    if (currentTab.url && currentTab.url.includes('web.whatsapp.com')) {
      openWhatsAppBtn.textContent = 'WhatsApp Web Active';
      openWhatsAppBtn.style.background = '#28a745';
      showStatus('Extension is active on WhatsApp Web', 'success');
    }
  });

  openWhatsAppBtn.addEventListener('click', function() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      const currentTab = tabs[0];
      
      if (currentTab.url && currentTab.url.includes('web.whatsapp.com')) {
        // Already on WhatsApp Web, just refresh the content script
        chrome.tabs.reload(currentTab.id);
        showStatus('Refreshing WhatsApp Web...', 'success');
      } else {
        // Open WhatsApp Web
        chrome.tabs.create({ url: 'https://web.whatsapp.com' });
        showStatus('Opening WhatsApp Web...', 'success');
      }
    });
  });

  openSettingsBtn.addEventListener('click', function() {
    // Check if we're on WhatsApp Web to open settings
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      const currentTab = tabs[0];
      
      if (currentTab.url && currentTab.url.includes('web.whatsapp.com')) {
        // Send message to content script to open settings
        chrome.tabs.sendMessage(currentTab.id, { action: 'openSettings' }, function(response) {
          if (chrome.runtime.lastError) {
            showStatus('Please refresh WhatsApp Web first', 'error');
          } else {
            showStatus('Opening settings...', 'success');
            window.close();
          }
        });
      } else {
        showStatus('Please open WhatsApp Web first', 'warning');
      }
    });
  });

  viewHelpBtn.addEventListener('click', function() {
    chrome.tabs.create({ url: chrome.runtime.getURL('help.html') });
  });

  showConfiguredProvider();

  /**
   * Shows which provider is selected and, when it sits on a host the manifest
   * does not cover - a custom gateway, a local Ollama - offers to grant access.
   *
   * The grant has to happen here: chrome.permissions.request needs both a user
   * gesture and an extension page, neither of which the settings modal on
   * WhatsApp Web can provide.
   */
  async function showConfiguredProvider() {
    const settings = await AISettings.load();
    const config = AISettings.activeConfig(settings);
    const provider = LLMProviders.get(config.provider);

    const providerLine = document.getElementById('providerLine');
    providerLine.innerHTML = `Using <strong>${provider.label}</strong> &middot; ${config.model || 'default model'}`;

    if (!config.baseUrl) return;

    let origin;
    try {
      origin = `${new URL(config.baseUrl).origin}/*`;
    } catch (error) {
      providerLine.innerHTML += '<br>Base URL is not a valid URL - fix it in settings.';
      return;
    }

    if (await chrome.permissions.contains({ origins: [origin] })) return;

    const notice = document.getElementById('permissionNotice');
    document.getElementById('permissionText').textContent =
      `Chrome needs your permission before the extension can reach ${new URL(config.baseUrl).host}.`;
    notice.style.display = 'block';

    document.getElementById('grantPermission').addEventListener('click', async () => {
      const granted = await chrome.permissions.request({ origins: [origin] });
      if (granted) {
        notice.style.display = 'none';
        showStatus('Access granted', 'success');
      } else {
        showStatus('Access denied - the provider cannot be reached', 'error');
      }
    });
  }

  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status status-${type}`;
    statusDiv.style.display = 'block';
    
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 3000);
  }
});
