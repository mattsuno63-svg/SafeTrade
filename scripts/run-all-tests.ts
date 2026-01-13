/**
 * 🧪 TEST RUNNER COMPLETO - SafeTrade
 * 
 * Esegue tutti i test di sicurezza e stabilità
 * 
 * Eseguire con: npx tsx scripts/run-all-tests.ts
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs/promises'
import * as path from 'path'

const execAsync = promisify(exec)

interface TestSuite {
  name: string
  script: string
  description: string
}

const testSuites: TestSuite[] = [
  {
    name: 'Security Tests',
    script: 'scripts/security-tests.ts',
    description: 'Test di sicurezza (SQL injection, XSS, autenticazione, ecc.)'
  },
  {
    name: 'Stability Tests',
    script: 'scripts/stability-tests.ts',
    description: 'Test di stabilità e performance'
  }
]

async function runTestSuite(suite: TestSuite): Promise<{ passed: boolean; output: string; error?: string }> {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`🧪 Running: ${suite.name}`)
  console.log(`📝 ${suite.description}`)
  console.log('='.repeat(60))
  
  try {
    const { stdout, stderr } = await execAsync(`npx tsx ${suite.script}`, {
      cwd: process.cwd(),
      maxBuffer: 10 * 1024 * 1024 // 10MB
    })
    
    const output = stdout + (stderr ? `\nSTDERR:\n${stderr}` : '')
    
    // Determina se il test è passato (exit code 0)
    // Nota: execAsync non cattura exit code, quindi controlliamo l'output
    const passed = !output.includes('❌ Failed:') || output.includes('❌ Failed: 0')
    
    return { passed, output }
  } catch (error: any) {
    return {
      passed: false,
      output: error.stdout || '',
      error: error.message
    }
  }
}

async function generateReport(results: Array<{ suite: TestSuite; result: any }>) {
  const reportPath = path.join(process.cwd(), 'TEST_SECURITY_REPORT.md')
  
  let report = `# 🔒 SafeTrade Security & Stability Test Report\n\n`
  report += `**Data**: ${new Date().toISOString()}\n`
  report += `**Base URL**: ${process.env.TEST_BASE_URL || 'http://localhost:3000'}\n\n`
  report += `---\n\n`
  
  const totalSuites = results.length
  const passedSuites = results.filter(r => r.result.passed).length
  
  report += `## 📊 Summary\n\n`
  report += `- **Total Test Suites**: ${totalSuites}\n`
  report += `- **✅ Passed**: ${passedSuites}\n`
  report += `- **❌ Failed**: ${totalSuites - passedSuites}\n\n`
  report += `---\n\n`
  
  results.forEach(({ suite, result }) => {
    const status = result.passed ? '✅' : '❌'
    report += `## ${status} ${suite.name}\n\n`
    report += `${suite.description}\n\n`
    
    if (result.error) {
      report += `**Error**: ${result.error}\n\n`
    }
    
    // Estrai risultati dall'output
    const outputLines = result.output.split('\n')
    const relevantLines = outputLines.filter((line: string) => 
      line.includes('✅') || 
      line.includes('❌') || 
      line.includes('Test') ||
      line.includes('Total') ||
      line.includes('Passed') ||
      line.includes('Failed')
    )
    
    if (relevantLines.length > 0) {
      report += `### Results\n\n\`\`\`\n`
      report += relevantLines.join('\n')
      report += `\n\`\`\`\n\n`
    }
    
    report += `---\n\n`
  })
  
  report += `## 🔍 Recommendations\n\n`
  
  if (passedSuites < totalSuites) {
    report += `⚠️ **Action Required**: Alcuni test sono falliti. Rivedere i risultati sopra.\n\n`
  } else {
    report += `✅ **All tests passed!** Il sistema è pronto per il deploy.\n\n`
  }
  
  report += `### Pre-Deploy Checklist\n\n`
  report += `- [ ] Tutti i test di sicurezza passati\n`
  report += `- [ ] Tutti i test di stabilità passati\n`
  report += `- [ ] Environment variables configurate correttamente\n`
  report += `- [ ] Database migrations applicate\n`
  report += `- [ ] Build production testata (\`npm run build\`)\n`
  report += `- [ ] Backup database creato\n`
  
  await fs.writeFile(reportPath, report, 'utf-8')
  console.log(`\n📄 Report generato: ${reportPath}`)
}

async function main() {
  console.log('🧪 SafeTrade Complete Test Suite')
  console.log('='.repeat(60))
  console.log(`Working Directory: ${process.cwd()}`)
  console.log(`Base URL: ${process.env.TEST_BASE_URL || 'http://localhost:3000'}`)
  
  const results: Array<{ suite: TestSuite; result: any }> = []
  
  for (const suite of testSuites) {
    const result = await runTestSuite(suite)
    results.push({ suite, result })
    
    // Mostra output
    console.log(result.output)
    
    if (result.error) {
      console.error(`\n❌ Error running ${suite.name}:`, result.error)
    }
  }
  
  // Genera report
  await generateReport(results)
  
  // Exit code
  const allPassed = results.every(r => r.result.passed)
  process.exit(allPassed ? 0 : 1)
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})

