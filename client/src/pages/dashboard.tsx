import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  Calendar
} from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import type { Complaint, DashboardStats } from "@shared/schema";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const statusColors: Record<string, string> = {
  New: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "Under Review": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  Transferred: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  "Pending Customer": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  Resolved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  Closed: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
  Rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

const severityColors: Record<string, string> = {
  Normal: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  Medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  High: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  Urgent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const CHART_COLORS = [
  "#0066CC",
  "#0099FF",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
];

function StatCard({
  title,
  value,
  icon: Icon,
  gradient,
  subtitle,
}: {
  title: string;
  value: number | string;
  icon: typeof FileText;
  gradient: string;
  subtitle?: string;
}) {
  return (
    <Card className="hover-elevate overflow-visible transition-all duration-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground truncate">{title}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <div
            className={`flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center ${gradient}`}
          >
            <Icon className="w-7 h-7 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RecentComplaintRow({ complaint }: { complaint: Complaint }) {
  const date = new Date(complaint.createdAt);
  const formattedDate = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Link
      href={`/complaints/${complaint.id}`}
      className="flex items-center gap-4 p-4 hover-elevate rounded-lg transition-all duration-200 cursor-pointer"
      data-testid={`link-complaint-${complaint.id}`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium truncate">{complaint.title}</span>
          <Badge variant="outline" className={severityColors[complaint.severity]}>
            {complaint.severity}
          </Badge>
        </div>
        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
          <span className="truncate">{complaint.source}</span>
          <span>•</span>
          <span>{complaint.type}</span>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <Badge className={statusColors[complaint.status]}>{complaint.status}</Badge>
        <span className="text-xs text-muted-foreground whitespace-nowrap">{formattedDate}</span>
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/stats"],
  });

  const { data: complaints, isLoading: complaintsLoading } = useQuery<Complaint[]>({
    queryKey: ["/api/complaints"],
  });

  const recentComplaints = complaints?.slice(0, 10) || [];

  const typeData =
    complaints?.reduce((acc: { name: string; value: number }[], c) => {
      const existing = acc.find((item) => item.name === c.type);
      if (existing) {
        existing.value++;
      } else {
        acc.push({ name: c.type, value: 1 });
      }
      return acc;
    }, []) || [];

  const sourceData =
    complaints?.reduce((acc: { name: string; value: number }[], c) => {
      const existing = acc.find((item) => item.name === c.source);
      if (existing) {
        existing.value++;
      } else {
        acc.push({ name: c.source, value: 1 });
      }
      return acc;
    }, []) || [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-dashboard-title">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome to Fazzaa Pro Complaint Management System
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsLoading ? (
          <>
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <StatCard
              title="Total Complaints"
              value={stats?.total || 0}
              icon={FileText}
              gradient="bg-gradient-to-br from-[#0066CC] to-[#0099FF]"
              subtitle="All time"
            />
            <StatCard
              title="New Today"
              value={stats?.newToday || 0}
              icon={Calendar}
              gradient="bg-gradient-to-br from-[#0099FF] to-[#00BFFF]"
              subtitle="Added today"
            />
            <StatCard
              title="Under Review"
              value={stats?.underReview || 0}
              icon={Clock}
              gradient="bg-gradient-to-br from-[#F59E0B] to-[#FBBF24]"
              subtitle="In progress"
            />
            <StatCard
              title="Resolved"
              value={stats?.resolved || 0}
              icon={CheckCircle2}
              gradient="bg-gradient-to-br from-[#10B981] to-[#34D399]"
              subtitle="Successfully closed"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Complaints by Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            {complaintsLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : typeData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No data available</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={typeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {typeData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Complaints by Source
            </CardTitle>
          </CardHeader>
          <CardContent>
            {complaintsLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : sourceData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No data available</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={sourceData} layout="vertical">
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="url(#colorGradient)" radius={[0, 4, 4, 0]} />
                  <defs>
                    <linearGradient id="colorGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#0066CC" />
                      <stop offset="100%" stopColor="#0099FF" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Recent Complaints
            </CardTitle>
            <Link href="/complaints">
              <Badge variant="outline" className="cursor-pointer hover-elevate" data-testid="link-view-all-complaints">
                View All
              </Badge>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {complaintsLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : recentComplaints.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">No complaints yet</p>
              <p className="text-sm mt-1">
                Add your first complaint to get started
              </p>
              <Link href="/complaints/new">
                <Badge className="mt-4 cursor-pointer" data-testid="link-add-first-complaint">
                  Add Complaint
                </Badge>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentComplaints.map((complaint) => (
                <RecentComplaintRow key={complaint.id} complaint={complaint} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
