import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Filter, Search, Loader2 } from "lucide-react";
import FloorPlan from "@/components/FloorPlan";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";

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

  useEffect(() => {
    fetchStores();
    fetchPositions();
  }, []);

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
      const updateData: any = {
        tenant: selectedPosition.tenant,
        expiry_date: selectedPosition.expiry_date,
      };

      // Update status based on tenant
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
    <div className="flex flex-col h-[calc(100vh-4rem)] p-6 gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pozicije</h1>
        <p className="text-muted-foreground">Upravljanje dodatnim prodajnim pozicijama</p>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
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
          
          <Select value={selectedStore} onValueChange={setSelectedStore}>
            <SelectTrigger className="w-[180px]">
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

          <div className="flex gap-2">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("all")}
            >
              <Filter className="h-4 w-4 mr-2" />
              Sve
            </Button>
            <Button
              variant={filter === "occupied" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("occupied")}
            >
              Zauzeto
            </Button>
            <Button
              variant={filter === "free" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("free")}
            >
              Slobodno
            </Button>
          </div>
        </div>
      </Card>

      {/* Content */}
      <div className={`flex gap-6 flex-1 overflow-hidden ${showFloorPlan ? "" : "flex-col"}`}>
        {/* Table */}
        <Card className={`overflow-auto ${showFloorPlan ? "w-[40%]" : "w-full"}`}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Store ID</TableHead>
                <TableHead>Broj</TableHead>
                <TableHead>Format</TableHead>
                <TableHead>Tip</TableHead>
                <TableHead>Zakupac</TableHead>
                <TableHead>Datum isteka</TableHead>
                <TableHead>Odgovorna osoba</TableHead>
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
        </Card>

        {/* Floor Plan */}
        {showFloorPlan && (
          <Card className="w-[60%] p-6 overflow-auto">
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
            />
          </Card>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Uređivanje pozicije {selectedPosition?.position_number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Store ID</Label>
              <Input value={selectedPosition?.store_id || ""} disabled />
            </div>
            <div className="space-y-2">
              <Label>Format</Label>
              <Input value={selectedPosition?.format || ""} disabled />
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
            <div className="space-y-2">
              <Label>Odgovorna osoba</Label>
              <Input
                value={selectedPosition?.responsible_person || ""}
                disabled
              />
              <p className="text-sm text-muted-foreground">
                Automatski se postavlja na osnovu prijavljenog korisnika
              </p>
            </div>
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
