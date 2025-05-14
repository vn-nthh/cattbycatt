import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Installing Playwright and dependencies...');

// Install Playwright packages with force flag to bypass dependency conflicts
execSync('npm install --save-dev @playwright/test --force', { stdio: 'inherit' });

// Install browser binaries
execSync('npx playwright install chromium firefox webkit', { stdio: 'inherit' });

// Create e2e-tests directory if it doesn't exist
const e2eDir = path.join(__dirname, 'e2e-tests');
if (!fs.existsSync(e2eDir)) {
  fs.mkdirSync(e2eDir);
}

// Add npm scripts to package.json
const packageJsonPath = path.join(__dirname, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

if (!packageJson.scripts) {
  packageJson.scripts = {};
}

packageJson.scripts['test:e2e'] = 'playwright test';
packageJson.scripts['test:e2e:ui'] = 'playwright test --ui';
packageJson.scripts['test:e2e:debug'] = 'playwright test --debug';

fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

console.log('Playwright setup complete!');
console.log('You can now run end-to-end tests with:');
console.log('  npm run test:e2e        # Run all tests headlessly');
console.log('  npm run test:e2e:ui     # Run tests with UI mode');
console.log('  npm run test:e2e:debug  # Debug tests'); 