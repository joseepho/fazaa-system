import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star } from "lucide-react";

interface TechnicianStatsCardProps {
    technicianId: number;
}

interface Stats {
    avgPunctuality: number;
    avgQuality: number;
    avgBehavior: number;
    avgOverall: number;
    totalEvaluations: number;
}

export function TechnicianStatsCard({ technicianId }: TechnicianStatsCardProps) {
    const { data: stats, isLoading } = useQuery<Stats>({
        queryKey: [`/api/users/${technicianId}/stats`],
        enabled: !!technicianId,
    });

    if (isLoading) {
        return <Card className="animate-pulse h-[200px]"></Card>;
    }

    if (!stats || stats.totalEvaluations === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-xl">أداء الفني</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                        <Star className="w-10 h-10 mx-auto mb-2 opacity-20" />
                        <p>لا توجد تقييمات حتى الآن</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-xl flex justify-between items-center">
                    <span>أداء الفني</span>
                    <span className="text-sm font-normal text-muted-foreground">
                        ({stats.totalEvaluations} تقييم)
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
                <div className="flex justify-center mb-4">
                    <div className="text-center">
                        <div className="text-4xl font-bold text-primary flex items-center justify-center gap-2">
                            {stats.avgOverall.toFixed(1)}
                            <Star className="w-8 h-8 text-yellow-400 fill-yellow-400" />
                        </div>
                        <p className="text-muted-foreground text-sm mt-1">التقييم العام</p>
                    </div>
                </div>

                <div className="space-y-3">
                    <StatRow label="الالتزام بالمواعيد" value={stats.avgPunctuality} />
                    <StatRow label="جودة العمل" value={stats.avgQuality} />
                    <StatRow label="السلوك والمظهر" value={stats.avgBehavior} />
                </div>
            </CardContent>
        </Card>
    );
}

function StatRow({ label, value }: { label: string, value: number }) {
    return (
        <div className="flex items-center gap-2">
            <span className="w-32 text-sm">{label}</span>
            <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                <div
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: `${(value / 5) * 100}%` }}
                />
            </div>
            <span className="text-sm font-medium w-8 text-left">{value.toFixed(1)}</span>
        </div>
    );
}
