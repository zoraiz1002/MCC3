import { createFileRoute } from "@tanstack/react-router";
import { PageShell, PageHero } from "@/components/site/PageShell";
import { Card } from "@/components/ui/card";
import { Trophy, Target, Heart, Users, Award, Sparkles } from "lucide-react";

export const Route = createFileRoute("/about")({
  component: About,
  head: () => ({ meta: [
    { title: "About — Marburg Cricket Club" },
    { name: "description", content: "Our history, mission, leadership and values. Cricket in Marburg since 2010." },
  ]}),
});

const values = [
  { icon: Users, label: "Teamwork" },
  { icon: Award, label: "Excellence" },
  { icon: Sparkles, label: "Integrity" },
  { icon: Heart, label: "Respect" },
  { icon: Target, label: "Passion" },
  { icon: Trophy, label: "Community" },
];

const timeline = [
  { y: "2010", t: "Club founded by a group of 9 cricket-loving students at Philipps-Universität." },
  { y: "2014", t: "First regional title: Hesse District Cup winners." },
  { y: "2018", t: "Junior academy launched — 60 kids in the first intake." },
  { y: "2021", t: "Lahnaue Ground inaugurated as our home venue." },
  { y: "2024", t: "Premier league promotion. 150+ active members." },
  { y: "2025", t: "Digital platform launch — fixtures, scoring, shop, all online." },
];

function About() {
  return (
    <PageShell>
      <PageHero title="About the Club" subtitle="Fifteen years of cricket in the heart of Hesse." />

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="p-8">
            <Target className="h-8 w-8 text-secondary" />
            <h3 className="mt-4 font-display text-3xl">Our Mission</h3>
            <p className="mt-3 text-muted-foreground">
              To grow cricket across central Germany by providing world-class coaching, inclusive competition,
              and a community where every player — beginner to professional — can thrive.
            </p>
          </Card>
          <Card className="p-8">
            <Sparkles className="h-8 w-8 text-secondary" />
            <h3 className="mt-4 font-display text-3xl">Our Vision</h3>
            <p className="mt-3 text-muted-foreground">
              A nationally recognised cricket academy in Marburg, producing players for the German national team
              while keeping our roots in community sport.
            </p>
          </Card>
        </div>
      </section>

      <section className="bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="font-display text-4xl">Our Journey</h2>
          <div className="mt-10 space-y-6 border-l-2 border-secondary pl-8">
            {timeline.map((e) => (
              <div key={e.y} className="relative">
                <div className="absolute -left-[41px] flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">●</div>
                <div className="font-display text-2xl">{e.y}</div>
                <p className="text-muted-foreground">{e.t}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="font-display text-4xl">Core Values</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {values.map((v) => (
            <Card key={v.label} className="flex items-center gap-4 p-5 transition-all hover:border-secondary">
              <div className="rounded-xl bg-secondary/15 p-3"><v.icon className="h-5 w-5 text-secondary" /></div>
              <div className="font-display text-2xl">{v.label}</div>
            </Card>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
