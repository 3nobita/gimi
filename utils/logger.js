const fs = require('fs');
const path = require('path');

// Logs folder path
const logsDir = path.join(__dirname, '../logs');

// Ensure logs directory exists
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Logger function
const logMessage = (level, message) => {
    const now = new Date();

    const timestamp = now.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });

    const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;

    console.log(logEntry.trim());

    const dateStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(now);

    const logFilePath = path.join(logsDir, `${dateStr}-app.log`);

    fs.appendFile(logFilePath, logEntry, (err) => {
        if (err) {
            console.error("Failed to write to log file:", err);
        }
    });
};
const logger = {
    info: (msg) => logMessage('INFO', msg),
    error: (msg) => logMessage('ERROR', msg),
    warn: (msg) => logMessage('WARN', msg),
};

 conformal = logger;
module.exports = logger;