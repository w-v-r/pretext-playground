import type { Metadata } from "next"
import { Newsreader } from "next/font/google"

const serif = Newsreader({
  variable: "--font-deformed-serif",
  subsets: ["latin"],
  axes: ["opsz"],
  style: ["normal"],
})

export const metadata: Metadata = {
  title: "Deformed Text — Pretext Playground",
  description: "Prismatic, glitch-smeared typography laid out with @chenglou/pretext",
}

export default function DeformedLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className={`${serif.variable} min-h-screen bg-neutral-950 text-neutral-200`}>{children}</div>
}
