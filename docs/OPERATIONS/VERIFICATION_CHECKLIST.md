# Verification Checklist (Pilot)

## Functional (P0)
- [ ] Start Visit يسجل GPS + timestamp + accuracy
- [ ] End Visit يعمل ويغلق الزيارة بشكل صحيح
- [ ] RBAC يعمل حسب الدور

## Offline/PWA
- [ ] Offline queue تعمل أثناء انقطاع الشبكة
- [ ] Sync بعد عودة الشبكة بدون duplication
- [ ] PWA build/test passed

## Reports/Exports
- [ ] CSV export يعمل
- [ ] Excel export يعمل
- [ ] PDF export يعمل

## UI-only Owner Validation
- [ ] Required checks خضراء في GitHub
- [ ] نشر Cloudflare عبر Actions UI فقط (عند الحاجة)
