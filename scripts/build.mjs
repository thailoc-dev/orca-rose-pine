// Writes themes/*.json and terminal/*.json from the Rosé Pine palette, and refuses any color that
// Orca would drop for low contrast. Usage: node scripts/build.mjs
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')

// https://github.com/rose-pine/palette (MIT), dist/css/rose-pine.css
const PALETTES = {
  'rose-pine': {
    title: 'Rosé Pine', base: 'dark',
    colors: {
      base: '#191724', surface: '#1f1d2e', overlay: '#26233a', muted: '#6e6a86', subtle: '#908caa',
      text: '#e0def4', love: '#eb6f92', gold: '#f6c177', rose: '#ebbcba', pine: '#31748f',
      foam: '#9ccfd8', iris: '#c4a7e7', highlightLow: '#21202e', highlightMed: '#403d52',
      highlightHigh: '#524f67'
    }
  },
  'rose-pine-moon': {
    title: 'Rosé Pine Moon', base: 'dark',
    colors: {
      base: '#232136', surface: '#2a273f', overlay: '#393552', muted: '#6e6a86', subtle: '#908caa',
      text: '#e0def4', love: '#eb6f92', gold: '#f6c177', rose: '#ea9a97', pine: '#3e8fb0',
      foam: '#9ccfd8', iris: '#c4a7e7', highlightLow: '#2a283e', highlightMed: '#44415a',
      highlightHigh: '#56526e'
    }
  },
  'rose-pine-dawn': {
    title: 'Rosé Pine Dawn', base: 'light',
    colors: {
      base: '#faf4ed', surface: '#fffaf3', overlay: '#f2e9e1', muted: '#9893a5', subtle: '#797593',
      text: '#575279', love: '#b4637a', gold: '#ea9d34', rose: '#d7827e', pine: '#286983',
      foam: '#56949f', iris: '#907aa9', highlightLow: '#f4ede8', highlightMed: '#dfdad9',
      highlightHigh: '#cecacd'
    }
  }
}

// The roles of Rosé Pine's own VS Code theme (https://github.com/rose-pine/vscode, MIT), which
// uses the same roles in all three variants. Each entry: scopes, palette role, font style.
const TOKEN_ROLES = [
  [['comment', 'punctuation.definition.comment'], 'muted', 'italic'],
  [['constant'], 'pine'],
  [['constant.numeric', 'constant.language'], 'rose'],
  [['entity.name'], 'rose'],
  [['entity.name.section', 'entity.name.tag', 'entity.name.namespace', 'entity.name.type'], 'foam'],
  [['entity.other.attribute-name', 'entity.other.inherited-class'], 'iris', 'italic'],
  [['invalid'], 'love'],
  [['invalid.deprecated'], 'subtle'],
  [['keyword', 'variable.language.this'], 'pine'],
  [['markup.inserted', 'markup.inserted.diff'], 'foam'],
  [['markup.deleted', 'markup.deleted.diff'], 'love'],
  [['markup.changed'], 'gold'],
  [['markup.heading'], 'iris', 'bold'],
  [['markup.bold'], null, 'bold'],
  [['markup.italic'], null, 'italic'],
  [['markup.underline.link', 'string.other.link'], 'foam', 'underline'],
  [['markup.inline.raw', 'markup.raw'], 'gold'],
  [['markup.quote'], 'subtle', 'italic'],
  [['meta.diff.range'], 'iris'],
  [['meta.tag', 'meta.brace'], 'text'],
  [['meta.import', 'meta.export'], 'pine'],
  [['meta.directive.vue'], 'iris', 'italic'],
  [['meta.property-name.css', 'support.type.property-name'], 'foam'],
  [['meta.property-value.css'], 'gold'],
  [['meta.tag.other.html'], 'subtle'],
  [['punctuation'], 'subtle'],
  [['punctuation.accessor'], 'pine'],
  [['punctuation.definition.string'], 'gold'],
  [['punctuation.definition.tag'], 'muted'],
  [['storage.type', 'storage.modifier'], 'pine'],
  [['string'], 'gold'],
  [['string.regexp', 'constant.character.escape'], 'iris'],
  [['support'], 'foam'],
  [['support.constant'], 'gold'],
  [['support.function'], 'love', 'italic'],
  [['variable'], 'rose', 'italic'],
  [['variable.other', 'variable.language', 'variable.function', 'variable.argument'], 'text'],
  [['variable.parameter'], 'iris']
]

function appTokens(c, base) {
  // Rosé Pine's buttons are rose on base; Dawn's rose is too light for text on it, so Dawn takes pine.
  const primary = base === 'light' ? c.pine : c.rose
  const mutedText = readable(c.subtle, [c.base, c.surface], 4.5)
  return {
    '--background': c.base,
    '--editor-surface': c.base,
    '--foreground': c.text,
    '--card': c.surface,
    '--card-foreground': c.text,
    '--popover': c.surface,
    '--popover-foreground': c.text,
    '--primary': primary,
    '--primary-foreground': c.base,
    '--secondary': c.overlay,
    '--secondary-foreground': c.text,
    '--muted': c.surface,
    '--muted-foreground': mutedText,
    '--accent': c.highlightMed,
    '--accent-foreground': c.text,
    '--border': c.highlightMed,
    '--input': c.highlightMed,
    '--ring': c.iris,
    '--chart-1': primary,
    '--chart-2': c.foam,
    '--chart-3': c.gold,
    '--chart-4': c.iris,
    '--chart-5': c.love,
    '--sidebar': c.surface,
    '--sidebar-foreground': c.text,
    '--sidebar-primary': primary,
    '--sidebar-primary-foreground': c.base,
    '--sidebar-accent': c.overlay,
    '--sidebar-accent-foreground': c.text,
    '--sidebar-border': c.overlay,
    '--sidebar-ring': c.iris
  }
}

function terminal(c, base) {
  const ansi = [c.overlay, c.love, c.pine, c.gold, c.foam, c.iris, c.rose, c.text]
  const names = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white']
  const colors = Object.fromEntries(names.map((name, i) => [name, ansi[i]]))
  // As in Rosé Pine's terminal ports: bright black is muted, the other bright colors repeat.
  const bright = Object.fromEntries(names.map((name, i) => [`bright${name[0].toUpperCase()}${name.slice(1)}`, i === 0 ? c.muted : ansi[i]]))
  return {
    schemaVersion: 1,
    mode: base,
    terminal: {
      background: c.base,
      foreground: c.text,
      cursor: c.text,
      cursorAccent: c.base,
      selectionBackground: c.highlightMed,
      selectionForeground: c.text,
      ...colors,
      ...bright
    }
  }
}

// WCAG 2 relative luminance and contrast, as Orca checks theme colors.
function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
export function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m)
  return (x + 0.05) / (y + 0.05)
}

const TEXT_PAIRS = [
  ['--background', '--foreground'], ['--card', '--card-foreground'], ['--popover', '--popover-foreground'],
  ['--primary', '--primary-foreground'], ['--secondary', '--secondary-foreground'],
  ['--muted', '--muted-foreground'], ['--background', '--muted-foreground'], ['--accent', '--accent-foreground'],
  ['--sidebar', '--sidebar-foreground'], ['--sidebar-primary', '--sidebar-primary-foreground'],
  ['--sidebar-accent', '--sidebar-accent-foreground']
]

// Orca drops a code color under 3:1 and a text color under 4.5:1. Dawn's gold, rose and muted, and
// the subtle text of Dawn and Moon, sit just below that, so they step away from the background,
// keeping their hue, until they pass, rather than falling back to Orca's built-in colors.
function readable(hex, backgrounds, minimum) {
  let [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  const toHex = () => `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`
  const dark = luminance(backgrounds[0]) < 0.2
  for (let step = 0; step < 100; step++) {
    const candidate = toHex()
    if (backgrounds.every((background) => contrast(candidate, background) >= minimum)) return candidate
    const factor = dark ? 1.02 : 0.98
    ;[r, g, b] = [r, g, b].map((v) => (dark ? Math.min(255, v * factor + 1) : v * factor))
  }
  return toHex()
}

const problems = []
const adjusted = new Set()
const manifestThemes = []
const manifestTerminals = []
mkdirSync(path.join(ROOT, 'themes'), { recursive: true })
mkdirSync(path.join(ROOT, 'terminal'), { recursive: true })
for (const [id, { title, base, colors: c }] of Object.entries(PALETTES)) {
  const tokens = appTokens(c, base)
  for (const [surface, text] of TEXT_PAIRS) {
    const ratio = contrast(tokens[surface], tokens[text])
    if (ratio < 4.5) problems.push(`${id}: ${text} on ${surface} is ${ratio.toFixed(2)}:1, under 4.5:1`)
  }
  const tokenColors = TOKEN_ROLES.map(([scope, role, fontStyle]) => {
    const settings = {}
    if (role) {
      settings.foreground = readable(c[role], [tokens['--editor-surface']], 3)
      if (settings.foreground !== c[role]) adjusted.add(`${id}: ${role} ${c[role]} -> ${settings.foreground}`)
      const ratio = contrast(settings.foreground, tokens['--editor-surface'])
      if (ratio < 3) problems.push(`${id}: ${role} for ${scope[0]} is ${ratio.toFixed(2)}:1, under 3:1`)
    }
    if (fontStyle) settings.fontStyle = fontStyle
    return { scope, settings }
  })
  writeFileSync(path.join(ROOT, 'themes', `${id}.json`), `${JSON.stringify({ base, tokens, tokenColors }, null, 2)}\n`)
  writeFileSync(path.join(ROOT, 'terminal', `${id}.json`), `${JSON.stringify(terminal(c, base), null, 2)}\n`)
  manifestThemes.push({ id, title, path: `themes/${id}.json` })
  manifestTerminals.push({ id, title, path: `terminal/${id}.json` })
}
if (adjusted.size) console.error(`Adjusted for contrast:\n${[...adjusted].join('\n')}`)
if (problems.length) {
  console.error(problems.join('\n'))
  process.exitCode = 1
}
console.log(JSON.stringify({ themes: manifestThemes, terminalThemes: manifestTerminals }, null, 2))
