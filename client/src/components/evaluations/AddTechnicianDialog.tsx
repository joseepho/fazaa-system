
import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
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
import { Checkbox } from "@/components/ui/checkbox";

export function AddTechnicianDialog() {
    const [open, setOpen] = useState(false);
    const [showCustomSpec, setShowCustomSpec] = useState(false);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: supervisors } = useQuery<any[]>({
        queryKey: ["/api/users/supervisors"],
    });

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

    const [selectedSpecs, setSelectedSpecs] = useState<string[]>(["Electrical"]);

    const toggleSpec = (spec: string) => {
        setSelectedSpecs(prev =>
            prev.includes(spec)
                ? prev.filter(s => s !== spec)
                : [...prev, spec]
        );
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        // Use state for checked specs
        const checkedSpecs = [...selectedSpecs];

        const showOther = showCustomSpec; // State is reliable
        let customSpec = "";
        if (showOther) {
            customSpec = (formData.get("specialization_custom") as string) || "";
            if (customSpec.trim()) checkedSpecs.push(customSpec.trim());
        }

        if (checkedSpecs.length === 0) {
            toast({
                title: "خطأ",
                description: "يجب اختيار تخصص واحد على الأقل",
                variant: "destructive",
            });
            return;
        }

        const supervisorId = formData.get("supervisorId");

        if (!supervisorId) {
            toast({
                title: "خطأ",
                description: "يجب اختيار مشرف مسؤول",
                variant: "destructive",
            });
            return;
        }

        const data = {
            name: formData.get("name"),
            phone: formData.get("phone"),
            specialization: checkedSpecs.join(","), // Store as comma separated
            level: formData.get("level"),
            area: formData.get("area"),
            contractType: formData.get("contractType"),
            joinDate: formData.get("joinDate") || format(new Date(), "yyyy-MM-dd"),
            status: "Active",
            notes: formData.get("notes"),
            supervisorId: parseInt(supervisorId.toString(), 10),
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
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
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
                        <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2 pr-2 border-r border-border h-5">
                                <span className="text-sm font-medium text-slate-600 dir-ltr">+966</span>
                            </div>
                            <Input
                                name="phone"
                                required
                                placeholder="5XXXXXXXX"
                                className="pl-24 text-left font-mono"
                                dir="ltr"
                            />
                        </div>
                    </div>

                    <Label>التخصص (يمكن اختيار أكثر من واحد)</Label>
                    <div className="border rounded-md p-3 space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                            {["Electrical", "Plumbing", "Carpentry", "Painting", "AC", "Cleaning", "General"].map((spec) => (
                                <div key={spec} className="flex items-center space-x-2 space-x-reverse">
                                    <Checkbox
                                        id={`spec-${spec}`}
                                        checked={selectedSpecs.includes(spec)}
                                        onCheckedChange={() => toggleSpec(spec)}
                                    />
                                    <Label htmlFor={`spec-${spec}`} className="text-sm font-normal cursor-pointer">
                                        {{
                                            Electrical: "كهرباء",
                                            Plumbing: "سباكة",
                                            Carpentry: "نجارة",
                                            Painting: "دهانات",
                                            AC: "تكييف",
                                            Cleaning: "نظافة",
                                            General: "عام"
                                        }[spec] || spec}
                                    </Label>
                                </div>
                            ))}
                        </div>
                        <div className="pt-2 border-t">
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="spec-other"
                                    checked={showCustomSpec}
                                    onCheckedChange={(c) => setShowCustomSpec(!!c)}
                                />
                                <Label htmlFor="spec-other" className="text-sm font-normal cursor-pointer">أخرى (إضافة تخصص جديد)</Label>
                            </div>
                            {showCustomSpec && (
                                <Input
                                    name="specialization_custom"
                                    placeholder="اكتب التخصصات مفصولة بفاصلة..."
                                    className="mt-2 h-8"
                                />
                            )}
                        </div>
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

                    <div className="space-y-2 md:col-span-2">
                        <Label>المشرف المسؤول</Label>
                        <Select name="supervisorId" required>
                            <SelectTrigger>
                                <SelectValue placeholder="اختر مشرفاً" />
                            </SelectTrigger>
                            <SelectContent>
                                {supervisors?.map((supervisor: any) => (
                                    <SelectItem key={supervisor.id} value={supervisor.id.toString()}>
                                        {supervisor.name} ({supervisor.role})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
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
