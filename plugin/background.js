chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "ask-assistant",
    title: "Ask Code Assistant",
    contexts: ["selection"]
  });
});

// Always inject content.js before messaging
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "ask-assistant") {
    chrome.scripting.executeScript(
      {
        target: { tabId: tab.id },
        files: ["content.js"]
      },
      () => {
        chrome.tabs.sendMessage(tab.id, {
          type: "OPEN_CONTEXT_DIALOG",
          selectedText: info.selectionText
        });
      }
    );
  }
});

// Receive a request from content.js and forward it to the backend
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "SEND_TO_SERVER") {
    fetch("http://localhost:8000/chat", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        message: request.message
      })
    })
      .then(res => res.json())
      .then(data => {
        sendResponse({ reply: data.reply });
      });

    return true;
  }
});

