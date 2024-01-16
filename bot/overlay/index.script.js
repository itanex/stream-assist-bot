/* eslint-disable no-console */
const notification = document.getElementById("notification");
const socketStatus = document.getElementById("socket-status");
const audio = new Audio();
const retryInterval = 2000;
const maxRetryCount = 60;

let reconnectInterval = null;
let retryCount = 0;
let ws = null;

function onCloseHanlder(event) {
    console.log(`Web Socket: Connection closed`, event);
    socketStatus.classList.replace("connected", "disconnected");

    if (retryCount < maxRetryCount) {
        ws = null;
        reconnectInterval = setInterval(() => {
            if (retryCount < maxRetryCount) {
                retryCount++;
                // eslint-disable-next-line no-use-before-define
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
    socketStatus.classList.replace("disconnected", "connected");

    retryCount = 0;
    clearInterval(reconnectInterval);

    ws.onmessage = onMessageHanlder;
    ws.onclose = onCloseHanlder;

    const message = {
        sender: "overlay",
        body: "Hello from the overlay screen!",
    };

    ws.send(JSON.stringify(message));
}

function createWebSocket() {
    socketStatus.classList.remove("connected");
    socketStatus.classList.add("disconnected");

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
