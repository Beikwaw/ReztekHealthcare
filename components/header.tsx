"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Menu, X, Phone, Heart, ChevronRight } from "lucide-react"
import { useState, useEffect } from "react"

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? "bg-background/95 backdrop-blur-md border-b border-border shadow-sm" 
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center transition-transform group-hover:scale-105">
              <Heart className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="hidden sm:block">
              <p className="font-bold text-foreground leading-tight">Reztek Healthcare Practice</p>
              <p className="text-xs text-muted-foreground">Integrated Care & Management</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {[
              { href: "#services", label: "Services" },
              { href: "#about", label: "About" },
              { href: "#contact", label: "Contact" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* CTA Buttons */}
          <div className="hidden lg:flex items-center gap-3">
            <a 
              href="tel:+27123456789" 
              className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
            >
              <Phone className="w-4 h-4" />
              <span>+27 12 345 6789</span>
            </a>
            <Link href="/get-quote">
              <Button variant="secondary">
                Get a quote
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" className="bg-transparent">
                Staff Login
              </Button>
            </Link>
            <Link href="#contact">
              <Button>
                Book Appointment
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            className="lg:hidden p-2 text-foreground rounded-lg hover:bg-muted transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="lg:hidden border-t border-border bg-background/95 backdrop-blur-md">
          <nav className="flex flex-col px-4 py-4 gap-1">
            {[
              { href: "#services", label: "Services" },
              { href: "#about", label: "About" },
              { href: "#contact", label: "Contact" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
                onClick={() => setIsMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="border-t border-border my-2" />
            <a 
              href="tel:+27123456789" 
              className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground"
            >
              <Phone className="w-4 h-4" />
              <span>+27 12 345 6789</span>
            </a>
            <Link href="/get-quote" onClick={() => setIsMenuOpen(false)}>
              <Button variant="secondary" className="w-full">
                Get a quote
              </Button>
            </Link>
            <Link href="/login" onClick={() => setIsMenuOpen(false)}>
              <Button variant="outline" className="w-full bg-transparent">
                Staff Login
              </Button>
            </Link>
            <Link href="#contact" onClick={() => setIsMenuOpen(false)}>
              <Button className="w-full mt-2">
                Book Appointment
              </Button>
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}
