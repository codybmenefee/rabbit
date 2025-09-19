#!/usr/bin/env tsx

/**
 * Data Integrity Validation Runner
 * 
 * Executes comprehensive validation tests and generates detailed reports
 * on the dashboard's data integrity and mathematical accuracy.
 */

import { DataIntegrityValidator } from '../lib/data-integrity-validation'

function printValidationReport(report: any) {
  console.log('\n' + '='.repeat(60))
  console.log('🔍 DATA INTEGRITY VALIDATION REPORT')
  console.log('='.repeat(60))
  
  console.log(`\n📊 OVERALL STATUS: ${report.overallStatus}`)
  console.log(`📈 Tests Passed: ${report.passedTests}/${report.totalTests}`)
  console.log(`❌ Tests Failed: ${report.failedTests}`)
  console.log(`🚨 Critical Issues: ${report.criticalIssues}`)
  console.log(`\n💡 Summary: ${report.summary}`)
  
  console.log('\n' + '-'.repeat(60))
  console.log('DETAILED TEST RESULTS')
  console.log('-'.repeat(60))
  
  const groupedResults = {
    Critical: report.results.filter((r: any) => !r.passed && r.severity === 'Critical'),
    High: report.results.filter((r: any) => !r.passed && r.severity === 'High'),
    Medium: report.results.filter((r: any) => !r.passed && r.severity === 'Medium'),
    Passed: report.results.filter((r: any) => r.passed)
  }
  
  // Show failed tests first, grouped by severity
  Object.entries(groupedResults).forEach(([severity, tests]) => {
    if (tests.length === 0) return
    
    const icon = severity === 'Critical' ? '🚨' : 
                 severity === 'High' ? '⚠️' : 
                 severity === 'Medium' ? '🟡' : '✅'
    
    console.log(`\n${icon} ${severity.toUpperCase()} (${tests.length} tests)`)
    console.log('-'.repeat(30))
    
    tests.forEach((test: any, index: number) => {
      console.log(`${index + 1}. ${test.testName}`)
      console.log(`   Status: ${test.passed ? 'PASS' : 'FAIL'}`)
      console.log(`   Details: ${test.details}`)
      
      if (!test.passed && test.expectedValue !== undefined) {
        console.log(`   Expected: ${JSON.stringify(test.expectedValue)}`)
        console.log(`   Actual: ${JSON.stringify(test.actualValue)}`)
      }
      
      if (test.errorData) {
        console.log(`   Error Data: ${JSON.stringify(test.errorData, null, 2)}`)
      }
      
      console.log()
    })
  })
  
  // Recommendations
  console.log('\n' + '-'.repeat(60))
  console.log('🎯 RECOMMENDATIONS')
  console.log('-'.repeat(60))
  
  if (report.criticalIssues > 0) {
    console.log('\n🚨 CRITICAL ACTIONS REQUIRED:')
    groupedResults.Critical.forEach((test: any, index: number) => {
      console.log(`${index + 1}. Fix ${test.testName}: ${test.details}`)
    })
  }
  
  if (groupedResults.High.length > 0) {
    console.log('\n⚠️ HIGH PRIORITY FIXES:')
    groupedResults.High.forEach((test: any, index: number) => {
      console.log(`${index + 1}. Address ${test.testName}: ${test.details}`)
    })
  }
  
  if (report.overallStatus === 'PASS') {
    console.log('\n🎉 All validation tests passed! The dashboard data integrity is verified.')
  } else {
    console.log(`\n❌ ${report.failedTests} tests failed. Please address the issues above.`)
  }
  
  console.log('\n' + '='.repeat(60))
}

// Main execution
async function main() {
  console.log('Starting comprehensive data integrity validation...')
  
  try {
    const report = DataIntegrityValidator.runFullValidation()
    printValidationReport(report)
    
    // Exit with appropriate code
    process.exit(report.overallStatus === 'PASS' ? 0 : 1)
    
  } catch (error) {
    console.error('\n🔥 VALIDATION RUNNER ERROR:')
    console.error(error)
    process.exit(1)
  }
}

main()