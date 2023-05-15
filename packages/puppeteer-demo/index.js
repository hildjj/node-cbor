/* eslint-disable no-console */
import {fileURLToPath, pathToFileURL} from 'url'
import assert from 'assert'
import fs from 'fs'
import path from 'path'
import puppeteer from 'puppeteer'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const TOP = pathToFileURL(path.resolve(
  __dirname, '..', '..', 'docs', 'example', 'index.html'
))

let executablePath = process.env.PUPPETEER_EXECUTABLE_PATH
if (!executablePath && (process.platform === 'darwin')) {
  executablePath = path.resolve(
    '/',
    'Applications',
    'Google Chrome.app',
    'Contents',
    'MacOS',
    'Google Chrome'
  )
}
if (executablePath) {
  try {
    fs.accessSync(executablePath, fs.constants.X_OK)
  } catch (ignored) {
    executablePath = undefined
    delete process.env.PUPPETEER_EXECUTABLE_PATH
  }
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath,
    slowMo: 100,
    headless: false,
    defaultViewport: null,
  })
  const pages = await browser.pages()
  const page = (pages.length > 0) ? pages[0] : await browser.newPage()
  page
    .on('console', message => {
      const txt = message.text()
      const type = message
        .type()
        .substr(0, 3)
        .toUpperCase()
      console.log(`${type} ${txt}`)
    })
    .on('pageerror', ({message}) => console.log(message))
    // .on('response', response =>
    //   console.log(`${response.status()} ${response.url()}`))
    .on('requestfailed', request => console.log(
      `${request.failure().errorText} ${request.url()}`
    ))
  await page.goto(TOP, {waitUntil: 'load'})
  const links = await page.$$('li a')
  const len = links.length
  for (let i = 0; i < len; i++) {
    await Promise.all([
      page.waitForNavigation({waitUntil: 'load'}),
      page.click(`li:nth-child(${i + 1}) a`),
    ])
    await page.$eval('#input-text', input => {
      input.value = 'c482382cc254056e5e99b1be81b6eefa3964490ac18c69399361'
    })
    await page.select('#input-fmt', 'hex')
    await page.select('#output-fmt', 'js')
    const txt = await page.$eval('#output-text', output => output.value)
    assert(txt.match(/\s+s:\s+\d+,/))
    await page.goBack()
  }
  await browser.close()
}

main().catch(console.error)
