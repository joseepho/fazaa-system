import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Calendar,
  Plus,
  ArrowRight,
  LayoutDashboard,
  Users,
  Download,
  AlertTriangle,
  Award,
  Filter
} from "lucide-react";
import { Link, Redirect } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import type { Complaint, DashboardStats } from "@shared/schema";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis
} from "recharts";
import { format, subDays, isSameDay, isToday, isThisWeek, isThisMonth, isThisYear, parseISO, differenceInHours } from "date-fns";
import { arEG } from "date-fns/locale";
import { useState, useMemo } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Define interface locally since it was missing in shared schema
interface TechnicianStat {
  technicianId: number;
  technicianName: string;
  role: string;
  specialization: string;
  avgPunctuality: number;
  avgQuality: number;
  avgBehavior: number;
  avgOverall: number;
  totalEvaluations: number;
  reworkRate: number;
  commitmentRate: number;
  customerSatisfactionRate: number;
  classification: string;
}

const statusColors: Record<string, string> = {
  New: "bg-blue-50 text-blue-700 border-blue-200",
  "Under Review": "bg-amber-50 text-amber-700 border-amber-200",
  Transferred: "bg-purple-50 text-purple-700 border-purple-200",
  "Pending Customer": "bg-orange-50 text-orange-700 border-orange-200",
  Resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Closed: "bg-slate-50 text-slate-700 border-slate-200",
  Rejected: "bg-rose-50 text-rose-700 border-rose-200",
};

const statusTranslations: Record<string, string> = {
  New: "جديد",
  "Under Review": "قيد المراجعة",
  Transferred: "محولة",
  "Pending Customer": "بانتظار العميل",
  Resolved: "تم الحل",
  Closed: "مغلقة",
  Rejected: "مرفوضة",
};

const typeTranslations: Record<string, string> = {
  "Technical": "مشكلة فنية",
  "Billing": "فواتير",
  "Payment": "مدفوعات",
  "Behavioral": "سلوك الموظف",
  "Price": "السعر",
  "Delay": "تأخير",
  "Service Quality": "جودة الخدمة",
  "App": "التطبيق",
  "Other": "أخرى",
  "Product": "منتج",
  "Service": "خدمة",
  "Staff": "موظفين"
};

const sourceTranslations: Record<string, string> = {
  "Social Media": "وسائل التواصل",
  "Google Play": "جوجل بلاي",
  "App Store": "آب ستور",
  "App Support": "دعم التطبيق",
  "Field": "ميداني",
  "Phone": "هاتف",
  "Email": "بريد إلكتروني",
  "Call Center": "مركز الاتصال",
  "Website": "الموقع",
  "Mobile App": "تطبيق الهاتف",
  "Walk-in": "زيارة شخصية"
};

const CHART_COLORS = [
  "#3b82f6", // blue-500
  "#10b981", // emerald-500
  "#f59e0b", // amber-500
  "#ef4444", // red-500
  "#8b5cf6", // violet-500
  "#ec4899", // pink-500
  "#06b6d4", // cyan-500
];

function StatCard({ title, value, icon: Icon, colorClass, trend, subtitle }: any) {
  return (
    <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-slate-200/60">
      <div className={`absolute top-0 right-0 w-32 h-32 opacity-10 -mr-8 -mt-8 rounded-full ${colorClass} transition-transform group-hover:scale-150 duration-700 ease-in-out`} />
      <CardContent className="p-6 relative">
        <div className="flex justify-between items-start">
          <div className="space-y-4">
            <div className={`p-3 rounded-xl w-fit ${colorClass.replace('bg-', 'bg-opacity-10 text-')}`}>
              <Icon className={`w-6 h-6 ${colorClass.replace('bg-', 'text-')}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{title}</p>
              <h3 className="text-3xl font-bold text-slate-800 mt-1 tracking-tight">{value}</h3>
              {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
            </div>
          </div>
          {trend && (
            <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full text-xs font-bold">
              <TrendingUp className="w-3 h-3" />
              <span>{trend}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-slate-100 shadow-xl rounded-xl text-sm z-50 text-right">
        <p className="font-bold text-slate-800 mb-1">{label}</p>
        <div className="flex items-center gap-2 flex-row-reverse justify-end">
          <span className="font-bold text-slate-900">{payload[0].value}</span>
          <span className="text-slate-600">:العدد</span>
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: payload[0].fill || payload[0].stroke }} />
        </div>
      </div>
    );
  }
  return null;
};

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }: any) => {
  const RADIAN = Math.PI / 180;
  // Place label in the middle of the slice
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      className="text-[10px] font-bold drop-shadow-md pointer-events-none"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function Dashboard() {
  const { user } = useAuth();
  const today = new Date();
  const [timeRange, setTimeRange] = useState("all");

  // Redirect Logic
  const hasPermission = (permission: string) => {
    if (!user) return false;
    if (user.role === "Admin") return true;
    return user.permissions?.includes(permission) || false;
  };

  if (user && user.role !== "Admin" && !hasPermission("view_dashboard")) {
    const redirects = [
      { url: "/complaints", allowed: hasPermission("view_complaints") },
      { url: "/complaints/new", allowed: hasPermission("create_complaint") },
      { url: "/reports", allowed: hasPermission("view_reports") },
      { url: "/evaluations", allowed: hasPermission("view_evaluations_page") || hasPermission("view_evaluations") || hasPermission("view_technicians") },
      { url: "/settings", allowed: hasPermission("view_settings") },
    ];
    const target = redirects.find(r => r.allowed);
    if (target) return <Redirect to={target.url} />;
    return <div className="p-8 text-center text-slate-500">لا توجد صلاحيات لعرض هذه الصفحة</div>;
  }

  // Data Fetching
  const { data: allStats, isLoading: statsLoading } = useQuery<DashboardStats>({ queryKey: ["/api/stats"] });
  const { data: complaints, isLoading: complaintsLoading } = useQuery<Complaint[]>({ queryKey: ["/api/complaints"] });
  const { data: techStats } = useQuery<TechnicianStat[]>({
    queryKey: ["/api/evaluations/stats"],
    enabled: hasPermission("view_evaluations") || hasPermission("view_technicians")
  });

  // --- Filtering Logic ---
  const filteredComplaints = useMemo(() => {
    if (!complaints) return [];
    return complaints.filter(c => {
      const date = parseISO(c.createdAt as any); // Assuming string date from API
      if (timeRange === "today") return isToday(date);
      if (timeRange === "week") return isThisWeek(date, { weekStartsOn: 6 });
      if (timeRange === "month") return isThisMonth(date);
      if (timeRange === "year") return isThisYear(date);
      return true;
    });
  }, [complaints, timeRange]);

  // --- Dynamic Stats Calculation ---
  const currentStats = useMemo(() => {
    return {
      total: filteredComplaints.length,
      new: filteredComplaints.filter(c => c.status === "New").length,
      active: filteredComplaints.filter(c => ["New", "Under Review", "Pending Customer", "Transferred"].includes(c.status)).length,
      resolved: filteredComplaints.filter(c => c.status === "Resolved" || c.status === "Closed").length,
    };
  }, [filteredComplaints]);

  // --- Actionable Alerts Logic ---
  const alerts = useMemo(() => {
    if (!complaints) return { urgent: [], overdue: [] };
    const urgent = complaints.filter(c => c.severity === "Urgent" && !["Resolved", "Closed", "Rejected"].includes(c.status));
    const overdue = complaints.filter(c => {
      const hours = differenceInHours(new Date(), parseISO(c.createdAt as any));
      // Overdue if > 24 hours and still New
      return hours > 24 && c.status === "New";
    });
    return { urgent, overdue };
  }, [complaints]);

  // --- Chart Data Processing ---
  const typeData = useMemo(() => {
    return filteredComplaints.reduce((acc: any[], c) => {
      const typeName = typeTranslations[c.type] || c.type;
      const existing = acc.find(i => i.name === typeName);
      if (existing) existing.value++;
      else acc.push({ name: typeName, value: 1 });
      return acc;
    }, []).sort((a, b) => b.value - a.value);
  }, [filteredComplaints]);

  const weeklyActivityData = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const date = subDays(today, 6 - i);
      const dateLabel = format(date, "EEE", { locale: arEG });
      const count = filteredComplaints?.filter(c => isSameDay(parseISO(c.createdAt as any), date)).length || 0;
      return { name: dateLabel, value: count, fullDate: format(date, "d MMMM", { locale: arEG }) };
    });
  }, [filteredComplaints]);

  // --- Quick Export ---
  const handleExport = () => {
    if (!filteredComplaints.length) return;

    // Define headers in Arabic
    const headers = [
      "معرف الشكوى",
      "عنوان الشكوى",
      "النوع",
      "المصدر",
      "الحالة",
      "مقدم الشكوى",
      "تاريخ الإنشاء",
      "وصف المشكلة"
    ];

    // Helper to escape CSV fields
    const escapeCsv = (str: string | number | undefined | null) => {
      if (str === null || str === undefined) return "";
      const stringValue = String(str);
      if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    // Map data rows
    const rows = filteredComplaints.map(c => [
      c.id,
      c.title,
      typeTranslations[c.type] || c.type,
      sourceTranslations[c.source] || c.source,
      statusTranslations[c.status] || c.status,
      c.customerName,
      format(new Date(c.createdAt), "yyyy/MM/dd HH:mm", { locale: arEG }),
      c.description
    ].map(escapeCsv).join(","));

    // Add BOM for Excel Arabic support
    const bom = "\uFEFF";
    const csvContent = bom + headers.join(",") + "\n" + rows.join("\n");

    // Create download link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `تقرير_الشكاوي_${format(new Date(), "yyyy-MM-dd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* Header & Filters */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 to-slate-800 p-8 rounded-3xl text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat opacity-20 pointer-events-none"></div>

          <div className="relative z-10 space-y-2">
            <div className="flex items-center gap-2 text-slate-300 text-sm font-medium bg-white/10 w-fit px-3 py-1 rounded-full backdrop-blur-sm">
              <Calendar className="w-4 h-4" />
              {format(today, "EEEE، d MMMM yyyy", { locale: arEG })}
            </div>
            <h1 className="text-4xl font-bold leading-tight">
              مرحباً، <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-indigo-200">{user?.name}</span> 👋
            </h1>
            <p className="text-slate-300 max-w-xl text-lg">
              لديك <strong className="text-white">{alerts.urgent.length}</strong> شكاوى عاجلة و <strong className="text-white">{alerts.overdue.length}</strong> شكاوى متأخرة تتطلب انتباهك.
            </p>
          </div>

          <div className="relative z-10 flex flex-col gap-3 min-w-[200px]">
            {/* Time Filter Select */}
            <div dir="rtl">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white backdrop-blur-md h-12">
                  <SelectValue placeholder="الفترة الزمنية" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الوقت</SelectItem>
                  <SelectItem value="today">اليوم</SelectItem>
                  <SelectItem value="week">هذا الأسبوع</SelectItem>
                  <SelectItem value="month">هذا الشهر</SelectItem>
                  <SelectItem value="year">هذه السنة</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleExport} variant="outline" className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10">
                <Download className="w-4 h-4 ml-2" />
                تصدير
              </Button>
              {hasPermission("create_complaint") && (
                <Link href="/complaints/new" className="flex-1">
                  <Button className="w-full bg-blue-600 hover:bg-blue-500 text-white border-0">
                    <Plus className="w-4 h-4" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Actionable Alerts Banner */}
        {(alerts.urgent.length > 0 || alerts.overdue.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {alerts.urgent.length > 0 && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center justify-between text-rose-800 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="bg-rose-100 p-2 rounded-full">
                    <AlertTriangle className="w-5 h-5 text-rose-600" />
                  </div>
                  <div>
                    <h4 className="font-bold">تنبيه عاجل</h4>
                    <p className="text-sm text-rose-600">يوجد {alerts.urgent.length} شكاوى ذات أولوية قصوى لم يتم حلها.</p>
                  </div>
                </div>
                <Link href="/complaints?severity=Urgent">
                  <Button size="sm" variant="ghost" className="text-rose-700 hover:text-rose-900 hover:bg-rose-100">عرض</Button>
                </Link>
              </div>
            )}
            {alerts.overdue.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center justify-between text-orange-800">
                <div className="flex items-center gap-3">
                  <div className="bg-orange-100 p-2 rounded-full">
                    <Clock className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="font-bold">شكاوى متأخرة</h4>
                    <p className="text-sm text-orange-600">يوجد {alerts.overdue.length} شكاوى جديدة تجاوزت 24 ساعة.</p>
                  </div>
                </div>
                <Link href="/complaints?status=New">
                  <Button size="sm" variant="ghost" className="text-orange-700 hover:text-orange-900 hover:bg-orange-100">متابعة</Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsLoading ? (
          [...Array(4)].map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-2xl" />)
        ) : (
          <>
            <StatCard
              title={timeRange === 'all' ? "إجمالي الشكاوى" : "الشكاوى (الفترة المحددة)"}
              value={currentStats.total}
              icon={LayoutDashboard}
              colorClass="bg-indigo-600"
              trend={timeRange === 'today' ? "اليوم" : ""}
            />
            <StatCard
              title="الشكاوى النشطة"
              value={currentStats.active}
              icon={AlertCircle}
              colorClass="bg-amber-500"
              subtitle="قيد المعالجة حالياً"
            />
            <StatCard
              title="تم الحل بنجاح"
              value={currentStats.resolved}
              icon={CheckCircle2}
              colorClass="bg-emerald-600"
              trend={`${currentStats.total ? ((currentStats.resolved / currentStats.total) * 100).toFixed(0) : 0}%`}
              subtitle="نسبة الإنجاز"
            />
            <StatCard
              title="شكاوى جديدة"
              value={currentStats.new}
              icon={FileText}
              colorClass="bg-blue-500"
              subtitle="بانتظار الإجراء"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Weekly Activity Chart */}
        <Card className="lg:col-span-2 shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-50">
            <div className="space-y-1">
              <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-800">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                النشاط الزمني
              </CardTitle>
              <CardDescription>حركة الشكاوى خلال الفترة المحددة</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-6 pl-0">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyActivityData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Technicians & KPI */}
        <Card className="shadow-sm border-slate-200 flex flex-col">
          <CardHeader className="border-b border-slate-50 bg-slate-50/50">
            <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-500" />
              أفضل الفنيين
            </CardTitle>
            <CardDescription>الأعلى تقييماً هذا الشهر</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 flex-1 overflow-y-auto">
            {!techStats || techStats.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 min-h-[200px]">
                <Users className="w-12 h-12 opacity-20 mb-2" />
                <p>لا توجد بيانات تقييم كافية</p>
              </div>
            ) : (
              <div className="space-y-4">
                {techStats.slice(0, 5).map((tech, i) => (
                  <div key={tech.technicianId} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${i === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-600'}`}>
                        {i + 1}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{tech.technicianName}</p>
                        <p className="text-xs text-slate-500">{tech.totalEvaluations} مهمة مكتملة</p>
                      </div>
                    </div>
                    <div className="text-left">
                      <span className="block font-bold text-emerald-600">{Number(tech.avgOverall || 0).toFixed(1)}</span>
                      <div className="flex text-yellow-400">
                        {[...Array(Math.round(Number(tech.avgOverall) || 0))].map((_, idx) => (
                          <svg key={idx} className="w-2 h-2 fill-current" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          <div className="p-4 border-t border-slate-50 mt-auto">
            <Link href="/evaluations">
              <Button variant="outline" className="w-full text-xs">عرض تقرير الأداء الكامل</Button>
            </Link>
          </div>
        </Card>
      </div>

      {/* Types Distribution - Full Width Bottom */}
      <Card className="shadow-sm border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg font-bold">توزيع الشكاوى حسب النوع</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] w-full">
            {typeData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                    label={renderCustomizedLabel}
                    labelLine={false}
                  >
                    {typeData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex justify-center items-center h-full text-slate-400">لا توجد بيانات</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
