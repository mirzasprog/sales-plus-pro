import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { Building2, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";

const Dashboard = () => {
  // Mock data
  const occupancyData = [
    { name: "Prodavnica 001", zauzeto: 12, slobodno: 8 },
    { name: "Prodavnica 002", zauzeto: 15, slobodno: 5 },
    { name: "Prodavnica 003", zauzeto: 8, slobodno: 12 },
    { name: "Prodavnica 004", zauzeto: 18, slobodno: 2 },
    { name: "Prodavnica 005", zauzeto: 10, slobodno: 10 },
  ];

  const pieData = [
    { name: "Zauzeto", value: 63, color: "hsl(var(--destructive))" },
    { name: "Slobodno", value: 37, color: "hsl(var(--success))" },
  ];

  const trendData = [
    { month: "Jan", zauzeto: 45 },
    { month: "Feb", zauzeto: 52 },
    { month: "Mar", zauzeto: 58 },
    { month: "Apr", zauzeto: 63 },
    { month: "Maj", zauzeto: 63 },
  ];

  const stats = [
    {
      title: "Ukupno pozicija",
      value: "100",
      icon: Building2,
      color: "text-primary",
    },
    {
      title: "Zauzeto",
      value: "63",
      icon: AlertCircle,
      color: "text-destructive",
    },
    {
      title: "Slobodno",
      value: "37",
      icon: CheckCircle,
      color: "text-success",
    },
    {
      title: "Stopa zauzetosti",
      value: "63%",
      icon: TrendingUp,
      color: "text-primary",
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Pregled statistike dodatnih pozicija</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
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
              <BarChart data={occupancyData}>
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
