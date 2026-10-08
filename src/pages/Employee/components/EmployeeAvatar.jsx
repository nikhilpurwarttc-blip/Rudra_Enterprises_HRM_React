import { useState } from 'react';
import { resolveApiAssetUrl } from '../../../config/config';

const initials = (name) => String(name ?? '?').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

const EmployeeAvatar = ({ employee, className = '' }) => {
  const [failedImageUrl, setFailedImageUrl] = useState(null);
  const imageUrl = resolveApiAssetUrl(employee?.image);
  const imageFailed = failedImageUrl === imageUrl;

  return (
    <div className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-(--color-accent) font-semibold text-white ${className}`}>
      <span aria-hidden="true">{initials(employee?.name)}</span>
      {imageUrl && !imageFailed && (
        <img
          src={imageUrl}
          alt={`${employee?.name ?? 'Employee'} photo`}
          onError={() => setFailedImageUrl(imageUrl)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
    </div>
  );
};

export default EmployeeAvatar;
