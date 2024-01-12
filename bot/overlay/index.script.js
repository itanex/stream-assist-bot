const notification = document.getElementById("notification");
const audio = new Audio();
const retryInterval = 2000;
const maxRetryCount = 60;

let reconnectInterval = null;
let retryCount = 0;
let ws = null;

function onCloseHanlder(event) {
  console.log(`Web Socket: Connection closed`, event);

  if (retryCount < maxRetryCount) {
    ws = null;
    reconnectInterval = setInterval(() => {
      if (retryCount < maxRetryCount) {
        retryCount++;
        createWebSocket();
        console.log(`Web Socket: Attempting Reconnect ${retryCount}`);
      } else {
        clearInterval(reconnectInterval);
      }
    }, retryInterval);
  }
}

function onMessageHanlder(event) {
  const data = JSON.parse(event.data);

  if (data.body && typeof data.body === "string") {
    const result = data.body.match(/!play ([a-f0-9]{32}) ([a-z]{2})/);
    if (result) {
      audio.src = `audio/${result[1]}.${result[2]}`;
      audio.play();
    }
  }
}

function onOpenHandler() {
  console.log("Web Socket: Connection established");

  retryCount = 0;
  clearInterval(reconnectInterval);

  ws.onmessage = onMessageHanlder;
  ws.onclose = onCloseHanlder;

  ws.send(
    JSON.stringify({
      sender: "overlay",
      body: "Hello from the overlay screen!",
    })
  );
}

function createWebSocket() {
  ws = new WebSocket("ws://127.0.0.1:8080/");
  ws.onopen = onOpenHandler;
}

createWebSocket();

audio.addEventListener("play", (event) => {
  notification.style.display = "inline-block";
});

audio.addEventListener("ended", (event) => {
  notification.style.display = "none";
});
