import { Bell, PlusCircle, FileEdit, Trash2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications } from "@/hooks/use-notifications";
import { formatDistanceToNow } from "date-fns";
import { arSA } from "date-fns/locale";

export function NotificationsBell() {
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

    const getIcon = (type: string) => {
        switch (type) {
            case "create":
                return <PlusCircle className="h-5 w-5 text-green-500" />;
            case "update":
                return <FileEdit className="h-5 w-5 text-blue-500" />;
            case "delete":
                return <Trash2 className="h-5 w-5 text-red-500" />;
            default:
                return <Info className="h-5 w-5 text-gray-500" />;
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
                                    onClick={() => !notification.read && markAsRead(notification.id)}
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
                                        <p className="text-xs text-muted-foreground">
                                            {formatDistanceToNow(new Date(notification.createdAt), {
                                                addSuffix: true,
                                                locale: arSA,
                                            })}
                                        </p>
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
