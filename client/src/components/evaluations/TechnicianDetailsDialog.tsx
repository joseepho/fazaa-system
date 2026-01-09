
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, Clock, User, MessageSquare, ClipboardCheck, AlertTriangle, Calendar, X, Eye } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";
import { DetailedEvaluationForm } from "./DetailedEvaluationForm";
import { DetailedEvaluation } from "@shared/schema";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface Evaluation {
    id: number;
    complaintId: number;
    technicianId: number;
    evaluatorId: number;
    ratingPunctuality: number;
    ratingQuality: number;
    ratingBehavior: number;
    ratingOverall: number;
    notes: string | null;
    createdAt: string;
    evaluatorName: string | null;
    complaintTitle: string | null;
}

type ExtendedDetailedEvaluation = DetailedEvaluation & { evaluatorName: string | null };

interface TechnicianDetailsDialogProps {
    technicianId: number | null;
    technicianName: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function TechnicianDetailsDialog({
    technicianId,
    technicianName,
    open,
    onOpenChange
}: TechnicianDetailsDialogProps) {
    const [activeTab, setActiveTab] = useState("history");
    const [modalEvaluation, setModalEvaluation] = useState<ExtendedDetailedEvaluation | null>(null);

    const { data: legacyEvaluations, isLoading: isLoadingLegacy } = useQuery<Evaluation[]>({
        queryKey: [`/api/users/${technicianId}/evaluations`],
        enabled: !!technicianId && open,
    });

    const { data: detailedEvaluations, isLoading: isLoadingDetailed } = useQuery<ExtendedDetailedEvaluation[]>({
        queryKey: [`/api/field-technicians/${technicianId}/evaluations/detailed`],
        enabled: !!technicianId && open,
    });

    const isLoading = isLoadingLegacy || isLoadingDetailed;

    // Grouping Logic
    const groupedEvaluations = detailedEvaluations?.reduce((groups, evalItem) => {
        const date = evalItem.orderDate; // YYYY-MM-DD
        if (!groups[date]) groups[date] = [];
        groups[date].push(evalItem);
        return groups;
    }, {} as Record<string, ExtendedDetailedEvaluation[]>);

    const sortedDates = Object.keys(groupedEvaluations || {}).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    const getDayAvg = (items: ExtendedDetailedEvaluation[]) => {
        if (!items.length) return 0;
        const total = items.reduce((sum, item) => {
            return sum + ((
                item.ratingPunctuality +
                item.ratingDiagnosis +
                item.ratingQuality +
                item.ratingSpeed +
                item.ratingPricing +
                item.ratingAppearance
            ) / 6);
        }, 0);
        return (total / items.length).toFixed(1);
    }

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden bg-slate-50" dir="rtl">
                    <DialogHeader className="p-6 pb-4 border-b border-slate-200 bg-white shrink-0">
                        <DialogTitle className="text-2xl font-bold flex items-center gap-2 text-slate-900">
                            <User className="w-6 h-6 text-primary" />
                            ملف الفني: {technicianName}
                        </DialogTitle>
                        <DialogDescription>
                            إدارة السجل المهني والتقييمات اليومية
                        </DialogDescription>
                    </DialogHeader>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden min-h-0">
                        <div className="px-6 pt-2 bg-white border-b border-slate-200 shrink-0">
                            <TabsList className="w-full justify-start md:w-auto grid grid-cols-2 md:inline-flex h-auto bg-transparent p-0 gap-6">
                                <TabsTrigger
                                    value="history"
                                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 pt-2 text-slate-500 data-[state=active]:text-primary font-medium"
                                >
                                    <ClipboardCheck className="w-4 h-4 ml-2" />
                                    سجل التقييمات
                                </TabsTrigger>
                                <TabsTrigger
                                    value="new"
                                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 pt-2 text-slate-500 data-[state=active]:text-primary font-medium"
                                >
                                    <Star className="w-4 h-4 ml-2" />
                                    إضافة تقييم جديد
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="history" className="flex-1 h-full overflow-hidden m-0 p-0 relative">
                            <div className="h-full overflow-y-auto p-6">
                                {isLoading ? (
                                    <div className="flex justify-center p-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                    </div>
                                ) : (
                                    <div className="space-y-6 pb-6">
                                        {/* Detailed Evaluations List Grouped */}
                                        {groupedEvaluations && sortedDates.length > 0 && (
                                            <div className="space-y-6">
                                                {sortedDates.map((date) => (
                                                    <div key={date} className="space-y-4">
                                                        <div className="flex items-center justify-between py-2 border-b border-slate-200 bg-white/50 px-3 rounded-lg sticky top-0 z-10 backdrop-blur-sm">
                                                            <div className="flex items-center gap-4">
                                                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                                                    <Calendar className="w-5 h-5 text-indigo-500" />
                                                                    {format(new Date(date), "EEEE, d MMMM yyyy", { locale: arSA })}
                                                                </h3>
                                                                <Badge variant="secondary" className="font-normal text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100">
                                                                    {groupedEvaluations[date].length} تقييمات
                                                                </Badge>
                                                            </div>
                                                            <div className="flex items-center gap-2 bg-yellow-50 px-3 py-1 rounded-md border border-yellow-100">
                                                                <span className="text-sm font-medium text-slate-600">متوسط اليوم:</span>
                                                                <span className="text-lg font-bold text-yellow-700">{getDayAvg(groupedEvaluations[date])}</span>
                                                                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-1 gap-4 pr-0 md:pr-4 md:border-r-2 border-indigo-100 mr-2">
                                                            {groupedEvaluations[date].map(evalItem => (
                                                                <div
                                                                    key={evalItem.id}
                                                                    onClick={() => setModalEvaluation(evalItem)}
                                                                    className="cursor-pointer transition-transform hover:scale-[1.01] active:scale-[0.99] duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-lg select-none"
                                                                    role="button"
                                                                    tabIndex={0}
                                                                >
                                                                    <DetailedEvaluationCard evaluation={evalItem} />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Legacy Evaluations List */}
                                        {legacyEvaluations && legacyEvaluations.length > 0 && (
                                            <div className="space-y-4 pt-8 border-t-2 border-slate-200 border-dashed">
                                                <h3 className="font-bold text-slate-500 flex items-center gap-2 text-sm uppercase tracking-wider">
                                                    <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                                                    الأرشيف القديم
                                                </h3>
                                                {legacyEvaluations.map((evalItem) => (
                                                    <LegacyEvaluationCard key={evalItem.id} evaluation={evalItem} />
                                                ))}
                                            </div>
                                        )}

                                        {(!detailedEvaluations?.length && !legacyEvaluations?.length) && (
                                            <div className="text-center py-12 text-slate-400">
                                                <p>لا توجد تقييمات سابقة لهذا الفني</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="new" className="flex-1 h-full overflow-hidden m-0 p-0 bg-slate-50 relative">
                            <div className="h-full overflow-y-auto p-6">
                                {technicianId && (
                                    <DetailedEvaluationForm
                                        technicianId={technicianId}
                                        onSuccess={() => setActiveTab("history")}
                                        onCancel={() => setActiveTab("history")}
                                    />
                                )}
                            </div>
                        </TabsContent>
                    </Tabs>
                </DialogContent>
            </Dialog>

            {/* Evaluation Details Popup */}
            {modalEvaluation && (
                <EvaluationDetailsModal
                    evaluation={modalEvaluation}
                    open={!!modalEvaluation}
                    onOpenChange={(open) => !open && setModalEvaluation(null)}
                />
            )}
        </>
    );
}

function EvaluationDetailsModal({ evaluation, open, onOpenChange }: { evaluation: ExtendedDetailedEvaluation, open: boolean, onOpenChange: (open: boolean) => void }) {
    const avg = ((
        evaluation.ratingPunctuality +
        evaluation.ratingDiagnosis +
        evaluation.ratingQuality +
        evaluation.ratingSpeed +
        evaluation.ratingPricing +
        evaluation.ratingAppearance
    ) / 6).toFixed(1);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl bg-white p-0 overflow-hidden" dir="rtl">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            تفاصيل التقييم
                            <Badge variant="outline" className="font-normal text-slate-500 bg-white">
                                {evaluation.orderNumber.startsWith("DAILY") ? "تقييم يومي" : `#${evaluation.orderNumber}`}
                            </Badge>
                        </DialogTitle>
                        <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5" />
                            {format(new Date(evaluation.orderDate), "PPP", { locale: arSA })}
                        </p>
                    </div>
                    <div className="flex flex-col items-center justify-center bg-white p-2 rounded-lg border border-indigo-100 shadow-sm min-w-[70px]">
                        <span className="text-2xl font-bold text-indigo-700">{avg}</span>
                        <div className="flex text-yellow-400 gap-0.5">
                            <Star className="w-3 h-3 fill-current" />
                        </div>
                    </div>
                </div>

                <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
                    {/* Main Metrics Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <MetricCard label="الالتزام بالمواعيد" value={evaluation.ratingPunctuality} max={5} />
                        <MetricCard label="جودة العمل" value={evaluation.ratingQuality} max={5} />
                        <MetricCard label="التشخيص وحل المشكلة" value={evaluation.ratingDiagnosis} max={5} />
                        <MetricCard label="سرعة الإنجاز" value={evaluation.ratingSpeed} max={5} />
                        <MetricCard label="التسعير والشفافية" value={evaluation.ratingPricing} max={5} />
                        <MetricCard label="المظهر العام" value={evaluation.ratingAppearance} max={5} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <h4 className="text-sm font-semibold text-slate-700 mb-2">السلوك الاحترافي</h4>
                            <ul className="space-y-2 text-sm text-slate-600">
                                <li className="flex items-center gap-2">
                                    {evaluation.behaviorRespect ? <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center"><ClipboardCheck className="w-3 h-3 text-white" /></div> : <div className="w-4 h-4 rounded-full bg-slate-200" />}
                                    الاحترام وحسن التعامل
                                </li>
                                <li className="flex items-center gap-2">
                                    {evaluation.behaviorExplain ? <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center"><ClipboardCheck className="w-3 h-3 text-white" /></div> : <div className="w-4 h-4 rounded-full bg-slate-200" />}
                                    شرح المشكلة للعميل
                                </li>
                                <li className="flex items-center gap-2">
                                    {evaluation.behaviorClean ? <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center"><ClipboardCheck className="w-3 h-3 text-white" /></div> : <div className="w-4 h-4 rounded-full bg-slate-200" />}
                                    نظافة مكان العمل
                                </li>
                            </ul>
                        </div>

                        <div className="space-y-2">
                            <div className={`p-3 rounded-lg border flex items-center justify-between ${evaluation.firstTimeFixed ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-orange-50 border-orange-100 text-orange-700"}`}>
                                <span className="font-medium text-sm">هل تم الإصلاح من أول زيارة؟</span>
                                <span className="font-bold">{evaluation.firstTimeFixed ? "نعم" : "لا"}</span>
                            </div>
                            <div className="p-3 rounded-lg border bg-slate-50 border-slate-100 flex items-center justify-between text-slate-700">
                                <span className="font-medium text-sm">نوع الصيانة</span>
                                <span className="font-bold">{evaluation.serviceType}</span>
                            </div>
                        </div>
                    </div>

                    {(evaluation.technicalErrors || evaluation.behavioralNotes) && (
                        <div className="space-y-3 pt-2">
                            {evaluation.technicalErrors && (
                                <div className="bg-red-50 border border-red-100 p-3 rounded-lg text-sm">
                                    <h4 className="font-bold text-red-700 flex items-center gap-2 mb-1">
                                        <AlertTriangle className="w-4 h-4" />
                                        أخطاء فنية
                                    </h4>
                                    <p className="text-red-800">{evaluation.technicalErrors}</p>
                                </div>
                            )}

                            {evaluation.behavioralNotes && (
                                <div className="bg-amber-50 border border-amber-100 p-3 rounded-lg text-sm">
                                    <h4 className="font-bold text-amber-700 flex items-center gap-2 mb-1">
                                        <MessageSquare className="w-4 h-4" />
                                        ملاحظات سلوكية
                                    </h4>
                                    <p className="text-amber-800">{evaluation.behavioralNotes}</p>
                                </div>
                            )}

                            {/* Client Feedback Removed - Not in Schema */}
                        </div>
                    )}
                </div>

                <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-between items-center text-sm text-slate-500">
                    <div className="flex flex-col gap-0.5">
                        <span className="text-xs">تم التقييم بواسطة</span>
                        <span className="font-medium text-slate-700">{evaluation.evaluatorName}</span>
                    </div>
                    <div className="flex flex-col gap-0.5 items-end text-right">
                        <span className="text-xs">وقت التقييم</span>
                        <span className="font-medium text-slate-700" dir="ltr">{format(new Date(evaluation.createdAt), "p yyyy/MM/dd", { locale: arSA })}</span>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function MetricCard({ label, value, max }: { label: string, value: number, max: number }) {
    return (
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
            <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-slate-500 font-medium">{label}</span>
                <span className="font-bold text-slate-800">{value}/{max}</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                <div
                    className={`h-full rounded-full ${value >= 4 ? 'bg-emerald-500' : value >= 3 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${(value / max) * 100}%` }}
                />
            </div>
        </div>
    );
}

function LegacyEvaluationCard({ evaluation }: { evaluation: Evaluation }) {
    return (
        <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm opacity-80 hover:opacity-100 transition-opacity">
            <div className="flex justify-between items-start mb-3">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200">
                            <span className="font-medium">أرشيف: {evaluation.complaintTitle || `#${evaluation.complaintId}`}</span>
                        </Badge>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(evaluation.createdAt), "PPP", { locale: arSA })}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                    <span className="font-bold text-slate-700">{evaluation.ratingOverall}</span>
                    <Star className="w-4 h-4 text-slate-400 fill-slate-400" />
                </div>
            </div>

            {evaluation.notes && (
                <div className="flex gap-2 items-start mt-2 p-3 bg-slate-50 rounded text-sm text-slate-600">
                    <MessageSquare className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <p>{evaluation.notes}</p>
                </div>
            )}
        </div>
    );
}

function DetailedEvaluationCard({ evaluation }: { evaluation: ExtendedDetailedEvaluation }) {
    // Calculate average for display
    const avg = ((
        evaluation.ratingPunctuality +
        evaluation.ratingDiagnosis +
        evaluation.ratingQuality +
        evaluation.ratingSpeed +
        evaluation.ratingPricing +
        evaluation.ratingAppearance
    ) / 6).toFixed(1);

    return (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow hover:border-indigo-200 group">
            <div className="p-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center group-hover:bg-indigo-50/30 transition-colors">
                <div className="flex gap-3 items-center">
                    <Badge variant={evaluation.firstTimeFixed ? "default" : "destructive"} className={evaluation.firstTimeFixed ? "bg-emerald-500 hover:bg-emerald-600" : ""}>
                        {evaluation.firstTimeFixed ? "إصلاح فوري" : "إعادة زيارة"}
                    </Badge>
                    <span className="font-bold text-slate-700 text-sm">
                        {evaluation.orderNumber.startsWith("DAILY") ? "تقييم يومي" : `طلب #${evaluation.orderNumber}`}
                    </span>
                    <span className="text-xs text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">{evaluation.serviceType}</span>
                </div>
                <Eye className="w-4 h-4 text-slate-300 group-hover:text-indigo-400" />
            </div>

            <div className="p-4">
                <div className="flex justify-between items-start mb-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 text-sm w-full pointer-events-none">
                        <div className="flex justify-between">
                            <span className="text-slate-500">جودة العمل:</span>
                            <span className="font-semibold text-slate-700">{evaluation.ratingQuality}/5</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">الموعد:</span>
                            <span className="font-semibold text-slate-700">{evaluation.ratingPunctuality}/5</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">السلوك:</span>
                            <span className="font-semibold text-slate-700">
                                {[evaluation.behaviorRespect, evaluation.behaviorExplain, evaluation.behaviorClean].filter(Boolean).length}/3
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">التسعير:</span>
                            <span className="font-semibold text-slate-700">{evaluation.ratingPricing}/5</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">التشخيص:</span>
                            <span className="font-semibold text-slate-700">{evaluation.ratingDiagnosis}/5</span>
                        </div>
                    </div>

                    <div className="flex flex-col items-center justify-center bg-indigo-50 p-2 rounded-lg border border-indigo-100 min-w-[70px] mr-4">
                        <span className="text-xl font-bold text-indigo-700">{avg}</span>
                        <div className="flex text-yellow-400 gap-0.5">
                            <Star className="w-3 h-3 fill-current" />
                        </div>
                    </div>
                </div>

                {(evaluation.technicalErrors || evaluation.behavioralNotes) && (
                    <div className="space-y-2 mt-4 pt-3 border-t border-slate-100 pointer-events-none">
                        {evaluation.technicalErrors && (
                            <div className="flex gap-2 items-start text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100">
                                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                <p className="line-clamp-1"><span className="font-bold ml-1">أخطاء فنية:</span> {evaluation.technicalErrors}</p>
                            </div>
                        )}
                        {evaluation.behavioralNotes && (
                            <div className="flex gap-2 items-start text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-100">
                                <MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                <p className="line-clamp-1"><span className="font-bold ml-1">ملاحظات سلوكية:</span> {evaluation.behavioralNotes}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="bg-slate-50 border-t border-slate-100 p-2 px-4 flex justify-between items-center text-xs text-slate-500 pointer-events-none">
                <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    بواسطة: <span className="font-medium text-slate-700">{evaluation.evaluatorName || "غير معروف"}</span>
                </span>
                <span className="flex items-center gap-1" dir="ltr">
                    <Clock className="w-3 h-3" />
                    {format(new Date(evaluation.createdAt), "p", { locale: arSA })}
                </span>
            </div>
        </div>
    );
}
