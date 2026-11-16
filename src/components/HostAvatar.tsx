import { useState } from 'react';
import { Mic } from 'lucide-react';

interface HostAvatarProps {
  name: string;
  portraitUrl: string;
  isSpeaking?: boolean;
  sizeClass?: string;
  roundedClass?: string;
}

export function HostAvatar({
  name,
  portraitUrl,
  isSpeaking = false,
  sizeClass = 'w-14 h-14',
  roundedClass = 'rounded-xl',
}: HostAvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);

  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

  return (
    <div
      className={`relative shrink-0 overflow-hidden bg-[#192338] border transition-colors duration-200 ${sizeClass} ${roundedClass} ${
        isSpeaking
          ? 'border-amber-400 ring-2 ring-amber-400/35'
          : 'border-white/15'
      }`}
    >
      {portraitUrl && !imgFailed ? (
        <img
          src={portraitUrl}
          alt={`${name} studio portrait`}
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#1E293B] to-[#0F172A] text-amber-300">
          {initials ? (
            <span className="font-display font-bold text-lg tracking-tight">
              {initials}
            </span>
          ) : (
            <Mic className="w-5 h-5 text-amber-400" aria-hidden="true" />
          )}
        </div>
      )}
    </div>
  );
}
