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
import { useAuth } from "@/hooks/use-auth";
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
  const { user } = useAuth();
  const { id } = useParams<{ id?: string }>();
  const isEditing = Boolean(id);

  const hasPermission = (permission: string) => {
    if (!user) return false;
    if (user.role === "Admin") return true;
    return user.permissions?.includes(permission) || false;
  };

  if (isEditing && !hasPermission("edit_complaint")) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">ليس لديك صلاحية لتعديل هذه الشكوى</p>
      </div>
    );
  }

  if (!isEditing && !hasPermission("create_complaint")) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">ليس لديك صلاحية لإنشاء شكوى جديدة</p>
      </div>
    );
  }
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
      orderNumber: "",
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
        orderNumber: complaint.orderNumber,
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
        title: "تم بنجاح",
        description: "تم إنشاء الشكوى بنجاح",
      });
      setLocation("/complaints");
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل إنشاء الشكوى",
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
        title: "تم بنجاح",
        description: "تم تحديث الشكوى بنجاح",
      });
      setLocation(`/complaints/${id}`);
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل تحديث الشكوى",
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
        title: "خطأ في التحميل",
        description: "فشل تحميل الملفات",
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
            {isEditing ? "تعديل الشكوى" : "شكوى جديدة"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isEditing
              ? "تحديث معلومات الشكوى"
              : "املأ التفاصيل لتسجيل شكوى جديدة"}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>تفاصيل الشكوى</CardTitle>
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
                      <FormLabel>المصدر</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-source">
                            <SelectValue placeholder="اختر المصدر" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Call Center">مركز الاتصال</SelectItem>
                          <SelectItem value="Email">البريد الإلكتروني</SelectItem>
                          <SelectItem value="Website">موقع فزاع برو</SelectItem>
                          <SelectItem value="Mobile App">شكاوي صفحات التطبيق</SelectItem>
                          <SelectItem value="Social Media">وسائل التواصل الاجتماعي</SelectItem>
                          <SelectItem value="Walk-in">زيارة شخصية</SelectItem>
                          <SelectItem value="App Support">دعم التطبيق</SelectItem>
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
                      <FormLabel>النوع</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-type">
                            <SelectValue placeholder="اختر النوع" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Technical">فني</SelectItem>
                          <SelectItem value="Service">خدمة</SelectItem>
                          <SelectItem value="Billing">فواتير</SelectItem>
                          <SelectItem value="Product">منتج</SelectItem>
                          <SelectItem value="Staff">موظفين</SelectItem>
                          <SelectItem value="Other">أخرى</SelectItem>
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
                      <FormLabel>الأهمية</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-severity">
                            <SelectValue placeholder="اختر الأهمية" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Normal">عادي</SelectItem>
                          <SelectItem value="Medium">متوسط</SelectItem>
                          <SelectItem value="High">مرتفع</SelectItem>
                          <SelectItem value="Urgent">عاجل</SelectItem>
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
                    <FormLabel>العنوان</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="ملخص موجز للشكوى"
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
                    <FormLabel>الوصف</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="وصف تفصيلي للشكوى"
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
                      <FormLabel>اسم العميل</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="اسم العميل (اختياري)"
                          {...field}
                          value={field.value || ""}
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
                      <FormLabel>رقم الهاتف</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2 border-r pr-2 h-5">
                            <img
                              src="https://flagcdn.com/w20/sa.png"
                              srcSet="https://flagcdn.com/w40/sa.png 2x"
                              width="20"
                              height="15"
                              alt="Saudi Arabia"
                              className="object-contain"
                            />
                            <span className="text-xs text-muted-foreground dir-ltr">+966</span>
                          </div>
                          <Input
                            placeholder="5XXXXXXXX"
                            className="pl-20 text-left dir-ltr"
                            {...field}
                            value={field.value || ""}
                            data-testid="input-customer-phone"
                          />
                        </div>
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
                      <FormLabel>الموقع</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="الموقع الجغرافي (اختياري)"
                          {...field}
                          value={field.value || ""}
                          data-testid="input-location"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="orderNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>رقم الطلب</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="رقم الطلب (اختياري)"
                          {...field}
                          value={field.value || ""}
                          data-testid="input-order-number"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div>
                <FormLabel>المرفقات</FormLabel>
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
                      انقر للتحميل أو اسحب وأفلت
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      صور، PDF، DOC (بحد أقصى 10 ميجابايت لكل ملف)
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
                  إلغاء
                </Button>
                <Button type="submit" disabled={isSubmitting} data-testid="button-save">
                  <Save className="w-4 h-4 mr-2" />
                  {isSubmitting
                    ? "جارٍ الحفظ..."
                    : isEditing
                      ? "تحديث الشكوى"
                      : "حفظ الشكوى"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
