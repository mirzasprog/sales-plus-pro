import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Bell, Mail, Users, Building2 } from "lucide-react";

const Settings = () => {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Postavke</h1>
        <p className="text-muted-foreground">Upravljajte postavkama aplikacije</p>
      </div>

      <div className="grid gap-6">
        {/* Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <CardTitle>Obavještenja</CardTitle>
            </div>
            <CardDescription>Konfigurišite email obavještenja za istek pozicija</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email obavještenja</Label>
                <p className="text-sm text-muted-foreground">
                  Primajte obavještenja o isteku pozicija
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="days-before">Broj dana prije isteka</Label>
              <Input
                id="days-before"
                type="number"
                defaultValue="3"
                className="w-32"
              />
              <p className="text-sm text-muted-foreground">
                Aplikacija će slati email obavještenja ovaj broj dana prije isteka
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Email Configuration */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              <CardTitle>Email konfiguracija</CardTitle>
            </div>
            <CardDescription>SMTP postavke za slanje emailova</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="smtp-host">SMTP Host</Label>
                <Input id="smtp-host" placeholder="smtp.example.com" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp-port">Port</Label>
                  <Input id="smtp-port" placeholder="587" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-secure">Enkripcija</Label>
                  <Input id="smtp-secure" placeholder="TLS" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp-user">Korisničko ime</Label>
                <Input id="smtp-user" placeholder="user@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp-pass">Lozinka</Label>
                <Input id="smtp-pass" type="password" placeholder="••••••••" />
              </div>
            </div>
            <Button>Sačuvaj konfiguraciju</Button>
          </CardContent>
        </Card>

        {/* User Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle>Upravljanje korisnicima</CardTitle>
            </div>
            <CardDescription>Dodajte ili uklonite korisnike sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-4">
                <Input placeholder="Email adresa novog korisnika" className="flex-1" />
                <Button>Dodaj korisnika</Button>
              </div>
              <Separator />
              <div className="space-y-2">
                <p className="text-sm font-medium">Postojeći korisnici</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">admin@example.com</p>
                      <p className="text-sm text-muted-foreground">Administrator</p>
                    </div>
                    <Button variant="outline" size="sm">Uredi</Button>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">korisnik@example.com</p>
                      <p className="text-sm text-muted-foreground">Korisnik</p>
                    </div>
                    <Button variant="outline" size="sm">Uredi</Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Store Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <CardTitle>Upravljanje prodavnicama</CardTitle>
            </div>
            <CardDescription>Dodajte ili uređujte prodavnice</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-4">
                <Input placeholder="ID prodavnice" className="w-32" />
                <Input placeholder="Naziv prodavnice" className="flex-1" />
                <Button>Dodaj</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
