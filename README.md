<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="brand/logo-dark.svg">
    <img src="brand/logo.svg" alt="WireWise logo" width="88" height="88">
  </picture>
</p>

<h1 align="center">WireWise</h1>

<p align="center">
  Electrical installation and motor control simulator.<br>
  Wire it, run it, check it against PEC 2017 or IEC 60364.
</p>

<p align="center">
  <a href="https://jro-d.github.io/wirewise/"><b>Download for Windows</b></a> ·
  <a href="https://jro-d.github.io/wirewise/app/">Open in browser</a> ·
  <a href="https://github.com/jro-d/wirewise/releases">Releases</a>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="MIT License"></a>
</p>

---

## Features

- **Wiring workbench**: place breakers, contactors, motors, PLCs, sensors and more, route conductors, then press **Simulate** to energize the circuit.
- **Linked views**: realistic workbench, ladder diagram, single-line diagram and PLC editor.
- **Live solver**: trips on short circuit, overload and earth leakage, with motors, timers and control circuits behaving as wired.
- **Code inspector**: PEC 2017 or IEC 60364 checks on conductor size, protection, colours and grounding.
- **Labs and reports**: guided example wirings, plus load schedule, bill of materials and energy reports.

Devices are generic models of standard devices, not specific brands. WireWise is a training aid: the models are simplified and are no substitute for the official codes or a qualified engineer.

## Shortcuts

Undo / Redo `Ctrl+Z` / `Ctrl+Y` · Rotate `R` · Fit view `F` · Delete `Del` · Pan `Space`+drag · Zoom mouse wheel

## Development

Requires Node.js 18+.

```bash
git clone https://github.com/jro-d/wirewise.git
cd wirewise
npm install
npm run dev        # run locally
npm run build      # type-check and build into dist/
npm test           # smoke tests
```

## Author and license

Developed by John Ray O. Dalida. Released under the [MIT License](LICENSE).
