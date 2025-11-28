let socket = null;

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "OPEN_PANEL") {
    openPanel();
  }
});

function openPanel() {
  const old = document.getElementById("assistant-box");
  if (old) old.remove();

  const box = document.createElement("div");
  box.id = "assistant-box";

  box.innerHTML = `
    <div id="assistant-container">
      <div id="assistant-header">
        <h3>Code Assistant</h3>
        <button id="assistant-close">×</button>
      </div>

      <textarea id="assistant-input" placeholder="Message Agent..."></textarea>

      <div class="btn-row">
        <button id="connect-btn">Connect</button>
        <button id="disconnect-btn">Disconnect</button>
        <button id="send-btn">Send</button>
      </div>

      <div id="assistant-result">Not connected.</div>
    </div>
  `;

  document.body.appendChild(box);

  document.getElementById("assistant-close").onclick = () => box.remove();

  const resultBox = document.getElementById("assistant-result");

  // ---------------------------
  // CONNECT
  // ---------------------------
  document.getElementById("connect-btn").onclick = () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      resultBox.innerText = "Already connected.";
      return;
    }

    socket = new WebSocket("ws://localhost:8001/ws");

    socket.onopen = () => {
      resultBox.innerText = "Connected to WebSocket.";
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      resultBox.innerText += "\n\nAssistant:\n" + data.reply;
      resultBox.scrollTop = resultBox.scrollHeight;
    };

    socket.onerror = () => {
      resultBox.innerText = "WebSocket error.";
    };

    socket.onclose = () => {
      resultBox.innerText = "Disconnected.";
    };
  };

  // ---------------------------
  // DISCONNECT
  // ---------------------------
  document.getElementById("disconnect-btn").onclick = () => {
    if (socket) socket.close();
  };

  // ---------------------------
  // SEND MESSAGE
  // ---------------------------
  document.getElementById("send-btn").onclick = () => {
    const context = document.getElementById("assistant-input").value;

    if (!socket || socket.readyState !== WebSocket.OPEN) {
      resultBox.innerText = "Not connected.";
      return;
    }

    const finalMsg = context;

    socket.send(JSON.stringify({ message: finalMsg }));

    document.getElementById("assistant-input").value = "";

    resultBox.innerText += "\n\nYou:\n" + finalMsg;
  };
}
