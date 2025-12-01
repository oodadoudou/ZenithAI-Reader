import { readFileSync } from 'fs'
import { resolve } from 'path'

function load(path) {
  try {
    const raw = readFileSync(resolve(process.cwd(), path), 'utf8')
    return JSON.parse(raw)
  } catch (err) {
    return []
  }
}

const indexFindings = load('reports/a11y-index.json')
const readingFindings = load('reports/a11y-reading.json')
const findings = [...indexFindings, ...readingFindings]

const errors = findings.filter((f) => f?.typeCode === 1)
if (errors.length) {
  console.error('Accessibility errors found:', errors.map((e) => e.code))
  process.exit(1)
}

console.log('Accessibility assertions passed.')