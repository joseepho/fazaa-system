import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Redirect } from "wouter";
import { useState } from "react";
import { Loader2, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";

const loginSchema = z.object({
    username: z.string().email("Please enter a valid email"),
    password: z.string().min(1, "Password is required"),
});

export default function AuthPage() {
    const { user, loginMutation } = useAuth();
    const [showPassword, setShowPassword] = useState(false);
    const form = useForm<z.infer<typeof loginSchema>>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            username: "",
            password: "",
        },
    });

    if (user) {
        return <Redirect to="/" />;
    }

    function onSubmit(values: z.infer<typeof loginSchema>) {
        loginMutation.mutate(values);
    }

    return (
        <div className="min-h-screen grid lg:grid-cols-2 overflow-hidden">
            {/* Left Side - Login Form */}
            <div className="flex items-center justify-center p-8 bg-background relative z-10 transition-all duration-500">
                <Card className="w-full max-w-md border-0 shadow-none sm:border sm:shadow-xl bg-card/80 backdrop-blur-sm transition-all duration-300 hover:shadow-2xl">
                    <CardHeader className="space-y-2 text-center pb-8 border-b border-border/10 mb-6">
                        <div className="flex justify-center mb-6">
                            <motion.div
                                className="relative group cursor-pointer"
                                whileHover={{ scale: 1.05 }}
                                transition={{ type: "spring", stiffness: 400, damping: 10 }}
                            >
                                <div className="absolute -inset-4 bg-gradient-to-r from-primary to-blue-600 rounded-full opacity-20 blur-lg group-hover:opacity-30 transition duration-1000"></div>
                                <div className="p-4 bg-primary/10 rounded-full ring-1 ring-primary/20 relative">
                                    <ShieldCheck className="w-12 h-12 text-primary" />
                                </div>
                            </motion.div>
                        </div>
                        <CardTitle className="text-3xl font-bold tracking-tight text-foreground">
                            تسجيل الدخول
                        </CardTitle>
                        <CardDescription className="text-base font-medium text-muted-foreground mt-2">
                            مرحباً بك في نظام فزاع برو
                            <br />
                            <span className="text-sm font-normal opacity-80 inline-block mt-1">
                                بوابة إدارة الشكاوي وتقييم أداء الفنيين
                            </span>
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                                <FormField
                                    control={form.control}
                                    name="username"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-foreground/80 font-semibold">البريد الإلكتروني</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="name@example.com"
                                                    {...field}
                                                    className="h-12 bg-background/50 border-input/50 focus:bg-background transition-colors text-right text-lg"
                                                    dir="ltr"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-foreground/80 font-semibold">كلمة المرور</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input
                                                        type={showPassword ? "text" : "password"}
                                                        {...field}
                                                        className="h-12 bg-background/50 border-input/50 focus:bg-background transition-colors pr-10 text-right text-lg"
                                                        dir="ltr"
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="absolute left-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                    >
                                                        {showPassword ? (
                                                            <EyeOff className="h-5 w-5" />
                                                        ) : (
                                                            <Eye className="h-5 w-5" />
                                                        )}
                                                    </Button>
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <Button
                                    type="submit"
                                    className="w-full h-12 text-lg font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all hover:scale-[1.02] active:scale-[0.98] mt-4"
                                    disabled={loginMutation.isPending}
                                >
                                    {loginMutation.isPending && (
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    )}
                                    تسجيل الدخول
                                </Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            </div>

            {/* Right Side - Branding & Features */}
            <div className="hidden lg:flex flex-col relative overflow-hidden bg-primary text-primary-foreground min-h-screen">
                {/* Dynamic Background */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent)] pointer-events-none" />
                <div className="absolute inset-0 bg-[linear-gradient(to_bottom_right,#00000020,transparent)] pointer-events-none" />

                {/* Decorative Pattern */}
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>

                <div className="flex-1 flex flex-col items-center justify-center p-12 relative z-10 text-center max-w-2xl mx-auto">
                    <div className="mb-20 relative perspective-[1200px] group w-full flex justify-center">
                        {/* Animated Background Blobs */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-blue-500/20 to-purple-500/20 rounded-full blur-[100px] opacity-40 animate-pulse -z-10" />

                        {/* Main 3D Container */}
                        <motion.div
                            className="w-80 h-80 relative"
                            initial={{ rotateX: 12, rotateY: -12, scale: 0.9 }}
                            animate={{
                                rotateX: [12, 0, 12],
                                rotateY: [-12, 12, -12],
                                y: [0, -20, 0]
                            }}
                            transition={{
                                rotateX: { duration: 6, repeat: Infinity, ease: "easeInOut" },
                                rotateY: { duration: 8, repeat: Infinity, ease: "easeInOut" },
                                y: { duration: 5, repeat: Infinity, ease: "easeInOut" }
                            }}
                            style={{ transformStyle: "preserve-3d" }}
                        >
                            {/* Layer 1: Back Panel (Glass Card) */}
                            <div
                                className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl rounded-[3rem] border border-white/20 shadow-[0_0_50px_rgba(0,0,0,0.2)]"
                                style={{ transform: "translateZ(0px)" }}
                            >
                                {/* Subtle inner glow */}
                                <div className="absolute inset-0 rounded-[3rem] bg-gradient-to-tr from-transparent via-white/5 to-white/10 opacity-50" />
                                {/* Grid texture */}
                                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] rounded-[3rem]" />
                            </div>

                            {/* Layer 2: Middle Decorative Ring */}
                            <div
                                className="absolute top-10 right-10 bottom-10 left-10 border-2 border-dashed border-white/20 rounded-full animate-[spin_20s_linear_infinite]"
                                style={{ transform: "translateZ(30px)" }}
                            />

                            {/* Layer 3: Floating Elements (Orbs) */}
                            <motion.div
                                className="absolute -top-6 -right-6 w-20 h-20 bg-accent/40 backdrop-blur-xl rounded-2xl border border-white/30 shadow-lg"
                                style={{ transform: "translateZ(50px)" }}
                                animate={{ y: [0, -10, 0], rotate: [0, 10, 0] }}
                                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                            />
                            <motion.div
                                className="absolute -bottom-8 -left-8 w-28 h-28 bg-primary/40 backdrop-blur-xl rounded-full border border-white/30 shadow-lg"
                                style={{ transform: "translateZ(-30px)" }}
                                animate={{ scale: [1, 1.1, 1] }}
                                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                            />

                            {/* Layer 4: Main Image (Popping Out) */}
                            <div
                                className="absolute inset-2 flex items-center justify-center pointer-events-none"
                                style={{ transform: "translateZ(80px)" }}
                            >
                                <img
                                    src="/login.png"
                                    alt="System Preview"
                                    className="w-[110%] h-[110%] object-contain drop-shadow-[0_25px_50px_rgba(0,0,0,0.5)] transform hover:scale-105 transition-transform duration-500"
                                />
                            </div>

                            {/* Layer 5: Front Badge */}
                            <div
                                className="absolute -bottom-0 right-10 bg-white/90 backdrop-blur-xl text-primary px-5 py-3 rounded-2xl text-sm font-bold shadow-2xl flex items-center gap-3 border border-white/40"
                                style={{ transform: "translateZ(120px)" }}
                            >
                                <div className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                </div>
                                <div className="flex flex-col text-right">
                                    <span className="leading-none text-xs text-muted-foreground">حالة النظام</span>
                                    <span className="leading-none mt-1 text-green-600">يعمل بكفاءة</span>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3, duration: 0.6 }}
                    >
                        <h1 className="text-5xl lg:text-6xl font-extrabold mb-6 tracking-tight drop-shadow-lg">
                            نظام فزاع برو
                        </h1>
                        <div className="h-1 w-32 bg-accent mx-auto mb-6 rounded-full opacity-80"></div>
                        <p className="text-xl lg:text-2xl opacity-90 mb-12 font-light leading-relaxed max-w-lg mx-auto">
                            الحل المتكامل والذكي لإدارة عمليات الصيانة
                            <br />
                            <span className="font-semibold text-accent/90">وتقييم أداء الفنيين</span>
                            {' '}بدقة واحترافية
                        </p>
                    </motion.div>

                    {/* Features Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left md:text-center mt-4">
                        {[
                            { title: "إدارة الشكاوي", desc: "متابعة فورية وحل سريع", icon: "📋" },
                            { title: "تقييم الفنيين", desc: "قياس الأداء والجودة", icon: "⭐" },
                            { title: "تقارير شاملة", desc: "تحليلات وإحصائيات دقيقة", icon: "📊" }
                        ].map((feature, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.6 + (idx * 0.1) }}
                                className="group bg-white/5 backdrop-blur-sm rounded-xl p-5 border border-white/10 hover:bg-white/15 transition-all hover:scale-105 cursor-default shadow-lg"
                            >
                                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">{feature.icon}</div>
                                <h3 className="font-bold mb-2 text-lg text-white">{feature.title}</h3>
                                <p className="text-sm opacity-75 leading-snug text-blue-50">{feature.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>

                <div className="p-6 text-center text-xs opacity-60 relative z-10 font-mono">
                    &copy; {new Date().getFullYear()} Fazaa Pro System. All rights reserved.
                </div>
            </div>
        </div>
    );
}
