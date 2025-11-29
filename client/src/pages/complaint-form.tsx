import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Save, Upload, X, FileText, Image } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import {
  insertComplaintSchema,
  complaintSources,
  complaintTypes,
  complaintSeverities,
  type Complaint,
  type InsertComplaint,
} from "@shared/schema";

export default function ComplaintForm() {
  const { id } = useParams<{ id?: string }>();
  const isEditing = Boolean(id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);

  const { data: complaint, isLoading: complaintLoading } = useQuery<Complaint>({
    queryKey: ["/api/complaints", id],
    enabled: isEditing,
  });

  const form = useForm<InsertComplaint>({
    resolver: zodResolver(insertComplaintSchema),
    defaultValues: {
      source: "App Support",
      type: "Technical",
      severity: "Normal",
      title: "",
      description: "",
      customerName: "",
      customerPhone: "",
      location: "",
      attachments: [],
    },
  });

  useEffect(() => {
    if (complaint && isEditing) {
      form.reset({
        source: complaint.source,
        type: complaint.type,
        severity: complaint.severity,
        title: complaint.title,
        description: complaint.description,
        customerName: complaint.customerName,
        customerPhone: complaint.customerPhone,
        location: complaint.location,
        attachments: complaint.attachments,
      });
      setUploadedFiles(complaint.attachments || []);
    }
  }, [complaint, isEditing, form]);

  const createMutation = useMutation({
    mutationFn: async (data: InsertComplaint) => {
      const response = await apiRequest("POST", "/api/complaints", {
        ...data,
        attachments: uploadedFiles,
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/complaints"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Success",
        description: "Complaint created successfully",
      });
      setLocation("/complaints");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create complaint",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: InsertComplaint) => {
      const response = await apiRequest("PUT", `/api/complaints/${id}`, {
        ...data,
        attachments: uploadedFiles,
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/complaints"] });
      queryClient.invalidateQueries({ queryKey: ["/api/complaints", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Success",
        description: "Complaint updated successfully",
      });
      setLocation(`/complaints/${id}`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update complaint",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertComplaint) => {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append("files", file);
    });

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (data.urls) {
        setUploadedFiles((prev) => [...prev, ...data.urls]);
      }
    } catch (error) {
      toast({
        title: "Upload Error",
        description: "Failed to upload files",
        variant: "destructive",
      });
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  if (isEditing && complaintLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Card>
          <CardContent className="p-6">
            <div className="space-y-6">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setLocation(isEditing ? `/complaints/${id}` : "/complaints")}
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-form-title">
            {isEditing ? "Edit Complaint" : "New Complaint"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isEditing
              ? "Update complaint information"
              : "Fill in the details to register a new complaint"}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Complaint Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-source">
                            <SelectValue placeholder="Select source" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {complaintSources.map((source) => (
                            <SelectItem key={source} value={source}>
                              {source}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {complaintTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="severity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Severity</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-severity">
                            <SelectValue placeholder="Select severity" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {complaintSeverities.map((severity) => (
                            <SelectItem key={severity} value={severity}>
                              {severity}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Brief summary of the complaint"
                        {...field}
                        data-testid="input-title"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Detailed description of the complaint"
                        className="min-h-32 resize-y"
                        {...field}
                        data-testid="input-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Customer's name (optional)"
                          {...field}
                          data-testid="input-customer-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customerPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Phone number (optional)"
                          {...field}
                          data-testid="input-customer-phone"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Geographic location (optional)"
                          {...field}
                          data-testid="input-location"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div>
                <FormLabel>Attachments</FormLabel>
                <div className="mt-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    multiple
                    accept="image/*,.pdf,.doc,.docx"
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                    data-testid="button-upload-files"
                  >
                    <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Images, PDF, DOC (max 10MB each)
                    </p>
                  </div>

                  {uploadedFiles.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {uploadedFiles.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 p-3 bg-muted rounded-lg"
                        >
                          {file.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                            <Image className="w-5 h-5 text-primary" />
                          ) : (
                            <FileText className="w-5 h-5 text-primary" />
                          )}
                          <span className="flex-1 text-sm truncate">{file}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeFile(index)}
                            data-testid={`button-remove-file-${index}`}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-4 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setLocation(isEditing ? `/complaints/${id}` : "/complaints")
                  }
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} data-testid="button-save">
                  <Save className="w-4 h-4 mr-2" />
                  {isSubmitting
                    ? "Saving..."
                    : isEditing
                    ? "Update Complaint"
                    : "Save Complaint"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
