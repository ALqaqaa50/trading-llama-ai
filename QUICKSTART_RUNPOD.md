# 🚀 دليل البدء السريع - RunPod

## نشر المشروع في 5 دقائق

### 1️⃣ الاتصال بالسيرفر
```bash
ssh root@your-runpod-ip -p your-port
```

### 2️⃣ تثبيت المتطلبات
```bash
# تحديث النظام وتثبيت Docker
apt update && apt upgrade -y
curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh
apt install docker-compose git -y
```

### 3️⃣ تحميل المشروع
```bash
cd /root
git clone https://github.com/ALqaqaa50/trading-llama-ai.git
cd trading-llama-ai
```

### 4️⃣ إعداد المتغيرات البيئية
```bash
nano .env
```

**انسخ والصق:**
```env
NEON_DATABASE_URL=postgresql://neondb_owner:npg_e4IGJS1VwNak@ep-dawn-glade-a12xk7f3-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
DATABASE_URL=postgresql://neondb_owner:npg_e4IGJS1VwNak@ep-dawn-glade-a12xk7f3-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
VITE_APP_ID=your-app-id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im
OWNER_OPEN_ID=your-open-id
OWNER_NAME=Your Name
BUILT_IN_FORGE_API_KEY=your-api-key
BUILT_IN_FORGE_API_URL=https://forge.manus.im
VITE_FRONTEND_FORGE_API_KEY=your-frontend-api-key
VITE_FRONTEND_FORGE_API_URL=https://forge.manus.im
VITE_APP_TITLE=Trading Llama AI
VITE_APP_LOGO=/logo.svg
NODE_ENV=production
```

**احفظ:** `Ctrl+X` → `Y` → `Enter`

### 5️⃣ تشغيل المشروع
```bash
# باستخدام السكريبت
chmod +x scripts/*.sh
./scripts/start.sh

# أو مباشرة
docker-compose up -d
```

### ✅ الوصول للمشروع
```
http://your-runpod-ip:3000
```

---

## 🎯 الأوامر المفيدة

### عرض السجلات
```bash
./scripts/logs.sh -f
# أو
docker-compose logs -f
```

### إيقاف المشروع
```bash
./scripts/stop.sh
# أو
docker-compose stop
```

### تحديث المشروع
```bash
./scripts/update.sh
# أو
git pull && docker-compose up -d --build
```

### التحقق من الحالة
```bash
docker-compose ps
docker stats
```

---

## 🔧 Port Forwarding في RunPod

1. اذهب إلى **Pod Settings**
2. أضف **Port Mapping**: `3000:3000`
3. احفظ التغييرات
4. استخدم الـ URL المعطى من RunPod

---

## 📚 المزيد من التفاصيل

راجع ملف `RUNPOD_DEPLOYMENT.md` للدليل الشامل.

---

**🎉 مبروك! مشروعك يعمل الآن!**
