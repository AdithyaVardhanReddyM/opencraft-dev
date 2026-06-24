import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PreviewChart } from "@/components/canvas/design-systems/PreviewChart";

const STATS = [
  { label: "Total Revenue", value: "$45,231.89", delta: "+20.1% from last month" },
  { label: "Subscriptions", value: "+2,350", delta: "+180.1% from last month" },
  { label: "Active Now", value: "+573", delta: "+201 since last hour" },
];

const PAYMENTS: {
  status: string;
  variant: "default" | "secondary" | "destructive";
  email: string;
  amount: string;
}[] = [
  { status: "Success", variant: "default", email: "ken99@example.com", amount: "$316.00" },
  { status: "Success", variant: "default", email: "abe45@example.com", amount: "$242.00" },
  { status: "Processing", variant: "secondary", email: "monserrat44@example.com", amount: "$837.00" },
  { status: "Failed", variant: "destructive", email: "carmella@example.com", amount: "$721.00" },
];

export function ExampleComponentsShowcase() {
  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {STATS.map((s) => (
          <Card key={s.label} className="gap-1 py-4">
            <CardHeader className="px-4">
              <CardDescription>{s.label}</CardDescription>
              <CardTitle className="text-2xl">{s.value}</CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              <p className="text-xs text-muted-foreground">{s.delta}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Form + chart */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="gap-4 py-5">
          <CardHeader className="px-5">
            <CardTitle>Create an account</CardTitle>
            <CardDescription>
              Enter your email below to create your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 px-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Email</label>
              <Input placeholder="m@example.com" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Password</label>
              <Input type="password" placeholder="Password" />
            </div>
          </CardContent>
          <CardFooter className="gap-2 px-5">
            <Button className="flex-1">Create account</Button>
            <Button variant="outline" className="flex-1">
              Cancel
            </Button>
          </CardFooter>
        </Card>

        <Card className="gap-2 py-5">
          <CardHeader className="px-5">
            <CardTitle>Visitors</CardTitle>
            <CardDescription>Desktop and mobile · last 6 months</CardDescription>
          </CardHeader>
          <CardContent className="px-5">
            <PreviewChart />
          </CardContent>
        </Card>
      </div>

      {/* Payments table */}
      <Card className="gap-3 py-5">
        <CardHeader className="px-5">
          <CardTitle>Payments</CardTitle>
          <CardDescription>Recent transactions.</CardDescription>
        </CardHeader>
        <CardContent className="px-5">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {PAYMENTS.map((p) => (
                <TableRow key={p.email}>
                  <TableCell>
                    <Badge variant={p.variant}>{p.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.email}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {p.amount}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Buttons & badges */}
      <Card className="gap-3 py-5">
        <CardHeader className="px-5">
          <CardTitle>Buttons &amp; badges</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 px-5">
          <div className="flex flex-wrap gap-2">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="destructive">Destructive</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
