var winston = require('winston');
var path = require('path');
var fs = require('fs');

// Set this to whatever, by default the path of the script.
var logPath = './tribe-data/logs';
const tsFormat = () => new Date().toISOString();

if (!fs.existsSync(logPath)) {
  fs.mkdirSync(logPath, { recursive: true });
}

// Get current date in YYYY-MM-DD format
const getDateString = () => {
  const now = new Date();
  return now.toISOString().split('T')[0];
};

const dateString = getDateString();

const errorLog = winston.createLogger({
  transports: [
    new winston.transports.File({
      filename: path.join(logPath, `errors.${dateString}.log`),
      timestamp: tsFormat,
      level: 'info',
    }),
  ],
});

const accessLog = winston.createLogger({
  transports: [
    new winston.transports.File({
      filename: path.join(logPath, `access.${dateString}.log`),
      timestamp: tsFormat,
      level: 'info',
    }),
  ],
});

const commandLog = winston.createLogger({
  format: winston.format.printf((info) => {
    const payload =
      info && typeof info.message === 'object' && info.message !== null
        ? info.message
        : {
            dateTime: tsFormat(),
            message: String(info && info.message ? info.message : ''),
          };
    return JSON.stringify(payload);
  }),
  transports: [
    new winston.transports.File({
      filename: path.join(logPath, `command.${dateString}.log`),
      timestamp: tsFormat,
      level: 'info',
    }),
  ],
});

// Clean up log files older than 30 days
function cleanupOldLogFiles() {
  try {
    if (!fs.existsSync(logPath)) {
      return;
    }

    const files = fs.readdirSync(logPath);
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    files.forEach((file) => {
      // Only delete .log files
      if (!file.endsWith('.log')) {
        return;
      }

      const filePath = path.join(logPath, file);
      try {
        const stat = fs.statSync(filePath);
        const ageMs = now - stat.mtimeMs;

        if (ageMs > thirtyDaysMs) {
          fs.unlinkSync(filePath);
          console.log(`Cleaned up old log file: ${file}`);
        }
      } catch (err) {
        console.error(`Error checking/deleting log file ${file}:`, err.message);
      }
    });
  } catch (err) {
    console.error('Error during log file cleanup:', err.message);
  }
}

// Run cleanup on startup
cleanupOldLogFiles();

module.exports = {
  errorLog: errorLog,
  accessLog: accessLog,
  commandLog: commandLog,
};
