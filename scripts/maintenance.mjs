import { execSync } from 'child_process';

const action = process.argv[2];

if (!action || (action !== 'on' && action !== 'off' && action !== 'status')) {
  console.log('使い方: npm run maintenance [on|off|status]');
  process.exit(1);
}

if (action === 'status') {
  try {
    const result = execSync('vercel env ls production 2>&1', { encoding: 'utf8' });
    const isOn = result.includes('MAINTENANCE_MODE');
    console.log(`メンテナンスモード: ${isOn ? '🔴 ON' : '🟢 OFF'}`);
  } catch {
    console.error('Vercel CLIでのステータス確認に失敗しました。`vercel login` を確認してください。');
  }
  process.exit(0);
}

if (action === 'on') {
  console.log('🔴 メンテナンスモードを有効化しています...');
  try {
    execSync('printf "true" | vercel env add MAINTENANCE_MODE production --force', { stdio: 'inherit', shell: true });
    execSync('vercel deploy --prod --yes', { stdio: 'inherit', shell: true });
    console.log('✅ メンテナンスモード ON — tabito.site はメンテナンスページを表示しています');
  } catch {
    console.error('エラーが発生しました。`vercel login` でログイン済みか確認してください。');
    process.exit(1);
  }
}

if (action === 'off') {
  console.log('🟢 メンテナンスモードを解除しています...');
  try {
    execSync('vercel env rm MAINTENANCE_MODE production --yes', { stdio: 'inherit', shell: true });
    execSync('vercel deploy --prod --yes', { stdio: 'inherit', shell: true });
    console.log('✅ メンテナンスモード OFF — tabito.site が通常表示に戻りました');
  } catch {
    console.error('エラーが発生しました。`vercel login` でログイン済みか確認してください。');
    process.exit(1);
  }
}
