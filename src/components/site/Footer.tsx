import { Link } from "@tanstack/react-router";
import { Instagram, Facebook, Twitter, MessageCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function Footer() {
  return (
    <footer className="mt-24 bg-[#0a0a0a] text-white">
      <div className="bg-secondary py-3 text-center text-sm font-semibold text-secondary-foreground">
        Proudly sponsored by local Marburg businesses — Get your logo here →
      </div>

      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div>
          <div className="flex items-center gap-2 font-display text-2xl">
            <span>🏏</span> Marburg CC
          </div>
          <p className="mt-3 text-sm text-white/70">
            Building champions. Uniting communities. Cricket in the heart of Hesse.
          </p>
        </div>

        <div>
          <h4 className="font-display text-lg">Explore</h4>
          <ul className="mt-3 space-y-2 text-sm text-white/70">
            <li><Link to="/" className="hover:text-secondary">Home</Link></li>
            <li><Link to="/about" className="hover:text-secondary">About</Link></li>
            <li><Link to="/teams" className="hover:text-secondary">Teams</Link></li>
            <li><Link to="/shop" className="hover:text-secondary">Shop</Link></li>
            <li><Link to="/contact" className="hover:text-secondary">Contact</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-display text-lg">Follow</h4>
          <div className="mt-3 flex gap-3">
            {[MessageCircle, Instagram, Facebook, Twitter].map((Icon, i) => (
              <a key={i} href="#" className="rounded-full border border-white/20 p-2 hover:border-secondary hover:text-secondary">
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-display text-lg">Newsletter</h4>
          <p className="mt-3 text-sm text-white/70">Match alerts and club news.</p>
          <form className="mt-3 flex gap-2" onSubmit={(e) => e.preventDefault()}>
            <Input placeholder="you@email.com" className="bg-white/10 border-white/20 text-white placeholder:text-white/40" />
            <Button type="submit" className="bg-secondary text-secondary-foreground hover:bg-secondary/90">Join</Button>
          </form>
        </div>
      </div>

      <div className="border-t border-white/10 py-5 text-center text-xs text-white/50">
        © 2025 Marburg Cricket Club. All rights reserved.
      </div>
    </footer>
  );
}
