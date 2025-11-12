import { useState, useRef, useEffect } from "react";
import { Position } from "@/pages/Positions";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface FloorPlanProps {
  positions: Position[];
  hoveredPosition: string | null;
  selectedPosition: string | null;
  onPositionClick: (id: string) => void;
  onPositionHover: (id: string | null) => void;
  onPositionsUpdate: () => void;
  storeId: string;
  backgroundImage?: string | null;
  createMode?: boolean;
  onPositionCreate?: (x: number, y: number) => void;
  onHistoryChange?: (oldData: any, newData: any, positionId: string) => void;
}

const FloorPlan = ({
  positions,
  hoveredPosition,
  selectedPosition,
  onPositionClick,
  onPositionHover,
  onPositionsUpdate,
  storeId,
  backgroundImage,
  createMode = false,
  onPositionCreate,
  onHistoryChange,
}: FloorPlanProps) => {
  const { toast } = useToast();
  const { isAdmin, user } = useAuth();
  const [draggingPosition, setDraggingPosition] = useState<string | null>(null);
  const [resizingPosition, setResizingPosition] = useState<string | null>(null);
  const [resizeHandle, setResizeHandle] = useState<"se" | "sw" | "ne" | "nw" | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [originalSize, setOriginalSize] = useState<{ width: number; height: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const getSvgCoordinates = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const svg = svgRef.current;
    const point = svg.createSVGPoint();
    point.x = e.clientX;
    point.y = e.clientY;
    const svgPoint = point.matrixTransform(svg.getScreenCTM()?.inverse());
    return { x: svgPoint.x, y: svgPoint.y };
  };

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>, positionId: string, type: "drag" | "resize", handle?: "se" | "sw" | "ne" | "nw") => {
    if (!isAdmin) return;
    e.stopPropagation();
    
    const coords = getSvgCoordinates(e);
    setDragStart(coords);

    if (type === "drag") {
      setDraggingPosition(positionId);
    } else {
      setResizingPosition(positionId);
      setResizeHandle(handle || "se");
      const position = positions.find((p) => p.id === positionId);
      if (position) {
        setOriginalSize({ width: Number(position.width), height: Number(position.height) });
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isAdmin || (!draggingPosition && !resizingPosition) || !dragStart) return;

    const coords = getSvgCoordinates(e);
    const dx = coords.x - dragStart.x;
    const dy = coords.y - dragStart.y;

    if (draggingPosition) {
      const position = positions.find((p) => p.id === draggingPosition);
      if (position) {
        const newX = Math.max(20, Math.min(780 - Number(position.width), Number(position.x) + dx));
        const newY = Math.max(20, Math.min(580 - Number(position.height), Number(position.y) + dy));
        
        // Update position temporarily in DOM
        const rect = document.querySelector(`[data-position-id="${draggingPosition}"]`);
        if (rect) {
          rect.setAttribute("x", newX.toString());
          rect.setAttribute("y", newY.toString());
        }
        const text = document.querySelector(`[data-position-text="${draggingPosition}"]`);
        if (text) {
          text.setAttribute("x", (newX + Number(position.width) / 2).toString());
          text.setAttribute("y", (newY + Number(position.height) / 2).toString());
        }
      }
    } else if (resizingPosition && originalSize) {
      const position = positions.find((p) => p.id === resizingPosition);
      if (position) {
        let newWidth = originalSize.width;
        let newHeight = originalSize.height;
        let newX = Number(position.x);
        let newY = Number(position.y);

        if (resizeHandle === "se") {
          newWidth = Math.max(50, originalSize.width + dx);
          newHeight = Math.max(40, originalSize.height + dy);
        } else if (resizeHandle === "sw") {
          newWidth = Math.max(50, originalSize.width - dx);
          newHeight = Math.max(40, originalSize.height + dy);
          newX = Number(position.x) + dx;
        } else if (resizeHandle === "ne") {
          newWidth = Math.max(50, originalSize.width + dx);
          newHeight = Math.max(40, originalSize.height - dy);
          newY = Number(position.y) + dy;
        } else if (resizeHandle === "nw") {
          newWidth = Math.max(50, originalSize.width - dx);
          newHeight = Math.max(40, originalSize.height - dy);
          newX = Number(position.x) + dx;
          newY = Number(position.y) + dy;
        }

        const rect = document.querySelector(`[data-position-id="${resizingPosition}"]`);
        if (rect) {
          rect.setAttribute("x", newX.toString());
          rect.setAttribute("y", newY.toString());
          rect.setAttribute("width", newWidth.toString());
          rect.setAttribute("height", newHeight.toString());
        }
        const text = document.querySelector(`[data-position-text="${resizingPosition}"]`);
        if (text) {
          text.setAttribute("x", (newX + newWidth / 2).toString());
          text.setAttribute("y", (newY + newHeight / 2).toString());
        }
      }
    }
  };

  const handleMouseUp = async (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isAdmin || (!draggingPosition && !resizingPosition) || !dragStart) return;

    const coords = getSvgCoordinates(e);
    const dx = coords.x - dragStart.x;
    const dy = coords.y - dragStart.y;

    try {
      if (draggingPosition) {
        const position = positions.find((p) => p.id === draggingPosition);
        if (position && (Math.abs(dx) > 1 || Math.abs(dy) > 1)) {
          const newX = Math.max(20, Math.min(780 - Number(position.width), Number(position.x) + dx));
          const newY = Math.max(20, Math.min(580 - Number(position.height), Number(position.y) + dy));

          // Save to history
          if (onHistoryChange && user) {
            await supabase.from("position_history").insert({
              position_id: draggingPosition,
              user_id: user.id,
              action: "move",
              old_data: { x: position.x, y: position.y },
              new_data: { x: newX, y: newY },
            });
          }

          const { error } = await supabase
            .from("positions")
            .update({ x: newX, y: newY })
            .eq("id", draggingPosition);

          if (error) throw error;

          toast({
            title: "Pozicija ažurirana",
            description: "Nova pozicija je spremljena",
          });
          onPositionsUpdate();
        }
      } else if (resizingPosition && originalSize) {
        const position = positions.find((p) => p.id === resizingPosition);
        if (position && (Math.abs(dx) > 1 || Math.abs(dy) > 1)) {
          let newWidth = originalSize.width;
          let newHeight = originalSize.height;
          let newX = Number(position.x);
          let newY = Number(position.y);

          if (resizeHandle === "se") {
            newWidth = Math.max(50, originalSize.width + dx);
            newHeight = Math.max(40, originalSize.height + dy);
          } else if (resizeHandle === "sw") {
            newWidth = Math.max(50, originalSize.width - dx);
            newHeight = Math.max(40, originalSize.height + dy);
            newX = Number(position.x) + dx;
          } else if (resizeHandle === "ne") {
            newWidth = Math.max(50, originalSize.width + dx);
            newHeight = Math.max(40, originalSize.height - dy);
            newY = Number(position.y) + dy;
          } else if (resizeHandle === "nw") {
            newWidth = Math.max(50, originalSize.width - dx);
            newHeight = Math.max(40, originalSize.height - dy);
            newX = Number(position.x) + dx;
            newY = Number(position.y) + dy;
          }

          // Save to history
          if (onHistoryChange && user) {
            await supabase.from("position_history").insert({
              position_id: resizingPosition,
              user_id: user.id,
              action: "resize",
              old_data: { x: position.x, y: position.y, width: position.width, height: position.height },
              new_data: { x: newX, y: newY, width: newWidth, height: newHeight },
            });
          }

          const { error } = await supabase
            .from("positions")
            .update({ 
              x: newX, 
              y: newY,
              width: newWidth, 
              height: newHeight 
            })
            .eq("id", resizingPosition);

          if (error) throw error;

          toast({
            title: "Dimenzije ažurirane",
            description: "Nova veličina pozicije je spremljena",
          });
          onPositionsUpdate();
        }
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Greška",
        description: error.message || "Nije moguće ažurirati poziciju",
      });
    } finally {
      setDraggingPosition(null);
      setResizingPosition(null);
      setDragStart(null);
      setOriginalSize(null);
      setResizeHandle(null);
    }
  };

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isAdmin || !createMode || !onPositionCreate) return;
    if (draggingPosition || resizingPosition) return;

    const coords = getSvgCoordinates(e);
    
    // Check if clicked on existing position
    const target = e.target as SVGElement;
    if (target.hasAttribute('data-position-id')) return;

    onPositionCreate(coords.x, coords.y);
  };

  return (
    <div className="relative w-full h-full min-h-[400px] md:min-h-[500px] bg-muted/20 rounded-lg overflow-hidden">
      {isAdmin && !createMode && (
        <div className="absolute top-2 left-2 md:top-4 md:left-4 z-10 bg-primary/90 text-primary-foreground px-2 py-1 md:px-4 md:py-2 rounded-lg shadow-lg animate-fade-in">
          <p className="text-xs md:text-sm font-semibold">🎯 Admin režim</p>
          <p className="text-[10px] md:text-xs opacity-90 hidden sm:block">Prevuci pozicije ili promeni veličinu</p>
        </div>
      )}
      {isAdmin && createMode && (
        <div className="absolute top-2 left-2 md:top-4 md:left-4 z-10 bg-accent/90 text-accent-foreground px-2 py-1 md:px-4 md:py-2 rounded-lg shadow-lg animate-fade-in">
          <p className="text-xs md:text-sm font-semibold">➕ Režim kreiranja</p>
          <p className="text-[10px] md:text-xs opacity-90 hidden sm:block">Klikni na plan za kreiranje nove pozicije</p>
        </div>
      )}
      <svg 
        ref={svgRef}
        width="100%" 
        height="100%" 
        viewBox="0 0 800 600" 
        className={cn(
          "border border-border rounded-lg",
          createMode && "cursor-crosshair"
        )}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleSvgClick}
      >
        {/* Floor plan background */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="hsl(var(--border))" strokeWidth="0.5" />
          </pattern>
        </defs>
        {backgroundImage ? (
          <image
            href={backgroundImage}
            x="0"
            y="0"
            width="800"
            height="600"
            preserveAspectRatio="xMidYMid slice"
            opacity="0.3"
          />
        ) : (
          <rect width="800" height="600" fill="url(#grid)" />
        )}
        
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
          const isDragging = draggingPosition === position.id;
          const isResizing = resizingPosition === position.id;

          return (
            <g key={position.id}>
              <rect
                data-position-id={position.id}
                x={position.x}
                y={position.y}
                width={position.width}
                height={position.height}
                fill={isOccupied ? "hsl(var(--destructive) / 0.2)" : "hsl(var(--success) / 0.2)"}
                stroke={
                  isSelected
                    ? "hsl(var(--primary))"
                    : isHovered || isDragging
                    ? "hsl(var(--accent))"
                    : isOccupied
                    ? "hsl(var(--destructive))"
                    : "hsl(var(--success))"
                }
                strokeWidth={isSelected || isHovered || isDragging ? "3" : "2"}
                rx="4"
                className={cn(
                  "transition-all",
                  isAdmin && "cursor-move",
                  isDragging && "opacity-70"
                )}
                onMouseEnter={() => !isDragging && !isResizing && onPositionHover(position.id)}
                onMouseLeave={() => !isDragging && !isResizing && onPositionHover(null)}
                onClick={(e) => {
                  if (!isDragging && !isResizing) {
                    e.stopPropagation();
                    onPositionClick(position.id);
                  }
                }}
                onMouseDown={(e) => isAdmin && handleMouseDown(e as any, position.id, "drag")}
              />
              <text
                data-position-text={position.id}
                x={Number(position.x) + Number(position.width) / 2}
                y={Number(position.y) + Number(position.height) / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-xs font-semibold pointer-events-none"
                fill="hsl(var(--foreground))"
              >
                {position.position_number}
              </text>
              {isOccupied && position.tenant && (
                <text
                  x={Number(position.x) + Number(position.width) / 2}
                  y={Number(position.y) + Number(position.height) / 2 + 15}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-[10px] pointer-events-none"
                  fill="hsl(var(--muted-foreground))"
                >
                  {position.tenant}
                </text>
              )}
              
              {/* Resize handles for admin */}
              {isAdmin && (isSelected || isHovered) && !isDragging && (
                <>
                  {/* SE handle */}
                  <circle
                    cx={Number(position.x) + Number(position.width)}
                    cy={Number(position.y) + Number(position.height)}
                    r="6"
                    fill="hsl(var(--primary))"
                    stroke="hsl(var(--background))"
                    strokeWidth="2"
                    className="cursor-se-resize hover:scale-125 transition-transform"
                    onMouseDown={(e) => handleMouseDown(e as any, position.id, "resize", "se")}
                  />
                  {/* SW handle */}
                  <circle
                    cx={Number(position.x)}
                    cy={Number(position.y) + Number(position.height)}
                    r="6"
                    fill="hsl(var(--primary))"
                    stroke="hsl(var(--background))"
                    strokeWidth="2"
                    className="cursor-sw-resize hover:scale-125 transition-transform"
                    onMouseDown={(e) => handleMouseDown(e as any, position.id, "resize", "sw")}
                  />
                  {/* NE handle */}
                  <circle
                    cx={Number(position.x) + Number(position.width)}
                    cy={Number(position.y)}
                    r="6"
                    fill="hsl(var(--primary))"
                    stroke="hsl(var(--background))"
                    strokeWidth="2"
                    className="cursor-ne-resize hover:scale-125 transition-transform"
                    onMouseDown={(e) => handleMouseDown(e as any, position.id, "resize", "ne")}
                  />
                  {/* NW handle */}
                  <circle
                    cx={Number(position.x)}
                    cy={Number(position.y)}
                    r="6"
                    fill="hsl(var(--primary))"
                    stroke="hsl(var(--background))"
                    strokeWidth="2"
                    className="cursor-nw-resize hover:scale-125 transition-transform"
                    onMouseDown={(e) => handleMouseDown(e as any, position.id, "resize", "nw")}
                  />
                </>
              )}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="absolute bottom-2 right-2 md:bottom-4 md:right-4 bg-card border border-border rounded-lg p-2 md:p-3 shadow-lg">
        <p className="text-[10px] md:text-xs font-semibold mb-1 md:mb-2">Legenda</p>
        <div className="space-y-1 md:space-y-1.5">
          <div className="flex items-center gap-1.5 md:gap-2">
            <div className="w-3 h-3 md:w-4 md:h-4 rounded border-2 border-success bg-success/20"></div>
            <span className="text-[10px] md:text-xs">Slobodno</span>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2">
            <div className="w-3 h-3 md:w-4 md:h-4 rounded border-2 border-destructive bg-destructive/20"></div>
            <span className="text-[10px] md:text-xs">Zauzeto</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FloorPlan;
