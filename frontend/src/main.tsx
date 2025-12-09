// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx' // <-- ต้องเรียก App ตรงนี้
// import './index.css' // (บรรทัดนี้อาจจะมีหรือไม่มีก็ได้ แล้วแต่ว่าคุณลบไฟล์ css ไปยัง)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)