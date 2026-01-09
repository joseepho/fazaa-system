import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { FileQuestion, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#0066CC] to-[#0099FF] flex items-center justify-center mb-8">
        <FileQuestion className="w-12 h-12 text-white" />
      </div>
      <h1 className="text-4xl font-bold mb-4" data-testid="text-404-title">الصفحة غير موجودة</h1>
      <p className="text-muted-foreground text-lg mb-8 max-w-md">
        الصفحة التي تبحث عنها غير موجودة أو تم نقلها.
      </p>
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => window.history.back()} data-testid="button-go-back">
          <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
          رجوع
        </Button>
        <Link href="/">
          <Button data-testid="button-go-home">
            <Home className="w-4 h-4 ml-2" />
            لوحة التحكم
          </Button>
        </Link>
      </div>
    </div>
  );
}
