import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CrudTable } from "@/components/admin/CrudTable";
import { EntityDialog, type Field } from "@/components/admin/EntityDialog";
import { Button } from "@/components/ui/button";
import { useCrud, useList } from "@/lib/crud";

export const Route = createFileRoute("/admin/scoring")({ component: Page });

type Section = "innings" | "balls" | "batting_scores" | "bowling_scores";

const sections: { key: Section; label: string }[] = [
  { key: "innings", label: "Innings" },
  { key: "balls", label: "Balls" },
  { key: "batting_scores", label: "Batting Scores" },
  { key: "bowling_scores", label: "Bowling Scores" },
];

const fieldsBySection: Record<Section, Field[]> = {
  innings: [
    { name: "match_id", label: "Match ID", required: true },
    { name: "batting_team", label: "Batting Team ID", required: true },
    { name: "bowling_team", label: "Bowling Team ID", required: true },
    { name: "innings_no", label: "Innings No", type: "number", required: true },
    { name: "runs", label: "Runs", type: "number" },
    { name: "wickets", label: "Wickets", type: "number" },
    { name: "overs", label: "Overs", type: "number" },
  ],

  balls: [
    { name: "innings_id", label: "Innings ID", required: true },
    { name: "over_no", label: "Over No", type: "number", required: true },
    { name: "ball_no", label: "Ball No", type: "number", required: true },
    { name: "batsman_id", label: "Batsman ID" },
    { name: "non_striker_id", label: "Non Striker ID" },
    { name: "bowler_id", label: "Bowler ID" },
    { name: "runs", label: "Runs", type: "number" },
    {
      name: "extras_type",
      label: "Extras Type",
      type: "select",
      options: [
        { value: "none", label: "None" },
        { value: "wide", label: "Wide" },
        { value: "no_ball", label: "No Ball" },
        { value: "bye", label: "Bye" },
        { value: "leg_bye", label: "Leg Bye" },
        { value: "penalty", label: "Penalty" },
      ],
    },
    { name: "is_wicket", label: "Wicket", type: "boolean" },
    {
      name: "dismissal_type",
      label: "Dismissal Type",
      type: "select",
      options: [
        { value: "bowled", label: "Bowled" },
        { value: "caught", label: "Caught" },
        { value: "lbw", label: "LBW" },
        { value: "run_out", label: "Run Out" },
        { value: "stumped", label: "Stumped" },
        { value: "hit_wicket", label: "Hit Wicket" },
        { value: "retired_hurt", label: "Retired Hurt" },
        { value: "obstructing_field", label: "Obstructing Field" },
        { value: "not_out", label: "Not Out" },
      ],
    },
    { name: "fielder_id", label: "Fielder ID" },
  ],

  batting_scores: [
    { name: "innings_id", label: "Innings ID", required: true },
    { name: "player_id", label: "Player ID", required: true },
    { name: "runs", label: "Runs", type: "number" },
    { name: "balls", label: "Balls", type: "number" },
    { name: "fours", label: "Fours", type: "number" },
    { name: "sixes", label: "Sixes", type: "number" },
    { name: "sr", label: "Strike Rate", type: "number" },
    {
      name: "dismissal",
      label: "Dismissal",
      type: "select",
      options: [
        { value: "bowled", label: "Bowled" },
        { value: "caught", label: "Caught" },
        { value: "lbw", label: "LBW" },
        { value: "run_out", label: "Run Out" },
        { value: "stumped", label: "Stumped" },
        { value: "hit_wicket", label: "Hit Wicket" },
        { value: "retired_hurt", label: "Retired Hurt" },
        { value: "obstructing_field", label: "Obstructing Field" },
        { value: "not_out", label: "Not Out" },
      ],
    },
    { name: "bowler_id", label: "Bowler ID" },
    { name: "fielder_id", label: "Fielder ID" },
  ],

  bowling_scores: [
    { name: "innings_id", label: "Innings ID", required: true },
    { name: "player_id", label: "Player ID", required: true },
    { name: "overs", label: "Overs", type: "number" },
    { name: "maidens", label: "Maidens", type: "number" },
    { name: "runs", label: "Runs", type: "number" },
    { name: "wickets", label: "Wickets", type: "number" },
    { name: "economy", label: "Economy", type: "number" },
  ],
};

function Page() {
  const [section, setSection] = useState<Section>("innings");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const { data, isLoading } = useList<any>(section);
  const { create, update, remove } = useCrud(section);

  const columnsBySection: Record<Section, any[]> = {
    innings: [
      { key: "innings_no", header: "Innings" },
      { key: "runs", header: "Runs" },
      { key: "wickets", header: "Wickets" },
      { key: "overs", header: "Overs" },
      { key: "match_id", header: "Match ID" },
    ],

    balls: [
      { key: "over_no", header: "Over" },
      { key: "ball_no", header: "Ball" },
      { key: "runs", header: "Runs" },
      { key: "extras_type", header: "Extra" },
      { key: "is_wicket", header: "Wicket", render: (r: any) => (r.is_wicket ? "Yes" : "No") },
    ],

    batting_scores: [
      { key: "player_id", header: "Player ID" },
      { key: "runs", header: "Runs" },
      { key: "balls", header: "Balls" },
      { key: "fours", header: "4s" },
      { key: "sixes", header: "6s" },
      { key: "sr", header: "SR" },
    ],

    bowling_scores: [
      { key: "player_id", header: "Player ID" },
      { key: "overs", header: "Overs" },
      { key: "maidens", header: "Maidens" },
      { key: "runs", header: "Runs" },
      { key: "wickets", header: "Wickets" },
      { key: "economy", header: "Econ" },
    ],
  };

  return (
    <div>
      <h1 className="font-display text-4xl">Scoring</h1>
      <p className="text-sm text-muted-foreground">
        Manage innings, balls, batting scores and bowling scores.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {sections.map((s) => (
          <Button
            key={s.key}
            type="button"
            variant={section === s.key ? "default" : "outline"}
            onClick={() => {
              setSection(s.key);
              setEditing(null);
              setOpen(false);
            }}
          >
            {s.label}
          </Button>
        ))}
      </div>

      <div className="mt-6">
        <CrudTable
          title={sections.find((s) => s.key === section)?.label ?? "Scoring"}
          rows={data ?? []}
          loading={isLoading}
          searchKeys={["id", "player_id", "match_id", "innings_id"]}
          columns={columnsBySection[section]}
          onAdd={() => {
            setEditing(null);
            setOpen(true);
          }}
          onEdit={(r) => {
            setEditing(r);
            setOpen(true);
          }}
          onDelete={(r) => {
            if (section === "batting_scores" || section === "bowling_scores") {
              remove.mutate({
                innings_id: r.innings_id,
                player_id: r.player_id,
              });
            } else {
              remove.mutate(r.id);
            }
          }}
        />
      </div>

      <EntityDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? `Edit ${section}` : `Add ${section}`}
        fields={fieldsBySection[section]}
        initial={editing}
        onSubmit={(v) =>
          editing
            ? update.mutateAsync({
                id:
                  section === "batting_scores" || section === "bowling_scores"
                    ? {
                        innings_id: editing.innings_id,
                        player_id: editing.player_id,
                      }
                    : editing.id,
                patch: v,
              })
            : create.mutateAsync(v)
        }
      />
    </div>
  );
}