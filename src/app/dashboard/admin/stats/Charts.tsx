"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from "recharts"

// ── Design tokens ──────────────────────────────────────────────────────────

const ACCENT = "#2d6a4f"
const COLORS = ["#2d6a4f", "#52b788", "#74c69d", "#95d5b2", "#b7e4c7", "#d8f3dc"]

const AXIS_STYLE = { fontSize: 11, fill: "#888" }
const TOOLTIP_STYLE = {
  backgroundColor: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 6,
  fontSize: 12,
  color: "#111",
}

// ── Types ──────────────────────────────────────────────────────────────────

export type ChartData = {
  statusData: { label: string; count: number }[]
  laboData: { nom: string; count: number }[]
  formationData: { formation: string; count: number }[]
  pubTypeData: { type: string; count: number }[]
  anneeData: { annee: string; count: number }[]
}

// ── Shared wrapper ─────────────────────────────────────────────────────────

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded border border-border">
      <div className="border-b border-border px-5 py-3">
        <h2 className="text-[10px] font-semibold uppercase tracking-wider text-muted">
          {title}
        </h2>
      </div>
      <div className="px-4 py-4">{children}</div>
    </div>
  )
}

// ── Individual charts ──────────────────────────────────────────────────────

export function StatusChart({ data }: { data: ChartData["statusData"] }) {
  // Horizontal layout keeps long French labels fully readable on the Y-axis
  const height = Math.max(240, data.length * 32)
  return (
    <ChartCard title="Répartition par statut">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
        >
          <XAxis type="number" tick={AXIS_STYLE} allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="label"
            tick={AXIS_STYLE}
            width={180}
          />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Bar dataKey="count" name="Dossiers" fill={ACCENT} radius={[0, 3, 3, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

export function LaboChart({ data }: { data: ChartData["laboData"] }) {
  return (
    <ChartCard title="Répartition par laboratoire">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
          <XAxis type="number" tick={AXIS_STYLE} allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="nom"
            tick={{ ...AXIS_STYLE, width: 140 }}
            width={150}
          />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Bar dataKey="count" name="Doctorants" fill={ACCENT} radius={[0, 3, 3, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

export function FormationChart({ data }: { data: ChartData["formationData"] }) {
  return (
    <ChartCard title="Répartition par formation doctorale">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
          <XAxis type="number" tick={AXIS_STYLE} allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="formation"
            tick={{ ...AXIS_STYLE, width: 140 }}
            width={150}
          />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Bar dataKey="count" name="Doctorants" fill="#52b788" radius={[0, 3, 3, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

const PUB_LABELS: Record<string, string> = {
  article: "Article",
  communication: "Communication",
  poster: "Poster",
  chapitre: "Chapitre",
}

export function PubTypeChart({ data }: { data: ChartData["pubTypeData"] }) {
  const labeled = data.map((d) => ({ ...d, name: PUB_LABELS[d.type] ?? d.type }))
  return (
    <ChartCard title="Publications par type">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={labeled}
            dataKey="count"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={72}
            label={({ name, percent }) =>
              `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
            }
            labelLine={false}
            fontSize={11}
          >
            {labeled.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

export function AnneeChart({ data }: { data: ChartData["anneeData"] }) {
  return (
    <ChartCard title="Évolution des réinscriptions par année universitaire">
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 4, right: 16, left: -16, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="annee" tick={AXIS_STYLE} />
          <YAxis tick={AXIS_STYLE} allowDecimals={false} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Line
            type="monotone"
            dataKey="count"
            name="Réinscriptions"
            stroke={ACCENT}
            strokeWidth={2}
            dot={{ r: 4, fill: ACCENT }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
