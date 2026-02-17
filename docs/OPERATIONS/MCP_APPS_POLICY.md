# سياسة MCP + Apps (Strict Production)

## 1) الهدف (Purpose)
تحديد ضوابط إلزامية للوصول للأنظمة الخارجية عبر MCP والأدوات المرتبطة.

## 2) أولوية الوصول (Priority of Access)
1. ابدأ دائمًا بـ MCP-discovered tools.
2. fallback إلى shell/CLI المحلي فقط إذا MCP غير متاح أو غير كافٍ.
3. وثّق سبب الـ fallback في أدلة التنفيذ.

## 3) شرط الاكتشاف (Discovery Requirement)
قبل أي عمل على tickets/PR/logs/deploy/docs:
- نفّذ MCP tool discovery.
- اختر أقل مجموعة أدوات لازمة.
- سجّل الاختيار في thread notes.

## 4) مستويات التطبيقات في هذا المشروع (App Tiers)
Tier-1 (افتراضي للتسليم):
- GitHub
- Vercel
- Slack
- Linear

Tier-2 (عند الحاجة):
- Notion
- Figma
- OpenAI Docs
- Deep Research
- Monday.com
- Hugging Face Jobs

## 5) فجوات التكامل (Availability Gaps)
عند غياب connector متوقع:
1. صنّفه blocker/non-blocker.
2. أنشئ بند `OWNER_ACTIONS` يحدد النقص بدقة.
3. أكمل بأفضل telemetry بديل متاح.

## 6) قواعد البيانات الحساسة (Data Handling Rules)
- ممنوع كشف secrets في prompts/logs/PR comments.
- استخدم أقل قدر بيانات يلزم للمهمة.
- في incidents الإنتاجية: redaction لأي بيانات حساسة.

## 7) ضوابط الموافقة والنطاق (Approval + Scope)
- حافظ على scope ضمن branch والبيئة المستهدفة.
- في deploy actions: صرّح البيئة (`preview` أو `production`).
- أي release gate يظل افتراضيًا `APPROVE_RELEASE=NO` حتى موافقة المالك.
- أي `OWNER_ACTIONS` تُنفذ عبر UI فقط، وليس بأوامر shell يدوية.

## 8) التوثيق الإلزامي (Required Logging)
لكل workflow خارجي، وثّق:
- `external_system`
- `mcp_query`
- `selected_tools`
- `action_taken`
- `result`
- `fallback_used`

## 9) حظر الامتثال (Non-compliance Conditions)
العمل يعتبر blocked إذا:
- يلزم external-system action ولم يتم MCP discovery/logging.
- حدث deploy بدون تحديد environment.
- تم إدراج بيانات حساسة بنص صريح.
- طُلب من المستخدم تنفيذ shell commands يدويًا.
