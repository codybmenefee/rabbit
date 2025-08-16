#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

// Create a mock transcript file for testing
const mockTranscript = path.join(__dirname, "test_transcript.jsonl");

const mockData = [
  {
    timestamp: new Date(Date.now() - 60000).toISOString(),
    message: {
      role: "user",
      content: [{ type: "text", text: "Hello Claude" }],
    },
  },
  {
    timestamp: new Date(Date.now() - 30000).toISOString(),
    message: {
      role: "assistant",
      model: "claude-3-opus",
      content: [{ type: "text", text: "Hello! How can I help you today?" }],
      usage: {
        input_tokens: 10,
        output_tokens: 12,
        cache_read_input_tokens: 0,
        cache_creation_input_tokens: 0,
      },
    },
  },
  {
    timestamp: new Date(Date.now() - 15000).toISOString(),
    message: {
      role: "user",
      content: [{ type: "text", text: "Can you help me with JavaScript?" }],
    },
  },
  {
    timestamp: new Date().toISOString(),
    message: {
      role: "assistant",
      model: "claude-3-opus",
      content: [{ type: "text", text: "Of course! I'd be happy to help you with JavaScript." }],
      usage: {
        input_tokens: 35,
        output_tokens: 25,
        cache_read_input_tokens: 15,
        cache_creation_input_tokens: 5,
      },
    },
  },
];

// Write mock data to file
fs.writeFileSync(
  mockTranscript,
  mockData.map((d) => JSON.stringify(d)).join("\n")
);

// Create input for the monitor
const testInput = {
  session_id: "test-session-" + Date.now(),
  transcript_path: mockTranscript,
  model: {
    display_name: "Claude 3 Opus",
  },
};

// Write input to a temp file to simulate stdin
const inputFile = path.join(__dirname, "test_input.json");
fs.writeFileSync(inputFile, JSON.stringify(testInput));

console.log("Testing Context Monitor Status Line\n");
console.log("=" + "=".repeat(50));
console.log("\n1. Testing simple output mode:");
console.log("-" + "-".repeat(30));

// Test simple mode
const { exec } = require("child_process");
exec(
  `node ctx_monitor_statusline.js < ${inputFile}`,
  (error, stdout, stderr) => {
    if (error) {
      console.error("Error:", error);
      return;
    }
    console.log(stdout);
    
    console.log("\n2. Testing status line mode:");
    console.log("-" + "-".repeat(30));
    console.log("Run: node ctx_monitor_statusline.js --status < test_input.json");
    console.log("(Press Ctrl+C to stop)\n");
    
    // Simulate updating the transcript
    console.log("Simulating transcript updates...");
    let updateCount = 0;
    const updateInterval = setInterval(() => {
      updateCount++;
      const newEntry = {
        timestamp: new Date().toISOString(),
        message: {
          role: "assistant",
          model: "claude-3-opus",
          content: [{ type: "text", text: `Response ${updateCount}` }],
          usage: {
            input_tokens: 100 + updateCount * 50,
            output_tokens: 50 + updateCount * 25,
            cache_read_input_tokens: updateCount * 10,
            cache_creation_input_tokens: updateCount * 5,
          },
        },
      };
      
      fs.appendFileSync(mockTranscript, "\n" + JSON.stringify(newEntry));
      
      if (updateCount >= 5) {
        clearInterval(updateInterval);
        console.log("\nTest data generation complete. The transcript now has simulated growth.");
        console.log("Context usage should increase over time in status line mode.");
      }
    }, 2000);
  }
);

// Cleanup function
process.on("exit", () => {
  try {
    fs.unlinkSync(mockTranscript);
    fs.unlinkSync(inputFile);
  } catch {}
});