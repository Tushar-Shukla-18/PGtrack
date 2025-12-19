import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface OccupancyChartProps {
  occupancyRate: number;
  occupiedBeds: number;
  totalBeds: number;
}

export function OccupancyChart({ occupancyRate, occupiedBeds, totalBeds }: OccupancyChartProps) {
  const vacantRate = 100 - occupancyRate;
  
  const data = [
    { name: "Occupied", value: occupancyRate, color: "hsl(166, 72%, 28%)" },
    { name: "Vacant", value: vacantRate, color: "hsl(220, 14%, 90%)" },
  ];

  return (
    <div className="bg-card rounded-xl border border-border p-6 shadow-card animate-slide-up">
      <h3 className="text-lg font-semibold text-foreground mb-4">
        Occupancy Rate
      </h3>
      <div className="relative h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              }}
              formatter={(value: number, name: string) => [`${value}%`, name]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-3xl font-bold text-foreground">
              {occupancyRate}%
            </p>
            <p className="text-sm text-muted-foreground">
              {occupiedBeds}/{totalBeds} beds
            </p>
          </div>
        </div>
      </div>
      <div className="flex justify-center gap-6 mt-4">
        {data.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-sm text-muted-foreground">{item.name}</span>
            <span className="text-sm font-semibold text-foreground">
              {item.value}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
