# ALQASEER CRM Backend - D:/CRM ALQASEER/CRM/backend

## Summary
- Test status: passed (exit 0)
- Build status: passed (exit 0)
- Git: git repo not found
- Timestamp: 2025-12-02T21:33:30.405Z

## Problems
1. Severity: Low
   - No failures detected. Consider lint/cleanup or minor improvements.

## Logs (truncated to latest run)
### Test stdout
```

> crm2-backend@1.0.0 test
> python -m pytest -q

.............                                                            [100%]
============================== warnings summary ===============================
C:\Users\M S I\AppData\Local\Python\pythoncore-3.14-64\Lib\site-packages\fastapi\routing.py:233: 172 warnings
  C:\Users\M S I\AppData\Local\Python\pythoncore-3.14-64\Lib\site-packages\fastapi\routing.py:233: DeprecationWarning: 'asyncio.iscoroutinefunction' is deprecated and slated for removal in Python 3.16; use inspect.iscoroutinefunction() instead
    is_coroutine = asyncio.iscoroutinefunction(dependant.call)

main.py:67
  C:\\Users\\M\ S\ I\\ALQASEER_CRM_SUITE_FINAL\CRM\backend\main.py:67: DeprecationWarning: 
          on_event is deprecated, use lifespan event handlers instead.
  
          Read more about it in the
          [FastAPI docs for Lifespan Events](https://fastapi.tiangolo.com/advanced/events/).
          
    @app.on_event("startup")

C:\Users\M S I\AppData\Local\Python\pythoncore-3.14-64\Lib\site-packages\fastapi\applications.py:4495
  C:\Users\M S I\AppData\Local\Python\pythoncore-3.14-64\Lib\site-packages\fastapi\applications.py:4495: DeprecationWarning: 
          on_event is deprecated, use lifespan event handlers instead.
  
          Read more about it in the
          [FastAPI docs for Lifespan Events](https://fastapi.tiangolo.com/advanced/events/).
          
    return self.router.on_event(event_type)

-- Docs: https://docs.pytest.org/en/stable/how-to/capture-warnings.html
13 passed, 174 warnings in 0.88s

```
### Test stderr
```
(empty)
```
### Build stdout
```

> crm2-backend@1.0.0 build
> set PYTHONPYCACHEPREFIX=%TEMP%&& python -m py_compile main.py


```
### Build stderr
```
(empty)
```

## Instructions for Codex/Aider
- Working directory: D:/CRM ALQASEER/CRM/backend
- You may edit project files, add/update tests, and run npm test/build as needed.
- Focus on the problems above; keep unrelated behavior unchanged.
