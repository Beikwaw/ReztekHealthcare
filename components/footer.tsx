"use client"

import Link from "next/link"
import { Heart } from "lucide-react"

export function Footer() {
  return (
    <footer className="bg-sidebar text-sidebar-foreground py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Heart className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <p className="font-semibold text-sidebar-foreground leading-tight">Reztek Healthcare Practice</p>
                <p className="text-xs text-sidebar-foreground/60">Comprehensive Primary Care</p>
              </div>
            </Link>
            <p className="text-sidebar-foreground/70 text-sm leading-relaxed max-w-md">
              Providing quality healthcare services with compassion and excellence 
              for over 20 years. Your health and wellbeing are our top priority.
            </p>
            <p className="mt-4 text-xs text-sidebar-foreground/50">
              Powered by modern technology for better patient care.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-sidebar-foreground mb-4">Quick Links</h4>
            <ul className="space-y-3">
              {[
                { href: "#services", label: "Our Services" },
                { href: "#about", label: "About Us" },
                { href: "#contact", label: "Contact" },
                { href: "/login", label: "Staff Portal" },
              ].map((link) => (
                <li key={link.href}>
                  <Link 
                    href={link.href} 
                    className="text-sm text-sidebar-foreground/70 hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-sidebar-foreground mb-4">Contact</h4>
            <ul className="space-y-3 text-sm text-sidebar-foreground/70">
              <li>
                <a href="tel:+27115551234" className="hover:text-primary transition-colors">
                  +27 11 555 1234
                </a>
              </li>
              <li>
                <a href="mailto:info@reztek-health.co.za" className="hover:text-primary transition-colors">
                  info@reztek-health.co.za
                </a>
              </li>
              <li>Reztek Healthcare Centre, 45 Orion Road</li>
              <li>Johannesburg, 2196, South Africa</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-sidebar-border">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-sidebar-foreground/60">
              {new Date().getFullYear()} Reztek Healthcare Practice. All rights reserved.
            </p>
            <div className="flex gap-6">
              <Link href="#" className="text-sm text-sidebar-foreground/60 hover:text-primary transition-colors">
                Privacy Policy
              </Link>
              <Link href="#" className="text-sm text-sidebar-foreground/60 hover:text-primary transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
