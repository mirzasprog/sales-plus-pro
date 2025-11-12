import { useEffect, useRef, useState } from "react";
import { Canvas as FabricCanvas, Line, Rect, FabricText, Circle, FabricObject, ActiveSelection } from "fabric";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Save, Trash2, Copy, Undo, Redo, Type, ZoomIn, ZoomOut, Square } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface FloorPlanEditorProps {
  storeId: string;
  storeName: string;
  onLayoutSaved?: () => void;
  stores?: Array<{ id: string; name: string }>;
}

const EQUIPMENT_TYPES = [
  { id: "cooler", label: "Rashladna vitrina", color: "#60a5fa", width: 1200, height: 600 },
  { id: "shelf", label: "Polica", color: "#34d399", width: 1000, height: 400 },
  { id: "fridge", label: "Frižider", color: "#a78bfa", width: 800, height: 800 },
  { id: "gondola", label: "Gondola", color: "#fbbf24", width: 1500, height: 500 },
  { id: "checkout", label: "Kasa", color: "#f87171", width: 900, height: 600 },
  { id: "entrance", label: "Ulaz", color: "#8b5cf6", width: 1000, height: 300 },
];

const SCALE_FACTOR = 0.05; // 1mm = 0.05px for display
const GRID_SIZE_MM = 50; // Grid na svakih 50mm
const GRID_SIZE_PX = GRID_SIZE_MM * SCALE_FACTOR; // Grid u pixelima

export const FloorPlanEditor = ({ storeId, storeName, onLayoutSaved, stores = [] }: FloorPlanEditorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [isDrawingWall, setIsDrawingWall] = useState(false);
  const [activeTool, setActiveTool] = useState<"select" | "wall" | "text">("select");
  const [storeWidthMm, setStoreWidthMm] = useState(16000);
  const [storeHeightMm, setStoreHeightMm] = useState(12000);
  const [dimensionsDialogOpen, setDimensionsDialogOpen] = useState(false);
  const [isLoadingLayout, setIsLoadingLayout] = useState(true);
  const [selectedObject, setSelectedObject] = useState<FabricObject | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [equipmentDetails, setEquipmentDetails] = useState({
    position_number: "",
    format: "",
    display_type: "",
    tenant: "",
    expiry_date: "",
    status: "free" as string,
    purpose: "",
    department: "",
    category: "",
    width_mm: "",
    length_mm: "",
    height_mm: "",
    depth_mm: "",
    x_position: "",
    y_position: "",
  });
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [targetStoreId, setTargetStoreId] = useState<string>("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyStep, setHistoryStep] = useState(-1);
  const [zoom, setZoom] = useState(1);
  const wallLineRef = useRef<Line | null>(null);
  const wallStartPoint = useRef<{ x: number; y: number } | null>(null);
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();

  // Snap to grid funkcija
  const snapToGrid = (value: number) => {
    return Math.round(value / GRID_SIZE_PX) * GRID_SIZE_PX;
  };

  // Funkcija za crtanje grid-a
  const drawGrid = (canvas: FabricCanvas, width: number, height: number) => {
    const gridSize = GRID_SIZE_PX;
    
    // Crtaj vertikalne linije
    for (let i = 0; i <= width; i += gridSize) {
      const line = new Line([i, 0, i, height], {
        stroke: '#e0e0e0',
        strokeWidth: 0.5,
        selectable: false,
        evented: false,
      });
      canvas.add(line);
      canvas.sendObjectToBack(line);
    }
    
    // Crtaj horizontalne linije
    for (let i = 0; i <= height; i += gridSize) {
      const line = new Line([0, i, width, i], {
        stroke: '#e0e0e0',
        strokeWidth: 0.5,
        selectable: false,
        evented: false,
      });
      canvas.add(line);
      canvas.sendObjectToBack(line);
    }
  };

  // Check if layout exists first
  useEffect(() => {
    const checkExistingLayout = async () => {
      try {
        const { data, error } = await supabase
          .from("floorplan_layouts")
          .select("store_width, store_height")
          .eq("store_id", storeId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          // Layout exists, load dimensions
          const widthMm = Number(data.store_width) / SCALE_FACTOR;
          const heightMm = Number(data.store_height) / SCALE_FACTOR;
          setStoreWidthMm(widthMm);
          setStoreHeightMm(heightMm);
          setDimensionsDialogOpen(false);
        } else {
          // No layout, show dimensions dialog
          setDimensionsDialogOpen(true);
        }
      } catch (error) {
        console.error("Error checking layout:", error);
        setDimensionsDialogOpen(true);
      } finally {
        setIsLoadingLayout(false);
      }
    };

    checkExistingLayout();
  }, [storeId]);

  useEffect(() => {
    if (!canvasRef.current || !isAdmin || isLoadingLayout) return;

    const displayWidth = storeWidthMm * SCALE_FACTOR;
    const displayHeight = storeHeightMm * SCALE_FACTOR;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: displayWidth,
      height: displayHeight,
      backgroundColor: "#ffffff",
    });

    // Nacrtaj grid
    drawGrid(canvas, displayWidth, displayHeight);

    setFabricCanvas(canvas);
    loadExistingLayout();

    // Selection events
    canvas.on("selection:created", (e) => {
      if (e.selected && e.selected[0]) {
        setSelectedObject(e.selected[0]);
      }
    });

    canvas.on("selection:updated", (e) => {
      if (e.selected && e.selected[0]) {
        setSelectedObject(e.selected[0]);
      }
    });

    canvas.on("selection:cleared", () => {
      setSelectedObject(null);
    });

    // Mouse wheel zoom
    canvas.on("mouse:wheel", (opt) => {
      const delta = opt.e.deltaY;
      let newZoom = canvas.getZoom();
      newZoom *= 0.999 ** delta;
      if (newZoom > 5) newZoom = 5;
      if (newZoom < 0.2) newZoom = 0.2;
      const pointer = canvas.getPointer(opt.e);
      canvas.zoomToPoint(pointer, newZoom);
      setZoom(newZoom);
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });

    // Save to history after object modification
    canvas.on("object:modified", () => {
      saveHistory();
    });

    // Event listener za double click - otvara detalje
    canvas.on("mouse:dblclick", (e) => {
      if (e.target && e.target.type !== 'line') {
        const target = e.target;
        setSelectedObject(target);
        
        const objData = (target as any).customData || {};
        const currentWidth = ((target.width || 100) * (target.scaleX || 1)) / SCALE_FACTOR;
        const currentHeight = ((target.height || 80) * (target.scaleY || 1)) / SCALE_FACTOR;
        
        setEquipmentDetails({
          position_number: (target as any).position_number || "",
          format: (target as any).format || "",
          display_type: (target as any).display_type || "",
          tenant: (target as any).tenant || "",
          expiry_date: (target as any).expiry_date || "",
          status: (target as any).status || "free",
          purpose: (target as any).purpose || "",
          department: (target as any).department || "",
          category: (target as any).category || "",
          width_mm: objData.width_mm?.toString() || currentWidth.toFixed(0),
          length_mm: objData.length_mm?.toString() || currentHeight.toFixed(0),
          height_mm: (target as any).height_mm?.toString() || "",
          depth_mm: (target as any).depth_mm?.toString() || "",
          x_position: ((target.left || 0) / SCALE_FACTOR).toFixed(0),
          y_position: ((target.top || 0) / SCALE_FACTOR).toFixed(0),
        });
        setDetailsDialogOpen(true);
      }
    });

    // Event listener za snap-to-grid kada se objekat pomera
    canvas.on("object:moving", (e) => {
      const obj = e.target;
      if (obj && obj.type !== 'line') {
        obj.set({
          left: snapToGrid(obj.left || 0),
          top: snapToGrid(obj.top || 0),
        });
      }
    });

    // Event listener za snap-to-grid kada se objekat dodaje
    canvas.on("object:added", (e) => {
      const obj = e.target;
      if (obj && obj.type !== 'line') {
        obj.set({
          left: snapToGrid(obj.left || 0),
          top: snapToGrid(obj.top || 0),
        });
        canvas.renderAll();
      }
    });

    return () => {
      canvas.dispose();
    };
  }, [storeWidthMm, storeHeightMm, isAdmin, isLoadingLayout]);

  const loadExistingLayout = async () => {
    try {
      const { data, error } = await supabase
        .from("floorplan_layouts")
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data && fabricCanvas) {
        const widthMm = Number(data.store_width) / SCALE_FACTOR;
        const heightMm = Number(data.store_height) / SCALE_FACTOR;
        setStoreWidthMm(widthMm);
        setStoreHeightMm(heightMm);
        
        if (data.layout_data && typeof data.layout_data === 'object') {
          const layoutData = data.layout_data as any;
          if (layoutData.objects) {
            fabricCanvas.loadFromJSON(layoutData, () => {
              fabricCanvas.renderAll();
              saveHistory();
            });
          }
        }
      }
    } catch (error) {
      console.error("Error loading layout:", error);
    }
  };

  const saveHistory = () => {
    if (!fabricCanvas) return;
    const json = JSON.stringify(fabricCanvas.toJSON());
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push(json);
    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
  };

  const undo = () => {
    if (historyStep > 0 && fabricCanvas) {
      const prevStep = historyStep - 1;
      const prevState = history[prevStep];
      fabricCanvas.loadFromJSON(JSON.parse(prevState), () => {
        fabricCanvas.renderAll();
      });
      setHistoryStep(prevStep);
    }
  };

  const redo = () => {
    if (historyStep < history.length - 1 && fabricCanvas) {
      const nextStep = historyStep + 1;
      const nextState = history[nextStep];
      fabricCanvas.loadFromJSON(JSON.parse(nextState), () => {
        fabricCanvas.renderAll();
      });
      setHistoryStep(nextStep);
    }
  };

  const handleSetDimensions = () => {
    setDimensionsDialogOpen(false);
    if (fabricCanvas) {
      const displayWidth = storeWidthMm * SCALE_FACTOR;
      const displayHeight = storeHeightMm * SCALE_FACTOR;
      fabricCanvas.setWidth(displayWidth);
      fabricCanvas.setHeight(displayHeight);
      drawStoreBoundary();
      saveHistory();
    }
  };

  const drawStoreBoundary = () => {
    if (!fabricCanvas) return;

    const displayWidth = storeWidthMm * SCALE_FACTOR;
    const displayHeight = storeHeightMm * SCALE_FACTOR;

    const boundary = new Rect({
      left: 10,
      top: 10,
      width: displayWidth - 20,
      height: displayHeight - 20,
      fill: "transparent",
      stroke: "#000000",
      strokeWidth: 3,
      selectable: false,
      evented: false,
    });

    fabricCanvas.add(boundary);
    fabricCanvas.renderAll();
  };

  const startWallDrawing = () => {
    if (!fabricCanvas) return;
    
    setActiveTool("wall");
    fabricCanvas.isDrawingMode = false;
    fabricCanvas.selection = false;
    fabricCanvas.forEachObject((obj) => {
      obj.selectable = false;
    });

    toast({
      title: "Režim crtanja zida",
      description: "Klikni i prevuci mišem za crtanje zida",
    });

    const handleMouseDown = (opt: any) => {
      if (activeTool !== "wall") return;
      const pointer = fabricCanvas.getPointer(opt.e);
      wallStartPoint.current = { x: pointer.x, y: pointer.y };
      
      const line = new Line([pointer.x, pointer.y, pointer.x, pointer.y], {
        stroke: "#1e293b",
        strokeWidth: 4,
        selectable: false,
      });
      wallLineRef.current = line;
      fabricCanvas.add(line);
    };

    const handleMouseMove = (opt: any) => {
      if (!wallStartPoint.current || !wallLineRef.current) return;
      const pointer = fabricCanvas.getPointer(opt.e);
      wallLineRef.current.set({
        x2: pointer.x,
        y2: pointer.y,
      });
      fabricCanvas.renderAll();
    };

    const handleMouseUp = () => {
      if (wallLineRef.current) {
        wallLineRef.current.selectable = true;
        saveHistory();
      }
      wallStartPoint.current = null;
      wallLineRef.current = null;
    };

    fabricCanvas.on("mouse:down", handleMouseDown);
    fabricCanvas.on("mouse:move", handleMouseMove);
    fabricCanvas.on("mouse:up", handleMouseUp);
  };

  const stopDrawing = () => {
    if (!fabricCanvas) return;
    setActiveTool("select");
    fabricCanvas.isDrawingMode = false;
    fabricCanvas.selection = true;
    fabricCanvas.forEachObject((obj) => {
      obj.selectable = true;
    });
    fabricCanvas.off("mouse:down");
    fabricCanvas.off("mouse:move");
    fabricCanvas.off("mouse:up");
  };

  const addText = () => {
    if (!fabricCanvas) return;
    
    const text = new FabricText("Tekst", {
      left: 100,
      top: 100,
      fontSize: 20,
      fill: "#000000",
      selectable: true,
    });

    fabricCanvas.add(text);
    fabricCanvas.setActiveObject(text);
    fabricCanvas.renderAll();
    saveHistory();
  };

  const addEquipment = (type: typeof EQUIPMENT_TYPES[0]) => {
    if (!fabricCanvas) return;

    const displayWidth = type.width * SCALE_FACTOR;
    const displayHeight = type.height * SCALE_FACTOR;

    const equipment = new Rect({
      left: snapToGrid(100),
      top: snapToGrid(100),
      width: displayWidth,
      height: displayHeight,
      fill: type.color,
      stroke: "#000000",
      strokeWidth: 2,
      selectable: true,
      evented: true,
    });

    const label = new FabricText(type.label, {
      left: snapToGrid(100) + displayWidth / 2,
      top: snapToGrid(100) + displayHeight / 2,
      fontSize: 12,
      fill: "#000000",
      originX: "center",
      originY: "center",
      selectable: false,
      evented: false,
    });

    (equipment as any).customData = { 
      type: type.id, 
      label: type.label,
      width_mm: type.width,
      length_mm: type.height,
    };

    fabricCanvas.add(equipment);
    fabricCanvas.add(label);
    fabricCanvas.renderAll();
    saveHistory();

    // Link text to rectangle
    equipment.on("moving", () => {
      label.set({
        left: (equipment.left || 0) + displayWidth / 2,
        top: (equipment.top || 0) + displayHeight / 2,
      });
    });

    equipment.on("scaling", () => {
      label.set({
        left: (equipment.left || 0) + (displayWidth * (equipment.scaleX || 1)) / 2,
        top: (equipment.top || 0) + (displayHeight * (equipment.scaleY || 1)) / 2,
      });
    });
  };

  const handleOpenDetailsDialog = () => {
    if (selectedObject && selectedObject.type === "rect") {
      const objData = (selectedObject as any).customData || {};
      const currentWidth = ((selectedObject.width || 100) * (selectedObject.scaleX || 1)) / SCALE_FACTOR;
      const currentHeight = ((selectedObject.height || 80) * (selectedObject.scaleY || 1)) / SCALE_FACTOR;
      
      setEquipmentDetails({
        position_number: (selectedObject as any).position_number || "",
        format: (selectedObject as any).format || "",
        display_type: (selectedObject as any).display_type || "",
        tenant: (selectedObject as any).tenant || "",
        expiry_date: (selectedObject as any).expiry_date || "",
        status: (selectedObject as any).status || "free",
        purpose: (selectedObject as any).purpose || "",
        department: (selectedObject as any).department || "",
        category: (selectedObject as any).category || "",
        width_mm: objData.width_mm?.toString() || currentWidth.toFixed(0),
        length_mm: objData.length_mm?.toString() || currentHeight.toFixed(0),
        height_mm: (selectedObject as any).height_mm?.toString() || "",
        depth_mm: (selectedObject as any).depth_mm?.toString() || "",
        x_position: ((selectedObject.left || 0) / SCALE_FACTOR).toFixed(0),
        y_position: ((selectedObject.top || 0) / SCALE_FACTOR).toFixed(0),
      });
      setDetailsDialogOpen(true);
    }
  };

  const saveEquipmentDetails = async () => {
    if (!selectedObject || !user) return;

    const objData = (selectedObject as any).customData || {};
    
    // Sačuvaj sve atribute u objekat
    (selectedObject as any).position_number = equipmentDetails.position_number;
    (selectedObject as any).format = equipmentDetails.format;
    (selectedObject as any).display_type = equipmentDetails.display_type;
    (selectedObject as any).tenant = equipmentDetails.tenant;
    (selectedObject as any).expiry_date = equipmentDetails.expiry_date;
    (selectedObject as any).status = equipmentDetails.status;
    (selectedObject as any).purpose = equipmentDetails.purpose;
    (selectedObject as any).department = equipmentDetails.department;
    (selectedObject as any).category = equipmentDetails.category;
    (selectedObject as any).height_mm = equipmentDetails.height_mm;
    (selectedObject as any).depth_mm = equipmentDetails.depth_mm;
    
    // Update canvas object with new dimensions if provided
    if (equipmentDetails.width_mm && equipmentDetails.length_mm) {
      const newWidth = Number(equipmentDetails.width_mm) * SCALE_FACTOR;
      const newHeight = Number(equipmentDetails.length_mm) * SCALE_FACTOR;
      selectedObject.set({
        width: newWidth,
        height: newHeight,
        scaleX: 1,
        scaleY: 1,
      });
      
      // Ažuriraj customData
      if (!(selectedObject as any).customData) {
        (selectedObject as any).customData = {};
      }
      (selectedObject as any).customData.width_mm = Number(equipmentDetails.width_mm);
      (selectedObject as any).customData.length_mm = Number(equipmentDetails.length_mm);
      
      fabricCanvas?.renderAll();
    }

    if (equipmentDetails.x_position && equipmentDetails.y_position) {
      selectedObject.set({
        left: snapToGrid(Number(equipmentDetails.x_position) * SCALE_FACTOR),
        top: snapToGrid(Number(equipmentDetails.y_position) * SCALE_FACTOR),
      });
      fabricCanvas?.renderAll();
    }
    
    try {
      const { error } = await supabase.from("positions").upsert({
        store_id: storeId,
        position_number: equipmentDetails.position_number,
        format: equipmentDetails.format || objData.label || "Oprema",
        display_type: equipmentDetails.display_type || "Podna",
        x: (selectedObject.left || 0) / SCALE_FACTOR,
        y: (selectedObject.top || 0) / SCALE_FACTOR,
        width: ((selectedObject.width || 100) * (selectedObject.scaleX || 1)) / SCALE_FACTOR,
        height: ((selectedObject.height || 80) * (selectedObject.scaleY || 1)) / SCALE_FACTOR,
        status: equipmentDetails.status,
        tenant: equipmentDetails.tenant,
        expiry_date: equipmentDetails.expiry_date || null,
        purpose: equipmentDetails.purpose || null,
        department: equipmentDetails.department || null,
        category: equipmentDetails.category || null,
      }, {
        onConflict: "store_id,position_number"
      });

      if (error) throw error;

      toast({
        title: "Detalji sačuvani",
        description: "Pozicija je uspešno kreirana",
      });

      setDetailsDialogOpen(false);
      setEquipmentDetails({
        position_number: "",
        format: "",
        display_type: "",
        tenant: "",
        expiry_date: "",
        status: "free",
        purpose: "",
        department: "",
        category: "",
        width_mm: "",
        length_mm: "",
        height_mm: "",
        depth_mm: "",
        x_position: "",
        y_position: "",
      });
      saveHistory();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Greška",
        description: error.message,
      });
    }
  };

  const handleSaveLayout = async () => {
    if (!fabricCanvas || !user) return;

    try {
      const layoutData = fabricCanvas.toJSON();
      const displayWidth = storeWidthMm * SCALE_FACTOR;
      const displayHeight = storeHeightMm * SCALE_FACTOR;

      const { error } = await supabase
        .from("floorplan_layouts")
        .upsert({
          store_id: storeId,
          layout_data: layoutData,
          store_width: displayWidth,
          store_height: displayHeight,
          created_by: user.id,
        });

      if (error) throw error;

      toast({
        title: "Layout sačuvan",
        description: "Floor plan je uspešno sačuvan",
      });

      onLayoutSaved?.();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Greška",
        description: error.message,
      });
    }
  };

  const handleCopyLayout = () => {
    if (stores.length === 0) {
      toast({
        variant: "destructive",
        title: "Greška",
        description: "Nema dostupnih prodavnica za kopiranje",
      });
      return;
    }
    setCopyDialogOpen(true);
  };

  const executeCopyLayout = async () => {
    if (!fabricCanvas || !user || !targetStoreId) return;

    try {
      const layoutData = fabricCanvas.toJSON();
      const displayWidth = storeWidthMm * SCALE_FACTOR;
      const displayHeight = storeHeightMm * SCALE_FACTOR;

      const { error } = await supabase
        .from("floorplan_layouts")
        .insert({
          store_id: targetStoreId,
          layout_data: layoutData,
          store_width: displayWidth,
          store_height: displayHeight,
          created_by: user.id,
        });

      if (error) throw error;

      toast({
        title: "Layout kopiran",
        description: `Floor plan je kopiran u ${stores.find(s => s.id === targetStoreId)?.name}`,
      });

      setCopyDialogOpen(false);
      setTargetStoreId("");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Greška",
        description: error.message,
      });
    }
  };

  const deleteSelected = () => {
    if (!fabricCanvas) return;
    const activeObjects = fabricCanvas.getActiveObjects();
    if (activeObjects.length > 0) {
      activeObjects.forEach((obj) => fabricCanvas.remove(obj));
      fabricCanvas.discardActiveObject();
      fabricCanvas.renderAll();
      saveHistory();
    }
  };

  const selectAll = () => {
    if (!fabricCanvas) return;
    const allObjects = fabricCanvas.getObjects().filter((obj) => obj.selectable !== false);
    if (allObjects.length > 0) {
      const selection = new ActiveSelection(allObjects, { canvas: fabricCanvas });
      fabricCanvas.setActiveObject(selection);
      fabricCanvas.renderAll();
    }
  };

  const handleZoomIn = () => {
    if (!fabricCanvas) return;
    const newZoom = Math.min(zoom * 1.2, 5);
    fabricCanvas.setZoom(newZoom);
    setZoom(newZoom);
  };

  const handleZoomOut = () => {
    if (!fabricCanvas) return;
    const newZoom = Math.max(zoom / 1.2, 0.2);
    fabricCanvas.setZoom(newZoom);
    setZoom(newZoom);
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Samo administratori mogu uređivati floor plan</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full p-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 p-4 bg-card border rounded-lg">
        <div className="flex gap-2 items-center border-r pr-2">
          <Button onClick={() => setDimensionsDialogOpen(true)} variant="outline" size="sm">
            Dimenzije
          </Button>
          <Button onClick={undo} variant="outline" size="sm" disabled={historyStep <= 0}>
            <Undo className="h-4 w-4" />
          </Button>
          <Button onClick={redo} variant="outline" size="sm" disabled={historyStep >= history.length - 1}>
            <Redo className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex gap-2 items-center border-r pr-2">
          <Button 
            onClick={activeTool === "wall" ? stopDrawing : startWallDrawing} 
            variant={activeTool === "wall" ? "default" : "outline"} 
            size="sm"
          >
            <Square className="h-4 w-4 mr-1" />
            Zid
          </Button>
          <Button onClick={addText} variant="outline" size="sm">
            <Type className="h-4 w-4 mr-1" />
            Tekst
          </Button>
        </div>
        
        <div className="flex gap-1 flex-wrap border-r pr-2">
          {EQUIPMENT_TYPES.map((type) => (
            <Button
              key={type.id}
              onClick={() => addEquipment(type)}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              {type.label}
            </Button>
          ))}
        </div>

        <div className="flex gap-2 items-center border-r pr-2">
          <Button onClick={handleZoomOut} variant="outline" size="sm">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">{(zoom * 100).toFixed(0)}%</span>
          <Button onClick={handleZoomIn} variant="outline" size="sm">
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>

        <div className="ml-auto flex gap-2">
          <Button onClick={selectAll} variant="outline" size="sm">
            Označi sve
          </Button>
          <Button onClick={deleteSelected} variant="outline" size="sm" disabled={!selectedObject}>
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button onClick={handleOpenDetailsDialog} variant="outline" size="sm" disabled={!selectedObject}>
            Detalji
          </Button>
          <Button onClick={handleCopyLayout} variant="outline" size="sm">
            <Copy className="h-4 w-4 mr-2" />
            Kopiraj
          </Button>
          <Button onClick={handleSaveLayout} variant="default" size="sm">
            <Save className="h-4 w-4 mr-2" />
            Sačuvaj
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-auto border rounded-lg bg-muted/20 p-4">
        <canvas ref={canvasRef} className="border border-border shadow-lg" />
      </div>

      {/* Dimensions Dialog */}
      <Dialog open={dimensionsDialogOpen} onOpenChange={setDimensionsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dimenzije objekta - {storeName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Širina objekta (mm)</Label>
              <Input
                type="number"
                value={storeWidthMm}
                onChange={(e) => setStoreWidthMm(Number(e.target.value))}
                min={1000}
                max={50000}
              />
            </div>
            <div className="space-y-2">
              <Label>Dužina objekta (mm)</Label>
              <Input
                type="number"
                value={storeHeightMm}
                onChange={(e) => setStoreHeightMm(Number(e.target.value))}
                min={1000}
                max={50000}
              />
            </div>
            <Button onClick={handleSetDimensions} className="w-full">
              Postavi dimenzije
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Equipment Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalji pozicije</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Broj pozicije *</Label>
                <Input
                  value={equipmentDetails.position_number}
                  onChange={(e) => setEquipmentDetails({ ...equipmentDetails, position_number: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Format</Label>
                <Input
                  value={equipmentDetails.format}
                  onChange={(e) => setEquipmentDetails({ ...equipmentDetails, format: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Širina (mm)</Label>
                <Input
                  type="number"
                  value={equipmentDetails.width_mm}
                  onChange={(e) => setEquipmentDetails({ ...equipmentDetails, width_mm: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Dužina (mm)</Label>
                <Input
                  type="number"
                  value={equipmentDetails.length_mm}
                  onChange={(e) => setEquipmentDetails({ ...equipmentDetails, length_mm: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Visina (mm)</Label>
                <Input
                  type="number"
                  value={equipmentDetails.height_mm}
                  onChange={(e) => setEquipmentDetails({ ...equipmentDetails, height_mm: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Dubina (mm)</Label>
                <Input
                  type="number"
                  value={equipmentDetails.depth_mm}
                  onChange={(e) => setEquipmentDetails({ ...equipmentDetails, depth_mm: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>X Pozicija (mm)</Label>
                <Input
                  type="number"
                  value={equipmentDetails.x_position}
                  onChange={(e) => setEquipmentDetails({ ...equipmentDetails, x_position: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Y Pozicija (mm)</Label>
                <Input
                  type="number"
                  value={equipmentDetails.y_position}
                  onChange={(e) => setEquipmentDetails({ ...equipmentDetails, y_position: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tip displeja</Label>
                <Input
                  value={equipmentDetails.display_type}
                  onChange={(e) => setEquipmentDetails({ ...equipmentDetails, display_type: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={equipmentDetails.status}
                  onValueChange={(value) => setEquipmentDetails({ ...equipmentDetails, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Slobodno</SelectItem>
                    <SelectItem value="occupied">Zauzeto</SelectItem>
                    <SelectItem value="partially">Djelimično</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Zakupac</Label>
              <Input
                value={equipmentDetails.tenant}
                onChange={(e) => setEquipmentDetails({ ...equipmentDetails, tenant: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Datum isteka</Label>
              <Input
                type="date"
                value={equipmentDetails.expiry_date}
                onChange={(e) => setEquipmentDetails({ ...equipmentDetails, expiry_date: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Namjena</Label>
                <Input
                  value={equipmentDetails.purpose}
                  onChange={(e) => setEquipmentDetails({ ...equipmentDetails, purpose: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Odjel</Label>
                <Input
                  value={equipmentDetails.department}
                  onChange={(e) => setEquipmentDetails({ ...equipmentDetails, department: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Kategorija</Label>
              <Input
                value={equipmentDetails.category}
                onChange={(e) => setEquipmentDetails({ ...equipmentDetails, category: e.target.value })}
              />
            </div>

            <Button onClick={saveEquipmentDetails} className="w-full">
              Sačuvaj detalje
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Copy Layout Dialog */}
      <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kopiraj layout u drugu prodavnicu</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Odaberi prodavnicu</Label>
              <Select value={targetStoreId} onValueChange={setTargetStoreId}>
                <SelectTrigger>
                  <SelectValue placeholder="Odaberi prodavnicu" />
                </SelectTrigger>
                <SelectContent>
                  {stores.filter(s => s.id !== storeId).map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={executeCopyLayout} className="w-full" disabled={!targetStoreId}>
              Kopiraj layout
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
