import Link from "next/link"
import { WindIcon } from "@phosphor-icons/react/ssr"

const links = [
  { href: "/accuracy", label: "how it works" },
  { href: "/about", label: "about" },
]

export function Navbar() {
  return (
    <header className="flex h-14 items-center px-6">
      <nav aria-label="Main" className="flex items-center gap-7 text-sm">
        <Link href="/" className="flex items-center gap-2 py-3 font-semibold hover:text-primary">
          <WindIcon size={20} aria-hidden />
          sylph
        </Link>
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="py-3 hover:text-primary">
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  )
}
