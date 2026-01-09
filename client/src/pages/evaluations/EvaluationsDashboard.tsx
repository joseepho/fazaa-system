import { useQuery } from "@tanstack/react-query";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Star,
    Search,
    User,
    Trophy,
    TrendingUp,
    AlertCircle,
    Calendar,
    Zap,
    Droplets,
    Hammer,
    Paintbrush,
    Snowflake,
    Sparkles,
    Wrench,
    HelpCircle,
    Filter,
    ArrowUpDown,
    Percent,
    Award
} from "lucide-react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar
} from "recharts";
import { useState } from "react";
import { motion } from "framer-motion";
import { TechnicianDetailsDialog } from "@/components/evaluations/TechnicianDetailsDialog";
import { AddTechnicianDialog } from "@/components/evaluations/AddTechnicianDialog";
import { useAuth } from "@/hooks/use-auth";

interface TechnicianStats {
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

export default function EvaluationsDashboard() {
    const [searchTerm, setSearchTerm] = useState("");
    const [specializationFilter, setSpecializationFilter] = useState("All");
    const [sortBy, setSortBy] = useState<"rating" | "evaluations" | "rework">("rating");
    const [selectedTechnician, setSelectedTechnician] = useState<{ id: number, name: string } | null>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const { user } = useAuth();

    const hasPermission = (permission: string) => {
        if (!user) return false;
        if (user.role === "Admin") return true;
        return user.permissions?.includes(permission) || false;
    };

    if (!hasPermission("view_evaluations_page") && !hasPermission("view_evaluations") && !hasPermission("view_technicians")) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-slate-800">غير مصرح لك بالوصول</h2>
                    <p className="text-slate-500 mt-2">عذراً، ليس لديك الصلاحية لعرض هذه الصفحة</p>
                </div>
            </div>
        );
    }

    const { data: stats, isLoading } = useQuery<TechnicianStats[]>({
        queryKey: ["/api/evaluations/stats"],
    });

    // Ensure stats is not undefined for following calculations
    const safeStats = stats || [];

    const filteredStats = safeStats.filter(tech => {
        const matchesSearch = tech.technicianName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesSpec = specializationFilter === "All" || tech.specialization === specializationFilter;
        return matchesSearch && matchesSpec;
    }).sort((a, b) => {
        if (sortBy === "rating") return b.avgOverall - a.avgOverall;
        if (sortBy === "evaluations") return b.totalEvaluations - a.totalEvaluations;
        if (sortBy === "rework") return a.reworkRate - b.reworkRate; // Lower is better
        return 0;
    }) || [];

    // Charts Data Calculation
    const radarData = [
        { subject: 'الالتزام', A: safeStats.reduce((acc, curr) => acc + curr.avgPunctuality, 0) / (safeStats.length || 1), fullMark: 5 },
        { subject: 'الجودة', A: safeStats.reduce((acc, curr) => acc + curr.avgQuality, 0) / (safeStats.length || 1), fullMark: 5 },
        { subject: 'السلوك', A: safeStats.reduce((acc, curr) => acc + curr.avgBehavior, 0) / (safeStats.length || 1), fullMark: 5 },
        { subject: 'الرضا', A: (safeStats.reduce((acc, curr) => acc + curr.customerSatisfactionRate, 0) / (safeStats.length || 1)) / 20, fullMark: 5 }, // Scale 100 to 5
        { subject: 'السرعة', A: safeStats.reduce((acc, curr) => acc + curr.avgOverall, 0) / (safeStats.length || 1), fullMark: 5 },
    ];

    const chartData = filteredStats.slice(0, 5).map(tech => ({
        name: tech.technicianName,
        rating: tech.avgOverall,
        evaluations: tech.totalEvaluations
    }));

    const specializations = [
        { id: "All", label: "الكل", icon: Filter, color: "bg-slate-100 text-slate-600" },
        { id: "Electrical", label: "كهرباء", icon: Zap, color: "bg-yellow-100 text-yellow-700" },
        { id: "Plumbing", label: "سباكة", icon: Droplets, color: "bg-blue-100 text-blue-700" },
        { id: "Carpentry", label: "نجارة", icon: Hammer, color: "bg-amber-100 text-amber-700" },
        { id: "Painting", label: "دهانات", icon: Paintbrush, color: "bg-purple-100 text-purple-700" },
        { id: "AC", label: "تكييف", icon: Snowflake, color: "bg-cyan-100 text-cyan-700" },
        { id: "Cleaning", label: "نظافة", icon: Sparkles, color: "bg-emerald-100 text-emerald-700" },
        { id: "General", label: "عام", icon: Wrench, color: "bg-gray-100 text-gray-700" },
    ];

    const getSpecIcon = (specId: string) => {
        const spec = specializations.find(s => s.id === specId);
        return spec ? spec.icon : HelpCircle;
    };

    const getSpecLabel = (specId: string) => {
        const spec = specializations.find(s => s.id === specId);
        return spec ? spec.label : specId;
    };

    const getSpecColor = (specId: string) => {
        const spec = specializations.find(s => s.id === specId);
        return spec ? spec.color : "bg-slate-100 text-slate-600";
    };

    const topPerformer = safeStats.reduce((prev, current) =>
        (prev.avgOverall > current.avgOverall) ? prev : current
        , safeStats[0]);

    const totalEvaluations = safeStats.reduce((acc, curr) => acc + curr.totalEvaluations, 0) || 0;
    const averageRating = safeStats.length
        ? (safeStats.reduce((acc, curr) => acc + curr.avgOverall, 0) / safeStats.length).toFixed(1)
        : "0.0";

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const item = {
        hidden: { y: 20, opacity: 0 },
        show: { y: 0, opacity: 1 }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8 bg-slate-50 min-h-screen" dir="rtl">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">تقييمات الفنيين</h1>
                    <p className="text-slate-500 mt-1">متابعة أداء الفنيين والتقييمات ومؤشرات الجودة</p>
                </div>

                <div className="flex flex-col md:flex-row gap-4 items-center w-full md:w-auto">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="بحث عن فني..."
                            className="pr-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {hasPermission("manage_technicians") && <AddTechnicianDialog />}
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-none text-white overflow-hidden relative">
                        <div className="absolute top-0 left-0 w-full h-full bg-white/10 transform rotate-12 scale-150 translate-x-1/2 translate-y-1/2 rounded-full" />
                        <CardContent className="p-6 relative">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-blue-100 font-medium mb-1">إجمالي التقييمات</p>
                                    <h3 className="text-4xl font-bold">{totalEvaluations}</h3>
                                </div>
                                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                    <Star className="h-6 w-6 text-yellow-300 fill-yellow-300" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 border-none text-white overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-full h-full bg-white/10 transform -rotate-12 scale-150 -translate-x-1/2 translate-y-1/2 rounded-full" />
                        <CardContent className="p-6 relative">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-emerald-100 font-medium mb-1">متوسط الأداء العام</p>
                                    <h3 className="text-4xl font-bold">{averageRating}</h3>
                                </div>
                                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                    <TrendingUp className="h-6 w-6 text-emerald-100" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <Card className="bg-gradient-to-br from-amber-500 to-amber-600 border-none text-white overflow-hidden relative">
                        <div className="absolute bottom-0 right-0 w-full h-full bg-white/10 transform rotate-45 scale-150 translate-x-1/2 translate-y-1/2 rounded-full" />
                        <CardContent className="p-6 relative">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-amber-100 font-medium mb-1">الأفضل أداءً</p>
                                    <h3 className="text-xl font-bold truncate max-w-[150px]">
                                        {topPerformer ? topPerformer.technicianName : "لا يوجد"}
                                    </h3>
                                    <div className="flex items-center gap-1 mt-1 text-amber-100">
                                        <Star className="h-3 w-3 fill-current" />
                                        <span className="text-sm">{topPerformer ? topPerformer.avgOverall.toFixed(1) : "0.0"}</span>
                                    </div>
                                </div>
                                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                    <Trophy className="h-6 w-6 text-amber-100" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            {/* Performance Analytics Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-primary" />
                            مؤشرات الأداء العامة
                        </CardTitle>
                        <CardDescription>تحليل الأداء عبر الأبعاد المختلفة</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px] flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                <PolarGrid stroke="#e2e8f0" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 5]} tick={false} axisLine={false} />
                                <Radar
                                    name="Average"
                                    dataKey="A"
                                    stroke="#0066CC"
                                    fill="#0066CC"
                                    fillOpacity={0.3}
                                />
                                <Tooltip />
                            </RadarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-2 shadow-sm">
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Award className="w-5 h-5 text-amber-500" />
                                أفضل الفنيين أداءً
                            </CardTitle>
                            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="ترتيب حسب" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="rating">الأعلى تقييماً</SelectItem>
                                    <SelectItem value="evaluations">الأكثر نشاطاً</SelectItem>
                                    <SelectItem value="rework">الأقل إعادة عمل</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                <YAxis domain={[0, 5]} />
                                <Tooltip
                                    cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                />
                                <Bar dataKey="rating" fill="#0066CC" radius={[4, 4, 0, 0]} barSize={40} name="التقييم العام" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Specialization Filters */}
            <div className="flex overflow-x-auto pb-4 gap-3 no-scrollbar">
                {specializations.map((spec) => (
                    <button
                        key={spec.id}
                        onClick={() => setSpecializationFilter(spec.id)}
                        className={`
                            flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap
                            ${specializationFilter === spec.id
                                ? "bg-primary text-white shadow-md ring-2 ring-primary/20"
                                : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"}
                        `}
                    >
                        <spec.icon className={`h-4 w-4 ${specializationFilter === spec.id ? "text-white" : ""}`} />
                        {spec.label}
                    </button>
                ))}
            </div>

            {/* Main Content Grid */}
            <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
            >
                {filteredStats.map((tech) => (
                    <motion.div key={tech.technicianId} variants={item}>
                        <Card className="hover:shadow-lg transition-all duration-300 border-slate-200 overflow-hidden group">
                            <CardHeader className="pb-4 border-b border-slate-100 bg-slate-50/50">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center border-2 border-white shadow-sm">
                                            <User className="h-6 w-6 text-primary" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg font-bold text-slate-800">{tech.technicianName}</CardTitle>
                                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                <Badge variant="secondary" className={`text-xs font-normal gap-1 ${getSpecColor(tech.specialization)} border-none`}>
                                                    {(() => {
                                                        const Icon = getSpecIcon(tech.specialization);
                                                        return <Icon className="h-3 w-3" />;
                                                    })()}
                                                    {getSpecLabel(tech.specialization)}
                                                </Badge>
                                                <Badge variant="outline" className={`text-xs ${tech.classification === "ممتاز" ? "border-emerald-200 text-emerald-700 bg-emerald-50" :
                                                    tech.classification === "جيد جداً" ? "border-blue-200 text-blue-700 bg-blue-50" :
                                                        tech.classification === "يحتاج تحسين" ? "border-amber-200 text-amber-700 bg-amber-50" :
                                                            "border-slate-200 text-slate-600"
                                                    }`}>
                                                    {tech.classification}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-1 mt-1">
                                                <span className="text-slate-400 text-xs text-xs">{tech.totalEvaluations} تقييم</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-2xl font-bold text-slate-800">{tech.avgOverall.toFixed(1)}</span>
                                            <span className="text-sm text-slate-400">/5</span>
                                        </div>
                                        <div className="flex gap-0.5 mt-1">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <Star
                                                    key={star}
                                                    className={`h-3 w-3 ${star <= Math.round(tech.avgOverall)
                                                        ? "text-yellow-400 fill-yellow-400"
                                                        : "text-slate-200 fill-slate-200"
                                                        }`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6 space-y-4">
                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-600">الالتزام بالمواعيد</span>
                                            <span className="font-medium text-slate-900">{tech.avgPunctuality.toFixed(1)}</span>
                                        </div>
                                        <Progress value={(tech.avgPunctuality / 5) * 100} className="h-2 bg-slate-100" />
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-600">جودة العمل</span>
                                            <span className="font-medium text-slate-900">{tech.avgQuality.toFixed(1)}</span>
                                        </div>
                                        <Progress value={(tech.avgQuality / 5) * 100} className="h-2 bg-slate-100" />
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-600">السلوك والمظهر</span>
                                            <span className="font-medium text-slate-900">{tech.avgBehavior.toFixed(1)}</span>
                                        </div>
                                        <Progress value={(tech.avgBehavior / 5) * 100} className="h-2 bg-slate-100" />
                                    </div>
                                </div>

                                {/* Advanced Metrics */}
                                <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-50">
                                    <div className="bg-slate-50 p-2 rounded-lg text-center">
                                        <div className="flex items-center justify-center gap-1 text-slate-500 text-xs mb-1">
                                            <Percent className="w-3 h-3" />
                                            <span>نسبة الرضا</span>
                                        </div>
                                        <span className={`font-bold ${tech.customerSatisfactionRate >= 80 ? "text-emerald-600" : "text-amber-600"}`}>
                                            {tech.customerSatisfactionRate.toFixed(0)}%
                                        </span>
                                    </div>
                                    <div className="bg-slate-50 p-2 rounded-lg text-center">
                                        <div className="flex items-center justify-center gap-1 text-slate-500 text-xs mb-1">
                                            <AlertCircle className="w-3 h-3" />
                                            <span>إعادة العمل</span>
                                        </div>
                                        <span className={`font-bold ${tech.reworkRate <= 5 ? "text-emerald-600" : "text-red-500"}`}>
                                            {tech.reworkRate.toFixed(1)}%
                                        </span>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-slate-500 hover:text-primary hover:bg-primary/5 w-full"
                                        onClick={() => {
                                            setSelectedTechnician({ id: tech.technicianId, name: tech.technicianName });
                                            setDetailsOpen(true);
                                        }}
                                    >
                                        عرض التفاصيل والسجل
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </motion.div>

            <TechnicianDetailsDialog
                technicianId={selectedTechnician?.id || null}
                technicianName={selectedTechnician?.name || ""}
                open={detailsOpen}
                onOpenChange={setDetailsOpen}
            />
        </div>
    );
}
