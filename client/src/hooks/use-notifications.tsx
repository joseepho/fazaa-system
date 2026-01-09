import { createContext, ReactNode, useContext, useEffect, useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Notification } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "./use-auth";

type NotificationContextType = {
    notifications: Notification[];
    unreadCount: number;
    markAsRead: (id: number) => void;
    markAllAsRead: () => void;
};

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Loud notification sound
    const NOTIFICATION_SOUND = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

    useEffect(() => {
        audioRef.current = new Audio(NOTIFICATION_SOUND);
        audioRef.current.volume = 1.0; // Max volume
    }, []);

    const { data: notifications = [] } = useQuery<Notification[]>({
        queryKey: ["/api/notifications"],
        queryFn: getQueryFn({ on401: "throw" }),
        enabled: !!user,
        refetchInterval: 30000, // Fallback polling
    });

    const unreadCount = notifications.filter(n => !n.read).length;

    useEffect(() => {
        if (!user) return;

        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log("Connected to notification server");
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === "NOTIFICATION") {
                    // Invalidate query to fetch new notifications
                    queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });

                    // Only play sound and show toast for Admin
                    if (user.role === "Admin") {
                        // Play sound multiple times
                        if (audioRef.current) {
                            const playSound = (times: number) => {
                                if (times <= 0) return;
                                audioRef.current!.currentTime = 0;
                                audioRef.current!.play().catch(e => console.error("Error playing sound:", e));
                                setTimeout(() => playSound(times - 1), 800); // Play every 800ms
                            };
                            playSound(3);
                        }

                        // Show toast
                        toast({
                            title: data.payload.title,
                            description: data.payload.message,
                        });
                    }
                }
            } catch (e) {
                console.error("Error parsing WS message", e);
            }
        };

        setSocket(ws);

        return () => {
            ws.close();
        };
    }, [user, toast]);

    const markAsReadMutation = useMutation({
        mutationFn: async (id: number) => {
            await apiRequest("POST", `/api/notifications/${id}/read`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
        },
    });

    const markAllAsReadMutation = useMutation({
        mutationFn: async () => {
            await apiRequest("POST", "/api/notifications/read-all");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
        },
    });

    return (
        <NotificationContext.Provider
            value={{
                notifications,
                unreadCount,
                markAsRead: (id) => markAsReadMutation.mutate(id),
                markAllAsRead: () => markAllAsReadMutation.mutate(),
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error("useNotifications must be used within a NotificationProvider");
    }
    return context;
}
