import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { Building2, TrendingUp, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Dashboard = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    occupied: 0,
    free: 0,
    occupancyRate: 0,
  });
  const [storeData, setStoreData] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch all positions
      const { data: positions, error } = await supabase
        .from("positions")
        .select("store_id, status");

      if (error) throw error;

      // Calculate stats
      const total = positions?.length || 0;
      const occupied = positions?.filter((p) => p.status === "occupied").length || 0;
      const free = total - occupied;
      const occupancyRate = total > 0 ? Math.round((occupied / total) * 100) : 0;

      setStats({ total, occupied, free, occupancyRate });

      // Group by store
      const storeGroups = positions?.reduce((acc: any, pos) => {
        if (!acc[pos.store_id]) {
          acc[pos.store_id] = { zauzeto: 0, slobodno: 0 };
        }
        if (pos.status === "occupied") {
          acc[pos.store_id].zauzeto++;
        } else {
          acc[pos.store_id].slobodno++;
        }
        return acc;
      }, {});

      const storeChartData = Object.entries(storeGroups || {}).map(([id, data]: [string, any]) => ({
        name: `Prodavnica ${id}`,
        zauzeto: data.zauzeto,
        slobodno: data.slobodno,
      }));

      setStoreData(storeChartData);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Greška",
        description: "Nije moguće učitati podatke",
      });
    } finally {
      setLoading(false);
    }
  };

  const pieData = [
    { name: "Zauzeto", value: stats.occupied, color: "hsl(var(--destructive))" },
    { name: "Slobodno", value: stats.free, color: "hsl(var(--success))" },
  ];

  const trendData = [
    { month: "Jan", zauzeto: 45 },
    { month: "Feb", zauzeto: 52 },
    { month: "Mar", zauzeto: 58 },
    { month: "Apr", zauzeto: stats.occupied },
    { month: "Maj", zauzeto: stats.occupied },
  ];

  const statsCards = [
    {
      title: "Ukupno pozicija",
      value: stats.total.toString(),
      icon: Building2,
      color: "text-primary",
    },
    {
      title: "Zauzeto",
      value: stats.occupied.toString(),
      icon: AlertCircle,
      color: "text-destructive",
    },
    {
      title: "Slobodno",
      value: stats.free.toString(),
      icon: CheckCircle,
      color: "text-success",
    },
    {
      title: "Stopa zauzetosti",
      value: `${stats.occupancyRate}%`,
      icon: TrendingUp,
      color: "text-primary",
    },
  ];

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Pregled statistike dodatnih pozicija</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Zauzetost po prodavnicama</CardTitle>
            <CardDescription>Broj zauzetih i slobodnih pozicija</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={storeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="zauzeto" fill="hsl(var(--destructive))" />
                <Bar dataKey="slobodno" fill="hsl(var(--success))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ukupna zauzetost</CardTitle>
            <CardDescription>Pregled svih pozicija</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Trend zauzetosti</CardTitle>
            <CardDescription>Pregled zauzetosti u proteklih 5 meseci</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="zauzeto" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
