import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Trophy, Users, Calendar, Activity, Star, Quote } from "lucide-react";
import { PageShell } from "@/components/site/PageShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/")({ component: Index });

const stats = [
  { label: "Players", value: "150+", icon: Users },
  { label: "Teams", value: "30+", icon: Trophy },
  { label: "Matches Played", value: "200+", icon: Activity },
  { label: "Tournaments", value: "12", icon: Calendar },
];

const latest = [
  { a: "Marburg Lions", b: "Frankfurt CC", as: "182/6", bs: "178/9", result: "Lions won by 4 runs" },
  { a: "Marburg Eagles", b: "Kassel XI", as: "204/8", bs: "150 all out", result: "Eagles won by 54 runs" },
  { a: "Marburg Tigers", b: "Giessen CC", as: "165/9", bs: "166/4", result: "Giessen won by 6 wickets" },
];

const upcoming = [
  { a: "Marburg Lions", b: "Hesse United", date: "Sat 24 May", venue: "Lahnaue Ground" },
  { a: "Marburg Eagles", b: "Darmstadt CC", date: "Sun 25 May", venue: "Schulsportplatz" },
  { a: "Marburg Tigers", b: "Wiesbaden XI", date: "Sat 31 May", venue: "Lahnaue Ground" },
];

const players = [
  { name: "Arjun K.", role: "Top-order Batsman", stat: "642 runs" },
  { name: "Hasan M.", role: "Fast Bowler", stat: "31 wickets" },
  { name: "Daniel W.", role: "All-rounder", stat: "412 R / 18 W" },
  { name: "Faisal R.", role: "Wicketkeeper", stat: "24 dismissals" },
  { name: "Ravi S.", role: "Spinner", stat: "Econ 4.2" },
];

function Index() {
  return (
    <PageShell>
      {/* HERO */}
      <section className="relative overflow-hidden hero-gradient text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-24 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-32">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-secondary/40 bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary">
              <span className="h-1.5 w-1.5 rounded-full bg-secondary animate-pulse" />
              Season 2025 is live
            </span>
            <h1 className="mt-6 font-display text-5xl leading-[0.95] sm:text-7xl">
              Welcome to <span className="text-secondary">Marburg</span><br />Cricket Club
            </h1>
            <p className="mt-5 max-w-lg text-lg text-white/80">
              Building Champions. Uniting Communities. Join 150+ players across 30+ teams competing year-round in Hesse.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register">
                <Button size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 glow-yellow">
                  Join the Club <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/matches">
                <Button size="lg" variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10">
                  View Matches
                </Button>
              </Link>
            </div>
          </div>

          <div className="relative hidden lg:block">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-[260px] roll-ball">🏏</div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS STRIP */}
      <section className="border-y border-border bg-surface">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-10 sm:px-6 md:grid-cols-4 lg:px-8">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <s.icon className="mx-auto h-6 w-6 text-secondary" />
              <div className="mt-2 font-display text-4xl">{s.value}</div>
              <div className="text-sm text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* LATEST MATCHES */}
      <Section title="Latest Matches" subtitle="Results from the last weekend" link={{ to: "/matches", label: "All matches" }}>
        <div className="grid gap-5 md:grid-cols-3">
          {latest.map((m, i) => (
            <Card key={i} className="group overflow-hidden p-6 transition-all hover:-translate-y-1 hover:border-secondary glow-yellow">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                <span>COMPLETED</span><span>League · Sun</span>
              </div>
              <div className="mt-4 space-y-3">
                <Row name={m.a} score={m.as} bold />
                <Row name={m.b} score={m.bs} />
              </div>
              <div className="mt-5 rounded-lg bg-secondary/15 px-3 py-2 text-sm font-semibold text-foreground">
                {m.result}
              </div>
            </Card>
          ))}
        </div>
      </Section>

      {/* UPCOMING */}
      <Section title="Upcoming Fixtures" subtitle="Mark your calendar" link={{ to: "/matches", label: "Full schedule" }}>
        <div className="grid gap-5 md:grid-cols-3">
          {upcoming.map((m, i) => (
            <Card key={i} className="p-6 transition-all hover:border-secondary glow-yellow">
              <div className="text-xs font-semibold text-secondary">{m.date.toUpperCase()}</div>
              <div className="mt-3 font-display text-2xl">{m.a}</div>
              <div className="text-sm text-muted-foreground">vs</div>
              <div className="font-display text-2xl">{m.b}</div>
              <div className="mt-4 text-sm text-muted-foreground">📍 {m.venue}</div>
            </Card>
          ))}
        </div>
      </Section>

      {/* TOP PLAYERS */}
      <Section title="Top Players" subtitle="Leading the leaderboards" link={{ to: "/stats", label: "All stats" }}>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {players.map((p, i) => (
            <Card key={i} className="min-w-[220px] p-5 transition-all hover:-translate-y-1 hover:border-secondary glow-yellow">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-secondary to-yellow-600 font-display text-3xl text-secondary-foreground">
                {p.name.split(" ").map((n) => n[0]).join("")}
              </div>
              <div className="mt-4 text-center">
                <div className="font-semibold">{p.name}</div>
                <div className="text-xs text-muted-foreground">{p.role}</div>
                <div className="mt-2 inline-block rounded-md bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground">{p.stat}</div>
              </div>
            </Card>
          ))}
        </div>
      </Section>

      {/* TOURNAMENTS */}
      <Section title="Active Tournaments" subtitle="Where champions are made">
        <div className="grid gap-5 md:grid-cols-3">
          {["Hesse Premier League", "Summer T20 Cup", "Marburg Knockout"].map((t, i) => (
            <Card key={i} className="overflow-hidden">
              <div className="hero-gradient h-32 px-5 py-4 text-white">
                <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-bold text-secondary-foreground">LIVE</span>
                <div className="mt-2 font-display text-2xl">{t}</div>
              </div>
              <div className="p-5 text-sm text-muted-foreground">
                12 teams · 45 matches · Final on 30 Aug
              </div>
            </Card>
          ))}
        </div>
      </Section>

      {/* TESTIMONIAL */}
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 lg:px-8">
          <Quote className="mx-auto h-10 w-10 text-secondary" />
          <p className="mt-6 font-display text-3xl leading-snug sm:text-4xl">
            "Marburg CC turned a hobby into a brotherhood. Best decision I made since moving to Germany."
          </p>
          <div className="mt-6 text-sm text-white/70">— Arjun K., All-rounder · 4 seasons</div>
        </div>
      </section>

      {/* SPONSORS */}
      <section className="overflow-hidden border-y border-border bg-surface py-10">
        <div className="marquee flex w-max gap-16 px-8 text-2xl font-display text-muted-foreground">
          {Array.from({ length: 2 }).flatMap((_, k) =>
            ["Sparkasse Marburg", "BlackForest Coffee", "DLR Hesse", "Marburg Tech", "Lahn Logistik", "PitchPerfect", "Sparkasse Marburg", "BlackForest Coffee"]
              .map((s, i) => <span key={`${k}-${i}`} className="whitespace-nowrap">★ {s}</span>)
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-4 py-20 text-center sm:px-6 lg:px-8">
        <Star className="mx-auto h-10 w-10 text-secondary" />
        <h2 className="mt-4 font-display text-5xl">Ready to play?</h2>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Whether you're a seasoned all-rounder or picking up a bat for the first time, there's a team waiting for you.
        </p>
        <Link to="/register">
          <Button size="lg" className="mt-8 bg-secondary text-secondary-foreground hover:bg-secondary/90 glow-yellow">
            Register as a Player <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </section>
    </PageShell>
  );
}

function Section({ title, subtitle, link, children }: {
  title: string; subtitle?: string; link?: { to: string; label: string }; children: React.ReactNode;
}) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-4xl sm:text-5xl">{title}</h2>
          {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
        </div>
        {link && (
          <Link to={link.to} className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold hover:text-secondary">
            {link.label} <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function Row({ name, score, bold }: { name: string; score: string; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${bold ? "font-semibold" : ""}`}>
      <span>{name}</span>
      <span className="font-display text-xl">{score}</span>
    </div>
  );
}
