import type { Register, ThemeResult, ThemeSetArgs } from 'claude-code'

import { makeColors } from './make-colors.js'
import { SCENE, SCENE_LEFT, SCENE_LEFT_VEIL, SCENE_VEIL } from './scene.js'

// Pink-white: a pink pixel-art look for the Claude desktop app.
//
// What the desktop app (5.11492) draws of a theme today: the backdrop scene and the frosted
// panels, where Anthropic has switched the backdrop on for the account. It does not paint
// `colors` yet and ignores `overrideColorScheme`; both are set anyway, so the palette takes
// effect once a build paints them, with nothing to change here.

// The scene (hooks/scene.js, built by dev/make-scene.mjs): a pixel-art pink sky with drifting
// clouds and twinkles, a sakura branch in a top corner and white petals falling from it. The
// app freezes every backdrop by itself, by writing *{animation:none!important} into the scene,
// when it draws without GPU compositing, when the system asks for reduced motion, or when its
// own background-animation setting is off; frozen, the petals and clouds rest in view.
// The branch sits in the top-right corner of the content area, where a right-hand panel can
// cover it; '/pink-white corner left' mirrors it beside the sidebar.
// Each corner comes in two palettes: 'normal', and 'veil', worked backwards so that seen
// through the app's 70% glass veil it reads like the normal one (see Glass below).
type Corner = 'left' | 'right'
type Palette = 'normal' | 'veil'
const SCENES: Record<Corner, Record<Palette, { name: string; svg: string }>> = {
  right: {
    normal: { name: 'pink-white-sakura', svg: SCENE },
    veil: { name: 'pink-white-sakura-veil', svg: SCENE_VEIL },
  },
  left: {
    normal: { name: 'pink-white-sakura-left', svg: SCENE_LEFT },
    veil: { name: 'pink-white-sakura-left-veil', svg: SCENE_LEFT_VEIL },
  },
}
const ALL_SCENES = Object.values(SCENES).flatMap(byPalette => Object.values(byPalette))

// '/pink-white test': four loud numbered blocks with no glass, to see whether and where the
// app shows a backdrop at all. '/pink-white on' goes back to the look.
const TEST = {
  name: 'pink-white-test',
  svg:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200" preserveAspectRatio="none" width="100%" height="100%">' +
    '<rect width="200" height="100" fill="#0090FF"/><rect x="200" width="200" height="100" fill="#00C853"/>' +
    '<rect y="100" width="200" height="100" fill="#FF9100"/><rect x="200" y="100" width="200" height="100" fill="#AA00FF"/>' +
    '<g font-family="Segoe UI, Arial, sans-serif" font-size="60" font-weight="700" fill="#FFFFFF" text-anchor="middle">' +
    '<text x="100" y="72">1</text><text x="300" y="72">2</text><text x="100" y="172">3</text><text x="300" y="172">4</text></g></svg>',
}

// '/pink-white test motion': why the scene stands still, read off the window with no screenshot.
// Row 1 says RUNNING only while CSS animations run in the scene: the app's freeze removes them,
// so it turns to STOPPED, the seconds stop counting and the small square halts. Rows 2 to 4 show
// the settings the scene sees; each state appears only on a positive media match, so a setting
// the app does not report reads UNKNOWN. Green is the usual state, red the one that freezes the
// scene or makes the glass opaque, grey unknown, and the words carry every state. The rows sit
// right of the sidebar, left of a right-hand panel and above the prompt box. The test has no
// reduced-motion rule of its own, so row 1 reports the app alone. Should the app ever drop the
// stylesheet, a grey cover says so, where every row would otherwise turn red.
const PROBE = { green: '#007E33', red: '#C62828', grey: '#546E7A', page: '#263238' }
const ROW_TOP = [8, 24, 40, 56] as const // percent of the window height; each row is 15% tall
const PROBE_X = '40%'

function probeLine(size: 'h' | 'w' | 'd', y: number, text: string): string {
  return `<text class="t ${size}" x="${PROBE_X}" y="${y}%">${text}</text>`
}

function probeState(cls: string, row: 0 | 1 | 2, fill: string, title: string, word: string, detail: string): string {
  const y = ROW_TOP[row]
  return (
    `<g class="${cls}"><rect x="0" y="${y}%" width="100%" height="15%" fill="${fill}"/>` +
    probeLine('h', y + 4, title) +
    probeLine('w', y + 9.5, word) +
    probeLine('d', y + 13.2, detail) +
    '</g>'
  )
}

const PROBE_CSS = [
  '.t{font-family:"Segoe UI",Arial,sans-serif;font-weight:700;fill:#FFFFFF;text-anchor:middle}',
  '.h{font-size:2.4vmin}.w{font-size:4.6vmin}.d{font-size:2.2vmin}',
  '.nocss{display:none}.s{display:none}.unk{display:inline}',
  '@keyframes pw-on{from,to{opacity:1}}@keyframes pw-off{from,to{opacity:0}}',
  '@keyframes pw-tick{0%{opacity:1}10%{opacity:0}100%{opacity:0}}',
  '@keyframes pw-sweep{from{transform:translateX(0)}to{transform:translateX(30vw)}}',
  '.run{opacity:0;animation:pw-on 1s linear infinite}.stop{animation:pw-off 1s linear infinite}',
  '.n{opacity:0;animation:pw-tick 10s step-end infinite}',
  Array.from({ length: 9 }, (_, i) => `.n${i + 1}{animation-delay:-${9 - i}s}`).join(''),
  '.sweep{animation:pw-sweep 3s linear infinite alternate}',
  '@media (prefers-reduced-motion: no-preference){.rm .unk{display:none}.rm .no{display:inline}}',
  '@media (prefers-reduced-motion: reduce){.rm .unk{display:none}.rm .yes{display:inline}}',
  '@media (prefers-reduced-transparency: no-preference){.rt .unk{display:none}.rt .no{display:inline}}',
  '@media (prefers-reduced-transparency: reduce){.rt .unk{display:none}.rt .yes{display:inline}}',
  '@media (forced-colors: none){.fc .unk{display:none}.fc .no{display:inline}}',
  '@media (forced-colors: active){.fc .unk{display:none}.fc .yes{display:inline}}',
  '@media (prefers-contrast: no-preference){.pc .unk{display:none}.pc .no{display:inline}}',
  '@media (prefers-contrast: more){.pc .unk{display:none}.pc .more{display:inline}}',
  '@media (prefers-contrast: less){.pc .unk{display:none}.pc .less{display:inline}}',
  '@media (prefers-contrast: custom){.pc .unk{display:none}.pc .custom{display:inline}}',
  // The same list the app uses to make the glass opaque.
  '.b4bad{display:none}@media (forced-colors: active),(prefers-contrast: more){.b4ok{display:none}.b4bad{display:inline}}',
].join('')

const ROW4 = ROW_TOP[3]
const MOTION_TEST = {
  name: 'pink-white-test-motion',
  svg:
    '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">' +
    `<style>${PROBE_CSS}</style>` +
    `<rect width="100%" height="100%" fill="${PROBE.page}"/>` +
    probeLine('d', 76, 'pink-white motion test: read each row number, its big word and the line under it') +
    probeState('run', 0, PROBE.green, '1  BACKGROUND ANIMATION', 'RUNNING', 'seconds:') +
    probeState('stop', 0, PROBE.red, '1  BACKGROUND ANIMATION', 'STOPPED', 'stopped by the app') +
    `<g class="run">${Array.from({ length: 10 }, (_, k) => `<text class="t d n n${k}" x="47%" y="${ROW_TOP[0] + 13.2}%">${k}</text>`).join('')}</g>` +
    `<rect class="sweep" x="22%" y="${ROW_TOP[0] + 11}%" width="1.6%" height="2.4%" fill="#FFFFFF"/>` +
    `<g class="rm">${probeState('s unk', 1, PROBE.grey, '2  REDUCED MOTION', 'UNKNOWN', 'the app does not report it')}` +
    probeState('s no', 1, PROBE.green, '2  REDUCED MOTION', 'NO', 'the system allows full motion') +
    `${probeState('s yes', 1, PROBE.red, '2  REDUCED MOTION', 'YES', 'Windows: Animation effects off. Mac: Reduce motion on')}</g>` +
    `<g class="rt">${probeState('s unk', 2, PROBE.grey, '3  REDUCED TRANSPARENCY', 'UNKNOWN', 'the app does not report it')}` +
    probeState('s no', 2, PROBE.green, '3  REDUCED TRANSPARENCY', 'NO', 'the system allows transparency') +
    `${probeState('s yes', 2, PROBE.red, '3  REDUCED TRANSPARENCY', 'YES', 'Windows: Transparency effects off. Mac: Reduce transparency on')}</g>` +
    `<g class="b4"><rect class="b4ok" x="0" y="${ROW4}%" width="100%" height="15%" fill="${PROBE.green}"/>` +
    `<rect class="b4bad" x="0" y="${ROW4}%" width="100%" height="15%" fill="${PROBE.red}"/></g>` +
    probeLine('h', ROW4 + 4, '4  HIGH CONTRAST') +
    `<g class="fc"><g class="s unk">${probeLine('w', ROW4 + 9.5, 'FORCED COLORS ?')}</g>` +
    `<g class="s no">${probeLine('w', ROW4 + 9.5, 'FORCED COLORS OFF')}</g>` +
    `<g class="s yes">${probeLine('w', ROW4 + 9.5, 'FORCED COLORS ON')}</g></g>` +
    `<g class="pc"><g class="s unk">${probeLine('d', ROW4 + 13.2, 'contrast: unknown')}</g>` +
    `<g class="s no">${probeLine('d', ROW4 + 13.2, 'contrast: standard')}</g>` +
    `<g class="s more">${probeLine('d', ROW4 + 13.2, 'contrast: MORE')}</g>` +
    `<g class="s less">${probeLine('d', ROW4 + 13.2, 'contrast: less')}</g>` +
    `<g class="s custom">${probeLine('d', ROW4 + 13.2, 'contrast: custom')}</g></g>` +
    // Shown only without the stylesheet, so it carries its own presentation attributes.
    `<g class="nocss"><rect width="100%" height="100%" fill="${PROBE.grey}"/>` +
    '<svg width="100%" height="100%" viewBox="0 0 800 450"><g font-family="Segoe UI, Arial, sans-serif" font-weight="700" fill="#FFFFFF" text-anchor="middle">' +
    '<text x="400" y="210" font-size="64">STYLE REMOVED</text>' +
    '<text x="400" y="270" font-size="30">the app stripped the styles from this test</text></g></svg></g>' +
    '</svg>',
}

// The palette, light only: pages #FFF7FA, cards and panels #FFFFFF, text #4A2E3A, secondary
// text #8A5A70, links #B83A6E, focus line #D46A92 on a #FFE3EC glow, accent borders #F8D7E3,
// diff signs and counts #27704A / #B42318.
const { theme, problems } = makeColors({
  label: 'Pink white',
  only: 'light',
  roles: {
    accent: { seed: '#D46A92', stops: { 100: '#FFE3EC', 250: '#F8D7E3', 450: '#D46A92', 600: '#B83A6E' } },
  },
  light: {
    gray: {
      anchors: {
        'surface-0': '#FFF7FA',
        'surface-1': '#FFFFFF',
        'surface-2': '#FFFFFF',
        'surface-3': '#FFFFFF',
        'text-primary': '#4A2E3A',
        'text-secondary': '#8A5A70',
        'text-muted': '#8A5A70',
      },
    },
    git: { added: '#27704A', removed: '#B42318' },
  },
})

// Pink glass: the sidebar (56%) and the top bar (46%) take this tint over the scene, the prompt
// box takes it whole and the person's message bubbles mix it with white. No blur. opacity is
// the veil over the conversation: 0 asks for none, but on some machines the app lays a 70% veil
// there anyway (without GPU compositing, or on an unfocused split pane), washing the scene out,
// and where the system asks for reduced transparency or high contrast it makes the glass opaque.
// Three ways to run it, '/pink-white glass on|off|veil':
//   on   - pink glass over the normal scene (where the app adds no veil);
//   off  - no glass: the normal scene in full, the app's own sidebar and prompt box;
//   veil - pink glass over the veil scene, which reads like the normal one through the veil.
type Glass = 'on' | 'off' | 'veil'
const GLASS = { blur: 0, tint: '#FFD6E4', opacity: 0 }

function look(corner: Corner, glass: Glass): ThemeSetArgs {
  const scene = SCENES[corner][glass === 'veil' ? 'veil' : 'normal']
  return {
    colors: theme,
    // Stay light when the system is dark (honored once the desktop app reads it).
    overrideColorScheme: 'light',
    backdrop: { scene: scene.name, glass: glass === 'off' ? false : GLASS },
  }
}

// The person's switches, kept across sessions: '/pink-white off' leaves the app's own look
// until '/pink-white on'; '/pink-white corner left|right' picks where the branch hangs;
// '/pink-white glass on|off|veil' picks the glass.
const OFF = 'off'
const CORNER = 'corner'
const GLASS_MODE = 'glass'
const NO_GLASS = 'noGlass' // written by 0.3 builds before glass had three modes
const STATUS_TOOL = 'mcp__pink-white__status'

type Store = { store: { get: (key: string) => Promise<unknown> } }

async function cornerOf($: Store): Promise<Corner> {
  return (await $.store.get(CORNER)) === 'left' ? 'left' : 'right'
}

async function glassOf($: Store): Promise<Glass> {
  const mode = await $.store.get(GLASS_MODE)
  if (mode === 'on' || mode === 'off' || mode === 'veil') {
    return mode
  }
  return (await $.store.get(NO_GLASS)) === true ? 'off' : 'on'
}

// What this session has seen, for '/pink-white status': the answer to the last theme.set,
// whether the test pattern is up, and how often a surface asked this mod to draw a scene.
// The person's choices themselves live in the store, shared by every session.
let lastSet: ThemeResult | undefined
let testing = false
let drawn = 0
const surfaces = new Set<string>()

async function status($: Store) {
  const off = (await $.store.get(OFF)) === true
  const corner = await cornerOf($)
  const glass = await glassOf($)
  const set = off
    ? 'off (you ran /pink-white off; /pink-white on brings it back)'
    : lastSet === undefined
      ? 'not set in this session'
      : lastSet.isDrawn
        ? `sent to an app that draws themes${testing ? ', showing the test pattern' : ''}`
        : `not drawn by the last set: ${lastSet.reason}`
  const scene =
    drawn === 0
      ? off
        ? 'nothing is drawn while the theme is off'
        : 'no app has asked to draw the background yet (the desktop asks only where its backdrop feature is on)'
      : `the background was drawn ${drawn} time(s), on ${[...surfaces].join(' and ')}`
  return { off, testing, set, scene, corner, glass, drawn, surfaces: [...surfaces] }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'pink-white',
      description: 'Pink-white theme: on, off, status, corner left|right, glass on|off|veil, test, test glass, test motion',
      argumentHint: 'on | off | status | corner left|right | glass on|off|veil | test | test glass | test motion',
    })
    await $.tool.register({
      name: 'status',
      description:
        'Reports whether the pink-white theme was set in this session and whether the Claude app has drawn its background scene.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    })

    // While building: the one kind of problem that stops Desktop painting the palette at all.
    const unpainted = problems.find(line => line.startsWith("Desktop won't paint"))
    if (unpainted !== undefined) {
      $.ui.toast(unpainted)
    }

    if ((await $.store.get(OFF)) !== true) {
      lastSet = await $.theme.set(look(await cornerOf($), await glassOf($)))
    }

    return next(e)
  })

  on('command.run', { command: 'pink-white' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase().replace(/\s+/g, ' ')
    const isOff = async () => (await $.store.get(OFF)) === true

    if (arg === 'off') {
      await $.store.set(OFF, true)
      testing = false
      lastSet = await $.theme.clear()
      return { text: 'Pink-white theme is off: the app is back to its default look. Run /pink-white on to bring it back.' }
    }

    if (arg === 'status') {
      const s = await status($)
      return {
        text: `Pink-white status: theme ${s.set}; ${s.scene}; the sakura branch hangs in the top-${s.corner} corner; glass is ${s.glass}.`,
      }
    }

    if (arg === 'test' || arg === 'test glass') {
      const withGlass = arg === 'test glass'
      testing = true
      lastSet = await $.theme.set({ backdrop: { scene: TEST.name, glass: withGlass ? GLASS : false } })
      return {
        text:
          `Test pattern on${withGlass ? ', seen through the pink glass' : ', with no pink glass'}: four loud blocks (1 blue, 2 green, 3 orange, 4 purple) fill the window behind the app. ` +
          'Note which numbers or colors you can see, how strong they look and where, then run /pink-white on to go back.',
      }
    }

    if (arg === 'test motion') {
      testing = true
      lastSet = await $.theme.set({ backdrop: { scene: MOTION_TEST.name, glass: false } })
      return {
        text:
          'Motion test on, with no pink glass: four rows on a dark page, right of the sidebar. ' +
          'Row 1 reads RUNNING (green; the seconds count and the small square slides) when the app lets the scene move, STOPPED (red) when it froze it. ' +
          'Rows 2 to 4 show what the system asks for: NO or OFF in green, YES or ON in red, UNKNOWN in grey where the app does not report it. ' +
          'STOPPED with REDUCED MOTION YES: the reduced-motion setting froze it. ' +
          'STOPPED with NO: the app is drawing without GPU compositing (hardware acceleration off, GPU compositing unavailable, or the Microsoft Basic Render Driver) or its own background-animation setting is off; the mod cannot change either. ' +
          'RUNNING while the seconds never change: the app is not redrawing the scene. A red row 3 or 4 turns the pink glass opaque. ' +
          'Note what each row says, then run /pink-white on to go back.',
      }
    }

    // The other choice is read back from the store, which every session shares, so a change made
    // in another window is kept. While the theme is off, a choice is saved and applied on 'on'.
    const OFF_NOTE = ' The theme is off now; /pink-white on brings it back with this choice.'

    const wanted = /^corner (left|right)$/.exec(arg)?.[1]
    if (wanted === 'left' || wanted === 'right') {
      await $.store.set(CORNER, wanted)
      if (await isOff()) {
        return { text: `Saved: the sakura branch will hang in the top-${wanted} corner.${OFF_NOTE}` }
      }
      testing = false
      lastSet = await $.theme.set(look(wanted, await glassOf($)))
      return { text: `The sakura branch now hangs in the top-${wanted} corner.` }
    }

    const glassArg = /^glass (on|off|veil)$/.exec(arg)?.[1]
    if (glassArg === 'on' || glassArg === 'off' || glassArg === 'veil') {
      await $.store.set(GLASS_MODE, glassArg)
      await $.store.delete(NO_GLASS)
      if (await isOff()) {
        return { text: `Saved: glass ${glassArg}.${OFF_NOTE}` }
      }
      testing = false
      lastSet = await $.theme.set(look(await cornerOf($), glassArg))
      const said: Record<Glass, string> = {
        on: 'Pink glass is on over the normal scene: the sidebar, top bar and prompt box turn pink. Where the app adds its own veil, the scene shows faintly; try /pink-white glass veil there.',
        off: 'Pink glass is off: the scene shows in full behind the conversation; the sidebar, top bar and prompt box keep the app colors.',
        veil: 'Pink glass is on over the veil scene: everything turns pink, and through the app veil the sky reads close to the normal one, though clouds and twinkles over the conversation fade and the branch over it reads as mauve.',
      }
      return { text: said[glassArg] }
    }

    if (arg === 'on' || arg === '') {
      await $.store.delete(OFF)
      testing = false
      lastSet = await $.theme.set(look(await cornerOf($), await glassOf($)))
      return {
        text: lastSet.isDrawn
          ? 'Pink-white theme is on.'
          : `Pink-white theme is on, but nothing draws it here: ${lastSet.reason}`,
      }
    }

    return {
      text: 'Use /pink-white on, off, status, corner left|right, glass on|off|veil, test, test glass or test motion.',
    }
  })

  // A tool's result reaches the model as text.
  on('tool.call', { tool: STATUS_TOOL }, async $ => ({ result: JSON.stringify(await status($)) })).catch(($, e, next) =>
    next.called ? next(e) : { deny: 'pink-white could not read its status' },
  )

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    const scene = [...ALL_SCENES, TEST, MOTION_TEST].find(one => one.name === e.props.scene)
    if ((e.surface !== 'desktop' && e.surface !== 'mobile') || scene === undefined) {
      return next(e)
    }

    drawn += 1
    surfaces.add(e.surface)
    const { Svg } = $.ui.resolve(e)

    // Drawn in the sandboxed frame (isInteractive), as the skill's own backdrop example does: the
    // frame fills the window with the scene's root <svg>, where an image of it may not show.
    // The surface stretches the frame over the whole backdrop; width and height are its fallback.
    return (
      <Svg
        source={scene.svg}
        alt="A pink pixel-art sky with a sakura branch in a top corner and petals falling"
        isInteractive
        width={1920}
        height={1080}
      />
    )
  })
}
