
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { format } from "date-fns";

export function AddTechnicianDialog() {
    const [open, setOpen] = useState(false);
    const [showCustomSpec, setShowCustomSpec] = useState(false);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await apiRequest("POST", "/api/field-technicians", data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/evaluations/stats"] });
            queryClient.invalidateQueries({ queryKey: ["/api/field-technicians"] });
            setOpen(false);
            toast({ title: "تم إضافة الفني بنجاح" });
        },
        onError: (error: any) => {
            toast({
                title: "خطأ في إضافة الفني",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const specSelect = formData.get("specialization_select");
        const specCustom = formData.get("specialization_custom");

        const data = {
            name: formData.get("name"),
            phone: formData.get("phone"),
            specialization: specSelect === "Other" ? specCustom : specSelect,
            level: formData.get("level"),
            area: formData.get("area"),
            contractType: formData.get("contractType"),
            joinDate: formData.get("joinDate") || format(new Date(), "yyyy-MM-dd"),
            status: "Active",
            notes: formData.get("notes"),
        };

        createMutation.mutate(data);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2 bg-slate-900 hover:bg-slate-800 text-white">
                    <Plus className="h-4 w-4" />
                    إضافة فني جديد
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl" dir="rtl">
                <DialogHeader>
                    <DialogTitle>إضافة فني ميداني جديد</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>الاسم الكامل</Label>
                        <Input name="name" required placeholder="اسم الفني" />
                    </div>
                    <div className="space-y-2">
                        <Label>رقم الهاتف</Label>
                        <Input name="phone" required placeholder="05xxxxxxxx" />
                    </div>

                    <div className="space-y-2">
                        <Label>التخصص</Label>
                        <Select
                            name="specialization_select"
                            required
                            defaultValue="Electrical"
                            onValueChange={(val) => setShowCustomSpec(val === "Other")}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="اختر التخصص" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Electrical">كهرباء</SelectItem>
                                <SelectItem value="Plumbing">سباكة</SelectItem>
                                <SelectItem value="Carpentry">نجارة</SelectItem>
                                <SelectItem value="Painting">دهانات</SelectItem>
                                <SelectItem value="AC">تكييف</SelectItem>
                                <SelectItem value="Cleaning">نظافة</SelectItem>
                                <SelectItem value="General">عام</SelectItem>
                                <SelectItem value="Other">تخصص آخر (إضافة جديد)</SelectItem>
                            </SelectContent>
                        </Select>
                        {showCustomSpec && (
                            <Input
                                name="specialization_custom"
                                placeholder="اكتب اسم التخصص الجديد..."
                                required
                                className="mt-2"
                            />
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label>المستوى المهني</Label>
                        <Select name="level" required defaultValue="Beginner">
                            <SelectTrigger>
                                <SelectValue placeholder="اختر المستوى" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Beginner">مبتدئ</SelectItem>
                                <SelectItem value="Medium">متوسط</SelectItem>
                                <SelectItem value="Professional">محترف</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>المنطقة / الحي</Label>
                        <Input name="area" required placeholder="الرياض - حي ..." />
                    </div>

                    <div className="space-y-2">
                        <Label>نوع العقد</Label>
                        <Select name="contractType" required defaultValue="Full-time">
                            <SelectTrigger>
                                <SelectValue placeholder="اختر نوع العقد" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Full-time">دوام كامل</SelectItem>
                                <SelectItem value="Part-time">دوام جزئي</SelectItem>
                                <SelectItem value="On-demand">حسب الطلب</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>تاريخ الانضمام</Label>
                        <Input name="joinDate" type="date" required defaultValue={format(new Date(), "yyyy-MM-dd")} />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                        <Label>ملاحظات</Label>
                        <Input name="notes" placeholder="ملاحظات إضافية" />
                    </div>

                    <div className="md:col-span-2 flex justify-end gap-2 mt-4">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
                        <Button type="submit" disabled={createMutation.isPending}>
                            {createMutation.isPending ? "جاري الإضافة..." : "حفظ"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
