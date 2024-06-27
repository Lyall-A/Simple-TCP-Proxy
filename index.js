const net = require("net");
const fs = require("fs");

const rawArgs = process.argv.slice(2);
const args = Object.fromEntries(rawArgs.map((value, index, array) => value.startsWith("-") ? ([value.substring(1), !array[index + 1]?.startsWith("-") ? array[index + 1] || null : null]) : null).filter(i => i));

let { hostname, port, serverHost, serverPort, log, logData, logError, freeze } = {  ...fs.existsSync("config.json") ? JSON.parse(fs.readFileSync("config.json", "utf-8")) : { }, ...args };

if (port && !serverPort) serverPort = port;
if (!port && serverPort) port = serverPort;

if (typeof log != "undefined") log = true;
if (typeof logData != "undefined") logData = true;
if (typeof logError != "undefined") logError = true;
if (typeof freeze != "undefined") freeze = Number(freeze);

if (!port || !serverHost) return console.log("Missing arguments");

const proxyServer = net.createServer();

proxyServer.on("connection", socket => {
    const ip = socket.remoteAddress.split("::ffff:")[1] || socket.remoteAddress;

    if (typeof log != "undefined") console.log(`[${new Date().toUTCString()}] [${ip}] Connected`)
    const serverConnection = net.createConnection({ host: serverHost, port: serverPort }, () => {
        if (log) console.log(`[${new Date().toUTCString()}] [${ip}] Connected to ${serverHost}:${serverPort}`);
    });

    let frozen = false;
    if (freeze) setTimeout(() => frozen = true, freeze);

    socket.on("data", data => {
        if (frozen) return;
        serverConnection.write(data);
        if (logData) console.log(`[${new Date().toUTCString()}] [${ip}] [SOCKET DATA]`, data.toString());
    });
    socket.on("error", err => {
        if (logError) console.log(`[${new Date().toUTCString()}] [${ip}] [SOCKET ERROR]`, err)
    });
    socket.on("close", () => {
        serverConnection.end();
        if (log) console.log(`[${ip}] Socket closed`);
    });

    serverConnection.on("data", data => {
        if (frozen) return;
        socket.write(data);
        if (logData) console.log(`[${new Date().toUTCString()}] [${ip}] [SERVER DATA]`, data.toString());
    });
    serverConnection.on("error", err => {
        if (logError) console.log(`[${new Date().toUTCString()}] [${ip}] [SERVER ERROR]`, err);
    });
    serverConnection.on("close", () => {
        socket.end();
        if (log) console.log(`[${new Date().toUTCString()}] [${ip}] Server closed`);
    });
});

proxyServer.listen(port, hostname, () => {
    if (log) console.log(`Proxy server running at ${hostname || ""}:${port}`);
});