'use strict'

const puppeteer = require('puppeteer')
const chalk = require('chalk')
const path = require('path')
const assert = require('assert')
const fs = require('fs')

const TOP = 'file://' +
  path.resolve(__dirname, '..', '..', 'docs', 'example', 'index.html')

let executablePath = process.env.PUPPETEER_EXECUTABLE_PATH
if (!executablePath) {
  executablePath = path.resolve(
    '/',
    'Applications',
    'Google Chrome.app',
    'Contents',
    'MacOS',
    'Google Chrome'
  )
}
if (!executablePath) {
  throw new Error('Set PUPPETEER_EXECUTABLE_PATH environment variable')
}
fs.accessSync(executablePath, fs.constants.X_OK)

async function main() {
  const browser = await puppeteer.launch({
    executablePath,
    slowMo: 100,
    headless: false,
    defaultViewport: null
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
      const colors = {
        LOG: text => text,
        ERR: chalk.red,
        WAR: chalk.yellow,
        INF: chalk.cyan
      }
      const color = colors[type] || chalk.blue
      console.log(color(`${type} ${txt}`))
    })
    .on('pageerror', ({ message }) => console.log(chalk.red(message)))
    // .on('response', response =>
    //   console.log(chalk.green(`${response.status()} ${response.url()}`)))
    .on('requestfailed', request => console.log(
      chalk.magenta(`${request.failure().errorText} ${request.url()}`)
    ))
  await page.goto(TOP, {waitUntil: 'load'})
  const links = await page.$$('li a')
  const len = links.length
  for (let i = 0; i < len; i++) {
    await Promise.all([
      page.waitForNavigation({waitUntil: 'load'}),
      page.click(`li:nth-child(${i + 1}) a`)
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
