# Pretext Playground

Self-referential text experiments powered by [`@chenglou/pretext`](https://github.com/chenglou/pretext). Inspired by Hofstadter's *Gödel, Escher, Bach*.

Each paragraph measures itself with pretext's pure-arithmetic text layout, injects the measurements back into its own content, and iterates to a fixed point. Resize the window and the numbers update live — no DOM measurements involved.

## Getting Started

```bash
npm install
npm run dev
```

## Built With

- [Next.js](https://nextjs.org)
- [@chenglou/pretext](https://github.com/chenglou/pretext) — DOM-free text measurement & layout
- [Tailwind CSS](https://tailwindcss.com)
