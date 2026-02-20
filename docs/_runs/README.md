# docs/_runs دليل البنية (Run Structure Guide)

هذا المجلد مخصص لـ run artifacts وقواعد إدارتها فقط.

## البنية المعتمدة (Required Structure)
- `run_<YYYYMMDD_HHMMSS>/` لكل تنفيذ فعلي.
- `run_<YYYYMMDD_HHMMSS>.zip` عند الأرشفة في الجذر.
- `LATEST.txt` ويحتوي اسم مجلد run الحالي فقط.
- `REPORT_ROTATION_POLICY.txt` لسياسة الاحتفاظ.

## قواعد إلزامية (Governance Rules)
- لا تنشئ run folder جديد لتعديلات توثيق فقط.
- لا تعدّل `LATEST.txt` إلا بعد إنشاء run folder جديد فعليًا.
- يجب أن يشير `LATEST.txt` دائمًا إلى مجلد موجود.
- المخرجات يجب أن تكون خالية من الأسرار.
- أي release process يبقى افتراضيًا `APPROVE_RELEASE=NO`.
- أي بنود `OWNER_ACTIONS` تُنفذ UI-only وليس عبر shell يدوي.

## سياسة التشغيل
- لا نطلب من المستخدم تنفيذ أوامر shell يدويًا.
- استخدم السكربتات/الأتمتة الموثقة داخل الريبو.

## checklist سريع
- راجع توافق مراجع docs التشغيل مع `LATEST.txt`.
- راجع تطبيق `REPORT_ROTATION_POLICY.txt` على المخرجات الأقدم.
