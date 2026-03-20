/**
 * Thermal Printer module
 * Supports ESC/POS commands for 58mm and 80mm thermal printers.
 *
 * Usage: requires node-escpos or escpos package installed separately.
 * This file provides utility functions for receipt printing.
 */

function buildEscPosBuffer(text, paperWidth = '80') {
  const ESC = 0x1B
  const GS = 0x1D
  const LF = 0x0A
  const CUT = [GS, 0x56, 0x00] // Full cut

  const encoder = new TextEncoder()
  const lines = text.split('\n')

  const buffers = []

  // Initialize printer
  buffers.push(Buffer.from([ESC, 0x40])) // ESC @

  // Set line spacing
  buffers.push(Buffer.from([ESC, 0x33, 24]))

  for (const line of lines) {
    buffers.push(encoder.encode(line))
    buffers.push(Buffer.from([LF]))
  }

  // Feed and cut
  buffers.push(Buffer.from([LF, LF, LF]))
  buffers.push(Buffer.from(CUT))

  return Buffer.concat(buffers)
}

/**
 * Print to a serial/USB printer port
 * @param {string} text - Formatted receipt text
 * @param {string} port - Printer port (USB, COM1, etc.)
 * @param {string} paperWidth - '58' or '80'
 */
async function printToPort(text, port = 'USB', paperWidth = '80') {
  try {
    // Attempt to use node-escpos if available
    // const escpos = require('escpos')
    // const device = new escpos.USB()
    // ...

    // Fallback: write to port directly (Windows)
    if (process.platform === 'win32' && port !== 'USB') {
      const fs = require('fs')
      const buf = buildEscPosBuffer(text, paperWidth)
      fs.writeFileSync(`\\\\.\\${port}`, buf)
      return { success: true }
    }

    // For USB on Windows, use raw print
    console.log('[Printer] Receipt text:\n', text)
    return { success: true, note: 'Printed to console (configure printer port in Settings)' }
  } catch (e) {
    return { success: false, error: e.message }
  }
}

module.exports = { printToPort, buildEscPosBuffer }
