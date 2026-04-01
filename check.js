#!/usr/bin/env node

/**
 * Pre-flight check script
 * Verifies the bot is ready to run
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Binance Trading Bot - Pre-flight Check\n');

const checks = [];

// Check 1: .env file exists
if (fs.existsSync('.env')) {
  checks.push({ name: '.env file', status: '✅', message: 'Found' });
  
  // Check API keys are set
  const envContent = fs.readFileSync('.env', 'utf8');
  if (envContent.includes('your_') || !envContent.includes('BINANCE_API_KEY=')) {
    checks.push({ name: 'API Keys', status: '⚠️', message: 'Not configured - add your Binance API keys' });
  } else {
    checks.push({ name: 'API Keys', status: '✅', message: 'Configured' });
  }
} else {
  checks.push({ name: '.env file', status: '❌', message: 'Missing - run: cp .env.example .env' });
}

// Check 2: dist folder exists
if (fs.existsSync('dist')) {
  checks.push({ name: 'Build output', status: '✅', message: 'Found in dist/' });
} else {
  checks.push({ name: 'Build output', status: '⚠️', message: 'Run: npm run build' });
}

// Check 3: Node modules
if (fs.existsSync('node_modules')) {
  checks.push({ name: 'Dependencies', status: '✅', message: 'Installed' });
} else {
  checks.push({ name: 'Dependencies', status: '❌', message: 'Run: npm install' });
}

// Check 4: Data directory
if (!fs.existsSync('data')) {
  fs.mkdirSync('data', { recursive: true });
}
checks.push({ name: 'Data directory', status: '✅', message: 'Created' });

// Check 5: Logs directory
if (!fs.existsSync('logs')) {
  fs.mkdirSync('logs', { recursive: true });
}
checks.push({ name: 'Logs directory', status: '✅', message: 'Created' });

// Print results
checks.forEach(check => {
  console.log(`${check.status} ${check.name}: ${check.message}`);
});

// Summary
const failed = checks.filter(c => c.status === '❌').length;
const warnings = checks.filter(c => c.status === '⚠️').length;
const passed = checks.filter(c => c.status === '✅').length;

console.log(`\n📊 Summary: ${passed} passed, ${warnings} warnings, ${failed} failed\n`);

if (failed > 0) {
  console.log('❌ Critical issues found. Please fix them before running the bot.\n');
  process.exit(1);
} else if (warnings > 0) {
  console.log('⚠️  Some issues need attention before the bot can trade.\n');
  console.log('Next steps:');
  console.log('1. Get Binance testnet API keys: https://testnet.binance.vision/');
  console.log('2. Add keys to .env file');
  console.log('3. Run: npm run build (if needed)');
  console.log('4. Run: npm run dev\n');
  process.exit(0);
} else {
  console.log('✅ All checks passed! Bot is ready to run.\n');
  console.log('Run the bot with: npm run dev\n');
  process.exit(0);
}
