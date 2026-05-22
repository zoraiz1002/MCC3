import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell, PageHero } from "@/components/site/PageShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Star } from "lucide-react";

export const Route = createFileRoute("/shop")({ component: Shop });

const products = [
  { id: "jersey-home", name: "Home Jersey 2025", cat: "Jerseys", price: 49, rating: 4.7, reviews: 32 },
  { id: "jersey-away", name: "Away Jersey 2025", cat: "Jerseys", price: 49, rating: 4.6, reviews: 18 },
  { id: "cap", name: "Club Cap", cat: "Accessories", price: 19, rating: 4.9, reviews: 64 },
  { id: "bat", name: "English Willow Bat", cat: "Equipment", price: 189, rating: 4.8, reviews: 12 },
  { id: "gloves", name: "Batting Gloves Pro", cat: "Equipment", price: 59, rating: 4.5, reviews: 22 },
  { id: "mug", name: "Marburg CC Mug", cat: "Merchandise", price: 12, rating: 4.4, reviews: 41 },
];

function Shop() {
  return (
    <PageShell>
      <PageHero title="Club Shop" subtitle="Wear the badge. Carry the kit." />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <Card key={p.id} className="group overflow-hidden">
              <div className="hero-gradient flex h-48 items-center justify-center text-7xl">
                {p.cat === "Jerseys" ? "👕" : p.cat === "Equipment" ? "🏏" : p.cat === "Accessories" ? "🧢" : "☕"}
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs text-muted-foreground">{p.cat}</span>
                    <div className="font-semibold">{p.name}</div>
                  </div>
                  <button aria-label="Wishlist" className="text-muted-foreground hover:text-destructive"><Heart className="h-5 w-5"/></button>
                </div>
                <div className="mt-2 flex items-center gap-1 text-xs">
                  <Star className="h-3.5 w-3.5 fill-secondary text-secondary" />
                  <span className="font-semibold">{p.rating}</span>
                  <span className="text-muted-foreground">({p.reviews})</span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="font-display text-2xl">€{p.price}</span>
                  <Link to="/shop/products/$id" params={{ id: p.id }}>
                    <Button size="sm" className="bg-secondary text-secondary-foreground hover:bg-secondary/90">View</Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
