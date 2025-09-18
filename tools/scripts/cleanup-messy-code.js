#!/usr/bin/env node

/**
 * Cleanup script to remove messy implementations and leftover code
 * This script identifies and removes files that are no longer needed
 * after the reorganization to the new Rabbit platform structure
 */

const fs = require('fs')
const path = require('path')

const filesToRemove = [
  // Legacy parser files
  'apps/web/lib/parser.worker.ts',
  'apps/web/lib/parser-core.ts',
  'apps/web/lib/resilient-timestamp-extractor.ts',
  'apps/web/lib/timestamp-migration.ts',
  'apps/web/lib/worker-loader.ts',
  
  // Mock data files (use demo data from packages instead)
  'apps/web/lib/mock-data.ts',
  'apps/web/lib/demo-data.ts',
  'apps/web/lib/fixtures.ts',
  
  // Old validation files (consolidate into packages/validation)
  'apps/web/lib/data-consistency-validator.ts',
  'apps/web/lib/data-integrity-validation.ts',
  'apps/web/lib/validation-suite.ts',
  
  // Debug and test files scattered in lib
  'apps/web/lib/openai.ts', // If not used in production
  
  // Old documentation that's now outdated
  'apps/web/docs/PROTOTYPE_PLAN.md',
  'apps/web/docs/agents/',
  
  // Test artifacts
  'apps/web/playwright-report/',
  'apps/web/test-results/',
  
  // Build artifacts
  'apps/web/.next/',
  'apps/web/node_modules/',
  
  // Old configuration files
  'apps/web/next-env.d.ts',
  'apps/web/vercel.json',
  
  // Inspiration files (move to docs if needed)
  'apps/web/inspo/',
  
  // Public test files
  'apps/web/public/test-worker-performance.html',
]

const directoriesToClean = [
  'apps/web/scripts/dev-tools/',
  'apps/web/scripts/testing/',
  'apps/web/scripts/validation/',
]

function removeFile(filePath) {
  const fullPath = path.resolve(filePath)
  
  if (fs.existsSync(fullPath)) {
    try {
      if (fs.statSync(fullPath).isDirectory()) {
        fs.rmSync(fullPath, { recursive: true, force: true })
        console.log(`✅ Removed directory: ${filePath}`)
      } else {
        fs.unlinkSync(fullPath)
        console.log(`✅ Removed file: ${filePath}`)
      }
    } catch (error) {
      console.error(`❌ Failed to remove ${filePath}:`, error.message)
    }
  } else {
    console.log(`⚠️  File not found: ${filePath}`)
  }
}

function cleanDirectory(dirPath) {
  const fullPath = path.resolve(dirPath)
  
  if (fs.existsSync(fullPath)) {
    try {
      const files = fs.readdirSync(fullPath)
      if (files.length === 0) {
        fs.rmdirSync(fullPath)
        console.log(`✅ Removed empty directory: ${dirPath}`)
      } else {
        console.log(`⚠️  Directory not empty, keeping: ${dirPath}`)
      }
    } catch (error) {
      console.error(`❌ Failed to clean directory ${dirPath}:`, error.message)
    }
  }
}

function main() {
  console.log('🧹 Starting cleanup of messy implementations and leftover code...\n')
  
  // Remove specific files
  console.log('📁 Removing specific files:')
  filesToRemove.forEach(removeFile)
  
  console.log('\n📁 Cleaning up directories:')
  directoriesToClean.forEach(cleanDirectory)
  
  console.log('\n✨ Cleanup complete!')
  console.log('\n📋 Next steps:')
  console.log('1. Update imports to use new package structure')
  console.log('2. Update components to use new types and functions')
  console.log('3. Test the application to ensure everything works')
  console.log('4. Update documentation to reflect new structure')
}

if (require.main === module) {
  main()
}

module.exports = { removeFile, cleanDirectory }
