import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background text-foreground">
                    <div className="max-w-md text-center space-y-4">
                        <div className="flex justify-center">
                            <AlertCircle className="h-16 w-16 text-destructive" />
                        </div>
                        <h1 className="text-2xl font-bold">عذراً، حدث خطأ غير متوقع</h1>
                        <p className="text-muted-foreground">
                            نعتذر عن هذا الخلل. يرجى محاولة تحديث الصفحة أو الاتصال بالدعم الفني إذا استمرت المشكلة.
                        </p>
                        <div className="p-4 bg-muted rounded-md text-left text-xs font-mono overflow-auto max-h-40 dir-ltr">
                            {this.state.error?.toString()}
                        </div>
                        <Button
                            onClick={() => window.location.reload()}
                            className="w-full"
                        >
                            تحديث الصفحة
                        </Button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
