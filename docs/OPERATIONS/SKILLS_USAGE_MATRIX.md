# مصفوفة استخدام Skills (Skills Usage Matrix)

## 1) القاعدة (Rule)
إذا تطابقت نية المهمة بوضوح مع skill، يجب استخدامها.

## 2) السيناريوهات الأساسية (Core Scenarios)
### CI failure triage and fixes
- Primary skill: `gh-fix-ci`
- Expected output: ملخص checks الفاشلة + فرضية السبب + خطة إصلاح + تحقق.

### Addressing PR comments
- Primary skill: `gh-address-comments`
- Expected output: معالجة comment-by-comment وتوثيق التغييرات.

### Browser flow validation (visits/maps/forms)
- Primary skill: `playwright`
- Expected output: script/log قابل للإعادة + snapshots عند الحاجة.

### OpenAI API/product guidance
- Primary skill: `openai-docs`
- Expected output: guidance مبني على المصادر الرسمية فقط.

### Deployment to Vercel
- Primary skill: `vercel-deploy`
- Expected output: البيئة المستهدفة + URL + حالة التحقق.

### Explicit security review
- Skills: `security-best-practices` و/أو `security-threat-model`
- Expected output: findings مرتبة حسب الأولوية + mitigations عملية.

### Production issue triage with Sentry
- Primary skill: `sentry`
- Preconditions: connector/token متاح.
- Fallback: توثيق عدم التوفر واستخدام telemetry البديل.

### Documentation outputs
- Skills: `doc`, `pdf`, `spreadsheet`, `notion-*` حسب artifact المطلوب.

## 3) ربط خاص بـ DPM (DPM-Specific Mapping)
- Visits/GPS/offline regressions: `playwright` + `gh-fix-ci` عند الحاجة.
- Reporting/exports: `spreadsheet` لـ CSV/XLSX و `pdf` لـ PDF.
- UI parity/design implementation: `figma-implement-design` عند توفر مصدر Figma صريح.

## 4) Checklist سريع للاستخدام (Invocation Checklist)
قبل التفعيل:
1. تأكيد fit بين task وskill.
2. قراءة `SKILL.md` بالقدر الأدنى المطلوب.
3. إعادة استخدام scripts/templates المتاحة.

بعد التفعيل:
1. توثيق ما تم تشغيله.
2. توثيق النتيجة والمخاطر المتبقية.

## 5) Anti-patterns
- تنفيذ يدوي عام مع وجود skill مطابقة.
- استخدام skills أمنية لمهام غير أمنية.
- استخدام مصادر عامة لـ OpenAI بدل `openai-docs`.
