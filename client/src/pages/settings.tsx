import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { TeamMember, Log, permissions, Permission } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Plus, Pencil, Trash2, Shield, History, FileText, User, Settings as SettingsIcon, AlertCircle, Star, Briefcase, ArrowLeft, Eye } from "lucide-react";
import { Label } from "@/components/ui/label";

export default function Settings() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isAddUserOpen, setIsAddUserOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<TeamMember | null>(null);

    // Queries
    const { data: users = [] } = useQuery<TeamMember[]>({
        queryKey: ["/api/team-members"],
    });

    const { data: logs = [] } = useQuery<Log[]>({
        queryKey: ["/api/logs"],
    });

    // Mutations
    const createUserMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await apiRequest("POST", "/api/team-members", data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/team-members"] });
            setIsAddUserOpen(false);
            toast({ title: "تم إضافة المستخدم بنجاح" });
        },
        onError: (error: any) => {
            toast({
                title: "خطأ في إضافة المستخدم",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const updateUserMutation = useMutation({
        mutationFn: async ({ id, data }: { id: number; data: any }) => {
            const res = await apiRequest("PUT", `/api/team-members/${id}`, data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/team-members"] });
            setEditingUser(null);
            toast({ title: "تم تحديث بيانات المستخدم بنجاح" });
        },
    });

    const deleteUserMutation = useMutation({
        mutationFn: async (id: number) => {
            await apiRequest("DELETE", `/api/team-members/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/team-members"] });
            toast({ title: "تم حذف المستخدم بنجاح" });
        },
    });

    // Form handling
    const handleSubmitUser = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data: any = {
            name: formData.get("name"),
            email: formData.get("email"),
            role: formData.get("role"),
            permissions: JSON.parse(formData.get("permissions") as string || "[]"),
        };

        const password = formData.get("password");
        if (password) data.password = password;

        if (editingUser) {
            updateUserMutation.mutate({ id: editingUser.id, data });
        } else {
            createUserMutation.mutate(data);
        }
    };

    const hasPermission = (permission: string) => {
        if (!user) return false;
        if (user.role === "Admin") return true;
        return user.permissions?.includes(permission) || false;
    };

    if (!hasPermission("view_settings")) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">ليس لديك صلاحية للوصول إلى هذه الصفحة</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">الإعدادات</h1>
            </div>

            <Tabs defaultValue="users" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="users" className="gap-2">
                        <Shield className="h-4 w-4" />
                        المستخدمين والصلاحيات
                    </TabsTrigger>
                    <TabsTrigger value="logs" className="gap-2">
                        <History className="h-4 w-4" />
                        سجل النشاطات
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="users">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>إدارة المستخدمين</CardTitle>
                            <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                                <DialogTrigger asChild>
                                    <Button>
                                        <Plus className="h-4 w-4 ml-2" />
                                        إضافة مستخدم
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                                    <DialogHeader>
                                        <DialogTitle>إضافة مستخدم جديد</DialogTitle>
                                    </DialogHeader>
                                    <UserForm onSubmit={handleSubmitUser} />
                                </DialogContent>
                            </Dialog>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>الاسم</TableHead>
                                        <TableHead>البريد الإلكتروني</TableHead>
                                        <TableHead>الدور</TableHead>
                                        <TableHead>تاريخ الإنشاء</TableHead>
                                        <TableHead>الإجراءات</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.map((u) => (
                                        <TableRow key={u.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                                        {u.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{u.name}</span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">{u.email}</TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={u.role === "Admin" ? "default" : u.role === "Supervisor" || u.role === "FollowUpManager" ? "secondary" : "outline"}
                                                    className="gap-1"
                                                >
                                                    {u.role === "Admin" ? <Shield className="w-3 h-3" /> :
                                                        u.role === "Supervisor" ? <User className="w-3 h-3" /> :
                                                            u.role === "FollowUpManager" ? <Briefcase className="w-3 h-3" /> :
                                                                <FileText className="w-3 h-3" />}
                                                    {u.role === "Admin" ? "مدير النظام" :
                                                        u.role === "Supervisor" ? "مشرف" :
                                                            u.role === "FollowUpManager" ? "مدير متابعة" : "مستخدم"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col text-sm text-muted-foreground">
                                                    <span>{format(new Date(u.createdAt), "PPP", { locale: ar })}</span>
                                                    <span className="text-xs">{format(new Date(u.createdAt), "p", { locale: ar })}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={() => setEditingUser(u)}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    {u.id !== user?.id && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-destructive hover:text-destructive/90"
                                                            onClick={() => {
                                                                if (confirm("هل أنت متأكد من حذف هذا المستخدم؟")) {
                                                                    deleteUserMutation.mutate(u.id);
                                                                }
                                                            }}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="logs">
                    <Card>
                        <CardHeader>
                            <CardTitle>سجل النشاطات</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table dir="rtl">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-right">المستخدم</TableHead>
                                        <TableHead className="text-right w-[200px]">الحدث</TableHead>
                                        <TableHead className="text-center w-[150px]">IP</TableHead>
                                        <TableHead className="text-left w-[200px]">التوقيت</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {logs.map((log) => {
                                        const actor = users.find(u => u.id === log.userId);
                                        const actionColor = log.action.includes("CREATE") ? "default" :
                                            log.action.includes("UPDATE") ? "secondary" :
                                                log.action.includes("DELETE") ? "destructive" : "outline";

                                        const EntityIcon = log.entityType === "complaint" ? FileText :
                                            log.entityType === "user" ? User : AlertCircle;

                                        return (
                                            <TableRow key={log.id}>
                                                <TableCell className="font-medium">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold shadow-sm border border-primary/20">
                                                            {(actor?.name || "?").charAt(0)}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="font-semibold text-slate-900">{actor?.name || "مستخدم محذوف"}</span>
                                                            <span className="text-xs text-slate-500 font-mono">{actor?.email}</span>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant={actionColor as any} className="gap-1.5 px-2.5 py-0.5">
                                                            <EntityIcon className="w-3.5 h-3.5" />
                                                            {translateAction(log.action)}
                                                        </Badge>
                                                        {log.details && log.details.changes && (log.details.changes as any).length > 0 && (
                                                            <Popover>
                                                                <PopoverTrigger asChild>
                                                                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-slate-100">
                                                                        <Eye className="w-3 h-3 text-slate-500" />
                                                                    </Button>
                                                                </PopoverTrigger>
                                                                <PopoverContent className="w-80 p-3" align="start">
                                                                    <div className="space-y-2">
                                                                        <h4 className="font-semibold text-sm border-b pb-1 mb-2">التغييرات:</h4>
                                                                        {(log.details.changes as any[]).map((change: any, i: number) => (
                                                                            <div key={i} className="text-xs grid grid-cols-[1fr,auto,1fr] gap-2 items-center">
                                                                                <span className="text-muted-foreground font-medium text-right">
                                                                                    {translateField(change.field)}
                                                                                </span>
                                                                                <ArrowLeft className="w-3 h-3 text-slate-300" />
                                                                                <span className="truncate font-mono bg-slate-50 px-1 rounded border">
                                                                                    {String(change.to)}
                                                                                </span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </PopoverContent>
                                                            </Popover>
                                                        )}
                                                    </div>
                                                </TableCell>

                                                <TableCell className="text-center">
                                                    <Badge variant="outline" className="font-mono text-xs text-slate-500 bg-slate-50">
                                                        {log.ipAddress}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-left">
                                                    <div className="flex flex-col items-end">
                                                        <span className="font-medium text-slate-700">{format(new Date(log.createdAt), "PPP", { locale: ar })}</span>
                                                        <span className="text-xs text-slate-400 font-mono">{format(new Date(log.createdAt), "p", { locale: ar })}</span>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Edit User Dialog */}
            <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
                <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>تعديل بيانات المستخدم</DialogTitle>
                    </DialogHeader>
                    {editingUser && (
                        <UserForm
                            user={editingUser}
                            onSubmit={handleSubmitUser}
                            isEditing
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

function UserForm({ user, onSubmit, isEditing = false }: { user?: TeamMember; onSubmit: (e: React.FormEvent<HTMLFormElement>) => void; isEditing?: boolean }) {
    const [selectedRole, setSelectedRole] = useState(user?.role || "Agent");
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>(user?.permissions || []);

    const togglePermission = (perm: string) => {
        setSelectedPermissions(prev =>
            prev.includes(perm)
                ? prev.filter(p => p !== perm)
                : [...prev, perm]
        );
    };

    // Auto-update permissions when Role changes
    const handleRoleChange = (role: string) => {
        setSelectedRole(role);

        let newPermissions: string[] = [];

        if (role === "Admin") {
            // Admin gets all permissions implicitly in backend usually, but we can check all for UI
            newPermissions = [...permissions];
        } else if (role === "Supervisor") {
            // Supervisor: view_evaluations_page, view_evaluations, view_technicians, create_evaluation
            // Explicitly NO manage/edit/delete
            newPermissions = [
                "view_evaluations_page",
                "view_evaluations",
                "view_technicians",
                "create_evaluation"
            ];
        } else if (role === "FollowUpManager") {
            // FollowUpManager: view_dashboard, view_complaints, create_complaint, view_reports
            // Explicitly NO edit/delete
            newPermissions = [
                "view_dashboard",
                "view_complaints",
                "create_complaint",
                "view_reports",
                "manage_notes",
                "update_status"
            ];
        } else if (role === "Agent") {
            // Default Agent permissions (maybe basic view)
            newPermissions = ["view_dashboard", "view_complaints"];
        }

        setSelectedPermissions(newPermissions);
    };

    return (
        <form onSubmit={onSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>الاسم</Label>
                        <Input name="name" defaultValue={user?.name} required placeholder="الاسم الكامل" />
                    </div>
                    <div className="space-y-2">
                        <Label>البريد الإلكتروني</Label>
                        <Input name="email" type="email" defaultValue={user?.email} required placeholder="example@domain.com" />
                    </div>
                </div>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>كلمة المرور {isEditing && "(اتركها فارغة للإبقاء على الحالية)"}</Label>
                        <Input name="password" type="password" required={!isEditing} placeholder="******" />
                    </div>
                    <div className="space-y-2">
                        <Label>الدور الوظيفي</Label>
                        <Select name="role" value={selectedRole} onValueChange={handleRoleChange}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Admin">مدير النظام (كامل الصلاحيات)</SelectItem>
                                <SelectItem value="Supervisor">مشرف (تقييمات الفنيين فقط)</SelectItem>
                                <SelectItem value="FollowUpManager">مدير متابعة (شكاوي وتقارير)</SelectItem>
                                <SelectItem value="Agent">موظف (صلاحيات أساسية)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {["Supervisor", "Agent", "FollowUpManager"].includes(selectedRole) && (
                <div className="space-y-4 border rounded-lg p-6 bg-slate-50/50">
                    <div className="flex items-center gap-2 mb-4">
                        <Shield className="w-5 h-5 text-primary" />
                        <h3 className="font-semibold text-lg">تخصيص الصلاحيات</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Complaints Section */}
                        <div className="border rounded-md p-4 bg-white shadow-sm">
                            <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                                <FileText className="w-4 h-4 text-blue-500" />
                                <Label className="text-base font-medium">الشكاوي والبلاغات</Label>
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                                {permissions.filter(p => p.includes("complaint") || p.includes("note")).map((perm) => (
                                    <div key={perm} className="flex items-center space-x-2 space-x-reverse">
                                        <Checkbox
                                            id={perm}
                                            checked={selectedPermissions.includes(perm)}
                                            onCheckedChange={() => togglePermission(perm)}
                                        />
                                        <label htmlFor={perm} className="text-sm cursor-pointer select-none">
                                            {translatePermission(perm)}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Evaluations & Technicians Section */}
                        <div className="border rounded-md p-4 bg-white shadow-sm">
                            <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                                <Star className="w-4 h-4 text-amber-500" />
                                <Label className="text-base font-medium">تقييمات الفنيين</Label>
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                                {permissions.filter(p => p.includes("evaluation") || p.includes("technician")).map((perm) => (
                                    <div key={perm} className="flex items-center space-x-2 space-x-reverse">
                                        <Checkbox
                                            id={perm}
                                            checked={selectedPermissions.includes(perm)}
                                            onCheckedChange={() => togglePermission(perm)}
                                        />
                                        <label htmlFor={perm} className="text-sm cursor-pointer select-none">
                                            {translatePermission(perm)}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Service Requests Section */}
                        <div className="border rounded-md p-4 bg-white shadow-sm">
                            <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                                <Briefcase className="w-4 h-4 text-purple-500" />
                                <Label className="text-base font-medium">الطلبات</Label>
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                                {permissions.filter(p => p.includes("request")).map((perm) => (
                                    <div key={perm} className="flex items-center space-x-2 space-x-reverse">
                                        <Checkbox
                                            id={perm}
                                            checked={selectedPermissions.includes(perm)}
                                            onCheckedChange={() => togglePermission(perm)}
                                        />
                                        <label htmlFor={perm} className="text-sm cursor-pointer select-none">
                                            {translatePermission(perm)}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Users & Settings Section */}
                        <div className="border rounded-md p-4 bg-white shadow-sm">
                            <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                                <User className="w-4 h-4 text-green-500" />
                                <Label className="text-base font-medium">المستخدمين والإعدادات</Label>
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                                {permissions.filter(p =>
                                    !p.includes("complaint") &&
                                    !p.includes("note") &&
                                    !p.includes("evaluation") &&
                                    !p.includes("technician") &&
                                    !p.includes("request")
                                ).map((perm) => (
                                    <div key={perm} className="flex items-center space-x-2 space-x-reverse">
                                        <Checkbox
                                            id={perm}
                                            checked={selectedPermissions.includes(perm)}
                                            onCheckedChange={() => togglePermission(perm)}
                                        />
                                        <label htmlFor={perm} className="text-sm cursor-pointer select-none">
                                            {translatePermission(perm)}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <input
                type="hidden"
                name="permissions"
                value={JSON.stringify(
                    selectedRole === "Admin" ? [] : selectedPermissions
                )}
            />

            <div className="flex justify-end pt-4 border-t">
                <Button type="submit" className="min-w-[150px]">
                    {isEditing ? "حفظ التغييرات" : "إضافة المستخدم"}
                </Button>
            </div>
        </form>
    );
}

function translateAction(action: string) {
    const map: Record<string, string> = {
        "CREATE_COMPLAINT": "إضافة شكوى",
        "UPDATE_COMPLAINT": "تعديل شكوى",
        "DELETE_COMPLAINT": "حذف شكوى",
        "CREATE_NOTE": "إضافة ملاحظة",
        "CREATE_TEAM_MEMBER": "إضافة مستخدم",
        "UPDATE_TEAM_MEMBER": "تعديل مستخدم",
        "DELETE_TEAM_MEMBER": "حذف مستخدم",
        "BULK_UPDATE_STATUS": "تحديث حالة جماعي",
        "CREATE_FIELD_TECHNICIAN": "إضافة فني ميداني",
        "UPDATE_FIELD_TECHNICIAN": "تعديل بيانات فني",
        "UPDATE_TECHNICIAN_STATUS": "تحديث حالة فني",
        "DELETE_FIELD_TECHNICIAN": "حذف فني",
        "CREATE_EVALUATION": "إضافة تقييم",

        // Service Requests
        "CREATE_SERVICE_REQUEST": "إضافة طلب خدمة",
        "UPDATE_SERVICE_REQUEST": "تعديل طلب خدمة",
        "DELETE_SERVICE_REQUEST": "حذف طلب خدمة",
        "UPDATE_SERVICE_REQUEST_STATUS": "تحديث حالة الطلب",
    };
    return map[action] || action;
}

function translatePermission(perm: string) {
    const map: Record<string, string> = {
        // Dashboard
        "view_dashboard": "عرض لوحة التحكم",

        // Complaints
        "view_complaints": "عرض الشكاوي",
        "create_complaint": "إضافة شكوى",
        "edit_complaint": "تعديل شكوى (كامل)",
        "update_status": "تحديث حالة الشكوى",
        "delete_complaint": "حذف شكوى",
        "assign_complaint": "تعيين شكوى",
        "manage_notes": "إدارة الملاحظات",

        // Service Requests
        "view_requests": "عرض الطلبات",
        "view_requests_stats": "عرض إحصائيات الطلبات",
        "create_request": "إضافة طلب جديد",
        "edit_request": "تعديل الطلبات",
        "delete_request": "حذف الطلبات",
        "print_request": "طباعة الطلبات",
        "manage_requests": "إدارة الطلبات (حالة/تعيين)",

        // Users
        "view_users": "عرض المستخدمين",
        "create_user": "إضافة مستخدم",
        "edit_user": "تعديل مستخدم",
        "delete_user": "حذف مستخدم",
        "manage_roles": "إدارة الأدوار",

        // Reports
        "view_reports": "عرض التقارير",
        "export_reports": "تصدير التقارير",

        // Settings & Logs
        "view_settings": "عرض الإعدادات",
        "manage_settings": "إدارة الإعدادات",
        "view_logs": "عرض سجل النشاطات",

        // Technician Evaluations
        "view_evaluations_page": "عرض صفحة تقييم الفنيين",
        "view_evaluations": "عرض بيانات التقييمات",
        "create_evaluation": "إنشاء تقييم جديد",
        "edit_evaluation": "تعديل التقييمات",
        "delete_evaluation": "حذف التقييمات",
        "view_technicians": "عرض قائمة الفنيين",
        "manage_technicians": "إدارة بيانات الفنيين",
    };
    return map[perm] || perm;
}

function translateField(field: string) {
    const map: Record<string, string> = {
        title: "العنوان",
        description: "الوصف",
        status: "الحالة",
        type: "النوع",
        source: "المصدر",
        severity: "الأهمية",
        priority: "الأولوية",
        customerName: "اسم العميل",
        customerPhone: "رقم العميل",
        orderNumber: "رقم الطلب",
        assignedTo: "المسند إليه"
    };
    return map[field] || field;
}
