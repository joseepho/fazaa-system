import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Plus,
  Filter,
  FileText,
  X,
  ChevronLeft,
  ChevronRight,
  User,
  MessageSquare,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import type { Complaint, TeamMember } from "@shared/schema";
import {
  complaintSources,
  complaintTypes,
  complaintStatuses,
} from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const statusColors: Record<string, string> = {
  New: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "Under Review": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  Transferred: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  "Pending Customer": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  Resolved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  Closed: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
  Rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

const statusTranslations: Record<string, string> = {
  New: "جديد",
  "Under Review": "قيد المراجعة",
  Transferred: "محولة",
  "Pending Customer": "بانتظار العميل",
  Resolved: "تم الحل",
  Closed: "مغلقة",
  Rejected: "مرفوضة",
};

const severityColors: Record<string, string> = {
  Normal: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  Medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  High: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  Urgent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const severityTranslations: Record<string, string> = {
  Normal: "عادي",
  Medium: "متوسط",
  High: "مرتفع",
  Urgent: "عاجل",
};

const sourceTranslations: Record<string, string> = {
  "Call Center": "مركز الاتصال",
  "Email": "البريد الإلكتروني",
  "Website": "موقع فزاع برو",
  "Mobile App": "شكاوي صفحات التطبيق",
  "Social Media": "وسائل التواصل الاجتماعي",
  "Walk-in": "زيارة شخصية",
  "App Support": "دعم التطبيق",
};

const typeTranslations: Record<string, string> = {
  "Technical": "فني",
  "Service": "خدمة",
  "Billing": "فواتير",
  "Product": "منتج",
  "Staff": "موظفين",
  "Other": "أخرى",
};

const ITEMS_PER_PAGE = 10;

export default function ComplaintsList() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const { user } = useAuth();

  const { data: complaints, isLoading } = useQuery<Complaint[]>({
    queryKey: ["/api/complaints"],
  });

  const { data: teamMembers, isLoading: isLoadingMembers } = useQuery<TeamMember[]>({
    queryKey: ["/api/team-members"],
  });

  const getAssigneeName = (id: number | null) => {
    if (!id) return "غير معين";
    if (isLoadingMembers) return "...";
    return teamMembers?.find(m => m.id === id)?.name || "غير معروف";
  };

  const hasPermission = (permission: string) => {
    if (!user) return false;
    if (user.role === "Admin") return true;
    return user.permissions?.includes(permission) || false;
  };

  const filteredComplaints =
    complaints?.filter((complaint) => {
      const matchesSearch =
        searchQuery === "" ||
        complaint.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        complaint.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (complaint.customerName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (complaint.orderNumber || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(complaint.id).includes(searchQuery);

      const matchesSource =
        sourceFilter === "all" || complaint.source === sourceFilter;
      const matchesType = typeFilter === "all" || complaint.type === typeFilter;
      const matchesStatus =
        statusFilter === "all" || complaint.status === statusFilter;

      return matchesSearch && matchesSource && matchesType && matchesStatus;
    }) || [];

  const totalPages = Math.ceil(filteredComplaints.length / ITEMS_PER_PAGE);
  const paginatedComplaints = filteredComplaints.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const hasActiveFilters =
    sourceFilter !== "all" || typeFilter !== "all" || statusFilter !== "all";

  const clearFilters = () => {
    setSourceFilter("all");
    setTypeFilter("all");
    setStatusFilter("all");
    setCurrentPage(1);
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-complaints-list-title">الشكاوى</h1>
          <p className="text-muted-foreground mt-1">
            إدارة وتتبع جميع شكاوى العملاء
          </p>
        </div>
        {hasPermission("create_complaint") && (
          <Link href="/complaints/new">
            <Button className="w-full sm:w-auto" data-testid="button-add-complaint">
              <Plus className="w-4 h-4 mr-2" />
              إضافة شكوى
            </Button>
          </Link>
        )}
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="البحث بالعنوان، الوصف، العميل، رقم الطلب، أو المعرف..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10"
                data-testid="input-search-complaints"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select
                value={sourceFilter}
                onValueChange={(v) => {
                  setSourceFilter(v);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-[140px]" data-testid="select-source-filter">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="المصدر" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل المصادر</SelectItem>
                  {complaintSources.map((source) => (
                    <SelectItem key={source} value={source}>
                      {sourceTranslations[source] || source}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={typeFilter}
                onValueChange={(v) => {
                  setTypeFilter(v);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-[130px]" data-testid="select-type-filter">
                  <SelectValue placeholder="النوع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الأنواع</SelectItem>
                  {complaintTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {typeTranslations[type] || type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-[150px]" data-testid="select-status-filter">
                  <SelectValue placeholder="الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الحالات</SelectItem>
                  {complaintStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {statusTranslations[status] || status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={clearFilters}
                  data-testid="button-clear-filters"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredComplaints.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">لم يتم العثور على شكاوى</p>
              <p className="text-sm mt-1">
                {searchQuery || hasActiveFilters
                  ? "حاول تعديل البحث أو الفلاتر"
                  : "أضف شكواك الأولى للبدء"}
              </p>
              {!searchQuery && !hasActiveFilters && hasPermission("create_complaint") && (
                <Link href="/complaints/new">
                  <Button className="mt-4" data-testid="button-add-first-complaint">
                    <Plus className="w-4 h-4 mr-2" />
                    إضافة شكوى
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold text-right">المعرف</TableHead>
                      <TableHead className="font-semibold text-right">رقم الطلب</TableHead>
                      <TableHead className="font-semibold text-right">العنوان</TableHead>
                      <TableHead className="font-semibold text-right">المصدر</TableHead>
                      <TableHead className="font-semibold text-right">النوع</TableHead>
                      <TableHead className="font-semibold text-right">الأهمية</TableHead>
                      <TableHead className="font-semibold text-right">الحالة</TableHead>
                      <TableHead className="font-semibold text-right">المنفذ</TableHead>
                      <TableHead className="font-semibold text-right">التاريخ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedComplaints.map((complaint) => (
                      <TableRow
                        key={complaint.id}
                        className="cursor-pointer hover-elevate"
                        onClick={() => setLocation(`/complaints/${complaint.id}`)}
                        data-testid={`row-complaint-${complaint.id}`}
                      >
                        <TableCell className="font-mono text-xs">
                          #{complaint.id}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {complaint.orderNumber || "-"}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate font-medium">
                          {complaint.title}
                        </TableCell>
                        <TableCell>{sourceTranslations[complaint.source] || complaint.source}</TableCell>
                        <TableCell>{typeTranslations[complaint.type] || complaint.type}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={severityColors[complaint.severity]}
                          >
                            {severityTranslations[complaint.severity] || complaint.severity}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[complaint.status]}>
                            {statusTranslations[complaint.status] || complaint.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {complaint.createdBy ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <div className="flex items-center gap-2">
                                    <div className="bg-primary/10 p-1 rounded-full">
                                      <User className="w-4 h-4 text-primary" />
                                    </div>
                                    <span className="text-sm">{getAssigneeName(complaint.createdBy)}</span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>تم الإنشاء بواسطة: {getAssigneeName(complaint.createdBy)}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <span className="text-muted-foreground text-xs">نظام/خارجي</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          <div className="flex items-center gap-2">
                            {formatDate(complaint.createdAt)}
                            {(complaint as any).notesCount > 0 && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <div className="bg-blue-100 dark:bg-blue-900/30 p-1 rounded-full animate-pulse">
                                      <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>يوجد {(complaint as any).notesCount} ملاحظات</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 px-2">
                  <p className="text-sm text-muted-foreground">
                    عرض {(currentPage - 1) * ITEMS_PER_PAGE + 1} إلى{" "}
                    {Math.min(currentPage * ITEMS_PER_PAGE, filteredComplaints.length)}{" "}
                    من {filteredComplaints.length} شكوى
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      data-testid="button-prev-page"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    <span className="text-sm font-medium px-2">
                      صفحة {currentPage} من {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      data-testid="button-next-page"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
