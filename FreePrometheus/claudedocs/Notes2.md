1. CRITICAL Unknown Alert
Burada niye unkown diyor, burada başlıkta alert olmamalı çünkü alert based bir analiz dğeil bu

2.  QUICK FINDINGS(Burası gayet güzel)
• Pod bss-mc-pcm-product-offer-detail-6fbfbddf94-g58q7 is restarting.
• 6 alerts detected (0 critical).
• Cluster health is degraded due to pod instability.

3.  SYMPTOMS (What's Happening)( Burası gayet güzel)
• Memory Management service experiencing issues
• Pod status: Running
• Pod restarting (Restart count: 5)
• Memory: 950Mi/1024Mi
• Latest event: Pod Status Check (Warning)

4. 🔍 ROOT CAUSE (Why It's Happening)
Root Cause: Memory pressure causing pod restarts

5. Evidence:
• Pod Status: Running 
• Last Error: Unknown (Exit Code: 1) (Burada Unknown yamamalı)
• Memory Usage: 950Mi / 1024Mi
• CPU Usage: 0.85
• Latest Event: Pod Status Check (Warning)


6. SOLUTION (What To Do) (bu kısım çok detaysız ve roleback öerisi generic, böyle olmamalı, bu bilgiyi remedietion stageînden mi alıyor)

1. IMMEDIATE ACTION
Action Required: Rollback deployment to previous version

Command:

kubectl rollout undo deployment/[object Object] -n bstp-cms-global-production
⏱️ Duration: 2-5 minutes ⚠️ Risk: low
🎯 Expected Result: Restore service to previous stable version

7. VERIFY SOLUTION EFFECTIVENESS (burası güzel olmuş)