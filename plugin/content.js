chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "OPEN_CONTEXT_DIALOG") {
    displayContextBox(msg.selectedText);
  }
});

function displayContextBox(selectedText) {
  const existing = document.getElementById("assistant-box");
  if (existing) existing.remove();

  const box = document.createElement("div");
  box.id = "assistant-box";

  box.innerHTML = `
    <div id="assistant-container">
      <div id="assistant-header">
        <h3>Ask Code Assistant</h3>
        <button id="assistant-close">×</button>
      </div>

      <p>Selected Code:</p>
      <pre>${selectedText}</pre>

      <textarea id="extra-context" placeholder="Add extra context..."></textarea>

      <button id="send-btn">Send</button>

      <div id="assistant-result"></div>
    </div>
  `;

  document.body.appendChild(box);

  document.getElementById("assistant-close").onclick = () => {
    box.remove();
  };

  document.getElementById("send-btn").onclick = () => {
    const context = document.getElementById("extra-context").value;
    const fullMessage =
      "Code:\n" + selectedText + "\n\nExtra context:\n" + context;

    chrome.runtime.sendMessage(
      {
        type: "SEND_TO_SERVER",
        message: fullMessage
      },
      (response) => {
        document.getElementById("assistant-result").innerText =
          response.reply || "No response";
      }
    );
  };
}
