
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star } from "lucide-react";
import { format } from "date-fns";

interface DetailedEvaluationFormProps {
    technicianId: number;
    onSuccess?: () => void;
    onCancel?: () => void;
}

export function DetailedEvaluationForm({ technicianId, onSuccess, onCancel }: DetailedEvaluationFormProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isDaily, setIsDaily] = useState(false);

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await apiRequest("POST", "/api/evaluations/detailed", data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/field-technicians/${technicianId}/evaluations/detailed`] });
            queryClient.invalidateQueries({ queryKey: ["/api/evaluations/stats"] });
            toast({ title: "تم حفظ التقييم بنجاح" });
            if (onSuccess) onSuccess();
        },
        onError: (error: any) => {
            toast({
                title: "خطأ في حفظ التقييم",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        const getNum = (name: string) => Number(formData.get(name));

        const orderDate = formData.get("orderDate") as string;
        let orderNumber = formData.get("orderNumber") as string;

        if (isDaily || !orderNumber) {
            orderNumber = `DAILY-${orderDate}`;
        }

        const data = {
            technicianId,
            orderNumber: orderNumber,
            orderDate: orderDate,
            serviceType: isDaily ? "تقييم يومي" : formData.get("serviceType"),
            arrivalTime: formData.get("arrivalTime") || "00:00",
            completionTime: formData.get("completionTime") || "00:00",
            firstTimeFixed: formData.get("firstTimeFixed") === "true",

            ratingPunctuality: getNum("ratingPunctuality"),
            ratingDiagnosis: getNum("ratingDiagnosis"),
            ratingQuality: getNum("ratingQuality"),
            ratingSpeed: getNum("ratingSpeed"),
            ratingPricing: getNum("ratingPricing"),
            ratingAppearance: getNum("ratingAppearance"),

            behaviorRespect: formData.get("behaviorRespect") === "true",
            behaviorExplain: formData.get("behaviorExplain") === "true",
            behaviorPolicy: formData.get("behaviorPolicy") === "true",
            behaviorClean: formData.get("behaviorClean") === "true",

            technicalErrors: formData.get("technicalErrors"),
            behavioralNotes: formData.get("behavioralNotes"),
            needsTraining: formData.get("needsTraining") === "true",
            trainingType: formData.get("trainingType"),

            customerRating: getNum("customerRating"),
            customerComplained: formData.get("customerComplained") === "true",
            customerRehire: formData.get("customerRehire") === "true",
        };

        createMutation.mutate(data);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 pb-4" dir="rtl">
            {/* 1. Order Info */}
            <Card>
                <CardHeader className="bg-slate-50/50 pb-4">
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-base font-bold text-slate-700">بيانات التقييم</CardTitle>
                        <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-full border shadow-sm">
                            <Switch checked={isDaily} onCheckedChange={setIsDaily} id="daily-mode" />
                            <Label htmlFor="daily-mode" className="cursor-pointer">تقييم يومي شامل (بدون طلب)</Label>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                    <div className="space-y-2">
                        <Label>تاريخ التقييم</Label>
                        <Input name="orderDate" type="date" required defaultValue={format(new Date(), "yyyy-MM-dd")} />
                    </div>

                    {!isDaily && (
                        <>
                            <div className="space-y-2">
                                <Label>رقم الطلب</Label>
                                <Input name="orderNumber" required={!isDaily} placeholder="مثال: #12345" />
                            </div>
                            <div className="space-y-2">
                                <Label>نوع الخدمة</Label>
                                <Select name="serviceType" required defaultValue="اصلاح">
                                    <SelectTrigger>
                                        <SelectValue placeholder="اختر النوع" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="اصلاح">اصلاح / صيانة</SelectItem>
                                        <SelectItem value="تركيب">تركيب</SelectItem>
                                        <SelectItem value="معاينة">معاينة</SelectItem>
                                        <SelectItem value="أخرى">أخرى</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>وقت الوصول</Label>
                                <Input name="arrivalTime" type="time" required />
                            </div>
                            <div className="space-y-2">
                                <Label>وقت الانتهاء</Label>
                                <Input name="completionTime" type="time" required />
                            </div>
                            <div className="flex items-center gap-2 pt-8">
                                <Label htmlFor="firstTimeFixed" className="font-medium">تم الاصلاح من الزيارة الأولى؟</Label>
                                <BooleanInput name="firstTimeFixed" defaultValue={true} />
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* 2. Technical Performance */}
            <Card>
                <CardHeader className="bg-slate-50/50 pb-4">
                    <CardTitle className="text-base font-bold text-slate-700">الأداء الفني (1-5)</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    <RatingField label="الالتزام بالمواعيد" name="ratingPunctuality" />
                    <RatingField label="دقة التشخيص" name="ratingDiagnosis" />
                    <RatingField label="جودة العمل" name="ratingQuality" />
                    <RatingField label="سرعة الإنجاز" name="ratingSpeed" />
                    <RatingField label="الالتزام بالتسعير" name="ratingPricing" />
                    <RatingField label="المظهر العام والعدة" name="ratingAppearance" />
                </CardContent>
            </Card>

            {/* 3. Behavioral */}
            <Card>
                <CardHeader className="bg-slate-50/50 pb-4">
                    <CardTitle className="text-base font-bold text-slate-700">السلوك المهني</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between border p-3 rounded-lg">
                        <Label>الاحترام وحسن التعامل</Label>
                        <BooleanInput name="behaviorRespect" defaultValue={true} />
                    </div>
                    <div className="flex items-center justify-between border p-3 rounded-lg">
                        <Label>شرح المشكلة للعميل</Label>
                        <BooleanInput name="behaviorExplain" defaultValue={true} />
                    </div>
                    <div className="flex items-center justify-between border p-3 rounded-lg">
                        <Label>الالتزام بسياسة الشركة</Label>
                        <BooleanInput name="behaviorPolicy" defaultValue={true} />
                    </div>
                    <div className="flex items-center justify-between border p-3 rounded-lg">
                        <Label>النظافة بعد العمل</Label>
                        <BooleanInput name="behaviorClean" defaultValue={true} />
                    </div>
                </CardContent>
            </Card>

            {/* 4. Customer Feedback */}
            <Card>
                <CardHeader className="bg-slate-50/50 pb-4">
                    <CardTitle className="text-base font-bold text-slate-700">رأي العميل</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <RatingField label="تقييم العميل" name="customerRating" />

                    <div className="flex items-center justify-between md:col-span-2">
                        <Label>هل قدم العميل شكوى؟</Label>
                        <BooleanInput name="customerComplained" defaultValue={false} reverseColor />
                    </div>
                    <div className="flex items-center justify-between md:col-span-2">
                        <Label>هل يرغب العميل في التعامل معه مجدداً؟</Label>
                        <BooleanInput name="customerRehire" defaultValue={true} />
                    </div>
                </CardContent>
            </Card>

            {/* 5. Notes & Training */}
            <Card>
                <CardHeader className="bg-slate-50/50 pb-4">
                    <CardTitle className="text-base font-bold text-slate-700">ملاحظات المشرف</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>أخطاء فنية (إن وجدت)</Label>
                            <Textarea name="technicalErrors" placeholder="أذكر أي أخطاء فنية..." className="h-20" />
                        </div>
                        <div className="space-y-2">
                            <Label>ملاحظات سلوكية</Label>
                            <Textarea name="behavioralNotes" placeholder="ملاحظات على السلوك..." className="h-20" />
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center bg-yellow-50 p-4 rounded-md border border-yellow-100">
                        <div className="flex items-center gap-2 min-w-[200px]">
                            <Label>هل يحتاج تدريب إضافي؟</Label>
                            <BooleanInput name="needsTraining" defaultValue={false} reverseColor />
                        </div>
                        <div className="flex-1 w-full">
                            <Input name="trainingType" placeholder="نوع التدريب المقترح..." />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="sticky bottom-0 -mx-6 -mb-6 px-6 py-4 bg-white/95 backdrop-blur border-t border-slate-200 flex justify-end gap-2 mt-8 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                {onCancel && <Button type="button" variant="outline" onClick={onCancel}>إلغاء</Button>}
                <Button type="submit" disabled={createMutation.isPending} className="min-w-[150px]">
                    {createMutation.isPending ? "جاري الحفظ..." :
                        isDaily ? "حفظ التقييم اليومي" : "حفظ التقييم"}
                </Button>
            </div>
        </form>
    );
}

function BooleanInput({ name, defaultValue, reverseColor = false }: { name: string, defaultValue: boolean, reverseColor?: boolean }) {
    const [value, setValue] = useState(defaultValue);
    return (
        <div className="flex items-center gap-2">
            <input type="hidden" name={name} value={String(value)} />
            <Switch checked={value} onCheckedChange={setValue} />
            <span className="text-sm text-slate-500 w-12">{value ? "نعم" : "لا"}</span>
        </div>
    );
}

function RatingField({ label, name }: { label: string, name: string }) {
    const [rating, setRating] = useState(5);
    return (
        <div className="flex items-center justify-between p-2 rounded hover:bg-slate-50">
            <Label className="text-sm font-medium">{label}</Label>
            <div className="flex items-center gap-1">
                <input type="hidden" name={name} value={rating} />
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className={`p-1 transition-colors ${rating >= star ? "text-yellow-400" : "text-slate-200"}`}
                    >
                        <Star className="w-5 h-5 fill-current" />
                    </button>
                ))}
                <span className="text-sm font-bold w-6 text-center text-slate-700">{rating}</span>
            </div>
        </div>
    );
}
