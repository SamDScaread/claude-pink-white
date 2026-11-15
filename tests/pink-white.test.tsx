import type { ThemeSetArgs } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

const SCENE = 'pink-white-drift'

// What the engine stamps on a command the person types at the prompt.
const TYPED = { origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } } as const

const BACKDROP = {
  plugin: 'pink-white',
  component: 'Backdrop',
  requestId: 'backdrop',
  props: { scene: SCENE, plugin: 'pink-white', glass: { blur: 0, tint: '#FFFFFF', opacity: 0 } },
} as const

test('the look is set when a session starts', async ($, on) => {
  mock.store(on)
  on('command.register', () => ({ value: { command: 'pink-white' } }))
  const sets: ThemeSetArgs[] = []
  on('theme.set', (_, e) => {
    sets.push(e)
    return { value: { isDrawn: true, requestId: 'backdrop' } }
  })
  on('session.start', (_, e) => ({ cwd: e.cwd }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  expect(sets.length).toBe(1)
  const look = sets[0]
  expect(look?.backdrop).toEqual({ scene: SCENE, glass: { blur: 0, tint: '#FFFFFF', opacity: 0 } })
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

test('off goes back to the default look and stays off, on brings it back', async ($, on) => {
  mock.store(on)
  on('command.register', () => ({ value: { command: 'pink-white' } }))
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
  on('session.start', (_, e) => ({ cwd: e.cwd }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  expect(sets).toBe(1)

  const off = await $.command.run({ ...TYPED, command: 'pink-white', args: 'off' })
  expect(clears).toBe(1)
  expect(off.text ?? '').toMatch(/off/)

  // A later session keeps the default look.
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  expect(sets).toBe(1)

  const back = await $.command.run({ ...TYPED, command: 'pink-white', args: 'on' })
  expect(sets).toBe(2)
  expect(back.text ?? '').toMatch(/on/)
})

test('the backdrop draws the wash on desktop and mobile, and leaves other scenes alone', async $ => {
  for (const surface of ['desktop', 'mobile'] as const) {
    const ui = await $.ui.mount({ ...BACKDROP, surface })
    expect(await ui.find({ type: 'Svg' })).toBeDefined()
    await ui.unmount()
  }

  const other = await $.ui.mount({ ...BACKDROP, props: { ...BACKDROP.props, scene: 'someone-else' }, surface: 'desktop' })
  expect(await other.find({ type: 'Svg' })).toBeUndefined()
  await other.unmount()
})
