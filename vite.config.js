```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // نترك base فارغة أو نستخدم './' لضمان عمل المسارات بشكل صحيح عند النشر
  base: '', 
})

```

