#!/usr/bin/env node

import open from 'open';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

const PROJECT_URL = 'https://app.supabase.com/project/rngbrpitkkhplfwfmrym/sql/new';

async function main() {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  VERIFACT MVP - SUPABASE RLS SETUP');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  console.log('Opening Supabase dashboard in your browser...\n');
  console.log(`→ URL: ${PROJECT_URL}\n`);

  // Try to open browser
  try {
    await open(PROJECT_URL);
  } catch (e) {
    console.log('❓ Could not auto-open browser. Please visit manually:');
    console.log(`   ${PROJECT_URL}\n`);
  }

  // Display the SQL to copy
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  COPY THE SQL BELOW INTO THE SUPABASE SQL EDITOR:');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  try {
    const sql = readFileSync('./supabase/setup_rls.sql', 'utf-8');
    console.log(sql);
    console.log('\n═══════════════════════════════════════════════════════════════════\n');
  } catch (e) {
    console.error('Could not read RLS SQL file');
    process.exit(1);
  }

  console.log('NEXT STEPS:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('1. ✓ Supabase dashboard should be open (or visit URL above)');
  console.log('2. Copy the SQL above (Ctrl+A to select all)');
  console.log('3. Paste into the SQL editor in your browser');
  console.log('4. Click the "Run" button (or press Ctrl+Enter)');
  console.log('5. Wait for success message (should see: "query succeeded")');
  console.log('6. Return to terminal and press Enter\n');

  // Copy SQL to clipboard if possible
  try {
    // Windows
    if (process.platform === 'win32') {
      const sql = readFileSync('./supabase/setup_rls.sql', 'utf-8');
      execSync(`echo "${sql.replace(/"/g, '\\"')}" | clip`);
      console.log('💡 Tip: SQL has been copied to your clipboard! (Ctrl+V to paste)\n');
    }
  } catch (e) {
    // clipboard copy failed, no worries
  }

  // Wait for user confirmation
  console.log('Press Enter once you\'ve successfully run the SQL...');
  await new Promise(resolve => process.stdin.once('data', resolve));

  console.log('\n✅ Running verification...\n');

  // Run verification
  try {
    execSync('node scripts/verify_data.js', { stdio: 'inherit' });
    console.log('\n🎉 Setup complete! Refresh your app: http://localhost:8080/\n');
  } catch (e) {
    console.log('\n⚠️  Verification failed. Please check the Supabase dashboard.');
    process.exit(1);
  }
}

main().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
