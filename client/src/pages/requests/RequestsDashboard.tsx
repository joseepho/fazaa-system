import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { format, subDays, isAfter, startOfDay, endOfDay } from "date-fns";
import { ar } from "date-fns/locale";
import { useLocation } from "wouter";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
    Plus,
    Search,
    Calendar,
    Clock,
    User,
    Loader2,
    Edit,
    Trash2,
    MoreHorizontal,
    MapPin,
    BarChart3,
    TrendingUp,
    CheckCircle2,
    XCircle,
    AlertCircle,
    DollarSign,
    CreditCard,
    Wallet
} from "lucide-react";
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area, LineChart, Line
} from "recharts";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

// Status Configuration
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    "New": { label: "جديد", color: "text-blue-700", bg: "bg-blue-50" },
    "In Progress": { label: "جاري التنفيذ", color: "text-amber-700", bg: "bg-amber-50" },
    "Completed": { label: "مكتمل", color: "text-emerald-700", bg: "bg-emerald-50" },
    "On Hold": { label: "مؤجل", color: "text-slate-700", bg: "bg-slate-100" },
    "Cancelled": { label: "ملغي", color: "text-red-700", bg: "bg-red-50" },
};

const formatTime12 = (time24: string) => {
    if (!time24) return "";
    const [hours, minutes] = time24.split(':').map(Number);
    if (isNaN(hours)) return time24;
    const suffix = hours >= 12 ? 'م' : 'ص';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${suffix}`;
};

export default function RequestsDashboard() {
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editingRequest, setEditingRequest] = useState<any>(null);
    const [deletingRequestId, setDeletingRequestId] = useState<number | null>(null);
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [_, setLocation] = useLocation();
    const { user } = useAuth();

    // Check permission for stats tab
    // Check permission for stats tab
    const canViewStats = user?.role === "Admin" || user?.permissions?.includes("view_requests_stats");
    const canCreate = user?.role === "Admin" || user?.permissions?.includes("create_request");
    const canEdit = user?.role === "Admin" || user?.permissions?.includes("edit_request");
    const canDelete = user?.role === "Admin" || user?.permissions?.includes("delete_request");

    // Queries
    const { data: requests, isLoading: isRequestsLoading, isError } = useQuery<any[]>({
        queryKey: ["/api/requests"],
    });

    const { data: technicians } = useQuery<any[]>({
        queryKey: ["/api/field-technicians"],
    });

    // Mutations
    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await apiRequest("POST", "/api/requests", data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
            queryClient.invalidateQueries({ queryKey: ["/api/requests/stats"] });
            setIsAddOpen(false);
            toast({ title: "تم إضافة الطلب بنجاح" });
        },
        onError: (err: any) => {
            toast({ title: "خطأ", description: err.message, variant: "destructive" });
        }
    });



    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: number, data: any }) => {
            const res = await apiRequest("PUT", `/api/requests/${id}`, data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
            queryClient.invalidateQueries({ queryKey: ["/api/requests/stats"] });
            setIsAddOpen(false);
            setEditingRequest(null);
            toast({ title: "تم تحديث الطلب بنجاح" });
        },
        onError: (err: any) => {
            toast({ title: "خطأ", description: err.message, variant: "destructive" });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            await apiRequest("DELETE", `/api/requests/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
            queryClient.invalidateQueries({ queryKey: ["/api/requests/stats"] });
            setDeletingRequestId(null);
            toast({ title: "تم حذف الطلب بنجاح" });
        },
        onError: (err: any) => {
            toast({ title: "خطأ", description: err.message, variant: "destructive" });
        }
    });

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status }: { id: number, status: string }) => {
            const res = await apiRequest("PATCH", `/api/requests/${id}/status`, { status });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
            queryClient.invalidateQueries({ queryKey: ["/api/requests/stats"] });
            toast({ title: "تم تحديث الحالة" });
        }
    });

    // Filter Logic
    const filteredRequests = useMemo(() => {
        return requests?.filter(req => {
            const matchesSearch =
                req.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                req.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                req.customerPhone.includes(searchTerm);

            const matchesStatus = statusFilter === "All" || req.status === statusFilter;

            return matchesSearch && matchesStatus;
        }) || [];
    }, [requests, searchTerm, statusFilter]);




    // Enhanced Statistics Calculation
    const advancedStats = useMemo(() => {
        const defaults = {
            total: 0,
            completed: 0,
            inProgress: 0,
            cancelled: 0,
            newReqs: 0,
            onHold: 0,
            openRequests: 0,
            completionRate: 0,
            avgDuration: 0,
            trendData: [],
            techData: [],
            paymentData: [],
            locationData: []
        };

        if (!requests) return defaults;

        const total = requests.length;
        const completed = requests.filter(r => r.status === "Completed").length;
        const inProgress = requests.filter(r => r.status === "In Progress").length;
        const cancelled = requests.filter(r => r.status === "Cancelled").length;
        const newReqs = requests.filter(r => r.status === "New").length;
        const onHold = requests.filter(r => r.status === "On Hold").length;
        const openRequests = requests.filter(r => r.status !== "Completed" && r.status !== "Cancelled").length;

        // Calculate Average Duration
        const completedWithDuration = requests.filter(r => r.executionDuration > 0);
        const avgDuration = completedWithDuration.length > 0
            ? Math.round(completedWithDuration.reduce((acc: number, r: any) => acc + (r.executionDuration || 0), 0) / completedWithDuration.length)
            : 0;

        // Daily Trend (Last 7 Days)
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = subDays(new Date(), 6 - i);
            return startOfDay(d);
        });

        const trendData = last7Days.map(date => {
            const dayStr = format(date, "MMM dd");
            const count = requests.filter(r => {
                const rDate = new Date(r.requestDate || r.createdAt); // Fallback to created at if requestDate is somehow missing
                return startOfDay(rDate).getTime() === date.getTime();
            }).length;
            const completedCount = requests.filter(r => {
                const rDate = new Date(r.requestDate || r.createdAt);
                return startOfDay(rDate).getTime() === date.getTime() && r.status === "Completed";
            }).length;

            return { date: dayStr, requests: count, completed: completedCount };
        });

        // Technician Performance
        const techStats: Record<string, { name: string, total: number, completed: number }> = {};
        requests.forEach(r => {
            if (r.technicianName) {
                if (!techStats[r.technicianName]) {
                    techStats[r.technicianName] = { name: r.technicianName, total: 0, completed: 0 };
                }
                techStats[r.technicianName].total++;
                if (r.status === "Completed") techStats[r.technicianName].completed++;
            }
        });
        const techData = Object.values(techStats)
            .sort((a, b) => b.total - a.total)
            .slice(0, 5); // Top 5

        // Payment Methods
        const paymentData = [
            { name: "كاش", value: requests.filter(r => r.paymentMethod === "Cash").length, color: "#10b981" },
            { name: "أونلاين", value: requests.filter(r => r.paymentMethod === "Online").length, color: "#6366f1" },
        ].filter(d => d.value > 0);

        // Location Distribution (Top 5)
        const locationStats: Record<string, number> = {};
        requests.forEach(r => {
            // Try to extract neighborhood if possible from generic string, otherwise just use string
            // Assuming simple string for now
            const loc = r.location?.trim() || "غير محدد";
            locationStats[loc] = (locationStats[loc] || 0) + 1;
        });
        const locationData = Object.entries(locationStats)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        return {
            total,
            completed,
            completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
            inProgress,
            cancelled,
            openRequests,
            newReqs,
            onHold,
            avgDuration,
            trendData,
            techData,
            paymentData,
            locationData
        };
    }, [requests]);

    if (isRequestsLoading || !advancedStats) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
    }

    // Form Handling
    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = {
            orderNumber: formData.get("orderNumber"),
            customerName: formData.get("customerName"),
            customerPhone: formData.get("customerPhone"),
            location: formData.get("location"),
            locationCoordinates: formData.get("locationCoordinates"),
            paymentMethod: formData.get("paymentMethod"),
            details: formData.get("details"),
            requestDate: new Date(formData.get("requestDate") as string),
            startTime: formData.get("startTime"),
            endTime: formData.get("endTime"),
            technicianId: formData.get("technicianId") ? parseInt(formData.get("technicianId") as string) : null,
        };

        if (editingRequest) {
            updateMutation.mutate({ id: editingRequest.id, data });
        } else {
            createMutation.mutate({ ...data, status: "New" });
        }
    };

    const statusChartData = [
        { name: 'مكتمل', value: advancedStats.completed, color: '#10b981' },
        { name: 'جاري التنفيذ', value: advancedStats.inProgress, color: '#f59e0b' },
        { name: 'جديد', value: advancedStats.newReqs, color: '#3b82f6' },
        { name: 'مؤجل', value: advancedStats.onHold, color: '#64748b' },
        { name: 'ملغي', value: advancedStats.cancelled, color: '#ef4444' },
    ].filter(i => i.value > 0);

    return (
        <div className="p-4 md:p-8 space-y-6 md:space-y-8 bg-slate-50 min-h-screen" dir="rtl">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900">الطلبات</h1>
                    <p className="text-sm md:text-base text-slate-500 mt-1">إدارة جدول الزيارات الفنية ومتابعة حالات التنفيذ</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    {canCreate && (
                        <Dialog open={isAddOpen} onOpenChange={(open) => {
                            setIsAddOpen(open);
                            if (!open) setEditingRequest(null);
                        }}>
                            <DialogTrigger asChild>
                                <Button className="gap-2 bg-slate-900 hover:bg-slate-800 text-white w-full md:w-auto" onClick={() => setEditingRequest(null)}>
                                    <Plus className="h-4 w-4" />
                                    طلب جديد
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto w-[95vw] md:w-full rounded-lg" dir="rtl">
                                <DialogHeader>
                                    <DialogTitle>{editingRequest ? "تعديل طلب الخدمة" : "إضافة طلب خدمة جديد"}</DialogTitle>
                                </DialogHeader>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>رقم الطلب</Label>
                                        <Input name="orderNumber" required placeholder="رقم الطلب" defaultValue={editingRequest?.orderNumber} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>اسم العميل</Label>
                                            <Input name="customerName" required placeholder="الاسم الكامل" defaultValue={editingRequest?.customerName} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>رقم الهاتف</Label>
                                            <div className="relative">
                                                <div className="absolute left-0 top-0 bottom-0 px-3 flex items-center bg-slate-100 border-r border-slate-200 rounded-l-md text-slate-500 text-sm">
                                                    +966
                                                </div>
                                                <Input name="customerPhone" required placeholder="5xxxxxxxx" dir="ltr" className="text-right pl-16" defaultValue={editingRequest?.customerPhone} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>الموقع / العنوان</Label>
                                        <Input name="location" required placeholder="الحي - اسم الشارع" defaultValue={editingRequest?.location} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>
                                            رابط الموقع (Google Maps)
                                            <a href="https://www.google.com/maps" target="_blank" rel="noreferrer" className="text-blue-600 text-xs mr-2 hover:underline">فتح الخرائط</a>
                                        </Label>
                                        <Input name="locationCoordinates" placeholder="https://maps.google.com/..." dir="ltr" defaultValue={editingRequest?.locationCoordinates} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>طريقة الدفع</Label>
                                        <RadioGroup name="paymentMethod" defaultValue={editingRequest?.paymentMethod || "Cash"} className="flex gap-4" dir="rtl">
                                            <div className="flex items-center space-x-2 space-x-reverse">
                                                <RadioGroupItem value="Cash" id="cash" />
                                                <Label htmlFor="cash">كاش</Label>
                                            </div>
                                            <div className="flex items-center space-x-2 space-x-reverse">
                                                <RadioGroupItem value="Online" id="online" />
                                                <Label htmlFor="online">أونلاين</Label>
                                            </div>
                                        </RadioGroup>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>تفاصيل الطلب</Label>
                                        <Input name="details" required placeholder="وصف المختصر للمشكلة (صيانة تكييف، سباكة...)" defaultValue={editingRequest?.details} />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>تاريخ الزيارة</Label>
                                            <Input
                                                name="requestDate"
                                                type="date"
                                                required
                                                defaultValue={editingRequest?.requestDate ? format(new Date(editingRequest.requestDate), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd")}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>تعيين فني (اختياري)</Label>
                                            <Select name="technicianId" defaultValue={editingRequest?.technicianId?.toString()}>
                                                <SelectTrigger><SelectValue placeholder="اختر الفني" /></SelectTrigger>
                                                <SelectContent>
                                                    {technicians?.filter(t => t.status === 'Active').map(t => {
                                                        const specs = t.specialization?.split(',') || [];
                                                        const arabicSpecs: Record<string, string> = {
                                                            Electrical: "كهرباء",
                                                            Plumbing: "سباكة",
                                                            Carpentry: "نجارة",
                                                            Painting: "دهانات",
                                                            AC: "تكييف",
                                                            Cleaning: "نظافة",
                                                            General: "عام"
                                                        };
                                                        const displaySpecs = specs.map((s: string) => arabicSpecs[s.trim()] || s).join(' - ');
                                                        return (
                                                            <SelectItem key={t.id} value={t.id.toString()}>
                                                                {t.name} - {displaySpecs}
                                                            </SelectItem>
                                                        );
                                                    })}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>الوقت المتوقع (من - إلى)</Label>
                                        <div className="flex gap-2 items-center">
                                            <Input name="startTime" type="time" required className="flex-1" defaultValue={editingRequest?.startTime} />
                                            <span>إلى</span>
                                            <Input name="endTime" type="time" required className="flex-1" defaultValue={editingRequest?.endTime} />
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                                        <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>إلغاء</Button>
                                        <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                                            {createMutation.isPending || updateMutation.isPending ? "جاري الحفظ..." : "حفظ الطلب"}
                                        </Button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
            </div>

            <Tabs defaultValue="list" className="space-y-4" dir="rtl">
                <TabsList>
                    <TabsTrigger value="list">قائمة الطلبات</TabsTrigger>
                    {canViewStats && <TabsTrigger value="stats">الإحصائيات والتقارير</TabsTrigger>}
                </TabsList>

                {canViewStats && (
                    <TabsContent value="stats">
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

                            {/* 1. Top Level KPIs */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                                <Card className="shadow-sm border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
                                    <CardContent className="pt-6">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-sm font-medium text-slate-500 mb-1">إجمالي الطلبات</p>
                                                <h3 className="text-3xl font-bold text-slate-900">{advancedStats.total}</h3>
                                            </div>
                                            <div className="p-2 bg-blue-50 rounded-lg">
                                                <BarChart3 className="w-5 h-5 text-blue-600" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="shadow-sm border-l-4 border-l-amber-500 hover:shadow-md transition-shadow">
                                    <CardContent className="pt-6">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-sm font-medium text-slate-500 mb-1">الطلبات المفتوحة</p>
                                                <h3 className="text-3xl font-bold text-slate-900">{advancedStats.openRequests}</h3>
                                            </div>
                                            <div className="p-2 bg-amber-50 rounded-lg">
                                                <Clock className="w-5 h-5 text-amber-600" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="shadow-sm border-l-4 border-l-emerald-500 hover:shadow-md transition-shadow">
                                    <CardContent className="pt-6">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-sm font-medium text-slate-500 mb-1">تم الإنجاز</p>
                                                <h3 className="text-3xl font-bold text-slate-900">{advancedStats.completed}</h3>
                                                <p className="text-xs text-emerald-600 mt-1 font-medium flex items-center">
                                                    <TrendingUp className="w-3 h-3 mr-1" />
                                                    {advancedStats.completionRate}% نسبة الإنجاز
                                                </p>
                                            </div>
                                            <div className="p-2 bg-emerald-50 rounded-lg">
                                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="shadow-sm border-l-4 border-l-amber-500 hover:shadow-md transition-shadow">
                                    <CardContent className="pt-6">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-sm font-medium text-slate-500 mb-1">متوسط زمن التنفيذ</p>
                                                <h3 className="text-3xl font-bold text-slate-900">{advancedStats.avgDuration} <span className="text-base font-normal text-slate-500">دقيقة</span></h3>
                                                <p className="text-xs text-amber-600 mt-1 font-medium flex items-center">
                                                    <Clock className="w-3 h-3 mr-1" />
                                                    {advancedStats.inProgress} طلب قيد التنفيذ
                                                </p>
                                            </div>
                                            <div className="p-2 bg-amber-50 rounded-lg">
                                                <TrendingUp className="w-5 h-5 text-amber-600" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="shadow-sm border-l-4 border-l-red-500 hover:shadow-md transition-shadow">
                                    <CardContent className="pt-6">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-sm font-medium text-slate-500 mb-1">ملغي / مؤجل</p>
                                                <div className="flex items-baseline gap-2">
                                                    <h3 className="text-3xl font-bold text-slate-900">{advancedStats.cancelled}</h3>
                                                    <span className="text-sm text-slate-400">/ {advancedStats.onHold}</span>
                                                </div>
                                            </div>
                                            <div className="p-2 bg-red-50 rounded-lg">
                                                <AlertCircle className="w-5 h-5 text-red-600" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* 2. Primary Charts Row */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Daily Trend */}
                                <Card className="col-span-1 lg:col-span-2 shadow-sm">
                                    <CardHeader>
                                        <CardTitle className="text-lg">نشاط الطلبات (آخر 7 أيام)</CardTitle>
                                        <CardDescription>عدد الطلبات الجديدة والمكتملة يومياً</CardDescription>
                                    </CardHeader>
                                    <CardContent className="h-[300px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={advancedStats.trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                                    </linearGradient>
                                                    <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <XAxis dataKey="date" />
                                                <YAxis />
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                <RechartsTooltip />
                                                <Legend />
                                                <Area type="monotone" dataKey="requests" name="الطلبات" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRequests)" />
                                                <Area type="monotone" dataKey="completed" name="المكتملة" stroke="#10b981" fillOpacity={1} fill="url(#colorCompleted)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>

                                {/* Status Distribution */}
                                <Card className="col-span-1 shadow-sm">
                                    <CardHeader>
                                        <CardTitle className="text-lg">توزيع الحالات</CardTitle>
                                        <CardDescription>نسبة الطلبات حسب الحالة الحالية</CardDescription>
                                    </CardHeader>
                                    <CardContent className="h-[300px] flex justify-center items-center">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={statusChartData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={100}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                >
                                                    {statusChartData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <RechartsTooltip />
                                                <Legend verticalAlign="bottom" height={36} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* 3. Secondary Info Row */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {/* Technician Performance */}
                                <Card className="shadow-sm">
                                    <CardHeader>
                                        <CardTitle className="text-lg">أداء الفنيين (أعلى 5)</CardTitle>
                                        <CardDescription>حسب عدد الطلبات المسندة</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            {advancedStats.techData.map((tech, i) => (
                                                <div key={i} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs">
                                                            {i + 1}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-medium">{tech.name}</div>
                                                            <div className="text-xs text-slate-500">{tech.completed} مكتمل من أصل {tech.total}</div>
                                                        </div>
                                                    </div>
                                                    {/* Simple Progress Bar */}
                                                    <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-blue-500 rounded-full"
                                                            style={{ width: `${(tech.completed / tech.total) * 100}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                            {advancedStats.techData.length === 0 && (
                                                <div className="text-center text-slate-400 py-4">لا توجد بيانات</div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Payment Methods */}
                                <Card className="shadow-sm">
                                    <CardHeader>
                                        <CardTitle className="text-lg">طرق الدفع</CardTitle>
                                        <CardDescription>تفضيلات الدفع للعملاء</CardDescription>
                                    </CardHeader>
                                    <CardContent className="h-[250px] flex flex-col justify-center">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={advancedStats.paymentData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                                <XAxis type="number" hide />
                                                <YAxis dataKey="name" type="category" width={60} />
                                                <RechartsTooltip />
                                                <Bar dataKey="value" fill="#8884d8" radius={[0, 4, 4, 0]}>
                                                    {advancedStats.paymentData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                        <div className="flex justify-center gap-6 mt-4 text-sm text-slate-600">
                                            <div className="flex items-center gap-2">
                                                <Wallet className="w-4 h-4 text-emerald-500" />
                                                <span>كاش ({advancedStats.paymentData.find(d => d.name === "كاش")?.value || 0})</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <CreditCard className="w-4 h-4 text-indigo-500" />
                                                <span>أونلاين ({advancedStats.paymentData.find(d => d.name === "أونلاين")?.value || 0})</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Location Stats */}
                                <Card className="shadow-sm">
                                    <CardHeader>
                                        <CardTitle className="text-lg">المناطق الأكثر طلباً</CardTitle>
                                        <CardDescription>توزيع الطلبات جغرافياً</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            {advancedStats.locationData.map((loc, i) => (
                                                <div key={i} className="flex items-center justify-between border-b last:border-0 pb-3 last:pb-0">
                                                    <div className="flex items-center gap-2">
                                                        <MapPin className="w-4 h-4 text-slate-400" />
                                                        <span className="text-sm font-medium">{loc.name}</span>
                                                    </div>
                                                    <Badge variant="secondary" className="font-normal">
                                                        {loc.count} طلب
                                                    </Badge>
                                                </div>
                                            ))}
                                            {advancedStats.locationData.length === 0 && (
                                                <div className="text-center text-slate-400 py-4">لا توجد بيانات</div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </TabsContent>
                )}

                <TabsContent value="list">
                    {/* Main List */}
                    <Card className="shadow-sm">
                        <CardHeader className="pb-2">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <CardTitle className="text-lg">قائمة الطلبات</CardTitle>
                                <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                                    <div className="relative w-full md:w-64">
                                        <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                        <Input
                                            placeholder="بحث..."
                                            className="h-9 pr-8"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                                        <SelectTrigger className="h-9 w-full md:w-[130px]">
                                            <SelectValue placeholder="الحالة" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="All">الكل</SelectItem>
                                            <SelectItem value="New">جديد</SelectItem>
                                            <SelectItem value="In Progress">جاري التنفيذ</SelectItem>
                                            <SelectItem value="Completed">مكتمل</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>

                            {/* Desktop/Tablet View */}
                            <div className="hidden md:block">
                                <ScrollArea className="w-full whitespace-nowrap rounded-md border">
                                    <div className="min-w-[800px]">
                                        <Table dir="rtl">
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-[100px] text-right">رقم الطلب</TableHead>
                                                    <TableHead className="text-right">العميل</TableHead>
                                                    <TableHead className="text-right">التفاصيل</TableHead>
                                                    <TableHead className="text-right">وقت الزيارة</TableHead>
                                                    <TableHead className="text-right">الفني</TableHead>
                                                    <TableHead className="text-center">الحالة</TableHead>
                                                    <TableHead className="w-[50px]"></TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredRequests.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                                                            لا توجد طلبات مطابقة
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    filteredRequests.map((req) => (
                                                        <TableRow
                                                            key={req.id}
                                                            className="cursor-pointer hover:bg-slate-50 transition-colors"
                                                            onClick={() => setLocation(`/requests/${req.id}`)}
                                                        >
                                                            <TableCell className="font-bold text-slate-700 text-right">{req.orderNumber}</TableCell>
                                                            <TableCell className="text-right">
                                                                <div className="flex flex-col">
                                                                    <span className="font-medium">{req.customerName}</span>
                                                                    <span className="text-xs text-slate-400">{req.customerPhone}</span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="max-w-[200px] truncate text-right" title={req.details}>
                                                                {req.details}
                                                                <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                                                                    {req.location}
                                                                    {req.locationCoordinates && (
                                                                        <a
                                                                            href={req.locationCoordinates}
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                            onClick={(e) => e.stopPropagation()}
                                                                            className="text-blue-500 hover:text-blue-700"
                                                                            title="فتح الموقع"
                                                                        >
                                                                            <MapPin className="h-3 w-3" />
                                                                        </a>
                                                                    )}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <div className="flex flex-col gap-1 items-start">
                                                                    <div className="flex items-center gap-1 text-xs font-medium text-slate-600">
                                                                        <Calendar className="h-3 w-3" />
                                                                        {format(new Date(req.requestDate), "yyyy/MM/dd")}
                                                                    </div>
                                                                    <Badge variant="outline" className="w-fit text-[10px] gap-1 px-1.5 py-0 h-5 font-normal border-slate-300 bg-slate-50">
                                                                        <Clock className="h-3 w-3 text-slate-500" />
                                                                        {formatTime12(req.startTime)} - {formatTime12(req.endTime)}
                                                                    </Badge>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                {req.technicianName ? (
                                                                    <div className="flex items-center gap-1.5">
                                                                        <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-xs">
                                                                            <User className="h-3 w-3 text-slate-500" />
                                                                        </div>
                                                                        <span className="text-sm">{req.technicianName}</span>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-xs text-slate-400 italic">غير معين</span>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                <div className="flex flex-col items-center gap-1">
                                                                    <DropdownMenu>
                                                                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                                            <Badge className={`${STATUS_CONFIG[req.status]?.bg || 'bg-slate-100'} ${STATUS_CONFIG[req.status]?.color || 'text-slate-700'} border-0 hover:bg-opacity-80 cursor-pointer`}>
                                                                                {STATUS_CONFIG[req.status]?.label || req.status}
                                                                            </Badge>
                                                                        </DropdownMenuTrigger>
                                                                        <DropdownMenuContent align="center">
                                                                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); updateStatusMutation.mutate({ id: req.id, status: "New" }) }}>جديد</DropdownMenuItem>
                                                                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); updateStatusMutation.mutate({ id: req.id, status: "In Progress" }) }}>جاري التنفيذ</DropdownMenuItem>
                                                                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); updateStatusMutation.mutate({ id: req.id, status: "Completed" }) }}>مكتمل</DropdownMenuItem>
                                                                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); updateStatusMutation.mutate({ id: req.id, status: "On Hold" }) }}>مؤجل</DropdownMenuItem>
                                                                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); updateStatusMutation.mutate({ id: req.id, status: "Cancelled" }) }}>ملغي</DropdownMenuItem>
                                                                        </DropdownMenuContent>
                                                                    </DropdownMenu>
                                                                    {req.status === "Completed" && req.executionDuration != null && (
                                                                        <span className="text-[10px] text-slate-400 font-medium">
                                                                            استغرق {req.executionDuration} دقيقة
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                                            <MoreHorizontal className="h-4 w-4 text-slate-500" />
                                                                        </Button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent align="end">
                                                                        {canEdit && (
                                                                            <DropdownMenuItem onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setEditingRequest(req);
                                                                                setIsAddOpen(true);
                                                                            }}>
                                                                                <Edit className="ml-2 h-4 w-4" />
                                                                                تعديل التفاصيل
                                                                            </DropdownMenuItem>
                                                                        )}

                                                                        {canDelete && (
                                                                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setDeletingRequestId(req.id) }} className="text-red-600 focus:text-red-700">
                                                                                <Trash2 className="ml-2 h-4 w-4" />
                                                                                حذف الطلب
                                                                            </DropdownMenuItem>
                                                                        )}
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    <ScrollBar orientation="horizontal" />
                                </ScrollArea>
                            </div>

                            {/* Mobile View (Cards) */}
                            <div className="md:hidden space-y-4">
                                {filteredRequests.length === 0 ? (
                                    <div className="text-center text-slate-500 py-8 bg-slate-50 rounded-lg border border-dashed">
                                        لا توجد طلبات مطابقة
                                    </div>
                                ) : (
                                    filteredRequests.map((req) => (
                                        <Card
                                            key={req.id}
                                            className="shadow-sm active:scale-[0.98] transition-all cursor-pointer border hover:border-blue-200"
                                            onClick={() => setLocation(`/requests/${req.id}`)}
                                        >
                                            <CardContent className="p-4 space-y-3">
                                                {/* Header: ID + Status + Action */}
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <span className="text-xs font-bold text-slate-400 block mb-0.5">{req.orderNumber}</span>
                                                        <h4 className="font-bold text-slate-900">{req.customerName}</h4>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        {/* Status Badge */}
                                                        <div className="flex flex-col items-center gap-1">
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                                    <Badge className={`${STATUS_CONFIG[req.status]?.bg || 'bg-slate-100'} ${STATUS_CONFIG[req.status]?.color || 'text-slate-700'} border-0 hover:bg-opacity-80 cursor-pointer`}>
                                                                        {STATUS_CONFIG[req.status]?.label || req.status}
                                                                    </Badge>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="center">
                                                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); updateStatusMutation.mutate({ id: req.id, status: "New" }) }}>جديد</DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); updateStatusMutation.mutate({ id: req.id, status: "In Progress" }) }}>جاري التنفيذ</DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); updateStatusMutation.mutate({ id: req.id, status: "Completed" }) }}>مكتمل</DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); updateStatusMutation.mutate({ id: req.id, status: "On Hold" }) }}>مؤجل</DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); updateStatusMutation.mutate({ id: req.id, status: "Cancelled" }) }}>ملغي</DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                            {req.status === "Completed" && req.executionDuration != null && (
                                                                <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                                                                    {req.executionDuration} دقيقة
                                                                </span>
                                                            )}
                                                        </div>
                                                        {/* Menu */}
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                                <Button variant="ghost" className="h-6 w-6 p-0">
                                                                    <MoreHorizontal className="h-4 w-4 text-slate-500" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                {canEdit && (
                                                                    <DropdownMenuItem onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setEditingRequest(req);
                                                                        setIsAddOpen(true);
                                                                    }}>
                                                                        <Edit className="ml-2 h-4 w-4" />
                                                                        تعديل
                                                                    </DropdownMenuItem>
                                                                )}

                                                                {canDelete && (
                                                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setDeletingRequestId(req.id) }} className="text-red-600 focus:text-red-700">
                                                                        <Trash2 className="ml-2 h-4 w-4" />
                                                                        حذف
                                                                    </DropdownMenuItem>
                                                                )}
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-2 text-sm">
                                                    {/* Date & Time */}
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-1.5 text-slate-500">
                                                            <Calendar className="h-3.5 w-3.5" />
                                                            <span className="text-xs">{format(new Date(req.requestDate), "yyyy/MM/dd")}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-slate-500">
                                                            <Clock className="h-3.5 w-3.5" />
                                                            <span className="text-xs">{formatTime12(req.startTime)} - {formatTime12(req.endTime)}</span>
                                                        </div>
                                                    </div>

                                                </div>

                                                {/* Details */}
                                                <div className="pt-2 border-t text-sm text-slate-600 mt-2 line-clamp-2">
                                                    {req.details}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <AlertDialog open={!!deletingRequestId} onOpenChange={(open) => !open && setDeletingRequestId(null)}>
                <AlertDialogContent dir="rtl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>هل أنت متأكد من الحذف؟</AlertDialogTitle>
                        <AlertDialogDescription>
                            لا يمكن التراجع عن هذا الإجراء، سيتم حذف الطلب نهائياً.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deletingRequestId && deleteMutation.mutate(deletingRequestId)} className="bg-red-600 hover:bg-red-700">
                            حذف
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
