export function TankRadarLogo({ size = 32 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Pump body - Blue */}
      <rect x="15" y="25" width="25" height="50" rx="3" fill="#2563EB" />
      
      {/* Pump display */}
      <rect x="20" y="30" width="15" height="8" rx="1" fill="white" />
      
      {/* Pump nozzle */}
      <path
        d="M 35 50 Q 45 45 50 50 Q 45 55 35 55"
        fill="#2563EB"
      />
      
      {/* Fuel drop - Green */}
      <path
        d="M 42 58 Q 42 62 45 65 Q 48 62 48 58 Z"
        fill="#16A34A"
      />
      
      {/* Radar circles - Green */}
      <circle cx="60" cy="40" r="12" stroke="#16A34A" strokeWidth="2" fill="none" />
      <circle cx="60" cy="40" r="20" stroke="#22C55E" strokeWidth="2" fill="none" />
      <circle cx="60" cy="40" r="28" stroke="#86EFAC" strokeWidth="2" fill="none" />
      
      {/* Radar dot */}
      <circle cx="60" cy="40" r="2" fill="#16A34A" />
    </svg>
  );
}