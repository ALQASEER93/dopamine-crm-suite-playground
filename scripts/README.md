# Scripts Directory - Dopamine CRM Suite
## Automated Scripts

هذه الـ scripts تقوم بجميع الأعمال تلقائياً - **لا حاجة لأوامر يدوية!**

---

## 📋 Scripts المتوفرة

### 1. `initialize-project.ps1`

**الوصف**: تهيئة المشروع تلقائياً

**ما يفعله**:
- ✅ التحقق من Python و Node.js
- ✅ إنشاء .env.example للـ Backend
- ✅ تثبيت Backend dependencies
- ✅ تهيئة Database
- ✅ تثبيت Frontend dependencies
- ✅ تثبيت PWA dependencies

**الاستخدام**:
```powershell
.\scripts\initialize-project.ps1
```

**أو في Cursor**: "قم بتهيئة المشروع"

---

### 2. `setup-github.ps1`

**الوصف**: إعداد GitHub Repository تلقائياً

**ما يفعله**:
- ✅ Initialize Git (إذا لم يكن موجود)
- ✅ Add all files
- ✅ Create initial commit (إذا لم يكن موجود)
- ✅ Set branch to main
- ✅ Add/Update remote

**الاستخدام**:
```powershell
.\scripts\setup-github.ps1 -GitHubUsername YOUR_USERNAME
```

**أو في Cursor**: "قم بإعداد GitHub مع username X"

---

### 3. `push-to-github.ps1`

**الوصف**: دفع الكود إلى GitHub تلقائياً

**ما يفعله**:
- ✅ Commit أي تغييرات غير محفوظة
- ✅ Push إلى GitHub
- ✅ Handle errors gracefully

**الاستخدام**:
```powershell
.\scripts\push-to-github.ps1 -GitHubUsername YOUR_USERNAME
```

**أو في Cursor**: "ارفع الكود إلى GitHub"

---

## 🎯 الطريقة المفضلة (في Cursor)

**لا تحتاج لتشغيل الـ scripts يدوياً!**

فقط أخبرني في Cursor:
- "قم بتهيئة المشروع" → سأشغّل `initialize-project.ps1`
- "قم بإعداد GitHub مع username X" → سأشغّل `setup-github.ps1`
- "ارفع الكود إلى GitHub" → سأشغّل `push-to-github.ps1`

---

## 📝 ملاحظات

- ✅ جميع الـ scripts تعمل من project root تلقائياً
- ✅ جميع الـ scripts تعطي feedback واضح
- ✅ جميع الـ scripts handle errors gracefully
- ✅ لا حاجة لأوامر يدوية - كل شيء أوتوماتيكي!

---

**انظر `AUTOMATED_WORKFLOW.md` للتفاصيل الكاملة**



