import app from "../../app";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = "../../../data/log.txt";
const logPath = path.resolve(__dirname, configPath);

app.post("/api/log/postLog", (req, res) => {
  const { log } = req.body;
  if (!log) {
    return res.status(400).json({ error: "Log is required" });
  }
  let _log = log;
  const timestamp = new Date().toISOString();
  try {
    _log = JSON.parse(log);
    _log.timestamp = timestamp;
    _log = JSON.stringify(_log);
  } catch (error) {}
  const logEntry = `${_log}\n`;
  fs.appendFile(logPath, logEntry, (err) => {
    if (err) {
      return res.status(500).json({ error: "Failed to write log" });
    }
    res.status(200).json({ message: "Log saved successfully" });
  });
});

app.get("api/log/getLog", (req, res) => {
  fs.readFile(logPath, "utf8", (err, data) => {
    if (err)
      return res
        .status(500)
        .json({
          success: false,
          code: 1,
          data: null,
          msg: "Failed to read log file",
        });
    res.status(200).send({ success: true, data: data, code: 0, msg: "" });
  });
});
