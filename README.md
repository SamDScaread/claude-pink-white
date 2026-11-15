# pink-white: a soft pink look for the Claude desktop app

粉嫩的粉白主题：窗口背后铺一层缓慢流动的粉色渐变，侧栏和顶栏变成半透明的白色毛玻璃，让粉色透出来。

A Claude Code mod that lays a slowly drifting pink wash behind the Claude desktop app's window and turns the sidebar and the top bar into frosted white glass, so the pink shows through.

- The wash runs at 125 degrees between `#FFD6E4` and `#FFC2D6`, laid out three times the window and panned back and forth once every 30 seconds.
- It stops moving when your system asks for reduced motion, or when background animation is turned off in Claude's own settings.
- `/pink-white off` goes back to the default look (and stays off in new sessions); `/pink-white on` brings it back.

## Install

At the prompt of a terminal session:

```
/plugin install pink-white --marketplace SamDScaread/claude-pink-white
```

Answer `y` to add the marketplace, then pick a scope (user is first; press Enter).

From a shell:

```
claude plugin install pink-white --marketplace SamDScaread/claude-pink-white
```

In the desktop app, where `/plugin` does not run: click + next to the prompt box, then Plugins, Add marketplace with `SamDScaread/claude-pink-white`, then Add plugin.

Start a new desktop session afterwards. To remove it: `claude plugin uninstall pink-white`.

## Good to know

- It needs Claude Code 2.1.325 or newer (the engine the desktop app ships). Older command-line versions report the plugin as failed to load; that does not affect the desktop app.
- The desktop app draws a mod's background scene only where Anthropic has rolled that feature out for your account. If nothing changes after installing, that is the likely reason.
- The mod also carries a full pink-white palette (text `#4A2E3A`, secondary text `#8A5A70`, links `#B83A6E`, focus line `#D46A92`, diff `#27704A` / `#B42318`). Current desktop builds do not paint mod palettes yet; it takes effect once they do.
- The look is made for light mode. In dark mode the app keeps its own dark panels; set Claude's appearance to Light to keep the pink look.

## License

MIT
