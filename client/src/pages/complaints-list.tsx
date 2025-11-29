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
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import type { Complaint } from "@shared/schema";
import {
  complaintSources,
  complaintTypes,
  complaintStatuses,
} from "@shared/schema";

const statusColors: Record<string, string> = {
  New: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "Under Review": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  Transferred: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  "Pending Customer": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  Resolved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  Closed: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
  Rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

const severityColors: Record<string, string> = {
  Normal: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  Medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  High: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  Urgent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const ITEMS_PER_PAGE = 10;

export default function ComplaintsList() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  const { data: complaints, isLoading } = useQuery<Complaint[]>({
    queryKey: ["/api/complaints"],
  });

  const filteredComplaints =
    complaints?.filter((complaint) => {
      const matchesSearch =
        searchQuery === "" ||
        complaint.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        complaint.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        complaint.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        complaint.id.toLowerCase().includes(searchQuery.toLowerCase());

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-complaints-list-title">Complaints</h1>
          <p className="text-muted-foreground mt-1">
            Manage and track all customer complaints
          </p>
        </div>
        <Link href="/complaints/new">
          <Button className="w-full sm:w-auto" data-testid="button-add-complaint">
            <Plus className="w-4 h-4 mr-2" />
            Add Complaint
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, description, customer, or ID..."
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
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  {complaintSources.map((source) => (
                    <SelectItem key={source} value={source}>
                      {source}
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
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {complaintTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
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
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {complaintStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
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
              <p className="text-lg font-medium">No complaints found</p>
              <p className="text-sm mt-1">
                {searchQuery || hasActiveFilters
                  ? "Try adjusting your search or filters"
                  : "Add your first complaint to get started"}
              </p>
              {!searchQuery && !hasActiveFilters && (
                <Link href="/complaints/new">
                  <Button className="mt-4" data-testid="button-add-first-complaint">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Complaint
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
                      <TableHead className="font-semibold">ID</TableHead>
                      <TableHead className="font-semibold">Title</TableHead>
                      <TableHead className="font-semibold">Source</TableHead>
                      <TableHead className="font-semibold">Type</TableHead>
                      <TableHead className="font-semibold">Severity</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Date</TableHead>
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
                          {complaint.id.slice(0, 8)}...
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate font-medium">
                          {complaint.title}
                        </TableCell>
                        <TableCell>{complaint.source}</TableCell>
                        <TableCell>{complaint.type}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={severityColors[complaint.severity]}
                          >
                            {complaint.severity}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[complaint.status]}>
                            {complaint.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(complaint.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 px-2">
                  <p className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
                    {Math.min(currentPage * ITEMS_PER_PAGE, filteredComplaints.length)}{" "}
                    of {filteredComplaints.length} complaints
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      data-testid="button-prev-page"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm font-medium px-2">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      data-testid="button-next-page"
                    >
                      <ChevronRight className="w-4 h-4" />
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
