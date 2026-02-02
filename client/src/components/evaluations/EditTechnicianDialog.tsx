
import { useState, useEffect } from "react";
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
import { Pencil } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface EditTechnicianDialogProps {
    technician: {
        technicianId: number;
        technicianName: string;
        role: string;
        specialization: string;
        status: string;
        supervisorId: number | null;
        // We might need more fields like phone, area, etc. but the stats object in dashboard might not have them all.
        // IF we need full details, we should fetch them or pass them if available.
        // The stats endpoint doesn't return phone/area/level/contractType/joinDate/notes in top level properly or maybe it does?
        // Checking `getAllTechnicianStats` in storage.ts, it returns basic info + stats.
        // It DOES NOT return phone, area, contractType, notes, etc.
        // So we need to FETCH the technician details first when opening this dialog.
    };
    trigger?: React.ReactNode;
}

export function EditTechnicianDialog({ technician, trigger }: EditTechnicianDialogProps) {
    const [open, setOpen] = useState(false);
    const [showCustomSpec, setShowCustomSpec] = useState(false);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Use passed prop as initial data to prevent loading flicker, but fetch fresh data
    const { data: fetchedDetails, isLoading } = useQuery<any>({
        queryKey: [`/api/field-technicians/${technician.technicianId}`],
        enabled: open,
        // Remove initialData to force loading state until full data arrives
        // or we can keep it minimal but we need to handle "isFetching" to show spinner overlays or similar.
        // The best UX here is valuable data is missing (phone, etc), so better wait for it.
    });


    // Prioritize fetched data over initial
    const techDetails = fetchedDetails;

    const { data: supervisors } = useQuery<any[]>({
        queryKey: ["/api/users/supervisors"],
        enabled: open,
    });

    const [selectedSpecs, setSelectedSpecs] = useState<string[]>([]);

    // Populate form when data loads
    useEffect(() => {
        if (techDetails) {
            const specs = techDetails.specialization ? techDetails.specialization.split(",") : [];
            setSelectedSpecs(specs);
        }
    }, [techDetails]);

    const toggleSpec = (spec: string) => {
        setSelectedSpecs(prev =>
            prev.includes(spec)
                ? prev.filter(s => s !== spec)
                : [...prev, spec]
        );
    };

    const updateMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await apiRequest("PUT", `/api/field-technicians/${technician.technicianId}`, data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/evaluations/stats"] });
            queryClient.invalidateQueries({ queryKey: [`/api/field-technicians/${technician.technicianId}`] });
            setOpen(false);
            toast({ title: "تم تحديث بيانات الفني بنجاح" });
        },
        onError: (error: any) => {
            toast({
                title: "خطأ في التحديث",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        const checkedSpecs = [...selectedSpecs];

        const showOther = showCustomSpec;
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

        const data = {
            name: formData.get("name"),
            phone: formData.get("phone"),
            specialization: checkedSpecs.join(","),
            level: formData.get("level"),
            area: formData.get("area"),
            contractType: formData.get("contractType"),
            joinDate: formData.get("joinDate"),
            notes: formData.get("notes"),
            supervisorId: supervisorId ? parseInt(supervisorId.toString(), 10) : null,
        };

        updateMutation.mutate(data);
    };

    // If we have absolutely no data (not even from props), then show loading
    if (!techDetails && isLoading && open) {
        return null;
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="ghost" size="icon">
                        <Pencil className="h-4 w-4" />
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
                <DialogHeader>
                    <DialogTitle>تعديل بيانات الفني: {technician.technicianName}</DialogTitle>
                </DialogHeader>

                {techDetails ? (
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>الاسم الكامل</Label>
                            <Input name="name" required defaultValue={techDetails.name} placeholder="اسم الفني" />
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
                                    defaultValue={techDetails.phone}
                                    placeholder="5XXXXXXXX"
                                    className="pl-24 text-left font-mono"
                                    dir="ltr"
                                />
                            </div>
                        </div>

                        <Label>التخصص</Label>
                        <div className="border rounded-md p-3 space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                                {["Electrical", "Plumbing", "Carpentry", "Painting", "AC", "Cleaning", "General"].map((spec) => (
                                    <div key={spec} className="flex items-center space-x-2 space-x-reverse">
                                        <Checkbox
                                            id={`edit-spec-${spec}`}
                                            checked={selectedSpecs.includes(spec)}
                                            onCheckedChange={() => toggleSpec(spec)}
                                        />
                                        <Label htmlFor={`edit-spec-${spec}`} className="text-sm font-normal cursor-pointer">
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
                                        id="edit-spec-other"
                                        checked={showCustomSpec}
                                        onCheckedChange={(c) => setShowCustomSpec(!!c)}
                                    />
                                    <Label htmlFor="edit-spec-other" className="text-sm font-normal cursor-pointer">أخرى (إضافة تخصص جديد)</Label>
                                </div>
                                {showCustomSpec && (
                                    <Input
                                        name="specialization_custom"
                                        placeholder="اكتب التخصصات..."
                                        className="mt-2 h-8"
                                    />
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>المستوى المهني</Label>
                            <Select name="level" defaultValue={techDetails.level} required>
                                <SelectTrigger>
                                    <SelectValue />
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
                            <Input name="area" defaultValue={techDetails.area} required placeholder="الرياض - حي ..." />
                        </div>

                        <div className="space-y-2">
                            <Label>نوع العقد</Label>
                            <Select name="contractType" defaultValue={techDetails.contractType} required>
                                <SelectTrigger>
                                    <SelectValue />
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
                            <Input name="joinDate" type="date" defaultValue={techDetails.joinDate} required />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <Label>ملاحظات</Label>
                            <Input name="notes" defaultValue={techDetails.notes || ""} placeholder="ملاحظات إضافية" />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <Label>المشرف المسؤول</Label>
                            <Select name="supervisorId" defaultValue={techDetails.supervisorId?.toString()} required>
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
                            <Button type="submit" disabled={updateMutation.isPending}>
                                {updateMutation.isPending ? "جاري التحديث..." : "حفظ التغييرات"}
                            </Button>
                        </div>
                    </form>
                ) : (
                    <div className="flex justify-center p-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
