import { Position } from "@/pages/Positions";
import { cn } from "@/lib/utils";

interface FloorPlanProps {
  positions: Position[];
  hoveredPosition: string | null;
  selectedPosition: string | null;
  onPositionClick: (id: string) => void;
  onPositionHover: (id: string | null) => void;
}

const FloorPlan = ({
  positions,
  hoveredPosition,
  selectedPosition,
  onPositionClick,
  onPositionHover,
}: FloorPlanProps) => {
  return (
    <div className="relative w-full h-full min-h-[500px] bg-muted/20 rounded-lg overflow-hidden">
      <svg width="100%" height="100%" viewBox="0 0 800 600" className="border border-border rounded-lg">
        {/* Floor plan background grid */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="hsl(var(--border))" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="800" height="600" fill="url(#grid)" />
        
        {/* Store outline */}
        <rect
          x="20"
          y="20"
          width="760"
          height="560"
          fill="hsl(var(--background))"
          stroke="hsl(var(--border))"
          strokeWidth="2"
          rx="4"
        />

        {/* Positions */}
        {positions.map((position) => {
          const isHovered = hoveredPosition === position.id;
          const isSelected = selectedPosition === position.id;
          const isOccupied = position.status === "occupied";

          return (
            <g
              key={position.id}
              onMouseEnter={() => onPositionHover(position.id)}
              onMouseLeave={() => onPositionHover(null)}
              onClick={() => onPositionClick(position.id)}
              className="cursor-pointer transition-all"
            >
              <rect
                x={position.x}
                y={position.y}
                width={position.width}
                height={position.height}
                fill={isOccupied ? "hsl(var(--destructive) / 0.2)" : "hsl(var(--success) / 0.2)"}
                stroke={
                  isSelected
                    ? "hsl(var(--primary))"
                    : isHovered
                    ? "hsl(var(--accent))"
                    : isOccupied
                    ? "hsl(var(--destructive))"
                    : "hsl(var(--success))"
                }
                strokeWidth={isSelected || isHovered ? "3" : "2"}
                rx="4"
                className="transition-all"
              />
              <text
                x={position.x + position.width / 2}
                y={position.y + position.height / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-xs font-semibold pointer-events-none"
                fill="hsl(var(--foreground))"
              >
                {position.position_number}
              </text>
              {isOccupied && position.tenant && (
                <text
                  x={position.x + position.width / 2}
                  y={position.y + position.height / 2 + 15}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-[10px] pointer-events-none"
                  fill="hsl(var(--muted-foreground))"
                >
                  {position.tenant}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="text-xs font-semibold mb-2">Legenda</p>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 border-success bg-success/20"></div>
            <span className="text-xs">Slobodno</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 border-destructive bg-destructive/20"></div>
            <span className="text-xs">Zauzeto</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FloorPlan;
