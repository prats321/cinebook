import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

// QR the theatre scans at the entrance. It encodes only the booking code, which the
// staff app would look up server-side; no personal details are inside the image.
export default function TicketQR({ code, className = '' }) {
  const [src, setSrc] = useState(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(`CINEBOOK:${code}`, { margin: 1, width: 240, errorCorrectionLevel: 'M' })
      .then((url) => !cancelled && setSrc(url))
      .catch(() => !cancelled && setSrc(null));
    return () => {
      cancelled = true;
    };
  }, [code]);

  return (
    <div className={`grid size-40 place-items-center rounded-xl bg-white p-2 ${className}`}>
      {src ? <img src={src} alt={`QR code for booking ${code}`} className="size-full" /> : null}
    </div>
  );
}
