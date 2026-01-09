import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertEvaluationSchema, type InsertEvaluation } from "@shared/schema";
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
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { Label } from "@/components/ui/label";

interface EvaluationFormProps {
    complaintId: number;
    technicianId: number;
    technicianName: string;
    trigger?: React.ReactNode;
    onSuccess?: () => void;
}

export function EvaluationForm({ complaintId, technicianId, technicianName, trigger, onSuccess }: EvaluationFormProps) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const form = useForm<InsertEvaluation>({
        resolver: zodResolver(insertEvaluationSchema),
        defaultValues: {
            complaintId,
            technicianId,
            evaluatorId: 0, // Handled by server
            ratingPunctuality: 0,
            ratingQuality: 0,
            ratingBehavior: 0,
            ratingOverall: 0,
            notes: "",
        },
    });

    const mutation = useMutation({
        mutationFn: async (data: InsertEvaluation) => {
            const res = await apiRequest("POST", "/api/evaluations", data);
            return res.json();
        },
        onSuccess: () => {
            toast({
                title: "تم استلام التقييم",
                description: "شكراً لك، تم حفظ التقييم بنجاح وإرسال إشعار للإدارة.",
            });
            setOpen(false);
            queryClient.invalidateQueries({ queryKey: [`/api/users/${technicianId}/evaluations`] });
            queryClient.invalidateQueries({ queryKey: [`/api/users/${technicianId}/stats`] });
            if (onSuccess) onSuccess();
        },
        onError: (error) => {
            toast({
                title: "خطأ",
                description: "فشل حفظ التقييم. الرجاء المحاولة مرة أخرى.",
                variant: "destructive",
            });
        },
    });

    const onSubmit = (data: InsertEvaluation) => {
        if (data.ratingPunctuality === 0 || data.ratingQuality === 0 || data.ratingBehavior === 0 || data.ratingOverall === 0) {
            toast({
                title: "تنبيه",
                description: "الرجاء تعبئة جميع حقول التقييم (النجوم).",
                variant: "destructive",
            });
            return;
        }
        mutation.mutate(data);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || <Button variant="outline">تقييم الفني</Button>}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]" dir="rtl">
                <DialogHeader>
                    <DialogTitle>تقييم الفني: {technicianName}</DialogTitle>
                </DialogHeader>

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <RatingField
                        label="الالتزام بالمواعيد"
                        value={form.watch("ratingPunctuality")}
                        onChange={(val) => form.setValue("ratingPunctuality", val)}
                    />
                    <RatingField
                        label="جودة العمل"
                        value={form.watch("ratingQuality")}
                        onChange={(val) => form.setValue("ratingQuality", val)}
                    />
                    <RatingField
                        label="السلوك والمظهر"
                        value={form.watch("ratingBehavior")}
                        onChange={(val) => form.setValue("ratingBehavior", val)}
                    />

                    <div className="border-t pt-4">
                        <RatingField
                            label="التقييم العام"
                            value={form.watch("ratingOverall")}
                            onChange={(val) => form.setValue("ratingOverall", val)}
                            size="lg"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>ملاحظات إضافية</Label>
                        <Textarea
                            placeholder="اكتب أي ملاحظات أو تعليقات هنا..."
                            {...form.register("notes")}
                            className="min-h-[100px]"
                        />
                    </div>

                    <Button type="submit" className="w-full" disabled={mutation.isPending}>
                        {mutation.isPending ? "جاري الحفظ..." : "إرسال التقييم"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function RatingField({ label, value, onChange, size = "md" }: { label: string, value: number, onChange: (v: number) => void, size?: "md" | "lg" }) {
    return (
        <div className="flex items-center justify-between">
            <Label className={size === "lg" ? "text-lg font-bold" : "text-base"}>{label}</Label>
            <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        type="button"
                        onClick={() => onChange(star)}
                        className={`transition-all hover:scale-110 focus:outline-none ${star <= value ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
                            }`}
                    >
                        <Star className={size === "lg" ? "w-8 h-8 fill-current" : "w-6 h-6 fill-current"} />
                    </button>
                ))}
            </div>
        </div>
    );
}
