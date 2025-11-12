import { useEffect, useRef, useState } from "react";
import { Canvas as FabricCanvas, Line, Rect, FabricText, Circle, FabricObject } from "fabric";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Save, Trash2, Download, Copy } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface FloorPlanEditorProps {
  storeId: string;
  storeName: string;
  onLayoutSaved?: () => void;
  stores?: Array<{ id: string; name: string }>;
}

const EQUIPMENT_TYPES = [
  { id: "cooler", label: "Rashladna vitrina", color: "#60a5fa", width: 120, height: 60 },
  { id: "shelf", label: "Polica", color: "#34d399", width: 100, height: 40 },
  { id: "fridge", label: "Frižider", color: "#a78bfa", width: 80, height: 80 },
  { id: "gondola", label: "Gondola", color: "#fbbf24", width: 150, height: 50 },
  { id: "checkout", label: "Kasa", color: "#f87171", width: 90, height: 60 },
  { id: "entrance", label: "Ulaz", color: "#8b5cf6", width: 100, height: 30 },
];

export const FloorPlanEditor = ({ storeId, storeName, onLayoutSaved, stores = [] }: FloorPlanEditorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [isDrawingWall, setIsDrawingWall] = useState(false);
  const [storeWidth, setStoreWidth] = useState(800);
  const [storeHeight, setStoreHeight] = useState(600);
  const [dimensionsDialogOpen, setDimensionsDialogOpen] = useState(true);
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
  });
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [targetStoreId, setTargetStoreId] = useState<string>("");
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();

  useEffect(() => {
    if (!canvasRef.current || !isAdmin) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: storeWidth,
      height: storeHeight,
      backgroundColor: "#ffffff",
    });

    setFabricCanvas(canvas);
    loadExistingLayout();

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

    return () => {
      canvas.dispose();
    };
  }, [storeWidth, storeHeight, isAdmin]);

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
        setStoreWidth(Number(data.store_width));
        setStoreHeight(Number(data.store_height));
        
        if (data.layout_data && typeof data.layout_data === 'object') {
          const layoutData = data.layout_data as any;
          if (layoutData.objects) {
            fabricCanvas.loadFromJSON(layoutData, () => {
              fabricCanvas.renderAll();
            });
          }
        }
      }
    } catch (error) {
      console.error("Error loading layout:", error);
    }
  };

  const handleSetDimensions = () => {
    setDimensionsDialogOpen(false);
    if (fabricCanvas) {
      fabricCanvas.setWidth(storeWidth);
      fabricCanvas.setHeight(storeHeight);
      drawStoreBoundary();
    }
  };

  const drawStoreBoundary = () => {
    if (!fabricCanvas) return;

    // Draw boundary rectangle
    const boundary = new Rect({
      left: 10,
      top: 10,
      width: storeWidth - 20,
      height: storeHeight - 20,
      fill: "transparent",
      stroke: "#000000",
      strokeWidth: 3,
      selectable: false,
      evented: false,
    });

    fabricCanvas.add(boundary);
    fabricCanvas.renderAll();
  };

  const addWall = () => {
    if (!fabricCanvas) return;
    setIsDrawingWall(!isDrawingWall);

    if (!isDrawingWall) {
      toast({
        title: "Režim crtanja zida",
        description: "Klikni dvaput na canvas za kreiranje zida",
      });

      let startPoint: { x: number; y: number } | null = null;
      const handleClick = (e: any) => {
        const pointer = fabricCanvas.getPointer(e.e);

        if (!startPoint) {
          startPoint = { x: pointer.x, y: pointer.y };
        } else {
          const line = new Line([startPoint.x, startPoint.y, pointer.x, pointer.y], {
            stroke: "#1e293b",
            strokeWidth: 4,
            selectable: true,
          });
          fabricCanvas.add(line);
          startPoint = null;
        }
      };

      fabricCanvas.on("mouse:down", handleClick);
    }
  };

  const addEquipment = (type: typeof EQUIPMENT_TYPES[0]) => {
    if (!fabricCanvas) return;

    const equipment = new Rect({
      left: 100,
      top: 100,
      width: type.width,
      height: type.height,
      fill: type.color,
      stroke: "#000000",
      strokeWidth: 2,
      selectable: true,
    });

    const label = new FabricText(type.label, {
      left: 100 + type.width / 2,
      top: 100 + type.height / 2,
      fontSize: 12,
      fill: "#000000",
      originX: "center",
      originY: "center",
      selectable: false,
      evented: false,
    });

    (equipment as any).customData = { type: type.id, label: type.label };

    fabricCanvas.add(equipment);
    fabricCanvas.add(label);
    fabricCanvas.renderAll();

    // Link text to rectangle
    equipment.on("moving", () => {
      label.set({
        left: (equipment.left || 0) + type.width / 2,
        top: (equipment.top || 0) + type.height / 2,
      });
    });
  };

  const handleObjectDoubleClick = () => {
    if (selectedObject && selectedObject.type === "rect") {
      setDetailsDialogOpen(true);
    }
  };

  const saveEquipmentDetails = async () => {
    if (!selectedObject || !user) return;

    const objData = (selectedObject as any).customData || {};
    
    try {
      const { error } = await supabase.from("positions").insert({
        store_id: storeId,
        position_number: equipmentDetails.position_number,
        format: equipmentDetails.format || objData.label || "Oprema",
        display_type: equipmentDetails.display_type || "Podna",
        x: selectedObject.left || 0,
        y: selectedObject.top || 0,
        width: selectedObject.width || 100,
        height: selectedObject.height || 80,
        status: equipmentDetails.status,
        tenant: equipmentDetails.tenant,
        expiry_date: equipmentDetails.expiry_date || null,
        purpose: equipmentDetails.purpose || null,
        department: equipmentDetails.department || null,
        category: equipmentDetails.category || null,
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
      });
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

      const { error } = await supabase
        .from("floorplan_layouts")
        .upsert({
          store_id: storeId,
          layout_data: layoutData,
          store_width: storeWidth,
          store_height: storeHeight,
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

      const { error } = await supabase
        .from("floorplan_layouts")
        .insert({
          store_id: targetStoreId,
          layout_data: layoutData,
          store_width: storeWidth,
          store_height: storeHeight,
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
    if (!fabricCanvas || !selectedObject) return;
    fabricCanvas.remove(selectedObject);
    fabricCanvas.renderAll();
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
        <Button onClick={() => setDimensionsDialogOpen(true)} variant="outline" size="sm">
          Dimenzije objekta
        </Button>
        <Button onClick={addWall} variant={isDrawingWall ? "default" : "outline"} size="sm">
          Nacrtaj zid
        </Button>
        
        <div className="flex gap-1 flex-wrap">
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

        <div className="ml-auto flex gap-2">
          <Button onClick={deleteSelected} variant="outline" size="sm" disabled={!selectedObject}>
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button onClick={handleObjectDoubleClick} variant="outline" size="sm" disabled={!selectedObject}>
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
              <Label>Širina (px)</Label>
              <Input
                type="number"
                value={storeWidth}
                onChange={(e) => setStoreWidth(Number(e.target.value))}
                min={400}
                max={2000}
              />
            </div>
            <div className="space-y-2">
              <Label>Visina (px)</Label>
              <Input
                type="number"
                value={storeHeight}
                onChange={(e) => setStoreHeight(Number(e.target.value))}
                min={400}
                max={2000}
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
