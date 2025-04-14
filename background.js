let currentPropertyData = {};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PROPERTY_DATA') {
    currentPropertyData = message.data;
  } else if (message.type === 'GET_PROPERTY_DATA') {
    sendResponse(currentPropertyData);
    return true;
  } else if (message.type === 'OPEN_POPUP') {
    chrome.action.openPopup();
  }
});

// Handle installation
chrome.runtime.onInstalled.addListener(() => {
  // Set default settings with Gemini API key
  chrome.storage.local.set({
    geminiApiKey: 'AIzaSyD1AoYOKFwzfzOuZkjunOuIkQH2ug6rQGU',
    model: 'gemini-pro'
  });
});
