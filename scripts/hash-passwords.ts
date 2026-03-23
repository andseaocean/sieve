// Hashes all plain-text passwords in the managers table using bcrypt.
// Run once: npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/hash-passwords.ts
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Manually parse .env.local to avoid dotenv version issues
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('.env.local not found');
    process.exit(1);
  }
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function hashPasswords() {
  const { data: managers, error } = await supabase
    .from('managers')
    .select('id, password_hash');

  if (error) {
    console.error('Failed to fetch managers:', error.message);
    process.exit(1);
  }

  for (const manager of managers ?? []) {
    if (manager.password_hash?.startsWith('$2')) {
      console.log(`Skipping ${manager.id} — already hashed`);
      continue;
    }

    const hashed = await bcrypt.hash(manager.password_hash, 10);
    const { error: updateError } = await supabase
      .from('managers')
      .update({ password_hash: hashed })
      .eq('id', manager.id);

    if (updateError) {
      console.error(`Failed to update ${manager.id}:`, updateError.message);
    } else {
      console.log(`Hashed password for manager ${manager.id}`);
    }
  }

  console.log('Done.');
}

hashPasswords();
