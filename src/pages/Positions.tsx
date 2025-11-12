import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Filter, Search } from "lucide-react";
import FloorPlan from "@/components/FloorPlan";

export type Position = {
  id: string;
  storeId: string;
  positionNumber: string;
  format: string;
  displayType: string;
  purpose: string;
  department: string;
  category: string;
  nearestPerson: string;
  responsiblePerson: string;
  tenant: string;
  expiryDate: string;
  status: "free" | "occupied";
  x: number;
  y: number;
  width: number;
  height: number;
};

const mockPositions: Position[] = [
  {
    id: "1",
    storeId: "1000001",
    positionNumber: "001",
    format: "Mali",
    displayType: "PAL",
    purpose: "N",
    department: "A",
    category: "Prehrambeni",
    nearestPerson: "Marko Marković",
    responsiblePerson: "Ana Anić",
    tenant: "Violeta doo",
    expiryDate: "31.12.2025",
    status: "occupied",
    x: 50,
    y: 50,
    width: 100,
    height: 80,
  },
  {
    id: "2",
    storeId: "1000001",
    positionNumber: "002",
    format: "Veliki",
    displayType: "BOČ",
    purpose: "P",
    department: "B",
    category: "Neprehrambeni",
    nearestPerson: "Ivan Ivić",
    responsiblePerson: "",
    tenant: "",
    expiryDate: "",
    status: "free",
    x: 200,
    y: 50,
    width: 120,
    height: 80,
  },
  {
    id: "3",
    storeId: "1000001",
    positionNumber: "003",
    format: "Srednji",
    displayType: "KOR",
    purpose: "N",
    department: "A",
    category: "Prehrambeni",
    nearestPerson: "Petra Petrić",
    responsiblePerson: "Marko Marković",
    tenant: "Delta doo",
    expiryDate: "15.06.2025",
    status: "occupied",
    x: 50,
    y: 180,
    width: 80,
    height: 60,
  },
];

const Positions = () => {
  const [positions, setPositions] = useState<Position[]>(mockPositions);
  const [selectedStore, setSelectedStore] = useState<string>("all");
  const [filter, setFilter] = useState<"all" | "occupied" | "free">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredPosition, setHoveredPosition] = useState<string | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);

  const stores = ["all", "1000001", "1000002", "1000003"];

  const filteredPositions = positions
    .filter((pos) => {
      if (selectedStore !== "all" && pos.storeId !== selectedStore) return false;
      if (filter !== "all" && pos.status !== filter) return false;
      if (searchQuery && !Object.values(pos).some((val) => 
        String(val).toLowerCase().includes(searchQuery.toLowerCase())
      )) return false;
      return true;
    });

  const showFloorPlan = selectedStore !== "all";

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
              {stores.filter(s => s !== "all").map((store) => (
                <SelectItem key={store} value={store}>Prodavnica {store}</SelectItem>
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
                  className={`cursor-pointer transition-colors ${
                    selectedPosition === position.id ? "bg-muted" : ""
                  }`}
                  onMouseEnter={() => setHoveredPosition(position.id)}
                  onMouseLeave={() => setHoveredPosition(null)}
                  onClick={() => setSelectedPosition(position.id)}
                >
                  <TableCell>
                    <Badge variant={position.status === "free" ? "success" : "destructive"}>
                      {position.status === "free" ? "Slobodno" : "Zauzeto"}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{position.storeId}</TableCell>
                  <TableCell>{position.positionNumber}</TableCell>
                  <TableCell>{position.format}</TableCell>
                  <TableCell>{position.displayType}</TableCell>
                  <TableCell>{position.tenant || "-"}</TableCell>
                  <TableCell>{position.expiryDate || "-"}</TableCell>
                  <TableCell>{position.responsiblePerson || "-"}</TableCell>
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
              selectedPosition={selectedPosition}
              onPositionClick={setSelectedPosition}
              onPositionHover={setHoveredPosition}
            />
          </Card>
        )}
      </div>
    </div>
  );
};

export default Positions;
