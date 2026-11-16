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
// app freezes it by itself under the system's reduced-motion setting and its own
// background-animation setting; frozen, a few petals and clouds still rest in view.
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
// there anyway (without GPU compositing, or on an unfocused split pane), washing the scene out.
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
      description: 'Pink-white theme: on, off, status, corner left|right, glass on|off|veil, test, test glass',
      argumentHint: 'on | off | status | corner left|right | glass on|off|veil | test | test glass',
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
      text: 'Use /pink-white on, off, status, corner left|right, glass on|off|veil, test or test glass.',
    }
  })

  // A tool's result reaches the model as text.
  on('tool.call', { tool: STATUS_TOOL }, async $ => ({ result: JSON.stringify(await status($)) })).catch(($, e, next) =>
    next.called ? next(e) : { deny: 'pink-white could not read its status' },
  )

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    const scene = [...ALL_SCENES, TEST].find(one => one.name === e.props.scene)
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
