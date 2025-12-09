// src/components/DigitalClock.tsx
import React, { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";

const pad2 = (n: number) => n.toString().padStart(2, "0");

const DigitalClock: React.FC = () => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const h = pad2(now.getHours());
  const m = pad2(now.getMinutes());
  const s = pad2(now.getSeconds());

  const dateText = now.toLocaleDateString("th-TH", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <Box textAlign="right">
      {/* เวลา */}
      <Typography
        variant="h4"
        sx={{
          fontWeight: 700,
          lineHeight: 1,
          fontFamily: "Segoe UI, sans-serif",
        }}
      >
        {h}:{m}
        <Box
          component="span"
          sx={{
            color: "grey.400",
            ml: 0.5,
            fontWeight: 600,
          }}
        >
          :{s}
        </Box>
      </Typography>

      {/* วันที่ */}
      <Typography
        variant="body2"
        sx={{ color: "text.secondary", mt: 0.5 }}
      >
        {dateText}
      </Typography>
    </Box>
  );
};

export default DigitalClock;
