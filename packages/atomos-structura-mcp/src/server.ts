#!/usr/bin/env node

import { createServer } from 'http';
import { createVbsMcpServer } from './mcp-server.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 9743;

const server = createVbsMcpServer();

const httpServer = createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === 'GET' && req.url === '/events') {
    server.handleSSE(req, res);
    return;
  }
  
  server.handleRequest(req, res);
});

httpServer.listen(PORT, () => {
  console.log(`VBS MCP Server running on port ${PORT}`);
});