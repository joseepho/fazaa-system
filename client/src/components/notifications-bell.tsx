import { Bell, PlusCircle, FileEdit, Trash2, Info } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications } from "@/hooks/use-notifications";
import { formatDistanceToNow, format } from "date-fns";
import { arSA } from "date-fns/locale";

export function NotificationsBell() {
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
    const [, setLocation] = useLocation();

    const getIcon = (type: string) => {
        if (type.startsWith("create")) {
            return <PlusCircle className="h-5 w-5 text-green-500" />;
        }
        if (type.startsWith("update") || type.startsWith("complaint_list")) {
            return <FileEdit className="h-5 w-5 text-blue-500" />;
        }
        if (type.startsWith("delete")) {
            return <Trash2 className="h-5 w-5 text-red-500" />;
        }
        // Fallback for legacy simple types
        switch (type) {
            case "create": return <PlusCircle className="h-5 w-5 text-green-500" />;
            case "update": return <FileEdit className="h-5 w-5 text-blue-500" />;
            case "delete": return <Trash2 className="h-5 w-5 text-red-500" />;
            default: return <Info className="h-5 w-5 text-gray-500" />;
        }
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-0 right-0 h-4 w-4 rounded-full bg-red-600 text-[10px] font-bold text-white flex items-center justify-center">
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <div className="flex items-center justify-between p-4 border-b bg-muted/30">
                    <h4 className="font-semibold">الاشعارات</h4>
                    {unreadCount > 0 && (
                        <Button variant="ghost" size="sm" onClick={() => markAllAsRead()} className="text-xs hover:text-primary">
                            تحديد الكل كمقروء
                        </Button>
                    )}
                </div>
                <ScrollArea className="h-[300px]">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                            <Bell className="h-10 w-10 mb-2 opacity-20" />
                            <p className="text-sm">لا توجد اشعارات</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={`p-4 hover:bg-muted/50 transition-colors cursor-pointer flex gap-3 ${!notification.read ? "bg-blue-50/50 dark:bg-blue-900/10" : ""
                                        }`}
                                    onClick={() => {
                                        if (!notification.read) markAsRead(notification.id);

                                        // Handle Evaluation Links
                                        if (notification.type.includes("evaluation:")) {
                                            const parts = notification.type.split(":");
                                            // Format: create_evaluation:123 or evaluation:123
                                            const techId = parts[parts.length - 1];
                                            setLocation(`/evaluations?techId=${techId}`);
                                        }
                                        // Handle Complaint Links
                                        else if (notification.type.includes("complaint:") && !notification.type.includes("list")) {
                                            const parts = notification.type.split(":");
                                            // Format: create_complaint:123, update_complaint:123, complaint:123
                                            const complaintId = parts[parts.length - 1];
                                            setLocation(`/complaints/${complaintId}`);
                                        }
                                        // Handle Lists
                                        else if (notification.type === "complaint_list" || notification.type === "create") {
                                            setLocation("/complaints");
                                        }
                                        // Handle Service Requests
                                        else if (notification.type.includes("request:") || notification.type.includes("request_status:")) {
                                            const parts = notification.type.split(":");
                                            const id = parts[parts.length - 1];
                                            setLocation(`/requests/${id}`);
                                        }
                                        else if (notification.type === "delete_request") {
                                            setLocation("/requests");
                                        }
                                    }}
                                >
                                    <div className="mt-1 shrink-0">
                                        {getIcon(notification.type)}
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <p className="text-sm font-medium leading-none">
                                            {notification.title}
                                        </p>
                                        <p className="text-sm text-muted-foreground line-clamp-2">
                                            {notification.message}
                                        </p>
                                        <div className="flex justify-between items-center w-full">
                                            <span className="text-xs text-muted-foreground">
                                                {format(new Date(notification.createdAt), "PPP - hh:mm a", { locale: arSA })}
                                            </span>
                                        </div>
                                    </div>
                                    {!notification.read && (
                                        <div className="h-2 w-2 rounded-full bg-blue-600 mt-1 shrink-0" />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}
