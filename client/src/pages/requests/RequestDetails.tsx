import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    MapPin,
    Calendar,
    Clock,
    User,
    Phone,
    FileText,
    ArrowRight,
    Loader2,
    DollarSign,
    Save,
    Send,
    MessageSquare,
    CheckCircle2,
    AlertCircle,
    XCircle,
    Trash2,
    Printer,
    Download,
    Check,
    ChevronsUpDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { useState, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import html2canvas from "html2canvas";

// Status Configuration (Reused)
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    "New": { label: "جديد", color: "text-blue-700", bg: "bg-blue-50" },
    "In Progress": { label: "جاري التنفيذ", color: "text-amber-700", bg: "bg-amber-50" },
    "Completed": { label: "مكتمل", color: "text-emerald-700", bg: "bg-emerald-50" },
    "On Hold": { label: "مؤجل", color: "text-slate-700", bg: "bg-slate-100" },
    "Cancelled": { label: "ملغي", color: "text-red-700", bg: "bg-red-50" },
};

const statusIcons: Record<string, any> = {
    New: AlertCircle,
    "In Progress": Clock,
    "On Hold": Clock,
    "Completed": CheckCircle2,
    "Cancelled": XCircle,
};

const formatTime12 = (time24: string) => {
    if (!time24) return "";
    const [hours, minutes] = time24.split(':').map(Number);
    if (isNaN(hours)) return time24;
    const suffix = hours >= 12 ? 'م' : 'ص';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${suffix}`;
};

// Helper for specialization translation
const getTranslatedSpecs = (specsString: string | null) => {
    if (!specsString) return "";
    const specs = specsString.split(',') || [];
    const arabicSpecs: Record<string, string> = {
        Electrical: "كهرباء",
        Plumbing: "سباكة",
        Carpentry: "نجارة",
        Painting: "دهانات",
        AC: "تكييف",
        Cleaning: "نظافة",
        General: "عام"
    };
    return specs.map((s: string) => arabicSpecs[s.trim()] || s).join(' - ');
};

function TimelineItem({
    change,
    isLast,
}: {
    change: any;
    isLast: boolean;
}) {
    const Icon = statusIcons[change.toStatus] || Clock;
    const date = new Date(change.changedAt);

    return (
        <div className="flex gap-4">
            <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-primary" />
                </div>
                {!isLast && <div className="w-0.5 flex-1 bg-border mt-2" />}
            </div>
            <div className="pb-6">
                <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={STATUS_CONFIG[change.fromStatus]?.bg + " " + STATUS_CONFIG[change.fromStatus]?.color}>
                        {STATUS_CONFIG[change.fromStatus]?.label || change.fromStatus}
                    </Badge>
                    <span className="text-muted-foreground">إلى</span>
                    <Badge className={STATUS_CONFIG[change.toStatus]?.bg + " " + STATUS_CONFIG[change.toStatus]?.color}>
                        {STATUS_CONFIG[change.toStatus]?.label || change.toStatus}
                    </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                    {date.toLocaleDateString("ar-EG", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                    })}
                </p>
            </div>
        </div>
    );
}

function AssignmentItem({
    change,
    isLast,
}: {
    change: any;
    isLast: boolean;
}) {
    const date = new Date(change.changedAt);

    return (
        <div className="flex gap-4">
            <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                    <User className="w-4 h-4 text-purple-600" />
                </div>
                {!isLast && <div className="w-0.5 flex-1 bg-border mt-2" />}
            </div>
            <div className="pb-6">
                <div className="flex items-center gap-2 flex-wrap text-sm">
                    <span className="font-medium text-slate-700">{change.fromTechnicianName || "غير معين"}</span>
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                    <span className="font-bold text-slate-900">{change.toTechnicianName}</span>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                    بواسطة: {change.changedByName}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                    {date.toLocaleDateString("ar-EG", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                    })}
                </p>
            </div>
        </div>
    );
}

export default function RequestDetails() {
    const { id } = useParams();
    const [location, setLocation] = useLocation();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [noteText, setNoteText] = useState("");
    const printRef = useRef<HTMLDivElement>(null);

    const { data: request, isLoading } = useQuery<any>({
        queryKey: [`/api/requests/${id}`],
    });

    const { data: notes, isLoading: notesLoading } = useQuery<any[]>({
        queryKey: [`/api/requests/${id}/notes`],
    });

    const { data: statusHistory } = useQuery<any[]>({
        queryKey: [`/api/requests/${id}/status-history`],
    });

    const { data: technicians } = useQuery<any[]>({
        queryKey: ["/api/technicians"],
    });

    const { data: assignments } = useQuery<any[]>({
        queryKey: [`/api/requests/${id}/assignments`],
    });

    const [isChangeTechOpen, setIsChangeTechOpen] = useState(false);

    const updateStatusMutation = useMutation({
        mutationFn: async (status: string) => {
            const res = await apiRequest("PATCH", `/api/requests/${id}/status`, { status });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/requests/${id}`] });
            queryClient.invalidateQueries({ queryKey: [`/api/requests/${id}/status-history`] });
            toast({ title: "تم تحديث الحالة بنجاح" });
        },
        onError: (err: any) => {
            toast({ title: "خطأ", description: err.message, variant: "destructive" });
        }
    });

    const addNoteMutation = useMutation({
        mutationFn: async (text: string) => {
            return apiRequest("POST", `/api/requests/${id}/notes`, { text });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/requests/${id}/notes`] });
            setNoteText("");
            toast({
                title: "تمت إضافة ملاحظة",
                description: "تمت إضافة ملاحظة داخلية",
            });
        },
        onError: () => {
            toast({
                title: "خطأ",
                description: "فشل إضافة ملاحظة",
                variant: "destructive",
            });
        },
    });

    const updateTechnicianMutation = useMutation({
        mutationFn: async (technicianId: number) => {
            const res = await apiRequest("PATCH", `/api/requests/${id}/technician`, { technicianId });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/requests/${id}`] });
            queryClient.invalidateQueries({ queryKey: [`/api/requests/${id}/assignments`] });
            toast({ title: "تم تغيير الفني بنجاح" });
            setIsChangeTechOpen(false);
        },
        onError: (err: any) => {
            toast({ title: "خطأ", description: err.message, variant: "destructive" });
        }
    });

    const { user } = useAuth();
    const canEdit = user?.role === "Admin" || user?.permissions?.includes("edit_request");
    const canDelete = user?.role === "Admin" || user?.permissions?.includes("delete_request");
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const deleteRequestMutation = useMutation({
        mutationFn: async () => {
            await apiRequest("DELETE", `/api/requests/${id}`);
        },
        onSuccess: () => {
            toast({ title: "تم حذف الطلب بنجاح" });
            setLocation("/requests");
        },
        onError: () => {
            toast({ title: "فشل حذف الطلب", variant: "destructive" });
        }
    });

    const handleDownloadImage = async () => {
        if (!printRef.current) return;

        // Temporarily make it visible for capture
        const element = printRef.current;
        const originalDisplay = element.style.display;
        // Remove print-only which has display:none
        element.classList.remove('print-only');
        element.style.display = "block";
        element.style.position = "absolute";
        element.style.top = "0";
        element.style.left = "0";
        element.style.zIndex = "-1000";

        try {
            const canvas = await html2canvas(element, {
                scale: 2, // Better quality
                useCORS: true,
                backgroundColor: "#ffffff",
                windowWidth: element.scrollWidth,
                windowHeight: element.scrollHeight
            });

            const image = canvas.toDataURL("image/png");
            const link = document.createElement("a");
            link.href = image;
            link.download = `request-${request.orderNumber || id}.png`;
            link.click();
        } catch (error) {
            console.error("Error generating image:", error);
            toast({ title: "فشل حفظ الصورة", variant: "destructive" });
        } finally {
            element.classList.add('print-only');
            element.style.display = "";
            element.style.position = "";
            element.style.top = "";
            element.style.left = "";
            element.style.zIndex = "";
        }
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
    }

    if (!request) {
        return <div className="p-8 text-center text-red-500">الطلب غير موجود</div>;
    }

    return (
        <>
            <style>{`
                @media print {
                    @page { size: A4; margin: 0; }
                    body { background: white; margin: 0; padding: 0; }
                    .no-print { display: none !important; }
                    .print-only { display: block !important; }
                }
                .print-only { display: none; }
            `}</style>
            <div className="no-print p-4 md:p-8 space-y-6 md:space-y-8 bg-slate-50 min-h-screen" dir="rtl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" onClick={() => setLocation("/requests")}>
                            <ArrowRight className="h-5 w-5 ml-2" />
                            عودة للقائمة
                        </Button>
                        <h1 className="text-xl md:text-3xl font-bold text-slate-900">تفاصيل الطلب: {request.orderNumber}</h1>
                    </div>

                    <div className="flex gap-2 items-center">
                        {/* Print Button */}
                        {(user?.role === "Admin" || user?.permissions?.includes("print_request")) && (
                            <>
                                <Button variant="outline" size="sm" className="gap-2" onClick={() => window.print()}>
                                    <Printer className="h-4 w-4" />
                                    طباعة الطلب
                                </Button>
                                <Button variant="outline" size="sm" className="gap-2" onClick={handleDownloadImage}>
                                    <Download className="h-4 w-4" />
                                    صورة
                                </Button>
                            </>
                        )}

                        {canDelete && (
                            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="sm" className="gap-2 self-end md:self-auto">
                                        <Trash2 className="h-4 w-4" />
                                        حذف الطلب
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="max-w-md">
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>هل أنت متأكد من حذف هذا الطلب؟</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            سيتم حذف الطلب وجميع البيانات المرتبطة به بشكل نهائي. لا يمكن التراجع عن هذا الإجراء.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => deleteRequestMutation.mutate()} className="bg-red-600 hover:bg-red-700">
                                            تأكيد الحذف
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Info */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card className="shadow-sm">
                            <CardHeader className="border-b pb-4">
                                <CardTitle>معلومات العميل والطلب</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6 grid gap-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-1">
                                        <Label className="text-slate-500 text-xs">اسم العميل</Label>
                                        <div className="flex items-center gap-2 font-medium text-base md:text-lg text-slate-900 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                            <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center border shadow-sm shrink-0">
                                                <User className="h-4 w-4 text-primary" />
                                            </div>
                                            {request.customerName}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-slate-500 text-xs">رقم الهاتف</Label>
                                        <a
                                            href={`tel:${request.customerPhone?.toString().startsWith('0') ? request.customerPhone.toString().replace(/^0/, '+966') : request.customerPhone}`}
                                            className="flex items-center gap-2 font-medium text-base md:text-lg text-slate-900 bg-slate-50 p-2.5 rounded-lg border border-slate-100 hover:bg-slate-100 transition-colors group"
                                            dir="ltr"
                                        >
                                            <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center border shadow-sm shrink-0 group-hover:border-primary/30 transition-colors">
                                                <Phone className="h-4 w-4 text-emerald-600" />
                                            </div>
                                            <span className="flex-1 text-right tracking-wider">
                                                {request.customerPhone?.toString().startsWith('0') ? request.customerPhone.toString().replace(/^0/, '+966 ') : request.customerPhone}
                                            </span>
                                        </a>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-slate-500 text-xs">العنوان / الموقع</Label>
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 font-medium bg-slate-50 p-3 rounded-lg border border-slate-100">
                                        <div className="flex items-start gap-2 flex-1">
                                            <MapPin className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                                            <span className="text-sm md:text-base leading-relaxed">{request.location}</span>
                                        </div>
                                        {request.locationCoordinates && (
                                            <a
                                                href={request.locationCoordinates}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="w-full sm:w-auto text-sm bg-white text-blue-600 border border-blue-200 px-4 py-2 rounded-md hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 shadow-sm"
                                            >
                                                <MapPin className="h-4 w-4" />
                                                فتح الموقع
                                            </a>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-slate-500 text-xs">تفاصيل الطلب</Label>
                                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-slate-700 leading-relaxed text-sm md:text-base min-h-[80px]">
                                        {request.details}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 border-t pt-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-slate-500 text-xs block">تاريخ الزيارة</Label>
                                        <div className="flex items-center gap-2 font-medium text-sm md:text-base">
                                            <Calendar className="h-4 w-4 text-slate-400" />
                                            {format(new Date(request.requestDate), "yyyy/MM/dd")}
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-slate-500 text-xs block">الوقت</Label>
                                        <div className="flex items-center gap-2 font-medium text-sm md:text-base">
                                            <Clock className="h-4 w-4 text-slate-400" />
                                            <span dir="ltr" className="text-right">
                                                {formatTime12(request.startTime)} - {formatTime12(request.endTime)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5 col-span-2 md:col-span-1 border-t md:border-t-0 pt-2 md:pt-0 mt-2 md:mt-0">
                                        <Label className="text-slate-500 text-xs block">طريقة الدفع</Label>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="font-normal gap-1.5 px-3 py-1 text-sm bg-slate-50">
                                                <DollarSign className="h-3.5 w-3.5 text-green-600" />
                                                {request.paymentMethod === "Cash" ? "كاش" : "أونلاين"}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="shadow-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <MessageSquare className="w-5 h-5" />
                                    ملاحظات داخلية
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex gap-3">
                                    <Textarea
                                        value={noteText}
                                        onChange={(e) => setNoteText(e.target.value)}
                                        placeholder="أضف ملاحظة داخلية..."
                                        className="min-h-20 resize-none"
                                    />
                                    <Button
                                        onClick={() => noteText.trim() && addNoteMutation.mutate(noteText.trim())}
                                        disabled={!noteText.trim() || addNoteMutation.isPending}
                                    >
                                        <Send className="w-4 h-4" />
                                    </Button>
                                </div>

                                {notesLoading ? (
                                    <div className="space-y-3">
                                        {[...Array(3)].map((_, i) => (
                                            <Skeleton key={i} className="h-16" />
                                        ))}
                                    </div>
                                ) : notes && notes.length > 0 ? (
                                    <div className="space-y-3">
                                        {notes.map((note) => (
                                            <div
                                                key={note.id}
                                                className="p-4 bg-muted rounded-lg"
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                                                            <User className="w-3 h-3 text-primary" />
                                                        </div>
                                                        <span className="text-sm font-medium">
                                                            {note.authorName || "مستخدم غير معروف"}
                                                        </span>
                                                    </div>
                                                    <span className="text-xs text-muted-foreground">
                                                        {format(new Date(note.createdAt), "yyyy/MM/dd HH:mm")}
                                                    </span>
                                                </div>
                                                <p className="text-sm pr-8">{note.text}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                        <p className="text-sm">لا توجد ملاحظات حتى الآن</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar Info */}
                    <div className="space-y-6">
                        <Card className="shadow-sm">
                            <CardHeader>
                                <CardTitle>حالة الطلب</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-center py-4">
                                    <Badge className={`text-lg px-4 py-1.5 ${STATUS_CONFIG[request.status]?.bg} ${STATUS_CONFIG[request.status]?.color}`}>
                                        {STATUS_CONFIG[request.status]?.label}
                                    </Badge>
                                </div>
                                {canEdit && (
                                    <div className="space-y-2">
                                        <Label>تغيير الحالة</Label>
                                        <Select
                                            value={request.status}
                                            onValueChange={(val) => updateStatusMutation.mutate(val)}
                                            disabled={updateStatusMutation.isPending}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent align="end">
                                                <SelectItem value="New">جديد</SelectItem>
                                                <SelectItem value="In Progress">جاري التنفيذ</SelectItem>
                                                <SelectItem value="Completed">مكتمل</SelectItem>
                                                <SelectItem value="On Hold">مؤجل</SelectItem>
                                                <SelectItem value="Cancelled">ملغي</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="shadow-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Clock className="w-5 h-5" />
                                    الجدول الزمني للحالة
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {statusHistory && statusHistory.length > 0 ? (
                                    <div>
                                        {statusHistory.map((change, index) => (
                                            <TimelineItem
                                                key={change.id}
                                                change={change}
                                                isLast={index === statusHistory.length - 1}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-6 text-muted-foreground">
                                        <Clock className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                        <p className="text-sm">لا توجد تغييرات في الحالة حتى الآن</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="shadow-sm">
                            <CardHeader>
                                <CardTitle>الفني المسؤول</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {request.technicianName ? (
                                    <div className="space-y-4">
                                        <div className="p-4 bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-100 shadow-sm space-y-4">
                                            <div className="flex items-center gap-4">
                                                <div className="relative">
                                                    <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center border-2 border-white shadow-sm">
                                                        <User className="h-7 w-7 text-primary" />
                                                    </div>
                                                    <div className="absolute -bottom-1 -right-1 bg-green-500 h-4 w-4 rounded-full border-2 border-white" title="نشط"></div>
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                                        <h3 className="font-bold text-lg text-slate-900 truncate">
                                                            {request.technicianName}
                                                        </h3>
                                                        {request.supervisorName && (
                                                            <Badge variant="secondary" className="bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-100 px-2 py-0.5 h-6 text-xs font-normal">
                                                                تحت إشراف: {request.supervisorName}
                                                            </Badge>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-2 text-sm text-slate-500">
                                                        <Badge variant="outline" className="font-normal bg-white text-slate-600 border-slate-200">
                                                            {getTranslatedSpecs(request.technicianSpecialization)}
                                                        </Badge>
                                                        <span className="text-slate-300">|</span>
                                                        <span className="text-slate-400 text-xs">فني ميداني</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {request.technicianPhone && (
                                                <a
                                                    href={`tel:${request.technicianPhone.toString().startsWith('0') ? request.technicianPhone.toString().replace(/^0/, '+966') : request.technicianPhone}`}
                                                    className="flex items-center justify-between gap-3 p-3 bg-white rounded-lg border border-slate-100 hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-50/50 transition-all group cursor-pointer w-full"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-9 w-9 rounded-full bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                                                            <Phone className="h-4 w-4 text-emerald-600" />
                                                        </div>
                                                        <div className="flex flex-col items-start">
                                                            <span className="text-xs text-slate-400 font-medium">رقم التواصل</span>
                                                            <span className="text-sm font-bold text-slate-900" dir="ltr">
                                                                {request.technicianPhone.toString().startsWith('0') ? request.technicianPhone.toString().replace(/^0/, '+966 ') : request.technicianPhone}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="bg-slate-50 p-1.5 rounded-md group-hover:bg-emerald-500 group-hover:text-white transition-all text-slate-300">
                                                        <Phone className="h-4 w-4" />
                                                    </div>
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-4 text-slate-500 italic border-2 border-dashed rounded-lg">
                                        لم يتم تعيين فني
                                    </div>
                                )}

                                <div className="mt-4 pt-4 border-t block w-full">
                                    <Dialog open={isChangeTechOpen} onOpenChange={setIsChangeTechOpen}>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" className="w-full gap-2">
                                                <User className="h-4 w-4" />
                                                {request.technicianName ? "تغيير الفني" : "تعيين فني"}
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-[425px]">
                                            <DialogHeader>
                                                <DialogTitle>تغيير الفني المسؤول</DialogTitle>
                                            </DialogHeader>
                                            <div className="py-4 space-y-4">
                                                <div className="space-y-2">
                                                    <Label>اختر الفني البديل</Label>
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <Button
                                                                variant="outline"
                                                                role="combobox"
                                                                className="w-full justify-between"
                                                            >
                                                                {technicians?.find((tech) => tech.id === request.technicianId)?.name || "اختر الفني..."}
                                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-[400px] p-0" align="start">
                                                            <Command dir="rtl">
                                                                <CommandInput placeholder="بحث عن فني..." />
                                                                <CommandList>
                                                                    <CommandEmpty>لا يوجد فني بهذا الاسم.</CommandEmpty>
                                                                    <CommandGroup>
                                                                        {technicians?.filter(t => t.status === 'Active' && t.id !== request.technicianId).map((tech) => (
                                                                            <CommandItem
                                                                                key={tech.id}
                                                                                value={tech.name}
                                                                                onSelect={() => {
                                                                                    updateTechnicianMutation.mutate(tech.id);
                                                                                }}
                                                                            >
                                                                                <Check
                                                                                    className={cn(
                                                                                        "mr-2 h-4 w-4",
                                                                                        request.technicianId === tech.id
                                                                                            ? "opacity-100"
                                                                                            : "opacity-0"
                                                                                    )}
                                                                                />
                                                                                <div className="flex flex-col gap-0.5 mr-2">
                                                                                    <span className="font-medium">{tech.name}</span>
                                                                                    <span className="text-xs text-muted-foreground">{getTranslatedSpecs(tech.specialization)}</span>
                                                                                </div>
                                                                            </CommandItem>
                                                                        ))}
                                                                    </CommandGroup>
                                                                </CommandList>
                                                            </Command>
                                                        </PopoverContent>
                                                    </Popover>
                                                </div>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </div>

                                {assignments && assignments.length > 0 && (
                                    <div className="mt-6">
                                        <Label className="text-xs text-slate-500 mb-3 block">سجل تغييرات الفنيين</Label>
                                        <div className="space-y-0">
                                            {assignments.map((change, index) => (
                                                <AssignmentItem
                                                    key={change.id}
                                                    change={change}
                                                    isLast={index === assignments.length - 1}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Print View */}
            <div ref={printRef} className="print-only bg-white w-full h-full min-h-screen p-8" dir="rtl">
                {/* Header */}
                <div className="flex justify-between items-center border-b-2 border-slate-800 pb-6 mb-8">
                    <div className="flex flex-col gap-2">
                        <h1 className="text-3xl font-bold text-slate-900">تفاصيل طلب خدمة</h1>
                        <p className="text-slate-600">رقم الطلب: #{request.orderNumber || request.id}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <img src="/logo.png" alt="Logo" className="h-16 w-auto object-contain" />
                        <span className="text-sm font-bold text-slate-900">نظام فزاع برو</span>
                    </div>
                </div>

                {/* Grid Layout */}
                <div className="grid grid-cols-2 gap-8">
                    {/* Customer Info */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold border-b pb-2 text-slate-800 flex items-center gap-2">
                            <User className="w-5 h-5" />
                            بيانات العميل
                        </h3>
                        <div className="grid grid-cols-[100px_1fr] gap-2 text-sm">
                            <span className="text-slate-500">الاسم:</span>
                            <span className="font-semibold">{request.customerName}</span>

                            <span className="text-slate-500">رقم الهاتف:</span>
                            <span className="font-semibold" dir="ltr">{request.customerPhone}</span>

                            <span className="text-slate-500">العنوان:</span>
                            <span className="font-semibold">{request.location}</span>
                        </div>
                    </div>

                    {/* Request Info */}
                    <div className="space-y-4" >
                        <h3 className="text-lg font-bold border-b pb-2 text-slate-800 flex items-center gap-2">
                            <FileText className="w-5 h-5" />
                            بيانات الطلب
                        </h3>
                        <div className="grid grid-cols-[100px_1fr] gap-2 text-sm">
                            <span className="text-slate-500">تاريخ الطلب:</span>
                            <span className="font-semibold">{new Date(request.requestDate).toLocaleDateString('ar-EG')}</span>

                            <span className="text-slate-500">الوقت:</span>
                            <span className="font-semibold">{formatTime12(request.startTime)} - {formatTime12(request.endTime)}</span>

                            <span className="text-slate-500">الحالة:</span>
                            <span className="font-semibold">{STATUS_CONFIG[request.status]?.label}</span>
                        </div>
                    </div>
                </div>

                {/* Description */}
                <div className="mt-8 space-y-4" >
                    <h3 className="text-lg font-bold border-b pb-2 text-slate-800">وصف المشكلة</h3>
                    <div className="p-4 bg-slate-50 rounded border border-slate-200 text-slate-700 leading-relaxed min-h-[100px]">
                        {request.details || "لا يوجد وصف"}
                    </div>
                </div>

                {/* Technician Info */}
                <div className="mt-8 space-y-4" >
                    <h3 className="text-lg font-bold border-b pb-2 text-slate-800 flex items-center gap-2">
                        <Badge variant="outline" className="text-slate-800 border-slate-800">بيانات الفني</Badge>
                    </h3>
                    {
                        request.technicianName ? (
                            <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded border">
                                <div>
                                    <span className="text-slate-500 block mb-1">اسم الفني:</span>
                                    <span className="font-bold text-lg">{request.technicianName}</span>
                                </div>
                                <div>
                                    <span className="text-slate-500 block mb-1">رقم الهاتف:</span>
                                    <span className="font-semibold" dir="ltr">{request.technicianPhone}</span>
                                </div>
                                <div className="col-span-2">
                                    <span className="text-slate-500 block mb-1">التخصص:</span>
                                    <span className="font-semibold">{getTranslatedSpecs(request.technicianSpecialization)}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 text-slate-500 italic text-center border border-dashed rounded">لم يتم تعيين فني بعد</div>
                        )
                    }
                </div>

                {/* Footer */}
                <div className="fixed bottom-0 left-0 right-0 p-8 border-t text-center text-xs text-slate-400" >
                    تم طباعة هذا الطلب بتاريخ {new Date().toLocaleDateString('ar-EG')}
                </div>
            </div>
        </>
    );
}
