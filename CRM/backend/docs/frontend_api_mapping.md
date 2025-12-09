| UI Screen                 | Endpoint                                                         |
|---------------------------|------------------------------------------------------------------|
| HCP List                  | GET /api/hcps                                                    |
| HCP Details               | GET /api/hcps/{id}                                               |
| Create HCP                | POST /api/hcps                                                   |
| Update HCP                | PUT /api/hcps/{id}                                               |
| Ledger Pharmacy Summary   | GET /api/admin/dpm-ledger/pharmacies/{legacy_id}/summary         |
| Ledger Pharmacy Statement | GET /api/admin/dpm-ledger/pharmacies/{legacy_id}/statement       |
| Ledger Area Summary       | GET /api/admin/dpm-ledger/areas/{area_id}/summary                |
| AI Insights               | GET /api/admin/ai/insights                                       |
| AI Tasks                  | GET /api/admin/ai/tasks                                          |
| Update AI Task            | PATCH /api/admin/ai/tasks/{task_id}                              |
| AI Draft Messages         | GET /api/admin/ai/drafts                                         |
| AI Collection Plan        | GET /api/admin/ai/collection-plan                                |
| Dev Token (local only)    | GET /api/dev/token                                               |
