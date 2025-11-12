import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Filter, Search, Loader2, Download, Undo2, Redo2, Upload, Plus, History } from "lucide-react";
import FloorPlan from "@/components/FloorPlan";
import { FloorPlanEditor } from "@/components/FloorPlanEditor";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { exportPositionsToExcel } from "@/lib/exportToExcel";
import { usePositionHistory } from "@/hooks/usePositionHistory";

export type Position = {
  id: string;
  store_id: string;
  position_number: string;
  format: string;
  display_type: string;
  purpose: string | null;
  department: string | null;
  category: string | null;
  nearest_person: string | null;
  responsible_person: string | null;
  tenant: string | null;
  expiry_date: string | null;
  status: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type Store = {
  id: string;
  name: string;
};

const Positions = () => {
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();
  const [positions, setPositions] = useState<Position[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>("all");
  const [filter, setFilter] = useState<"all" | "occupied" | "free">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredPosition, setHoveredPosition] = useState<string | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [createMode, setCreateMode] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newPositionCoords, setNewPositionCoords] = useState<{ x: number; y: number } | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [detectionConfidence, setDetectionConfidence] = useState<number | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [editorMode, setEditorMode] = useState(false);
  
  const { undo, redo, canUndo, canRedo, history } = usePositionHistory(selectedStore);

  useEffect(() => {
    fetchStores();
    fetchPositions();
  }, []);

  useEffect(() => {
    if (selectedStore !== "all") {
      fetchFloorplanImage();
    } else {
      setBackgroundImage(null);
    }
  }, [selectedStore]);

  const fetchStores = async () => {
    try {
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .order("id");

      if (error) throw error;
      setStores(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Greška",
        description: "Nije moguće učitati prodavnice",
      });
    }
  };

  const fetchPositions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("positions")
        .select("*")
        .order("store_id")
        .order("position_number");

      if (error) throw error;
      setPositions(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Greška",
        description: "Nije moguće učitati pozicije",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchFloorplanImage = async () => {
    if (selectedStore === "all") return;

    try {
      const { data, error } = await supabase
        .from("floorplan_images")
        .select("*")
        .eq("store_id", selectedStore)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setBackgroundImage(data?.image_url || null);
    } catch (error: any) {
      console.error("Error fetching floorplan image:", error);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || selectedStore === "all") return;
    
    const file = e.target.files[0];
    
    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      toast({
        variant: "destructive",
        title: "Neispravan format",
        description: "Molimo koristite PNG, JPG ili SVG format",
      });
      return;
    }

    setUploadingImage(true);

    try {
      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${selectedStore}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('floorplans')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('floorplans')
        .getPublicUrl(filePath);

      // Save to database
      const { error: dbError } = await supabase
        .from('floorplan_images')
        .insert({
          store_id: selectedStore,
          image_url: publicUrl,
          uploaded_by: user?.id || '',
        });

      if (dbError) throw dbError;

      setBackgroundImage(publicUrl);
      
      // Delete existing positions before analyzing new floorplan
      const { error: deleteError } = await supabase
        .from('positions')
        .delete()
        .eq('store_id', selectedStore);

      if (deleteError) {
        console.error('Error deleting positions:', deleteError);
      }

      await analyzeFloorplan(publicUrl);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Greška",
        description: error.message || "Nije moguće učitati sliku",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const analyzeFloorplan = async (imageUrl: string) => {
    setIsAnalyzing(true);
    toast({
      title: "Analiziranje tlocrta...",
      description: "AI analizira sliku i kreira pozicije",
    });

    try {
      const { data: functionData, error: functionError } = await supabase.functions.invoke(
        'analyze-floorplan',
        {
          body: { imageUrl, storeId: selectedStore }
        }
      );

      if (functionError) {
        console.error('Error analyzing floorplan:', functionError);
        toast({
          variant: "destructive",
          title: "Upozorenje",
          description: "Slika je učitana, ali automatska analiza nije uspjela. Možete ručno kreirati pozicije.",
        });
        setDetectionConfidence(null);
      } else if (functionData?.positions && Array.isArray(functionData.positions)) {
        const confidence = functionData.overall_confidence || 75;
        setDetectionConfidence(confidence);

        // Create positions from AI analysis
        const positionsToCreate = functionData.positions.map((pos: any) => ({
          store_id: selectedStore,
          position_number: pos.position_number,
          format: pos.format || 'Displej',
          display_type: pos.display_type || 'Zidni',
          x: pos.x || 0,
          y: pos.y || 0,
          width: pos.width || 100,
          height: pos.height || 80,
          status: pos.status || 'free',
        }));

        const { error: insertError } = await supabase
          .from('positions')
          .insert(positionsToCreate);

        if (insertError) {
          console.error('Error creating positions:', insertError);
          toast({
            variant: "destructive",
            title: "Greška",
            description: "Pozicije nisu mogle biti kreirane automatski",
          });
        } else {
          toast({
            title: "Uspješno!",
            description: `${positionsToCreate.length} pozicija detektovano (${confidence}% tačnost)`,
          });
          fetchPositions();
        }
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRescan = async () => {
    if (!backgroundImage || selectedStore === "all") return;
    
    // Delete existing positions for this store
    const { error: deleteError } = await supabase
      .from('positions')
      .delete()
      .eq('store_id', selectedStore);

    if (deleteError) {
      toast({
        variant: "destructive",
        title: "Greška",
        description: "Nije moguće obrisati postojeće pozicije",
      });
      return;
    }

    await analyzeFloorplan(backgroundImage);
  };

  const handlePositionCreate = (x: number, y: number) => {
    setNewPositionCoords({ x, y });
    setCreateDialogOpen(true);
  };

  const handleCreateNewPosition = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newPositionCoords || selectedStore === "all") return;

    const formData = new FormData(e.currentTarget);
    const positionNumber = formData.get("position_number") as string;
    const format = formData.get("format") as string;
    const displayType = formData.get("display_type") as string;

    try {
      const { error } = await supabase.from("positions").insert({
        store_id: selectedStore,
        position_number: positionNumber,
        format,
        display_type: displayType,
        x: newPositionCoords.x,
        y: newPositionCoords.y,
        width: 100,
        height: 80,
        status: "free",
      });

      if (error) throw error;

      toast({
        title: "Pozicija kreirana",
        description: "Nova pozicija je uspešno kreirana",
      });

      setCreateDialogOpen(false);
      setCreateMode(false);
      setNewPositionCoords(null);
      fetchPositions();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Greška",
        description: error.message || "Nije moguće kreirati poziciju",
      });
    }
  };

  const handleExport = () => {
    const storeName = stores.find(s => s.id === selectedStore)?.name;
    exportPositionsToExcel(filteredPositions, storeName);
    toast({
      title: "Izvoz uspešan",
      description: "Excel fajl je preuzet",
    });
  };

  const handleUndo = async () => {
    const success = await undo();
    if (success) {
      fetchPositions();
    }
  };

  const handleRedo = async () => {
    const success = await redo();
    if (success) {
      fetchPositions();
    }
  };

  const filteredPositions = positions.filter((pos) => {
    if (selectedStore !== "all" && pos.store_id !== selectedStore) return false;
    if (filter !== "all" && pos.status !== filter) return false;
    if (searchQuery && !Object.values(pos).some((val) => 
      String(val).toLowerCase().includes(searchQuery.toLowerCase())
    )) return false;
    return true;
  });

  const handleUpdatePosition = async () => {
    if (!selectedPosition) return;

    try {
      // Update status based on tenant if admin is editing
      if (isAdmin) {
        const updateData = {
          ...selectedPosition,
          responsible_person: selectedPosition.tenant && selectedPosition.tenant.trim() !== "" 
            ? (selectedPosition.responsible_person || user?.email || "")
            : "",
        };

        const { error } = await supabase
          .from("positions")
          .update(updateData)
          .eq("id", selectedPosition.id);

        if (error) throw error;
      } else {
        // Non-admin can only update tenant and expiry_date
        const updateData: any = {
          tenant: selectedPosition.tenant,
          expiry_date: selectedPosition.expiry_date,
        };

        if (selectedPosition.tenant && selectedPosition.tenant.trim() !== "") {
          updateData.status = "occupied";
          updateData.responsible_person = user?.email || "";
        } else {
          updateData.status = "free";
          updateData.responsible_person = "";
        }

        const { error } = await supabase
          .from("positions")
          .update(updateData)
          .eq("id", selectedPosition.id);

        if (error) throw error;
      }

      toast({
        title: "Uspešno ažurirano",
        description: "Pozicija je uspešno ažurirana",
      });

      setEditDialogOpen(false);
      fetchPositions();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Greška",
        description: error.message || "Nije moguće ažurirati poziciju",
      });
    }
  };

  const showFloorPlan = selectedStore !== "all";

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-screen p-3 md:p-6 gap-4 md:gap-6 pt-16 md:pt-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Pozicije</h1>
        <p className="text-sm md:text-base text-muted-foreground">Upravljanje dodatnim prodajnim pozicijama</p>
      </div>

      {/* Filters and Actions */}
      <Card className="p-3 md:p-4">
        <div className="flex flex-col gap-3 md:gap-4">
          {/* Search */}
          <div className="w-full">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pretraži..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          {/* Store selector and filters */}
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Select value={selectedStore} onValueChange={setSelectedStore}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Prodavnica" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Sve prodavnice</SelectItem>
                {stores.map((store) => (
                  <SelectItem key={store.id} value={store.id}>
                    {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-2 flex-wrap">
              <Button
                variant={filter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("all")}
                className="flex-1 sm:flex-none"
              >
                <Filter className="h-4 w-4 mr-2" />
                Sve
              </Button>
              <Button
                variant={filter === "occupied" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("occupied")}
                className="flex-1 sm:flex-none"
              >
                Zauzeto
              </Button>
              <Button
                variant={filter === "free" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("free")}
                className="flex-1 sm:flex-none"
              >
                Slobodno
              </Button>
          </div>
        </div>

         {/* Admin Actions */}
        {isAdmin && (
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 pt-3 md:pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={filteredPositions.length === 0}
              className="w-full sm:w-auto"
            >
              <Download className="h-4 w-4 mr-2" />
              Excel izvoz
            </Button>
            
            {selectedStore !== "all" && (
              <>
                <Button
                  variant={editorMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => setEditorMode(!editorMode)}
                  className="w-full sm:w-auto"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {editorMode ? "Zatvori editor" : "Kreiraj nacrt"}
                </Button>

                {backgroundImage && detectionConfidence !== null && (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                    <Badge 
                      variant={detectionConfidence >= 80 ? "success" : detectionConfidence >= 60 ? "default" : "destructive"}
                      className="text-sm"
                    >
                      Tačnost: {detectionConfidence}%
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRescan}
                      disabled={isAnalyzing}
                      className="w-full sm:w-auto"
                    >
                      {isAnalyzing ? "Skeniranje..." : "Ponovo skeniraj"}
                    </Button>
                  </div>
                )}
              </>
            )}
            
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handleUndo}
                disabled={!canUndo}
                className="flex-1 sm:flex-none"
              >
                <Undo2 className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Undo</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleRedo}
                disabled={!canRedo}
                className="flex-1 sm:flex-none"
              >
                <Redo2 className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Redo</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHistoryDialogOpen(true)}
                className="flex-1 sm:flex-none"
              >
                <History className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Istorija ({history.length})</span>
                <span className="sm:hidden">({history.length})</span>
              </Button>
            </div>
          </div>
        )}
      </div>
      </Card>

      {/* Floor Plan Editor Dialog */}
      <Dialog open={editorMode && selectedStore !== "all"} onOpenChange={(open) => setEditorMode(open)}>
        <DialogContent className="max-w-[98vw] max-h-[98vh] w-full h-full p-0 overflow-hidden">
          <div className="h-full w-full">
            <FloorPlanEditor
              storeId={selectedStore}
              storeName={stores.find(s => s.id === selectedStore)?.name || ""}
              onLayoutSaved={() => {
                setEditorMode(false);
                fetchPositions();
              }}
              stores={stores}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Content */}
      {!(editorMode && selectedStore !== "all") && (
        <div className={`flex flex-col lg:flex-row gap-4 md:gap-6 flex-1 overflow-hidden`}>
          {/* Table */}
          <Card className={`overflow-auto ${showFloorPlan ? "lg:w-[40%]" : "w-full"}`}>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Status</TableHead>
                    <TableHead className="whitespace-nowrap">Store ID</TableHead>
                    <TableHead className="whitespace-nowrap">Broj</TableHead>
                    <TableHead className="whitespace-nowrap">Format</TableHead>
                    <TableHead className="whitespace-nowrap">Tip</TableHead>
                    <TableHead className="whitespace-nowrap">Zakupac</TableHead>
                    <TableHead className="whitespace-nowrap">Datum isteka</TableHead>
                    <TableHead className="whitespace-nowrap">Odgovorna osoba</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPositions.map((position) => (
                    <TableRow
                      key={position.id}
                      className="cursor-pointer transition-colors"
                      onMouseEnter={() => setHoveredPosition(position.id)}
                      onMouseLeave={() => setHoveredPosition(null)}
                      onClick={() => {
                        setSelectedPosition(position);
                        setEditDialogOpen(true);
                      }}
                    >
                      <TableCell>
                        <Badge variant={position.status === "free" ? "success" : "destructive"}>
                          {position.status === "free" ? "Slobodno" : "Zauzeto"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{position.store_id}</TableCell>
                      <TableCell>{position.position_number}</TableCell>
                      <TableCell>{position.format}</TableCell>
                      <TableCell>{position.display_type}</TableCell>
                      <TableCell>{position.tenant || "-"}</TableCell>
                      <TableCell>
                        {position.expiry_date ? format(new Date(position.expiry_date), "dd.MM.yyyy") : "-"}
                      </TableCell>
                      <TableCell>{position.responsible_person || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* Floor Plan */}
          {showFloorPlan && (
            <Card className="lg:w-[60%] p-3 md:p-6 overflow-auto min-h-[400px]">
              <FloorPlan
                positions={filteredPositions}
                hoveredPosition={hoveredPosition}
                selectedPosition={selectedPosition?.id || null}
                onPositionClick={(id) => {
                  const pos = filteredPositions.find((p) => p.id === id);
                  if (pos) {
                    setSelectedPosition(pos);
                    setEditDialogOpen(true);
                  }
                }}
                onPositionHover={setHoveredPosition}
                onPositionsUpdate={fetchPositions}
                storeId={selectedStore}
                backgroundImage={backgroundImage}
                createMode={createMode}
                onPositionCreate={handlePositionCreate}
              />
            </Card>
          )}
        </div>
      )}

      {/* Create Position Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova pozicija</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateNewPosition} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="position_number">Broj pozicije *</Label>
              <Input
                id="position_number"
                name="position_number"
                required
                placeholder="npr. A1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="format">Format *</Label>
              <Input
                id="format"
                name="format"
                required
                placeholder="npr. Gondola"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="display_type">Tip *</Label>
              <Input
                id="display_type"
                name="display_type"
                required
                placeholder="npr. Shelf"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
              >
                Otkaži
              </Button>
              <Button type="submit">Kreiraj</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Istorija promena</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nema istorije promena
              </p>
            ) : (
              history.map((entry) => {
                const position = positions.find(p => p.id === entry.position_id);
                return (
                  <Card key={entry.id} className="p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-sm">
                          {entry.action === "move" ? "Pomeranje" : 
                           entry.action === "resize" ? "Promena veličine" : 
                           entry.action}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Pozicija: {position?.position_number || "Nepoznato"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(entry.created_at), "dd.MM.yyyy HH:mm")}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {entry.action}
                      </Badge>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Uređivanje pozicije {selectedPosition?.position_number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Broj pozicije</Label>
                <Input 
                  value={selectedPosition?.position_number || ""} 
                  onChange={(e) => setSelectedPosition(prev => prev ? {...prev, position_number: e.target.value} : null)}
                  disabled={!isAdmin}
                />
              </div>
              <div className="space-y-2">
                <Label>Store ID</Label>
                <Input value={selectedPosition?.store_id || ""} disabled />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Format</Label>
                <Input 
                  value={selectedPosition?.format || ""} 
                  onChange={(e) => setSelectedPosition(prev => prev ? {...prev, format: e.target.value} : null)}
                  disabled={!isAdmin}
                  placeholder="npr. Polica 120cm"
                />
              </div>
              <div className="space-y-2">
                <Label>Tip displeja</Label>
                <Input 
                  value={selectedPosition?.display_type || ""} 
                  onChange={(e) => setSelectedPosition(prev => prev ? {...prev, display_type: e.target.value} : null)}
                  disabled={!isAdmin}
                  placeholder="npr. Zidni"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select 
                  value={selectedPosition?.status || "free"} 
                  onValueChange={(value) => setSelectedPosition(prev => prev ? {...prev, status: value} : null)}
                  disabled={!isAdmin}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Slobodno</SelectItem>
                    <SelectItem value="occupied">Zauzeto</SelectItem>
                    <SelectItem value="partially">Djelimično zauzeto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Namjena</Label>
                <Input 
                  value={selectedPosition?.purpose || ""} 
                  onChange={(e) => setSelectedPosition(prev => prev ? {...prev, purpose: e.target.value} : null)}
                  placeholder="npr. Promocija"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Odjel</Label>
                <Input 
                  value={selectedPosition?.department || ""} 
                  onChange={(e) => setSelectedPosition(prev => prev ? {...prev, department: e.target.value} : null)}
                  placeholder="npr. Hrana"
                />
              </div>
              <div className="space-y-2">
                <Label>Kategorija</Label>
                <Input 
                  value={selectedPosition?.category || ""} 
                  onChange={(e) => setSelectedPosition(prev => prev ? {...prev, category: e.target.value} : null)}
                  placeholder="npr. Sokovi"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Zakupac</Label>
              <Input
                value={selectedPosition?.tenant || ""}
                onChange={(e) =>
                  setSelectedPosition((prev) =>
                    prev ? { ...prev, tenant: e.target.value } : null
                  )
                }
                placeholder="Ime zakupca"
              />
            </div>

            <div className="space-y-2">
              <Label>Datum isteka</Label>
              <Input
                type="date"
                value={selectedPosition?.expiry_date || ""}
                onChange={(e) =>
                  setSelectedPosition((prev) =>
                    prev ? { ...prev, expiry_date: e.target.value } : null
                  )
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Najbliža osoba</Label>
                <Input 
                  value={selectedPosition?.nearest_person || ""} 
                  onChange={(e) => setSelectedPosition(prev => prev ? {...prev, nearest_person: e.target.value} : null)}
                  placeholder="Ime osobe"
                />
              </div>
              <div className="space-y-2">
                <Label>Odgovorna osoba</Label>
                <Input
                  value={selectedPosition?.responsible_person || ""}
                  onChange={(e) => setSelectedPosition(prev => prev ? {...prev, responsible_person: e.target.value} : null)}
                  disabled={!isAdmin}
                  placeholder="Automatski se postavlja"
                />
              </div>
            </div>

            {isAdmin && (
              <>
                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-3">Dimenzije i pozicija</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Pozicija X</Label>
                      <Input 
                        type="number"
                        value={selectedPosition?.x || 0} 
                        onChange={(e) => setSelectedPosition(prev => prev ? {...prev, x: Number(e.target.value)} : null)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Pozicija Y</Label>
                      <Input 
                        type="number"
                        value={selectedPosition?.y || 0} 
                        onChange={(e) => setSelectedPosition(prev => prev ? {...prev, y: Number(e.target.value)} : null)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="space-y-2">
                      <Label>Širina</Label>
                      <Input 
                        type="number"
                        value={selectedPosition?.width || 100} 
                        onChange={(e) => setSelectedPosition(prev => prev ? {...prev, width: Number(e.target.value)} : null)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Visina</Label>
                      <Input 
                        type="number"
                        value={selectedPosition?.height || 80} 
                        onChange={(e) => setSelectedPosition(prev => prev ? {...prev, height: Number(e.target.value)} : null)}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Otkaži
            </Button>
            <Button onClick={handleUpdatePosition}>Sačuvaj</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Positions;
