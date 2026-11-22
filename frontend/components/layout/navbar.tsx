import Link from "next/link"
import { WindIcon } from "@phosphor-icons/react/ssr"
import { cn } from "@/lib/utils"

const links = [
  { href: "/accuracy", label: "how it works" },
]

/* The dashboard's centered pill nav (from the Sylphio design): the app icon,
   then the sections, with "Air quality" marked as the page you're on. */
const pillLinks = [
  { href: "/", label: "Air quality", current: true },
  { href: "/accuracy", label: "How it works" },
]

export function Navbar({
  className,
  pill,
}: {
  className?: string
  pill?: boolean
}) {
  if (pill) {
    return (
      <header className={cn("flex justify-center px-4 pt-5", className)}>
        <nav
          aria-label="Main"
          className="flex max-w-full items-center gap-1 overflow-x-auto rounded-full border bg-card p-1.5 font-display shadow-raised"
        >
          <Link
            href="/"
            aria-label="Sylph home"
            className="flex size-10 flex-none items-center justify-center rounded-full text-primary hover:bg-muted"
          >
            <WindIcon size={20} aria-hidden />
          </Link>
          {pillLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              aria-current={link.current ? "page" : undefined}
              className="flex-none rounded-full px-4 py-2.5 text-sm font-medium whitespace-nowrap hover:bg-muted aria-[current=page]:bg-muted aria-[current=page]:font-semibold"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </header>
    )
  }

  return (
    <header className={cn("flex h-14 items-center px-6", className)}>
      <nav aria-label="Main" className="flex items-center gap-7 text-sm">
        <Link
          href="/"
          className="flex items-center gap-2 py-3 font-semibold hover:text-primary"
        >
          <WindIcon size={20} aria-hidden />
          sylph
        </Link>
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="py-3 hover:text-primary"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  )
}
