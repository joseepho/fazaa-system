import { createContext, ReactNode, useContext } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TeamMember } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
    user: TeamMember | null;
    isLoading: boolean;
    error: Error | null;
    loginMutation: any;
    logoutMutation: any;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const { toast } = useToast();
    const {
        data: user,
        error,
        isLoading,
    } = useQuery<TeamMember | null>({
        queryKey: ["/api/user"],
        queryFn: getQueryFn({ on401: "returnNull" }),
    });

    const loginMutation = useMutation({
        mutationFn: async (credentials: Pick<TeamMember, "email" | "password">) => {
            const res = await apiRequest("POST", "/api/login", credentials);
            return await res.json();
        },
        onSuccess: (user: TeamMember) => {
            queryClient.setQueryData(["/api/user"], user);
        },
        onError: (error: Error) => {
            toast({
                title: "Login failed",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const logoutMutation = useMutation({
        mutationFn: async () => {
            await apiRequest("POST", "/api/logout");
        },
        onSuccess: () => {
            queryClient.setQueryData(["/api/user"], null);
        },
        onError: (error: Error) => {
            toast({
                title: "Logout failed",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    return (
        <AuthContext.Provider
            value={{
                user: user ?? null,
                isLoading,
                error,
                loginMutation,
                logoutMutation,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
