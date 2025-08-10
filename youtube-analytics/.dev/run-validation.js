// Node.js script to run the validation suite
const { execSync } = require('child_process');

try {
  console.log('Running TypeScript validation suite...\n');
  
  // Compile and run the validation
  const result = execSync(`
    cd /Users/codymenefee/Documents/Projects/rabbit2/youtube-analytics && 
    npx tsx -e "
      import { runDataIntegrityValidation } from './lib/validation-suite.ts';
      runDataIntegrityValidation();
    "
  `, { 
    encoding: 'utf8',
    stdio: 'inherit'
  });

} catch (error) {
  console.error('Error running validation:', error.message);
  process.exit(1);
}