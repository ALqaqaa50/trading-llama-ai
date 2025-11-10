# 🚀 دليل النشر على RunPod - Trading Llama AI

## نظرة عامة

هذا الدليل يشرح كيفية نشر مشروع Trading Llama AI على سيرفر RunPod الخاص بك للعمل بشكل دائم 24/7.

---

## 📋 المتطلبات الأساسية

### 1. سيرفر RunPod
- ✅ حساب RunPod نشط
- ✅ Pod (سيرفر) مستأجر ومشغّل
- ✅ SSH Access متاح

### 2. المواصفات الموصى بها
- **CPU**: 2+ vCPUs
- **RAM**: 4GB+ (8GB موصى به)
- **Storage**: 20GB+ SSD
- **OS**: Ubuntu 20.04 أو أحدث

### 3. البرامج المطلوبة على السيرفر
- Docker
- Docker Compose
- Git

---

## 🔧 الخطوة 1: الاتصال بسيرفر RunPod

### عبر SSH
```bash
# استخدم معلومات SSH من لوحة تحكم RunPod
ssh root@your-runpod-ip -p your-port
```

### عبر RunPod Web Terminal
يمكنك أيضاً استخدام Terminal المدمج في لوحة تحكم RunPod.

---

## 📦 الخطوة 2: تثبيت المتطلبات

### تحديث النظام
```bash
apt update && apt upgrade -y
```

### تثبيت Docker
```bash
# تثبيت Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# التحقق من التثبيت
docker --version
```

### تثبيت Docker Compose
```bash
# تثبيت Docker Compose
apt install docker-compose -y

# التحقق من التثبيت
docker-compose --version
```

### تثبيت Git
```bash
apt install git -y
```

---

## 📥 الخطوة 3: تحميل المشروع

### Clone من GitHub
```bash
# الانتقال إلى المجلد الرئيسي
cd /root

# Clone المشروع
git clone https://github.com/ALqaqaa50/trading-llama-ai.git

# الدخول إلى مجلد المشروع
cd trading-llama-ai
```

---

## 🔐 الخطوة 4: إعداد المتغيرات البيئية

### إنشاء ملف .env
```bash
nano .env
```

### نسخ المتغيرات التالية
```env
# Database (Neon PostgreSQL)
NEON_DATABASE_URL=postgresql://neondb_owner:npg_e4IGJS1VwNak@ep-dawn-glade-a12xk7f3-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
DATABASE_URL=postgresql://neondb_owner:npg_e4IGJS1VwNak@ep-dawn-glade-a12xk7f3-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require

# JWT Secret (أنشئ مفتاح عشوائي قوي)
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long

# OAuth Configuration
VITE_APP_ID=your-app-id-from-manus
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im

# Owner Information
OWNER_OPEN_ID=your-open-id
OWNER_NAME=Your Name

# Manus Built-in APIs
BUILT_IN_FORGE_API_KEY=your-api-key
BUILT_IN_FORGE_API_URL=https://forge.manus.im
VITE_FRONTEND_FORGE_API_KEY=your-frontend-api-key
VITE_FRONTEND_FORGE_API_URL=https://forge.manus.im

# App Configuration
VITE_APP_TITLE=Trading Llama AI
VITE_APP_LOGO=/logo.svg
NODE_ENV=production
```

**ملاحظة**: احصل على قيم المتغيرات من:
1. **Neon Database**: استخدم Connection String الموجود في لوحة تحكم Neon
2. **Manus OAuth**: من إعدادات المشروع في Manus
3. **JWT_SECRET**: أنشئ مفتاح عشوائي قوي (32+ حرف)

### حفظ الملف
اضغط `Ctrl+X`، ثم `Y`، ثم `Enter`

---

## 🏗️ الخطوة 5: بناء وتشغيل المشروع

### بناء Docker Image
```bash
docker-compose build
```

هذه الخطوة ستستغرق 5-10 دقائق في المرة الأولى.

### تشغيل المشروع
```bash
docker-compose up -d
```

الخيار `-d` يعني التشغيل في الخلفية (detached mode).

### التحقق من الحالة
```bash
# عرض الحاويات النشطة
docker-compose ps

# عرض السجلات (logs)
docker-compose logs -f

# للخروج من السجلات اضغط Ctrl+C
```

---

## 🌐 الخطوة 6: الوصول إلى المشروع

### عبر IP السيرفر
```
http://your-runpod-ip:3000
```

### فتح المنفذ (Port Forwarding)
في لوحة تحكم RunPod:
1. اذهب إلى **Pod Settings**
2. أضف **Port Mapping**: `3000:3000`
3. احفظ التغييرات

---

## 🔒 الخطوة 7: إعداد Domain وSSL (اختياري)

### استخدام Nginx Reverse Proxy

#### تثبيت Nginx
```bash
apt install nginx -y
```

#### إنشاء ملف تكوين
```bash
nano /etc/nginx/sites-available/trading-llama
```

#### إضافة التكوين التالي
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
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### تفعيل الموقع
```bash
ln -s /etc/nginx/sites-available/trading-llama /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### إضافة SSL مع Let's Encrypt
```bash
# تثبيت Certbot
apt install certbot python3-certbot-nginx -y

# الحصول على شهادة SSL
certbot --nginx -d your-domain.com

# التجديد التلقائي
certbot renew --dry-run
```

---

## 🔄 الخطوة 8: إدارة المشروع

### إيقاف المشروع
```bash
docker-compose stop
```

### إعادة تشغيل المشروع
```bash
docker-compose restart
```

### إيقاف وحذف الحاويات
```bash
docker-compose down
```

### تحديث المشروع
```bash
# سحب آخر التحديثات من GitHub
git pull origin main

# إعادة بناء الصورة
docker-compose build

# إعادة تشغيل الحاويات
docker-compose up -d
```

### عرض السجلات
```bash
# عرض جميع السجلات
docker-compose logs

# عرض آخر 100 سطر
docker-compose logs --tail=100

# متابعة السجلات الحية
docker-compose logs -f
```

---

## 📊 المراقبة والصيانة

### التحقق من استخدام الموارد
```bash
# استخدام Docker
docker stats

# استخدام النظام
htop
# أو
top
```

### النسخ الاحتياطي لقاعدة البيانات
```bash
# Neon يوفر نسخ احتياطي تلقائي
# يمكنك أيضاً عمل نسخة يدوية:
docker exec trading-llama-ai pg_dump $NEON_DATABASE_URL > backup_$(date +%Y%m%d).sql
```

### تنظيف Docker
```bash
# حذف الصور غير المستخدمة
docker system prune -a

# حذف الحاويات المتوقفة
docker container prune
```

---

## 🔧 استكشاف الأخطاء

### المشكلة: الحاوية لا تبدأ
```bash
# التحقق من السجلات
docker-compose logs

# التحقق من ملف .env
cat .env

# التحقق من المنافذ
netstat -tulpn | grep 3000
```

### المشكلة: قاعدة البيانات لا تتصل
```bash
# اختبار الاتصال بقاعدة البيانات
docker exec -it trading-llama-ai node -e "console.log(process.env.NEON_DATABASE_URL)"

# التحقق من صحة Connection String
# يجب أن يبدأ بـ postgresql:// وليس psql
```

### المشكلة: المنفذ 3000 مستخدم
```bash
# إيقاف العملية المستخدمة للمنفذ
lsof -ti:3000 | xargs kill -9

# أو تغيير المنفذ في docker-compose.yml
# ports:
#   - "8080:3000"
```

---

## 🚀 التشغيل التلقائي عند إعادة تشغيل السيرفر

### استخدام systemd

#### إنشاء ملف service
```bash
nano /etc/systemd/system/trading-llama.service
```

#### إضافة المحتوى التالي
```ini
[Unit]
Description=Trading Llama AI
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/root/trading-llama-ai
ExecStart=/usr/bin/docker-compose up -d
ExecStop=/usr/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

#### تفعيل الخدمة
```bash
systemctl daemon-reload
systemctl enable trading-llama.service
systemctl start trading-llama.service

# التحقق من الحالة
systemctl status trading-llama.service
```

---

## 📈 تحسين الأداء

### زيادة حدود الذاكرة
في ملف `docker-compose.yml`، أضف:
```yaml
services:
  trading-llama-ai:
    # ... existing config
    deploy:
      resources:
        limits:
          memory: 4G
        reservations:
          memory: 2G
```

### تفعيل Logging Rotation
```bash
# إنشاء ملف تكوين Docker logging
nano /etc/docker/daemon.json
```

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

```bash
# إعادة تشغيل Docker
systemctl restart docker
```

---

## 🔐 الأمان

### تحديث الحزم بانتظام
```bash
apt update && apt upgrade -y
```

### إعداد Firewall
```bash
# تثبيت UFW
apt install ufw -y

# السماح بـ SSH
ufw allow ssh

# السماح بـ HTTP/HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# السماح بالمنفذ 3000 (إذا لم تستخدم Nginx)
ufw allow 3000/tcp

# تفعيل Firewall
ufw enable
```

### تغيير منفذ SSH (موصى به)
```bash
nano /etc/ssh/sshd_config
# غيّر Port 22 إلى رقم آخر (مثل 2222)

systemctl restart sshd

# لا تنسَ السماح بالمنفذ الجديد في UFW
ufw allow 2222/tcp
```

---

## 📞 الدعم والمساعدة

### الموارد المفيدة
- **GitHub Repository**: https://github.com/ALqaqaa50/trading-llama-ai
- **RunPod Docs**: https://docs.runpod.io
- **Docker Docs**: https://docs.docker.com
- **Neon Docs**: https://neon.tech/docs

### حل المشاكل الشائعة
1. **Out of Memory**: زد حجم RAM أو قلل عدد العمليات المتزامنة
2. **Slow Performance**: ترقية المواصفات أو تحسين الاستعلامات
3. **Connection Timeout**: تحقق من Firewall وإعدادات الشبكة

---

## ✅ Checklist النشر النهائي

- [ ] السيرفر مُحدث ومُجهز
- [ ] Docker و Docker Compose مثبتين
- [ ] المشروع محمّل من GitHub
- [ ] ملف .env مُعد بشكل صحيح
- [ ] المشروع يعمل على المنفذ 3000
- [ ] Port Forwarding مُفعل في RunPod
- [ ] Nginx و SSL مُعدين (اختياري)
- [ ] النسخ الاحتياطي مُجدول
- [ ] المراقبة مُفعلة
- [ ] Firewall مُعد
- [ ] التشغيل التلقائي مُفعل

---

## 🎉 تهانينا!

مشروعك الآن يعمل بشكل دائم على RunPod! 🚀

يمكنك الوصول إليه عبر:
- **IP مباشر**: `http://your-runpod-ip:3000`
- **Domain مخصص**: `https://your-domain.com` (إذا أعددت Nginx + SSL)

---

## 📝 ملاحظات إضافية

### تكاليف RunPod
- راقب استخدامك بانتظام لتجنب التكاليف غير المتوقعة
- أوقف Pod عندما لا تحتاجه لتوفير المال

### الصيانة الدورية
- تحديث المشروع أسبوعياً: `git pull && docker-compose up -d --build`
- مراجعة السجلات يومياً: `docker-compose logs --tail=100`
- فحص استخدام الموارد: `docker stats`
- النسخ الاحتياطي شهرياً للبيانات المهمة

---

**تم إعداد هذا الدليل بواسطة Manus AI** 🤖
