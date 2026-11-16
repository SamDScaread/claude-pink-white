import type { On, ThemeSetArgs } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

import { SCENE as SAKURA, SCENE_LEFT, SCENE_LEFT_VEIL, SCENE_VEIL } from '../hooks/scene.js'

const SCENE = 'pink-white-sakura'
// Which drawing each scene name must produce.
const SOURCES: Record<string, string> = {
  [SCENE]: SAKURA,
  [`${SCENE}-veil`]: SCENE_VEIL,
  [`${SCENE}-left`]: SCENE_LEFT,
  [`${SCENE}-left-veil`]: SCENE_LEFT_VEIL,
}
const GLASS = { blur: 0, tint: '#FFD6E4', opacity: 0 }

// What the engine stamps on a command the person types at the prompt.
const TYPED = { origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } } as const

const BACKDROP = {
  plugin: 'pink-white',
  component: 'Backdrop',
  requestId: 'backdrop',
  props: { scene: SCENE, plugin: 'pink-white', glass: GLASS },
} as const

function engine(on: On, stored?: Record<string, unknown>) {
  mock.store(on, stored)
  on('command.register', () => ({ value: { command: 'pink-white' } }))
  on('tool.register', () => ({ value: { tool: 'mcp__pink-white__status' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
}

function recordSets(on: On) {
  const sets: ThemeSetArgs[] = []
  on('theme.set', (_, e) => {
    sets.push(e)
    return { value: { isDrawn: true, requestId: 'backdrop' } }
  })
  return sets
}

const START = { cwd: '/', surface: 'desktop', isInteractive: true } as const

test('the look is set when a session starts', async ($, on) => {
  engine(on)
  const sets = recordSets(on)

  await $.session.start(START)

  expect(sets.length).toBe(1)
  const look = sets[0]
  expect(look?.backdrop).toEqual({ scene: SCENE, glass: GLASS })
  expect(look?.overrideColorScheme).toBe('light')
  const light = look?.colors?.inputs.light
  expect(light?.['gray-20']).toBe('#fff7fa')
  expect(light?.['gray-10']).toBe('#ffffff')
  expect(light?.['gray-900']).toBe('#4a2e3a')
  expect(light?.['gray-600']).toBe('#8a5a70')
  expect(light?.['role-accent-600']).toBe('#b83a6e')
  expect(light?.['role-accent-fill']).toBe('#d46a92')
  expect(light?.['text-git-added']).toBe('#27704a')
  expect(light?.['text-git-removed']).toBe('#b42318')
  expect(look?.colors?.inputs.dark).toBeUndefined()
})

test('a new session starts with the corner and glass the person saved', async ($, on) => {
  engine(on, { corner: 'left', glass: 'veil' })
  const sets = recordSets(on)

  await $.session.start(START)

  expect(sets[0]?.backdrop).toEqual({ scene: `${SCENE}-left-veil`, glass: GLASS })
})

test('off goes back to the default look and stays off, on brings it back', async ($, on) => {
  engine(on)
  let sets = 0
  let clears = 0
  on('theme.set', () => {
    sets += 1
    return { value: { isDrawn: true, requestId: 'backdrop' } }
  })
  on('theme.clear', () => {
    clears += 1
    return { value: { isDrawn: false, reason: 'cleared' } }
  })

  await $.session.start(START)
  expect(sets).toBe(1)

  const off = await $.command.run({ ...TYPED, command: 'pink-white', args: 'off' })
  expect(clears).toBe(1)
  expect(off.text ?? '').toMatch(/off/)

  // A later session keeps the default look.
  await $.session.start(START)
  expect(sets).toBe(1)

  const back = await $.command.run({ ...TYPED, command: 'pink-white', args: 'on' })
  expect(sets).toBe(2)
  expect(back.text ?? '').toMatch(/on/)
})

test('while off, corner and glass are saved but not applied, and status says it is off', async ($, on) => {
  engine(on, { off: true })
  const sets = recordSets(on)

  await $.session.start(START)
  const corner = await $.command.run({ ...TYPED, command: 'pink-white', args: 'corner left' })
  const glass = await $.command.run({ ...TYPED, command: 'pink-white', args: 'glass veil' })
  expect(sets.length).toBe(0)
  expect(corner.text ?? '').toMatch(/^Saved/)
  expect(glass.text ?? '').toMatch(/^Saved/)

  const said = await $.command.run({ ...TYPED, command: 'pink-white', args: 'status' })
  expect(said.text ?? '').toMatch(/theme off/)
  expect(said.text ?? '').toMatch(/top-left corner; glass is veil/)

  await $.command.run({ ...TYPED, command: 'pink-white', args: 'on' })
  expect(sets[0]?.backdrop).toEqual({ scene: `${SCENE}-left-veil`, glass: GLASS })
})

test('each scene name draws its own scene on desktop and mobile; other scenes are left alone', async $ => {
  for (const [scene, source] of Object.entries(SOURCES)) {
    for (const surface of ['desktop', 'mobile'] as const) {
      const ui = await $.ui.mount({ ...BACKDROP, props: { ...BACKDROP.props, scene }, surface })
      expect((await ui.find({ type: 'Svg' }))?.props.source).toBe(source)
      await ui.unmount()
    }
  }

  const other = await $.ui.mount({ ...BACKDROP, props: { ...BACKDROP.props, scene: 'someone-else' }, surface: 'desktop' })
  expect(await other.find({ type: 'Svg' })).toBeUndefined()
  await other.unmount()
})

test('status reports the theme and whether the background was drawn', async ($, on) => {
  engine(on)
  recordSets(on)

  await $.session.start(START)
  const ui = await $.ui.mount({ ...BACKDROP, surface: 'desktop' })
  await ui.unmount()

  const said = await $.command.run({ ...TYPED, command: 'pink-white', args: 'status' })
  expect(said.text ?? '').toMatch(/sent to an app that draws themes/)
  expect(said.text ?? '').toMatch(/drawn \d+ time\(s\), on .*desktop/)

  const reported = await $.tool.call({ tool: 'mcp__pink-white__status' })
  expect(typeof reported.result).toBe('string')
  const result = JSON.parse(String(reported.result)) as { off: boolean; drawn: number; surfaces: string[]; corner: string }
  expect(result.off).toBe(false)
  expect(result.drawn).toBeGreaterThan(0)
  expect(result.surfaces).toContain('desktop')
  expect(result.corner).toBe('right')
})

test('test shows the loud pattern with no glass, and on goes back to the look', async ($, on) => {
  engine(on)
  const sets = recordSets(on)

  await $.session.start(START)
  const said = await $.command.run({ ...TYPED, command: 'pink-white', args: 'test' })
  expect(said.text ?? '').toMatch(/1 blue, 2 green, 3 orange, 4 purple/)
  expect(sets[1]).toEqual({ backdrop: { scene: 'pink-white-test', glass: false } })

  const ui = await $.ui.mount({ ...BACKDROP, props: { scene: 'pink-white-test', plugin: 'pink-white', glass: false }, surface: 'desktop' })
  expect(String((await ui.find({ type: 'Svg' }))?.props.source)).toContain('#0090FF')
  await ui.unmount()

  await $.command.run({ ...TYPED, command: 'pink-white', args: 'on' })
  expect(sets[2]?.backdrop).toEqual({ scene: SCENE, glass: GLASS })
})

test('glass off drops the glass and stays off; test glass shows the pattern through it', async ($, on) => {
  engine(on)
  const sets = recordSets(on)

  await $.session.start(START)
  const off = await $.command.run({ ...TYPED, command: 'pink-white', args: 'glass off' })
  expect(off.text ?? '').toMatch(/glass is off/)
  expect(sets[1]?.backdrop).toEqual({ scene: SCENE, glass: false })

  await $.session.start(START)
  expect(sets[2]?.backdrop).toEqual({ scene: SCENE, glass: false })

  // Spacing and case are forgiven.
  await $.command.run({ ...TYPED, command: 'pink-white', args: '  Test   Glass ' })
  expect(sets[3]).toEqual({ backdrop: { scene: 'pink-white-test', glass: GLASS } })

  await $.command.run({ ...TYPED, command: 'pink-white', args: 'glass on' })
  expect(sets[4]?.backdrop).toEqual({ scene: SCENE, glass: GLASS })
})

test('glass veil uses the veil scene with the glass, per corner; an old glass-off choice carries over', async ($, on) => {
  // What an earlier development build stored for '/pink-white glass off'.
  engine(on, { noGlass: true })
  const sets = recordSets(on)

  await $.session.start(START)
  expect(sets[0]?.backdrop).toEqual({ scene: SCENE, glass: false })

  const said = await $.command.run({ ...TYPED, command: 'pink-white', args: 'glass veil' })
  expect(said.text ?? '').toMatch(/veil scene/)
  expect(sets[1]?.backdrop).toEqual({ scene: `${SCENE}-veil`, glass: GLASS })

  await $.command.run({ ...TYPED, command: 'pink-white', args: 'corner left' })
  expect(sets[2]?.backdrop).toEqual({ scene: `${SCENE}-left-veil`, glass: GLASS })

  await $.session.start(START)
  expect(sets[3]?.backdrop).toEqual({ scene: `${SCENE}-left-veil`, glass: GLASS })
})

test('a corner change keeps the glass another session saved', async ($, on) => {
  // The store every session shares, answered here so the test can write to it as another window would.
  const shared: Record<string, unknown> = {}
  on('store.get', (_, e) => ({ value: shared[e.key] }))
  on('store.set', (_, e) => {
    shared[e.key] = e.value
    return { value: undefined }
  })
  on('store.delete', (_, e) => {
    delete shared[e.key]
    return { value: undefined }
  })
  on('command.register', () => ({ value: { command: 'pink-white' } }))
  on('tool.register', () => ({ value: { tool: 'mcp__pink-white__status' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  const sets = recordSets(on)

  await $.session.start(START)
  shared.glass = 'veil'
  await $.command.run({ ...TYPED, command: 'pink-white', args: 'corner left' })
  expect(sets[1]?.backdrop).toEqual({ scene: `${SCENE}-left-veil`, glass: GLASS })
})
