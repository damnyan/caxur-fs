#!/usr/bin/env bun
import { spawn } from 'child_process';
import readline from 'readline';
import path from 'path';

const SCRIPT_DIR = import.meta.dir;
let mcpUrl = 'http://localhost:6274';
let hasFooter = false;

// Color utility definitions
const colors = {
  reset: '\x1b[0m',
  magenta: '\x1b[1;35m',
  cyan: '\x1b[1;36m',
  green: '\x1b[1;32m',
  yellow: '\x1b[1;33m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  underline: '\x1b[4m',
  
  // Tag colors matching concurrently
  api: '\x1b[32m',    // Green
  client: '\x1b[34m', // Blue
  admin: '\x1b[35m',  // Magenta
  mcp: '\x1b[33m'     // Yellow
};



// Retrieve the terminal status footer containing the active links
const getFooter = () => [
  ` ${colors.cyan}React Admin${colors.reset}: ${colors.underline}${colors.green}http://localhost:3001/login${colors.reset}`,
  ` ${colors.cyan}Client Portal${colors.reset}: ${colors.underline}${colors.green}http://localhost:3002${colors.reset}`,
  ` ${colors.cyan}Rust Axum API${colors.reset}: ${colors.underline}${colors.green}http://localhost:3000/health${colors.reset}`,
  ` ${colors.cyan}MCP Inspector${colors.reset}: ${colors.underline}${colors.green}${mcpUrl}${colors.reset}`
];

// Cleanly erase the sticky status bar from the terminal bottom
const clearFooter = () => {
  if (!hasFooter) return;
  // Move cursor up 4 lines, and clear screen from cursor down
  process.stdout.write('\x1b[A\x1b[2K\x1b[A\x1b[2K\x1b[A\x1b[2K\x1b[A\x1b[2K');
  hasFooter = false;
};

// Draw the terminal sticky status bar at the bottom
const drawFooter = () => {
  if (hasFooter) return;
  process.stdout.write(getFooter().join('\n') + '\n');
  hasFooter = true;
};

// Print log line-by-line while maintaining the sticky status footer pinned below
const printLog = (prefix: string, tagColor: string, text: string) => {
  clearFooter();
  const cleanText = text.replace(/\r/g, ''); // Strip carriage returns
  const lines = cleanText.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip empty trailing lines
    if (i === lines.length - 1 && line === '') continue;
    
    process.stdout.write(`[${tagColor}${prefix}${colors.reset}] ${line}\n`);
  }
  drawFooter();
};



const children: any[] = [];
let isCleaningUp = false;

// Graceful exit handler
const cleanup = () => {
  if (isCleaningUp) return;
  isCleaningUp = true;

  clearFooter();
  console.log('\n🛑 Shutting down development environment...');
  


  // Send kill signals to all running services
  for (const child of children) {
    try {
      child.kill('SIGINT');
    } catch {}
  }

  // Gracefully stop S3, DB and SMTP containers
  console.log('🐳 Running docker compose down...');
  const composeDown = spawn('docker compose down', {
    cwd: path.resolve(SCRIPT_DIR, '../api'),
    shell: true,
    stdio: 'inherit'
  });
  
  composeDown.on('exit', () => {
    process.exit(0);
  });
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Spawn individual process helper
const spawnService = (name: string, cmd: string, args: string[], cwd: string, tagColor: string) => {
  const child = spawn(cmd, args, {
    cwd,
    shell: true,
    env: { 
      ...process.env, 
      FORCE_COLOR: 'true',
      MCP_AUTO_OPEN_ENABLED: 'false'
    }
  });

  children.push(child);

  const rlOut = readline.createInterface({ input: child.stdout });
  rlOut.on('line', (line) => {
    // Intercept dynamic MCP Inspector URL containing token
    if (name === 'MCP' && line.includes('http://localhost:6274')) {
      const match = line.match(/http:\/\/localhost:6274[^ ]*/);
      if (match) {
        mcpUrl = match[0];
        // Force refresh of the footer
        clearFooter();
        drawFooter();
      }
    }
    printLog(name, tagColor, line);
  });

  const rlErr = readline.createInterface({ input: child.stderr });
  rlErr.on('line', (line) => {
    printLog(name, tagColor, line);
  });

  child.on('exit', (code) => {
    if (!isCleaningUp) {
      printLog(name, tagColor, `Process exited with code ${code}`);
    }
  });
};

// Start all services concurrently
console.log('⚡ Starting all services concurrently...');
drawFooter();

spawnService('API', 'cargo watch --ignore postgres_data --ignore minio_data -x run', [], path.resolve(SCRIPT_DIR, '../api'), colors.api);
spawnService('CLIENT', 'bun run dev', [], path.resolve(SCRIPT_DIR, '../client'), colors.client);
spawnService('ADMIN', 'bun run dev', [], path.resolve(SCRIPT_DIR, '../admin'), colors.admin);
spawnService('MCP', 'bunx @modelcontextprotocol/inspector bun scripts/mcp-api-docs.ts', [], path.resolve(SCRIPT_DIR, '..'), colors.mcp);
