#!/usr/bin/env node
"use strict";

const fs = require("fs");
const readline = require("readline");

// --- Configuration ---
const CONTEXT_WINDOW = 200_000;
const UPDATE_INTERVAL = 1000; // Update every second
const STATUS_LINE_HEIGHT = 3; // Lines for status display

// --- ANSI Codes ---
const ANSI = {
  clear: "\x1b[2J",
  home: "\x1b[H",
  clearLine: "\x1b[2K",
  saveCursor: "\x1b[s",
  restoreCursor: "\x1b[u",
  hideCursor: "\x1b[?25l",
  showCursor: "\x1b[?25h",
  moveUp: (n) => `\x1b[${n}A`,
  moveDown: (n) => `\x1b[${n}B`,
  setPos: (row, col) => `\x1b[${row};${col}H`,
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[90m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  bgBlack: "\x1b[40m",
  bgBlue: "\x1b[44m",
};

// --- Helpers ---
function readJSON(fd) {
  try {
    return JSON.parse(fs.readFileSync(fd, "utf8"));
  } catch {
    return {};
  }
}

function getColor(percentage) {
  if (percentage >= 90) return ANSI.red;
  if (percentage >= 70) return ANSI.yellow;
  return ANSI.green;
}

function formatNumber(n) {
  return new Intl.NumberFormat("en-US").format(
    Math.max(0, Math.floor(Number(n) || 0))
  );
}

function formatBytes(bytes) {
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

function getProgressBar(percentage, width = 30) {
  const filled = Math.floor((percentage / 100) * width);
  const empty = width - filled;
  const color = getColor(percentage);
  return (
    color +
    "█".repeat(filled) +
    ANSI.dim +
    "░".repeat(empty) +
    ANSI.reset
  );
}

function usedTotal(usage) {
  return (
    (usage?.input_tokens ?? 0) +
    (usage?.output_tokens ?? 0) +
    (usage?.cache_read_input_tokens ?? 0) +
    (usage?.cache_creation_input_tokens ?? 0)
  );
}

function syntheticModel(j) {
  const m = String(j?.message?.model ?? "").toLowerCase();
  return m === "<synthetic>" || m.includes("synthetic");
}

function assistantMessage(j) {
  return j?.message?.role === "assistant";
}

function subContext(j) {
  return j?.isSidechain === true;
}

function contentNoResponse(j) {
  const c = j?.message?.content;
  return (
    Array.isArray(c) &&
    c.some(
      (x) =>
        x &&
        x.type === "text" &&
        /no\s+response\s+requested/i.test(String(x.text))
    )
  );
}

function parseTimestamp(j) {
  const t = j?.timestamp;
  const n = Date.parse(t);
  return Number.isFinite(n) ? n : -Infinity;
}

// --- Main Monitor Class ---
class ContextMonitor {
  constructor(input) {
    this.sessionId = input.session_id || "unknown";
    this.transcriptPath = input.transcript_path;
    this.model = input.model || {};
    this.modelName = this.model.display_name || "Claude";
    this.isRunning = false;
    this.lastUpdate = null;
    this.usage = null;
    this.stats = {
      totalMessages: 0,
      assistantMessages: 0,
      cacheHits: 0,
      avgResponseTime: 0,
    };
  }

  parseTranscript() {
    if (!this.transcriptPath || !fs.existsSync(this.transcriptPath)) {
      return null;
    }

    let latestTs = -Infinity;
    let latestUsage = null;
    let messageCount = 0;
    let assistantCount = 0;
    let cacheHits = 0;

    try {
      const lines = fs.readFileSync(this.transcriptPath, "utf8").split(/\r?\n/);
      
      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i].trim();
        if (!line) continue;

        let j;
        try {
          j = JSON.parse(line);
        } catch {
          continue;
        }

        messageCount++;
        
        if (assistantMessage(j)) {
          assistantCount++;
        }

        const u = j.message?.usage;
        if (u?.cache_read_input_tokens > 0) {
          cacheHits++;
        }

        if (
          subContext(j) ||
          syntheticModel(j) ||
          j.isApiErrorMessage === true ||
          usedTotal(u) === 0 ||
          contentNoResponse(j) ||
          !assistantMessage(j)
        )
          continue;

        const ts = parseTimestamp(j);
        if (ts > latestTs) {
          latestTs = ts;
          latestUsage = u;
        } else if (ts === latestTs && usedTotal(u) > usedTotal(latestUsage)) {
          latestUsage = u;
        }
      }

      this.stats.totalMessages = messageCount;
      this.stats.assistantMessages = assistantCount;
      this.stats.cacheHits = cacheHits;
      
      return latestUsage;
    } catch (error) {
      return null;
    }
  }

  renderStatusLine() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString();
    
    if (!this.usage) {
      return [
        `${ANSI.cyan}╭─ Context Monitor ─────────────────────────────────────╮${ANSI.reset}`,
        `${ANSI.cyan}│${ANSI.reset} ${ANSI.magenta}${this.modelName}${ANSI.reset} | ${ANSI.dim}Waiting for first message...${ANSI.reset}`,
        `${ANSI.cyan}╰─ Session: ${ANSI.dim}${this.sessionId.substring(0, 20)}...${ANSI.reset} ─ ${timeStr} ─╯${ANSI.reset}`,
      ];
    }

    const used = usedTotal(this.usage);
    const percentage = CONTEXT_WINDOW > 0 ? (used * 100) / CONTEXT_WINDOW : 0;
    const color = getColor(percentage);
    const progressBar = getProgressBar(percentage);

    // Token breakdown
    const input = this.usage.input_tokens || 0;
    const output = this.usage.output_tokens || 0;
    const cached = this.usage.cache_read_input_tokens || 0;
    const cacheCreation = this.usage.cache_creation_input_tokens || 0;

    return [
      `${ANSI.cyan}╭─ Context Monitor ─────────────────────────────────────────────────────╮${ANSI.reset}`,
      `${ANSI.cyan}│${ANSI.reset} ${ANSI.magenta}${this.modelName}${ANSI.reset} ${progressBar} ${color}${percentage.toFixed(1)}%${ANSI.reset} (${formatNumber(used)}/${formatNumber(CONTEXT_WINDOW)})`,
      `${ANSI.cyan}│${ANSI.reset} ${ANSI.dim}In:${ANSI.reset}${formatNumber(input)} ${ANSI.dim}Out:${ANSI.reset}${formatNumber(output)} ${ANSI.dim}Cache:${ANSI.reset}${formatNumber(cached)} ${ANSI.dim}Msgs:${ANSI.reset}${this.stats.assistantMessages}/${this.stats.totalMessages}`,
      `${ANSI.cyan}╰─ Session: ${ANSI.dim}${this.sessionId.substring(0, 20)}...${ANSI.reset} ─ ${timeStr} ─╯${ANSI.reset}`,
    ];
  }

  clearStatusArea() {
    process.stdout.write(ANSI.saveCursor);
    for (let i = 0; i < STATUS_LINE_HEIGHT + 1; i++) {
      process.stdout.write(ANSI.clearLine);
      if (i < STATUS_LINE_HEIGHT) {
        process.stdout.write(ANSI.moveUp(1));
      }
    }
    process.stdout.write(ANSI.restoreCursor);
  }

  updateDisplay() {
    this.usage = this.parseTranscript();
    const lines = this.renderStatusLine();
    
    // Clear previous status and write new one
    this.clearStatusArea();
    lines.forEach((line, i) => {
      process.stdout.write(ANSI.clearLine);
      process.stdout.write(line);
      if (i < lines.length - 1) {
        process.stdout.write("\n");
      }
    });
    
    // Move cursor to beginning of last line
    process.stdout.write("\r");
  }

  start() {
    this.isRunning = true;
    
    // Initial display
    console.log(); // Create space for status line
    this.updateDisplay();
    
    // Set up periodic updates
    this.interval = setInterval(() => {
      if (this.isRunning) {
        this.updateDisplay();
      }
    }, UPDATE_INTERVAL);

    // Handle graceful shutdown
    process.on("SIGINT", () => this.stop());
    process.on("SIGTERM", () => this.stop());
  }

  stop() {
    this.isRunning = false;
    if (this.interval) {
      clearInterval(this.interval);
    }
    process.stdout.write(ANSI.showCursor);
    process.stdout.write("\n");
    process.exit(0);
  }
}

// --- Entry Point ---
if (require.main === module) {
  const input = readJSON(0); // stdin
  
  // Check if we should run in status line mode
  const args = process.argv.slice(2);
  const statusLineMode = args.includes("--status") || args.includes("-s");
  
  if (statusLineMode) {
    // Run interactive status line
    const monitor = new ContextMonitor(input);
    monitor.start();
  } else {
    // Run simple one-time output (backward compatibility)
    const monitor = new ContextMonitor(input);
    const usage = monitor.parseTranscript();
    
    if (!usage) {
      console.log(
        `${ANSI.magenta}${monitor.modelName}${ANSI.reset} | ${ANSI.cyan}context window usage starts after your first question.${ANSI.reset}\nsession: ${ANSI.dim}${monitor.sessionId}${ANSI.reset}`
      );
      process.exit(0);
    }
    
    const used = usedTotal(usage);
    const pct = CONTEXT_WINDOW > 0 ? (used * 100) / CONTEXT_WINDOW : 0;
    const color = getColor(pct);
    
    console.log(
      `${ANSI.magenta}${monitor.modelName}${ANSI.reset} | ${color}context used ${pct.toFixed(1)}%${ANSI.reset} - ${ANSI.yellow}(${formatNumber(used)}/${formatNumber(CONTEXT_WINDOW)})${ANSI.reset}\nsession: ${ANSI.dim}${monitor.sessionId}${ANSI.reset}`
    );
  }
}

module.exports = { ContextMonitor };