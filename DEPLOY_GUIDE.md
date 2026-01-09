# دليل رفع مشروع "نظام شكاوي فزاع" على سيرفر VPS

هذا الدليل يشرح خطوات رفع وتشغيل النظام على سيرفر VPS (مثل DigitalOcean, Hetzner, AWS) بنظام تشغيل **Ubuntu 20.04/22.04**.

## 1. تجهيز المشروع محلياً (Build)

قبل الرفع، نحتاج لبناء النسخة النهائية من المشروع.

1. افتح المشروع في التيرمينال.
2. تأكد من تثبيت جميع الملحقات:
   ```bash
   npm install
   ```
3. قم ببناء المشروع:
   ```bash
   npm run build
   ```
   *سيتم إنشاء مجلد جديد باسم `dist` يحتوي على ملفات المشروع الجاهزة.*

---

## 2. تجهيز السيرفر (VPS Setup)

ادخل إلى السيرفر الخاص بك عن طريق SSH:
```bash
ssh root@your_server_ip
```

### تحديث النظام وتثبيت المتطلبات الأساسية
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install curl git nginx -y
```

### تثبيت Node.js (نسخة 20 LTS)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### تثبيت مدير العمليات PM2
نستخدم PM2 لإبقاء التطبيق يعمل في الخلفية وإعادة تشغيله تلقائياً عند الخطأ أو إعادة تشغيل السيرفر.
```bash
sudo npm install -g pm2
```

---

## 3. رفع الملفات إلى السيرفر

أسهل طريقة هي رفع الملفات باستخدام برنامج مثل **FileZilla** أو **WinSCO**، أو عبر الأمر `scp`.

### الملفات المطلوب رفعها:
قم بإنشاء مجلد في السيرفر، مثلاً: `/var/www/fazza`، وارفع بداخله الملفات والمجلدات التالية من جهازك:
1. مجلد `dist` (الذي تم بناؤه).
2. ملف `package.json`.
3. ملف `package-lock.json`.
4. مجلد `shared`.

*ملاحظة: لا ترفع مجلد `node_modules`، سنقوم بتثبيته في السيرفر.*

---

## 4. تشغيل التطبيق على السيرفر

1. اذهب للمجلد الذي رفعت فيه الملفات:
   ```bash
   cd /var/www/fazza
   ```

2. ثبت الملحقات (Production only):
   ```bash
   npm install --production
   ```

3. قم بإعداد متغيرات البيئة (اختياري، إذا كنت تريد تغيير المنفذ أو مسار الداتا):
   ```bash
   export PORT=3000
   export NODE_ENV=production
   ```
   *أو يمكنك إضافتها في أمر التشغيل مباشرة.*

4. شغل التطبيق باستخدام PM2:
   ```bash
   pm2 start dist/index.js --name "fazza-app"
   ```

5. احفظ التغييرات ليعمل التطبيق عند إعادة تشغيل السيرفر:
   ```bash
   pm2 save
   pm2 startup
   ```

---

## 5. إعداد Nginx (Reverse Proxy)

لربط الدومين بالتطبيق وحجب المنفذ المباشر.

1. أنشئ ملف إعداد جديد:
   ```bash
   sudo nano /etc/nginx/sites-available/fazza
   ```

2. ألصق الإعدادات التالية (مع تغيير `your_domain.com` للدومين الخاص بك):
   ```nginx
   server {
       listen 80;
       server_name your_domain.com www.your_domain.com;

       location / {
           proxy_pass http://localhost:5000; # أو المنفذ الذي حددته
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

3. فعل الموقع:
   ```bash
   sudo ln -s /etc/nginx/sites-available/fazza /etc/nginx/sites-enabled/
   ```

4. افحص الإعدادات وأعد تشغيل Nginx:
   ```bash
   sudo nginx -t
   sudo systemctl restart nginx
   ```

---

## 6. تفعيل الحماية (SSL)

لتفعيل HTTPS مجاناً باستخدام Certbot:

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your_domain.com -d www.your_domain.com
```

---

## ملاحظات إضافية

* **قاعدة البيانات:** سيتم إنشاء ملف `fazza.db` تلقائياً داخل مجلد المشروع في السيرفر. احرص على أخذ نسخ احتياطية منه بانتظام.
* **التحديث:** عند إجراء تعديلات، قم ببناء المشروع محلياً (`npm run build`)، ثم ارفع مجلد `dist` الجديد للسيرفر، ثم أعد تشغيل التطبيق بـ `pm2 restart fazza-app`.
