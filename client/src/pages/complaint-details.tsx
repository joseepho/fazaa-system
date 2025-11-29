import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Calendar,
  User,
  Phone,
  MapPin,
  FileText,
  Image,
  MessageSquare,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
} from "lucide-react";
import type { Complaint, Note, ComplaintStatus, StatusChange } from "@shared/schema";
import { complaintStatuses } from "@shared/schema";

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

const statusIcons: Record<string, typeof Clock> = {
  New: AlertCircle,
  "Under Review": Clock,
  Transferred: FileText,
  "Pending Customer": User,
  Resolved: CheckCircle2,
  Closed: CheckCircle2,
  Rejected: XCircle,
};

function TimelineItem({
  change,
  isLast,
}: {
  change: StatusChange;
  isLast: boolean;
}) {
  const Icon = statusIcons[change.toStatus] || Clock;
  const date = new Date(change.changedAt);

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        {!isLast && <div className="w-0.5 flex-1 bg-border mt-2" />}
      </div>
      <div className="pb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={statusColors[change.fromStatus]}>{change.fromStatus}</Badge>
          <span className="text-muted-foreground">to</span>
          <Badge className={statusColors[change.toStatus]}>{change.toStatus}</Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}

export default function ComplaintDetails() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [noteText, setNoteText] = useState("");

  const { data: complaint, isLoading: complaintLoading } = useQuery<Complaint>({
    queryKey: ["/api/complaints", id],
  });

  const { data: notes, isLoading: notesLoading } = useQuery<Note[]>({
    queryKey: ["/api/complaints", id, "notes"],
  });

  const { data: statusHistory } = useQuery<StatusChange[]>({
    queryKey: ["/api/complaints", id, "status-history"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: ComplaintStatus) => {
      return apiRequest("PUT", `/api/complaints/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/complaints"] });
      queryClient.invalidateQueries({ queryKey: ["/api/complaints", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/complaints", id, "status-history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Status Updated",
        description: "Complaint status has been updated",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async (text: string) => {
      return apiRequest("POST", `/api/complaints/${id}/notes`, { text });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/complaints", id, "notes"] });
      setNoteText("");
      toast({
        title: "Note Added",
        description: "Internal note has been added",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add note",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/complaints/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/complaints"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Deleted",
        description: "Complaint has been deleted",
      });
      setLocation("/complaints");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete complaint",
        variant: "destructive",
      });
    },
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (complaintLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="w-10 h-10 rounded-md" />
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-48" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <FileText className="w-16 h-16 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-semibold">Complaint Not Found</h2>
        <p className="text-muted-foreground mt-1">
          The complaint you're looking for doesn't exist
        </p>
        <Link href="/complaints">
          <Button className="mt-4" data-testid="button-back-to-list">Back to Complaints</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setLocation("/complaints")}
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold" data-testid="text-complaint-title">{complaint.title}</h1>
              <Badge className={statusColors[complaint.status]}>{complaint.status}</Badge>
            </div>
            <p className="text-sm text-muted-foreground font-mono">ID: {complaint.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/complaints/${id}/edit`}>
            <Button variant="outline" data-testid="button-edit">
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </Link>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" data-testid="button-delete">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Complaint?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the
                  complaint and all associated notes.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteMutation.mutate()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  data-testid="button-confirm-delete"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Complaint Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    Source
                  </p>
                  <p className="font-medium mt-1">{complaint.source}</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    Type
                  </p>
                  <p className="font-medium mt-1">{complaint.type}</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    Severity
                  </p>
                  <Badge variant="outline" className={`mt-1 ${severityColors[complaint.severity]}`}>
                    {complaint.severity}
                  </Badge>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    Status
                  </p>
                  <Badge className={`mt-1 ${statusColors[complaint.status]}`}>
                    {complaint.status}
                  </Badge>
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-2">Description</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {complaint.description}
                </p>
              </div>

              {(complaint.customerName || complaint.customerPhone || complaint.location) && (
                <div className="border-t pt-6">
                  <h3 className="font-medium mb-4">Customer Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {complaint.customerName && (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Name</p>
                          <p className="font-medium">{complaint.customerName}</p>
                        </div>
                      </div>
                    )}
                    {complaint.customerPhone && (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Phone className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Phone</p>
                          <p className="font-medium">{complaint.customerPhone}</p>
                        </div>
                      </div>
                    )}
                    {complaint.location && (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <MapPin className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Location</p>
                          <p className="font-medium">{complaint.location}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="border-t pt-6">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>Created: {formatDate(complaint.createdAt)}</span>
                  {complaint.updatedAt !== complaint.createdAt && (
                    <>
                      <span className="mx-1">•</span>
                      <span>Updated: {formatDate(complaint.updatedAt)}</span>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {complaint.attachments && complaint.attachments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="w-5 h-5" />
                  Attachments ({complaint.attachments.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {complaint.attachments.map((attachment, index) => (
                    <a
                      key={index}
                      href={attachment}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative aspect-square rounded-lg overflow-hidden bg-muted hover-elevate cursor-pointer group"
                      data-testid={`link-attachment-${index}`}
                    >
                      {attachment.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                        <img
                          src={attachment}
                          alt={`Attachment ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FileText className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-white text-sm">View</span>
                      </div>
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Internal Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <Textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Add an internal note..."
                  className="min-h-20 resize-none"
                  data-testid="input-note"
                />
                <Button
                  onClick={() => noteText.trim() && addNoteMutation.mutate(noteText.trim())}
                  disabled={!noteText.trim() || addNoteMutation.isPending}
                  data-testid="button-add-note"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>

              {notesLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : notes && notes.length > 0 ? (
                <div className="space-y-3">
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      className="p-4 bg-muted rounded-lg"
                      data-testid={`note-${note.id}`}
                    >
                      <p className="text-sm">{note.text}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDate(note.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No notes yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Update Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={complaint.status}
                onValueChange={(value) =>
                  updateStatusMutation.mutate(value as ComplaintStatus)
                }
                disabled={updateStatusMutation.isPending}
              >
                <SelectTrigger data-testid="select-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {complaintStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Status Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statusHistory && statusHistory.length > 0 ? (
                <div>
                  {statusHistory.map((change, index) => (
                    <TimelineItem
                      key={change.id}
                      change={change}
                      isLast={index === statusHistory.length - 1}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Clock className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No status changes yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
