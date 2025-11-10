# دليل النشر الدائم - Trading Llama AI

## 🚀 خيارات النشر للعمل بشكل دائم

تم بناء المشروع بالكامل وهو جاهز للنشر. لديك عدة خيارات للنشر الدائم:

---

## ✅ الخيار 1: النشر عبر Manus (الأسهل)

### الخطوات:
1. **افتح لوحة التحكم** في واجهة Manus
2. **اضغط على زر "Publish"** في أعلى اليمين
3. سيتم نشر المشروع تلقائياً على:
   - Domain مخصص: `https://your-project.manus.space`
   - أو ربط Domain خاص بك من إعدادات Domains

### المميزات:
- ✅ نشر بضغطة زر واحدة
- ✅ SSL مجاني تلقائياً
- ✅ قاعدة بيانات Neon متصلة ومُهيأة
- ✅ متغيرات البيئة محفوظة بشكل آمن
- ✅ تحديثات تلقائية عند حفظ Checkpoint جديد

---

## 🔧 الخيار 2: النشر على Vercel

### المتطلبات:
- حساب Vercel مجاني
- قاعدة بيانات Neon (موجودة بالفعل)

### الخطوات:

#### 1. تحضير المشروع
```bash
# تأكد من أن جميع الملفات محدثة
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

#### 2. إعداد Vercel
1. اذهب إلى [vercel.com](https://vercel.com)
2. اضغط "Import Project"
3. اختر مستودع GitHub: `ALqaqaa50/trading-llama-ai`
4. اختر Framework Preset: **Other**

#### 3. إعداد Build Settings
```
Build Command: pnpm build
Output Directory: dist
Install Command: pnpm install
```

#### 4. إضافة Environment Variables
انسخ هذه المتغيرات من Manus Settings → Secrets:
```
NEON_DATABASE_URL=postgresql://...
JWT_SECRET=...
VITE_APP_ID=...
OAUTH_SERVER_URL=...
VITE_OAUTH_PORTAL_URL=...
OWNER_OPEN_ID=...
OWNER_NAME=...
BUILT_IN_FORGE_API_KEY=...
BUILT_IN_FORGE_API_URL=...
VITE_FRONTEND_FORGE_API_KEY=...
VITE_FRONTEND_FORGE_API_URL=...
VITE_APP_TITLE=Trading Llama AI
VITE_APP_LOGO=/logo.svg
```

#### 5. Deploy
اضغط "Deploy" وانتظر حتى يكتمل النشر (2-3 دقائق)

---

## 🐳 الخيار 3: النشر على VPS باستخدام Docker

### المتطلبات:
- VPS (DigitalOcean, AWS, Linode, etc.)
- Docker و Docker Compose مثبتين

### الخطوات:

#### 1. إنشاء Dockerfile
```dockerfile
FROM node:22-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the app
RUN pnpm build

# Expose port
EXPOSE 3000

# Start the app
CMD ["pnpm", "start"]
```

#### 2. إنشاء docker-compose.yml
```yaml
version: '3.8'

services:
  trading-llama:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEON_DATABASE_URL=${NEON_DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
      - VITE_APP_ID=${VITE_APP_ID}
      # ... add all other env variables
    restart: unless-stopped
```

#### 3. النشر على VPS
```bash
# 1. Clone المشروع على VPS
git clone https://github.com/ALqaqaa50/trading-llama-ai.git
cd trading-llama-ai

# 2. إنشاء ملف .env
nano .env
# الصق جميع المتغيرات البيئية

# 3. بناء وتشغيل Docker
docker-compose up -d

# 4. التحقق من الحالة
docker-compose logs -f
```

#### 4. إعداد Nginx Reverse Proxy
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### 5. إعداد SSL مع Let's Encrypt
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## 🔒 الأمان والصيانة

### 1. النسخ الاحتياطي لقاعدة البيانات
```bash
# Neon يوفر نسخ احتياطي تلقائي
# يمكنك أيضاً عمل نسخة يدوية:
pg_dump $NEON_DATABASE_URL > backup_$(date +%Y%m%d).sql
```

### 2. مراقبة الأداء
- استخدم Neon Dashboard لمراقبة استخدام قاعدة البيانات
- راقب logs الخادم بانتظام
- استخدم أدوات مثل PM2 للحفاظ على تشغيل التطبيق

### 3. التحديثات
```bash
# سحب آخر التحديثات
git pull origin main

# تثبيت التبعيات الجديدة
pnpm install

# إعادة البناء
pnpm build

# إعادة التشغيل
pm2 restart trading-llama
# أو
docker-compose restart
```

---

## 📊 المراقبة والتحليلات

### Manus Analytics (مدمج بالفعل)
- تتبع عدد الزوار (UV/PV)
- متوفر في Dashboard → Analytics

### إضافة Google Analytics (اختياري)
أضف في `client/index.html`:
```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

---

## 🆘 استكشاف الأخطاء

### المشكلة: قاعدة البيانات لا تتصل
**الحل:**
```bash
# تحقق من صحة Connection String
echo $NEON_DATABASE_URL

# اختبر الاتصال
psql $NEON_DATABASE_URL -c "SELECT 1;"
```

### المشكلة: الخادم لا يبدأ
**الحل:**
```bash
# تحقق من Logs
docker-compose logs
# أو
pm2 logs

# تحقق من المنافذ
netstat -tulpn | grep 3000
```

### المشكلة: OAuth لا يعمل
**الحل:**
- تأكد من أن `OAUTH_SERVER_URL` و `VITE_OAUTH_PORTAL_URL` صحيحة
- تحقق من أن Domain مسجل في إعدادات OAuth

---

## 📞 الدعم

- **GitHub Issues**: https://github.com/ALqaqaa50/trading-llama-ai/issues
- **Manus Help**: https://help.manus.im

---

## ✅ Checklist قبل النشر

- [ ] جميع Environment Variables مُعدة بشكل صحيح
- [ ] قاعدة بيانات Neon متصلة وتعمل
- [ ] تم اختبار جميع الميزات الأساسية
- [ ] SSL مُفعل (HTTPS)
- [ ] النسخ الاحتياطي مُعد
- [ ] المراقبة مُفعلة
- [ ] Domain مُربوط (إذا كان مخصص)

---

🎉 **مبروك! مشروعك جاهز للعمل بشكل دائم!**
