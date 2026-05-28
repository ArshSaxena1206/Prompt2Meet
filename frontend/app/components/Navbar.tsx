"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, Bell } from "lucide-react";

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/calendar", label: "Calendar" },
  { href: "/", label: "Meetings" },
  { href: "/settings", label: "Settings" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 w-full z-50 border-b glass" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
      <div className="flex justify-between items-center px-6 py-3 max-w-[1200px] mx-auto">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center group-hover:bg-accent/25 transition">
            <Sparkles size={16} className="text-accent" />
          </div>
          <span className="font-semibold text-lg text-accent tracking-tight">Prompt2Meet</span>
        </Link>

        {/* Nav Links */}
        <div className="hidden md:flex gap-6">
          {navLinks.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors duration-200 ${
                  isActive
                    ? "text-accent border-b-2 border-accent pb-1"
                    : "text-[#c7c4d7] hover:text-accent"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Right section */}
        <div className="flex items-center gap-3">
          <button className="text-[#c7c4d7] hover:text-accent transition-colors p-1.5 rounded-lg hover:bg-surface-3">
            <Bell size={18} />
          </button>
          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-xs text-white font-bold">
            A
          </div>
        </div>
      </div>
    </nav>
  );
}
