import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Download,
  FileText,
  BarChart3,
  TrendingUp,
  Calendar,
  AlertCircle,
} from "lucide-react";
import type { Complaint, ReportData } from "@shared/schema";
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

const statusColors: Record<string, string> = {
  New: "#3B82F6",
  "Under Review": "#F59E0B",
  Transferred: "#8B5CF6",
  "Pending Customer": "#F97316",
  Resolved: "#10B981",
  Closed: "#6B7280",
  Rejected: "#EF4444",
};

export default function Reports() {
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [startDate, setStartDate] = useState(
    thirtyDaysAgo.toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(today.toISOString().split("T")[0]);

  const { data: complaints, isLoading } = useQuery<Complaint[]>({
    queryKey: ["/api/complaints"],
  });

  const filteredComplaints =
    complaints?.filter((c) => {
      const createdAt = new Date(c.createdAt);
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      return createdAt >= start && createdAt <= end;
    }) || [];

  const reportData: ReportData = {
    totalComplaints: filteredComplaints.length,
    byType: Object.entries(
      filteredComplaints.reduce((acc: Record<string, number>, c) => {
        acc[c.type] = (acc[c.type] || 0) + 1;
        return acc;
      }, {})
    ).map(([type, count]) => ({ type, count })),
    bySource: Object.entries(
      filteredComplaints.reduce((acc: Record<string, number>, c) => {
        acc[c.source] = (acc[c.source] || 0) + 1;
        return acc;
      }, {})
    ).map(([source, count]) => ({ source, count })),
    byStatus: Object.entries(
      filteredComplaints.reduce((acc: Record<string, number>, c) => {
        acc[c.status] = (acc[c.status] || 0) + 1;
        return acc;
      }, {})
    ).map(([status, count]) => ({ status, count })),
    bySeverity: Object.entries(
      filteredComplaints.reduce((acc: Record<string, number>, c) => {
        acc[c.severity] = (acc[c.severity] || 0) + 1;
        return acc;
      }, {})
    ).map(([severity, count]) => ({ severity, count })),
  };

  const exportToCSV = () => {
    const headers = [
      "ID",
      "Title",
      "Source",
      "Type",
      "Severity",
      "Status",
      "Customer Name",
      "Customer Phone",
      "Location",
      "Created At",
    ];

    const rows = filteredComplaints.map((c) => [
      c.id,
      `"${c.title.replace(/"/g, '""')}"`,
      c.source,
      c.type,
      c.severity,
      c.status,
      c.customerName || "",
      c.customerPhone || "",
      c.location || "",
      new Date(c.createdAt).toISOString(),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join(
      "\n"
    );

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `complaints_report_${startDate}_to_${endDate}.csv`;
    link.click();
  };

  const topSources = [...reportData.bySource]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-reports-title">Reports</h1>
          <p className="text-muted-foreground mt-1">
            Analyze complaint trends and patterns
          </p>
        </div>
        <Button onClick={exportToCSV} disabled={filteredComplaints.length === 0} data-testid="button-export-csv">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Date Range
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">From</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                data-testid="input-start-date"
              />
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">To</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                data-testid="input-end-date"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="hover-elevate overflow-visible">
              <CardContent className="p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Total Complaints
                    </p>
                    <p className="text-3xl font-bold mt-1">
                      {reportData.totalComplaints}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      In selected period
                    </p>
                  </div>
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#0066CC] to-[#0099FF] flex items-center justify-center">
                    <FileText className="w-7 h-7 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover-elevate overflow-visible">
              <CardContent className="p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Resolved
                    </p>
                    <p className="text-3xl font-bold mt-1">
                      {reportData.byStatus.find((s) => s.status === "Resolved")
                        ?.count || 0}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Successfully closed
                    </p>
                  </div>
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#10B981] to-[#34D399] flex items-center justify-center">
                    <TrendingUp className="w-7 h-7 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover-elevate overflow-visible">
              <CardContent className="p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Top Source
                    </p>
                    <p className="text-xl font-bold mt-1 truncate">
                      {topSources[0]?.source || "N/A"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {topSources[0]?.count || 0} complaints
                    </p>
                  </div>
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#F59E0B] to-[#FBBF24] flex items-center justify-center">
                    <BarChart3 className="w-7 h-7 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Complaints by Type</CardTitle>
              </CardHeader>
              <CardContent>
                {reportData.byType.length === 0 ? (
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
                        data={reportData.byType}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="count"
                        nameKey="type"
                        label={({ type, percent }) =>
                          `${type} ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {reportData.byType.map((_, index) => (
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
                <CardTitle>Complaints by Status</CardTitle>
              </CardHeader>
              <CardContent>
                {reportData.byStatus.length === 0 ? (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No data available</p>
                    </div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={reportData.byStatus}>
                      <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {reportData.byStatus.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={statusColors[entry.status] || CHART_COLORS[0]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Complaint Sources</CardTitle>
              </CardHeader>
              <CardContent>
                {topSources.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No data available</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {topSources.map((item, index) => {
                      const percentage =
                        (item.count / reportData.totalComplaints) * 100;
                      return (
                        <div key={item.source}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                #{index + 1}
                              </Badge>
                              <span className="font-medium">{item.source}</span>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {item.count} ({percentage.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${percentage}%`,
                                background: `linear-gradient(90deg, #0066CC, #0099FF)`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Complaints by Severity</CardTitle>
              </CardHeader>
              <CardContent>
                {reportData.bySeverity.length === 0 ? (
                  <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No data available</p>
                    </div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={reportData.bySeverity} layout="vertical">
                      <XAxis type="number" />
                      <YAxis
                        dataKey="severity"
                        type="category"
                        width={80}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip />
                      <Bar
                        dataKey="count"
                        fill="url(#severityGradient)"
                        radius={[0, 4, 4, 0]}
                      />
                      <defs>
                        <linearGradient
                          id="severityGradient"
                          x1="0"
                          y1="0"
                          x2="1"
                          y2="0"
                        >
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
        </>
      )}
    </div>
  );
}
