import type { Register, ThemeSetArgs } from 'claude-code'

import { makeColors } from './make-colors.js'

// Pink-white: a light pink-and-white look for the Claude desktop app.
//
// What the desktop app (5.11492) draws of a theme today: the backdrop scene and the
// frosted panels. It does not paint `colors` yet and ignores `overrideColorScheme`; both are
// set anyway, so the palette takes effect once a build paints them, with nothing to change here.

const SCENE_NAME = 'pink-white-drift'

// The window background: a 125deg wash of soft pinks #FFD6E4 and #FFC2D6, laid out three times the window
// and panned back and forth once every 30 seconds. The app freezes it by itself under the
// system's reduced-motion setting (and its own background-animation setting); the media rule
// is a second guard.
const SCENE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
  <style>
    .drift { animation: drift 30s ease-in-out infinite; will-change: transform; }
    @keyframes drift { 0%, 100% { transform: translateX(0px); } 50% { transform: translateX(-3200px); } }
    @media (prefers-reduced-motion: reduce) { .drift { animation: none; } }
  </style>
  <defs>
    <linearGradient id="wash" gradientUnits="userSpaceOnUse" x1="84.80" y1="-121.11" x2="4715.20" y2="3121.11">
      <stop offset="0" stop-color="#FFD6E4"/>
      <stop offset="0.25" stop-color="#FFC2D6"/>
      <stop offset="0.5" stop-color="#FFD6E4"/>
      <stop offset="0.75" stop-color="#FFC2D6"/>
      <stop offset="1" stop-color="#FFD6E4"/>
    </linearGradient>
  </defs>
  <rect width="1600" height="1000" fill="#FFD6E4"/>
  <g transform="translate(0 -1000)">
    <g class="drift">
      <rect width="4800" height="3000" fill="url(#wash)"/>
    </g>
  </g>
</svg>`

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

const LOOK: ThemeSetArgs = {
  colors: theme,
  // Stay light when the system is dark (honored once the desktop app reads it).
  overrideColorScheme: 'light',
  backdrop: {
    scene: SCENE_NAME,
    // Plain white panels over the wash, no blur: the sidebar and the top bar show it through.
    // opacity is the veil over the conversation itself: 0 keeps the window background visible.
    glass: { blur: 0, tint: '#FFFFFF', opacity: 0 },
  },
}

// The person's switch, kept across sessions: '/pink-white off' leaves the app's own look
// until '/pink-white on'.
const OFF = 'off'

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'pink-white',
      description: 'Pink-white theme: on, or off to go back to the default look',
      argumentHint: 'on | off',
    })

    // While building: the one kind of problem that stops Desktop painting the palette at all.
    const unpainted = problems.find(line => line.startsWith("Desktop won't paint"))
    if (unpainted !== undefined) {
      $.ui.toast(unpainted)
    }

    if ((await $.store.get(OFF)) !== true) {
      await $.theme.set(LOOK)
    }

    return next(e)
  })

  on('command.run', { command: 'pink-white' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()

    if (arg === 'off') {
      await $.store.set(OFF, true)
      await $.theme.clear()
      return { text: 'Pink-white theme is off: the app is back to its default look. Run /pink-white on to bring it back.' }
    }

    if (arg === 'on' || arg === '') {
      await $.store.delete(OFF)
      const set = await $.theme.set(LOOK)
      return {
        text: set.isDrawn
          ? 'Pink-white theme is on.'
          : `Pink-white theme is on, but nothing draws it here: ${set.reason}`,
      }
    }

    return { text: 'Use /pink-white on, or /pink-white off to go back to the default look.' }
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if ((e.surface !== 'desktop' && e.surface !== 'mobile') || e.props.scene !== SCENE_NAME) {
      return next(e)
    }

    const { Svg } = $.ui.resolve(e)

    return <Svg source={SCENE} alt="A soft pink and white wash drifting slowly behind the window" />
  })
}
