/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
'use strict'

const regeneratorRuntime = require('regenerator-runtime')
const util = require('node-inspect-extracted')
const cbor = require('cbor-web')
const { Buffer } = require('buffer')

console.log(cbor.BigNumber)

const ofmt = document.getElementById('output-fmt')
const otxt = document.getElementById('output-text')
const itxt = document.getElementById('input-text')
const ifmt = document.getElementById('input-fmt')
const copy = document.getElementById('copy')

function error(e) {
  copy.disabled = true
  otxt.value = e.toString()
}

// convert any input to a buffer
function input() {
  const inp = ifmt.selectedOptions[0].label
  const txt = itxt.value
  switch (inp) {
    case 'JSON':
      return cbor.encodeOne(JSON.parse(txt), {canonical: true})
    case 'hex':
    case 'base64':
      return Buffer.from(txt, inp)
    default:
      throw new Error(`Unknown input: "${inp}"`)
  }
}

// convert a buffer to the desired output format
function output(buf, typ) {
  const outp = ofmt.selectedOptions[0].label
  switch (outp) {
    case 'hex':
    case 'base64':
      copy.disabled = false
      otxt.value = buf.toString(outp)
      break
    case 'commented':
      copy.disabled = true
      cbor.comment(buf).then(
        txt => otxt.value = txt,
        error)
      break
    case 'diagnostic':
      copy.disabled = true
      cbor.diagnose(buf).then(
        txt => otxt.value = txt,
        error)
      break
    case 'js':
      copy.disabled = true
      cbor.decodeFirst(buf).then(o => {
        otxt.value = util.inspect(o, {
          depth: Infinity,
          compact: 1,
          maxArrayLength: Infinity,
          breakLength: otxt.cols - 1
        })
      }, error)
      break
    case 'JSON':
      copy.disabled = false
      cbor.decodeFirst(buf).then(o => {
        otxt.value = JSON.stringify(o, null, 2)
      }, error)
      break
    default:
      throw new Error(`Unknown output: "${outp}"`)
  }
}

function convert() {
  try {
    output(input())
  } catch (e) {
    error(e)
  }
}

ofmt.oninput = convert
ifmt.oninput = convert
copy.onclick = () => {
  // copy output to input, and guess the new input format
  itxt.value = otxt.value
  const sel = ofmt.selectedOptions[0].label
  for (const o of ifmt.options) {
    if (o.label === sel) {
      ifmt.selectedIndex = o.index
      break
    }
  }
}

// debounce
let timeout = null
itxt.oninput = () => {
  clearTimeout(timeout)
  timeout = setTimeout(() => {
    timeout = null
    convert()
  }, 300)
}

// make sure that initial output is set
convert()
